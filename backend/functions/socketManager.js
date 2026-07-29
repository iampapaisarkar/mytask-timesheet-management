import { Server } from "socket.io";
import models from "../models/index.js";
const { Users } = models;
import { fn, col, literal, Op } from "sequelize";

let io;

export const setIO = (server) => {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: ["*"], // change to your frontend
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      const userId = socket.handshake.auth?.user_id || null;

      if (!token) throw new Error("Missing token");
      if (!userId) throw new Error("Missing user id");

      if (process.env.SOCKETIO_TOKEN !== token) {
        next(new Error("Unauthorized"));
      }
      // console.log("SOCKET IO AUTH::", socket.handshake.auth);

      const user = await Users.findOne({
        where: {
          id: userId,
        },
        raw: true,
      });

      if (!user) {
        next(new Error("Unauthorized"));
      }

      socket.user = {
        id: user.id,
      };
      next();
    } catch (err) {
      console.error("Socket auth failed:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  // Connection event
  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log(`✅ User ${userId} connected [${socket.id}]`);

    // Join user room
    socket.join(`user:${userId}`);

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User ${userId} disconnected [${socket.id}]`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
