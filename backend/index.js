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
import correlationId from "./middleware/correlation-id.js";
import securityHeaders from "./middleware/security-headers.js";
import requestLogger from "./middleware/request-logger.js";
import rateLimiter from "./middleware/rate-limiter.js";
import requestAudit from "./middleware/request-audit.js";
import errorHandler from "./middleware/error-handler.js";

dotenv.config();

const app = express();
const server = createServer(app);

const io = setIO(server);

const hostPort = process.env.APP_HOST_PORT || 8080;

/** Restrict CORS in production when CORS_ORIGINS is set (comma-separated). */
function buildCorsOptions() {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_URL || "";
  const origins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === "production" && origins.length > 0) {
    return {
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      optionsSuccessStatus: 200,
    };
  }
  return { origin: "*", optionsSuccessStatus: 200 };
}

admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json"),
});

app.set("view engine", "ejs");
app.set("trust proxy", 1);

app.use(correlationId);
app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimiter);
app.use(requestAudit);
app.use(compression());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors(buildCorsOptions()));

/**
 * Unified response envelope:
 * - Legacy: `info` (status, response, timestamp, message, pagination)
 * - Enterprise additive: success, errors, meta, requestId
 * Clients that only read `data` + `info` remain compatible.
 */
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const currentUTCTime = moment().utc().format("YYYY-MM-DDTHH:mm:ss.SSS");
  const startedAt = Date.now();

  res.json = function (body) {
    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? body
        : { data: body };

    const message = payload.message ?? null;
    const caption = payload.caption ?? null;
    const pagination = payload.pagination ?? null;
    if (Object.prototype.hasOwnProperty.call(payload, "message")) {
      delete payload.message;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "caption")) {
      delete payload.caption;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "pagination")) {
      delete payload.pagination;
    }

    const ok = res.statusCode >= 200 && res.statusCode < 300;

    payload.info = payload.info || {
      status: res.statusCode,
      response: ok ? "success" : "failed",
      timestamp: currentUTCTime,
      noTimeout: false,
      message,
      caption,
      pagination,
    };

    if (payload.success === undefined) payload.success = ok;
    if (payload.errors === undefined) {
      payload.errors = ok
        ? null
        : payload.details
          ? [{ message: String(payload.details) }]
          : message
            ? [{ message }]
            : null;
    }
    if (payload.meta === undefined) {
      payload.meta = pagination ? { pagination } : {};
    }
    if (payload.meta && typeof payload.meta === "object") {
      payload.meta.durationMs = Date.now() - startedAt;
    }
    if (payload.requestId === undefined) {
      payload.requestId = req.requestId || null;
    }
    // Surface message at top-level for enterprise consumers (info.message also set)
    if (payload.message === undefined && message != null) {
      payload.message = message;
    }

    return originalJson(payload);
  };
  next();
});

app.use("/api", Routes);

app.use("*", (req, res) => {
  console.log("No route matched, hit the catch-all handler");
  res.status(404).json({
    message: "ACCESS UNAUTHORIZED!",
  });
});

/** Must be last — catches next(err) from routes/middleware. */
app.use(errorHandler);

if (process.env.START_SERVER !== "false") {
  server.listen(hostPort, "0.0.0.0", () => {
    console.info("Server listening on port " + hostPort);
    // Never log DB credentials
    console.info(
      JSON.stringify({
        DB_NAME: process.env.DB_NAME ? "[set]" : "[missing]",
        DB_USER: process.env.DB_USER ? "[set]" : "[missing]",
        DB_HOST: process.env.DB_HOST || process.env.DB_SERVER || "[missing]",
      }),
    );
  });
}

if (process.env.RUN_WORKERS !== "false") {
  import("./workers.js")
    .then(() => console.log("Workers bootstrapped"))
    .catch((err) => console.error("Worker failed", err));
}

export { app, io };

export const handler = async (event, context) => {
  await app(event, context);
};
