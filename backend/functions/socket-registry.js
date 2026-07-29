// functions/socket-registry.js
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient } from "./redis-registry.js";

let io;

export const setIO = (server) => {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: ["*"], // replace with frontend domain in prod
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"], // avoid long-polling overhead
  });

  // 🔥 Redis Adapter (CRITICAL)
  io.adapter(createAdapter(pubClient, subClient));

  // 🔐 Auth middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      const userId = socket.handshake.auth?.user_id;

      if (!token || !userId) {
        return next(new Error("Unauthorized"));
      }

      // simple token check (replace with JWT verify if needed)
      if (process.env.SOCKETIO_TOKEN !== token) {
        return next(new Error("Unauthorized"));
      }

      // attach user info (NO DB HIT)
      socket.user = { id: Number(userId) };

      next();
    } catch (err) {
      console.error("❌ Socket auth failed:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  // 🔌 Connection
  io.on("connection", (socket) => {
    const userId = socket.user.id;

    console.log(`✅ Socket connected: user=${userId}, socket=${socket.id}`);

    // room per user
    socket.join(`user:${userId}`);

    socket.on("disconnect", (reason) => {
      console.log(
        `❌ Socket disconnected: user=${userId}, socket=${socket.id}, reason=${reason}`
      );
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
