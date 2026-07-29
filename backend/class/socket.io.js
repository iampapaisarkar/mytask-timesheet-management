// services/socket.io.js
import { getIO } from "../functions/socket-registry.js";

export const SocketIO = {
  /**
   * Send realtime message to multiple users
   * @param {number[]} userIds
   * @param {object} dataMessage
   */
  sendMessage: async (userIds, dataMessage) => {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return { success: false, message: "No userIds provided" };
      }

      const io = getIO();
      const rooms = userIds.map((id) => `user:${id}`);

      // 🔥 non-blocking emit
      process.nextTick(() => {
        io.to(rooms).emit("receiveMessage", dataMessage);
      });

      return { success: true };
    } catch (err) {
      console.error("Socket sendMessage error:", err);
      return { success: false };
    }
  },

  /**
   * Send notification to multiple users
   * @param {number[]} userIds
   * @param {object} notification
   */
  sendNotification: async (userIds, notification) => {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return { success: false, message: "No userIds provided" };
      }

      const io = getIO();
      const rooms = userIds.map((id) => `user:${id}`);

      // 🔥 fire-and-forget (NO await, NO DB)
      process.nextTick(() => {
        io.to(rooms).emit("receiveNotification", notification);
      });

      return { success: true };
    } catch (err) {
      console.error("Socket sendNotification error:", err);
      return { success: false };
    }
  },
};
