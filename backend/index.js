import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import Routes from "./routes/index.js";
import { createServer } from "http";
import moment from "moment";
import { setIO } from "./functions/socket-registry.js";
import admin from "firebase-admin";
import compression from "compression";
// import setupGraphQL from "./graphql/index.js";
import { fork } from "child_process";

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = setIO(server);

const hostPort = process.env.APP_HOST_PORT || 8080;
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};

admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json"),
});

app.set("view engine", "ejs");
// Increase the limit here (e.g., 10mb or more depending on your needs)
app.use(compression());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors(corsOptions));

// setupGraphQL(app);
// Middleware to add 'info' globally to every response
app.use(async (req, res, next) => {
  const originalJson = res.json;
  const currentUTCTime = moment().utc().format("YYYY-MM-DDTHH:mm:ss.SSS");
  res.json = function (body) {
    // Add the 'info' object to the response
    const message = body.message || null;
    const caption = body.caption || null;
    const pagination = body.pagination || null;
    if (body.message) delete body.message;
    if (body.caption) delete body.caption;
    if (body.pagination) delete body.pagination;
    body.info = body.info || {
      status: res.statusCode,
      response:
        res.statusCode >= 200 && res.statusCode < 300 ? "success" : "failed",
      timestamp: currentUTCTime,
      noTimeout: false,
      message: message,
      caption: caption,
      pagination: pagination,
    }; // Default value if not set
    return originalJson.call(this, body);
  };
  next();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  return res.status(500).json({ error: err.message });
});

// app.get("/debug-env", (req, res) => {
//   // DO NOT do this in production! It exposes secrets.
//   // This is just for a 5-minute test to see if vars are loading.
//   res.json({
//     DATABASE_LOADED: !!process.env.DB_HOST,
//     FIREBASE_LOADED: !!process.env.FIREBASE_API_KEY,
//     PORT_INTERNAL: process.env.APP_HOST_PORT,
//     NODE_ENV: process.env.NODE_ENV,
//     REDIS: process.env.REDIS_HOST,
//   });
// });

// Define API calls
app.use("/api", Routes);

app.use("*", (req, res) => {
  console.log("No route matched, hit the catch-all handler");
  res.status(404).json({
    message: "ACCESS UNAUTHORIZED!",
  });
});

if (process.env.START_SERVER !== "false") {
  server.listen(hostPort, "0.0.0.0", () => {
    console.info("Server listening on port " + hostPort);
    const values = {
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_SERVER: process.env.DB_SERVER,
    };
    console.info(JSON.stringify(values));
  });
}

// start workers
if (process.env.RUN_WORKERS !== "false") {
  import("./workers.js")
    .then(() => console.log("Workers bootstrapped"))
    .catch((err) => console.error("Worker failed", err));
}

// Export the Express application to be used by Google Cloud Functions.
export { app, io };

export const handler = async (event, context) => {
  // Handle the incoming request
  await app(event, context);
};
