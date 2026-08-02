// class/socket.io.js — Socket Gateway emit API
import { Emitter } from "@socket.io/redis-emitter";
import { getIO, tryGetIO } from "../functions/socket-registry.js";
import { pubClient } from "../functions/redis-registry.js";
import { isRedisDisabled } from "../functions/redis-config.js";

let redisEmitter = null;

function getRedisEmitter() {
  if (isRedisDisabled()) return null;
  if (!redisEmitter) {
    redisEmitter = new Emitter(pubClient);
  }
  return redisEmitter;
}

function envelope(event, organisationId, data, extras = {}) {
  return {
    event,
    organisation_id: organisationId ?? null,
    entity_id: data?.id ?? extras.entity_id ?? null,
    actor_user_id: extras.actor_user_id ?? null,
    emitted_at: new Date().toISOString(),
    data: data ?? null,
  };
}

/**
 * Prefer in-process Socket.IO (API). Workers use Redis emitter so org rooms
 * on the API process still receive events (same Redis adapter channel).
 */
function emitSafe(withIo, withEmitter) {
  try {
    const io = tryGetIO();
    if (io) {
      process.nextTick(() => {
        try {
          withIo(io);
        } catch (err) {
          console.error("Socket emit (io) error:", err?.message || err);
        }
      });
      return { success: true };
    }

    const emitter = getRedisEmitter();
    if (emitter && typeof withEmitter === "function") {
      process.nextTick(() => {
        try {
          withEmitter(emitter);
        } catch (err) {
          console.error("Socket emit (redis) error:", err?.message || err);
        }
      });
      return { success: true, via: "redis-emitter" };
    }

    return { success: false, message: "Socket.io not initialized" };
  } catch (err) {
    console.error("Socket emit error:", err);
    return { success: false };
  }
}

export const SocketIO = {
  /**
   * Emit a typed domain event to organisation room.
   * Never emit using client-supplied org IDs from request without server validation —
   * callers must pass the organisation id resolved from OrganisationValidate.
   */
  emitToOrganisation: (organisationId, event, data, extras = {}) => {
    if (!organisationId || !event) {
      return { success: false, message: "organisationId and event required" };
    }
    const payload = envelope(event, Number(organisationId), data, extras);
    const room = `org:${organisationId}`;
    return emitSafe(
      (io) => {
        io.to(room).emit(event, payload);
      },
      (emitter) => {
        emitter.to(room).emit(event, payload);
      },
    );
  },

  emitToUsers: (userIds, event, data, extras = {}) => {
    if (!Array.isArray(userIds) || userIds.length === 0 || !event) {
      return { success: false, message: "userIds and event required" };
    }
    const rooms = userIds.map((id) => `user:${id}`);
    const payload = envelope(event, extras.organisation_id ?? null, data, extras);
    return emitSafe(
      (io) => {
        io.to(rooms).emit(event, payload);
      },
      (emitter) => {
        emitter.to(rooms).emit(event, payload);
      },
    );
  },

  emitToUser: (userId, event, data, extras = {}) => {
    return SocketIO.emitToUsers([userId], event, data, extras);
  },

  /**
   * Legacy + domain notification emit.
   * Emits `notification.created` and keeps `receiveNotification` for older clients.
   */
  sendNotification: async (userIds, notification) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, message: "No userIds provided" };
    }
    const payload = envelope("notification.created", null, notification);
    const rooms = userIds.map((id) => `user:${id}`);
    return emitSafe(
      (io) => {
        io.to(rooms).emit("notification.created", payload);
        io.to(rooms).emit("receiveNotification", notification);
      },
      (emitter) => {
        emitter.to(rooms).emit("notification.created", payload);
        emitter.to(rooms).emit("receiveNotification", notification);
      },
    );
  },

  sendMessage: async (userIds, dataMessage) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, message: "No userIds provided" };
    }
    const rooms = userIds.map((id) => `user:${id}`);
    return emitSafe(
      (io) => {
        io.to(rooms).emit("receiveMessage", dataMessage);
      },
      (emitter) => {
        emitter.to(rooms).emit("receiveMessage", dataMessage);
      },
    );
  },
};

export default SocketIO;
