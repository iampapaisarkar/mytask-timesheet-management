// class/socket.io.js — Socket Gateway emit API
import { getIO, tryGetIO } from "../functions/socket-registry.js";

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

function emitSafe(fn) {
  try {
    const io = tryGetIO();
    if (!io) return { success: false, message: "Socket.io not initialized" };
    process.nextTick(fn);
    return { success: true };
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
    return emitSafe(() => {
      getIO().to(`org:${organisationId}`).emit(event, payload);
    });
  },

  emitToUsers: (userIds, event, data, extras = {}) => {
    if (!Array.isArray(userIds) || userIds.length === 0 || !event) {
      return { success: false, message: "userIds and event required" };
    }
    const rooms = userIds.map((id) => `user:${id}`);
    const payload = envelope(event, extras.organisation_id ?? null, data, extras);
    return emitSafe(() => {
      getIO().to(rooms).emit(event, payload);
    });
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
    return emitSafe(() => {
      const io = getIO();
      const rooms = userIds.map((id) => `user:${id}`);
      io.to(rooms).emit("notification.created", payload);
      // Legacy alias
      io.to(rooms).emit("receiveNotification", notification);
    });
  },

  sendMessage: async (userIds, dataMessage) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, message: "No userIds provided" };
    }
    return emitSafe(() => {
      const rooms = userIds.map((id) => `user:${id}`);
      getIO().to(rooms).emit("receiveMessage", dataMessage);
    });
  },
};

export default SocketIO;
