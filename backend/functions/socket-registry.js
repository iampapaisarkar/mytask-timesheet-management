// functions/socket-registry.js — centralized Socket.IO gateway
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient } from "./redis-registry.js";
import Auth from "#auth";
import models from "../models/index.js";

const { UserOrganisationRoles } = models;

let io;

function parsePositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function userBelongsToOrganisation(userId, organisationId) {
  const row = await UserOrganisationRoles.findOne({
    where: {
      user_id: userId,
      organisation_id: organisationId,
    },
    attributes: ["id"],
    raw: true,
  });
  return Boolean(row);
}

/**
 * Initialize Socket.IO on the HTTP server.
 * Auth: Firebase Admin ID token (same as REST TokenValidate).
 * Rooms: user:{id} always; org:{id} only after membership validation.
 */
export const setIO = (server) => {
  const allowedOrigins = (process.env.SOCKETIO_CORS_ORIGINS || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigins.includes("*") ? true : allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Prefer websocket; allow polling fallback for mobile / proxy networks
    transports: ["websocket", "polling"],
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      // Optional shared secret for service/test clients (does NOT trust user_id alone)
      const socketioToken = process.env.SOCKETIO_TOKEN;
      const isServiceToken =
        Boolean(socketioToken) && token === socketioToken;

      if (isServiceToken) {
        const userId = parsePositiveInt(socket.handshake.auth?.user_id);
        if (!userId) {
          return next(new Error("Unauthorized"));
        }
        socket.user = { id: userId, service: true };
        socket.token = token;
        return next();
      }

      const verified = await Auth.verifyIdTokenAndResolveUser(token, {
        touchSession: true,
        meta: { platform: "socket" },
      });
      if (!verified?.success || !verified.user?.id) {
        return next(new Error(verified?.code || "Unauthorized"));
      }

      // Never trust client-provided user_id — always use DB-resolved user
      socket.user = {
        id: Number(verified.user.id),
        email: verified.user.email || null,
      };
      socket.token = token;
      next();
    } catch (err) {
      console.error("Socket auth failed:", err?.message || err);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    socket.data.orgRooms = new Set();

    console.log(`Socket connected: user=${userId}, socket=${socket.id}`);

    // Optional org join from handshake (still validated)
    const handshakeOrgId = parsePositiveInt(
      socket.handshake.auth?.organisation_id,
    );
    if (handshakeOrgId) {
      void joinOrgRoom(socket, handshakeOrgId);
    }

    socket.on("org.join", async (payload = {}, ack) => {
      try {
        const organisationId = parsePositiveInt(payload.organisation_id);
        if (!organisationId) {
          const err = { message: "organisation_id required" };
          socket.emit("org.error", err);
          if (typeof ack === "function") ack({ success: false, ...err });
          return;
        }
        const result = await joinOrgRoom(socket, organisationId);
        if (typeof ack === "function") ack(result);
      } catch (err) {
        const message = err?.message || "Unable to join organisation room";
        socket.emit("org.error", { message });
        if (typeof ack === "function") ack({ success: false, message });
      }
    });

    socket.on("org.leave", (payload = {}, ack) => {
      const organisationId = parsePositiveInt(payload.organisation_id);
      if (organisationId) {
        const room = `org:${organisationId}`;
        socket.leave(room);
        socket.data.orgRooms?.delete(room);
        socket.emit("org.left", { organisation_id: organisationId, room });
      }
      if (typeof ack === "function") {
        ack({ success: true, organisation_id: organisationId });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: user=${userId}, socket=${socket.id}, reason=${reason}`,
      );
    });
  });

  return io;
};

async function joinOrgRoom(socket, organisationId) {
  const allowed = await userBelongsToOrganisation(socket.user.id, organisationId);
  if (!allowed) {
    const err = { success: false, message: "Not a member of this organisation" };
    socket.emit("org.error", err);
    return err;
  }

  // Leave previous org rooms so a session is only in one org at a time
  for (const room of socket.data.orgRooms || []) {
    socket.leave(room);
  }
  socket.data.orgRooms = new Set();

  const room = `org:${organisationId}`;
  socket.join(room);
  socket.data.orgRooms.add(room);
  socket.emit("org.joined", { organisation_id: organisationId, room });
  return { success: true, organisation_id: organisationId, room };
}

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export const tryGetIO = () => io || null;
