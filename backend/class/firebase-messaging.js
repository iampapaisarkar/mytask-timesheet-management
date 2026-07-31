import moment from "moment";
import admin from "firebase-admin";
import models from "../models/index.js";
import { Op } from "sequelize";
import { SocketIO } from "#socketio";
import externalApiLogService from "../service/external-api-log.service.js";
import { resolveAuditOrganisation } from "../service/audit/audit-context.service.js";

const { FcmConnections, Notifications, NotificationStatus } = models;

/** FCM errors that mean the stored device token should be removed. */
const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

function logFcm(result, { success, error, durationMs, feature, user, organisation, friendlyMessage }) {
  void externalApiLogService
    .storeExternalApiCallLog(
      user || null,
      organisation || null,
      "FCM",
      "firebase.messaging.sendEachForMulticast",
      "POST",
      { feature },
      "application/json",
      result || null,
      {
        apiName: "Firebase Cloud Messaging",
        feature: feature || "Notifications",
        success,
        error,
        durationMs,
        statusCode: success ? 200 : 500,
        friendlyMessage: friendlyMessage || null,
      },
    )
    .catch(() => {});
}

async function resolveFcmAuditContext(context = {}, userIds = []) {
  const user = context.user || null;
  let organisation = context.organisation || null;
  if (!organisation?.id) {
    const seedUserId =
      user?.id ||
      (Array.isArray(userIds) && userIds.length ? userIds[0] : null);
    organisation = await resolveAuditOrganisation(organisation, seedUserId);
  }
  return { user, organisation };
}

function fcmErrorCode(response) {
  return (
    response?.error?.code ||
    response?.error?.errorInfo?.code ||
    null
  );
}

/**
 * Delete stale FCM tokens that Firebase rejected as unregistered/invalid.
 * Returns how many rows were removed.
 */
async function pruneStaleFcmTokens(tokens = [], responses = []) {
  const stale = [];
  responses.forEach((response, index) => {
    if (response?.success) return;
    const code = fcmErrorCode(response);
    if (code && STALE_TOKEN_CODES.has(code) && tokens[index]) {
      stale.push(tokens[index]);
    }
  });
  if (!stale.length) return 0;
  return FcmConnections.destroy({
    where: { token: { [Op.in]: [...new Set(stale)] } },
  });
}

/**
 * Multicast is a success when at least one token delivered.
 * All-stale tokens (after prune) is also not a hard API failure — push path worked,
 * devices were simply gone.
 */
function summarizeMulticastResult(result, prunedCount = 0) {
  const successCount = Number(result?.successCount) || 0;
  const failureCount = Number(result?.failureCount) || 0;
  const success = successCount > 0 || failureCount === 0;
  let message = null;
  if (successCount > 0 && failureCount > 0) {
    message = `Delivered to ${successCount} device(s); ${failureCount} stale/invalid token(s)${
      prunedCount ? ` (removed ${prunedCount})` : ""
    }.`;
  } else if (successCount === 0 && failureCount > 0) {
    message = `No devices delivered; ${failureCount} stale/invalid token(s)${
      prunedCount ? " removed" : ""
    }.`;
  }
  return {
    success,
    // Only mark System Logs as failed when Firebase rejected the request entirely
    // or every token failed for a non-stale reason with zero deliveries.
    logSuccess: success || prunedCount === failureCount,
    errorMessage: message,
  };
}

async function handleMulticastResult(result, tokens, startedAt, feature, audit) {
  const prunedCount = await pruneStaleFcmTokens(tokens, result?.responses || []);
  const summary = summarizeMulticastResult(result, prunedCount);
  if (result?.failureCount > 0) {
    for (const r of result.responses || []) {
      if (r.error) {
        console.error("FCM notification error:", r.error.code, r.error.message);
      }
    }
  }
  logFcm(result, {
    success: summary.logSuccess,
    durationMs: Date.now() - startedAt,
    feature,
    friendlyMessage: summary.errorMessage
      ? summary.errorMessage
      : summary.logSuccess
        ? "Firebase Cloud Messaging delivered successfully."
        : null,
    error: summary.logSuccess
      ? null
      : {
          message:
            summary.errorMessage ||
            `${result?.failureCount || 0} FCM token(s) failed`,
        },
    ...audit,
  });
  return summary;
}

export const FirebaseMessaging = {
  /**
   * 🔔 SEND DATA MESSAGE (background / silent push)
   * Used mostly for background sync
   * @param {object} [context] optional { user, organisation } for System Logs External tab
   */
  sendMessage: async (userIds = [], message = {}, context = {}) => {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0 || !message) {
        return { success: false };
      }

      const audit = await resolveFcmAuditContext(context, userIds);

      // Fetch all tokens once
      const userFcms = await FcmConnections.findAll({
        where: {
          user_id: { [Op.in]: userIds },
        },
        raw: true,
      });

      const tokens = userFcms.map((f) => f.token);
      if (tokens.length === 0) return { success: true };

      const payload = {
        tokens,
        data: message,
        android: { priority: "high" },
        apns: {
          headers: {
            "apns-push-type": "background",
            "apns-priority": "5",
          },
          payload: {
            aps: { "content-available": 1 },
          },
        },
      };

      // 🔥 fire-and-forget batch send
      const startedAt = Date.now();
      admin
        .messaging()
        .sendEachForMulticast(payload)
        .then((result) =>
          handleMulticastResult(result, tokens, startedAt, "Push Data Message", audit),
        )
        .catch((err) => {
          console.error("FCM data message error:", err.message);
          logFcm(null, {
            success: false,
            error: err,
            durationMs: Date.now() - startedAt,
            feature: "Push Data Message",
            ...audit,
          });
        });

      return { success: true };
    } catch (error) {
      console.error("FCM sendMessage error:", error);
      return { success: false };
    }
  },

  /**
   * 🔔 SEND NOTIFICATION (DB + socket for ALL users; FCM when tokens exist)
   * @param {object} [context] optional { user, organisation } for System Logs External tab
   */
  sendNotification: async (userIds = [], message = {}, url = null, context = {}) => {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0 || !message) {
        return { success: false };
      }

      const uniqueUserIds = [
        ...new Set(userIds.map((id) => Number(id)).filter((id) => id > 0)),
      ];
      if (uniqueUserIds.length === 0) return { success: false };

      const audit = await resolveFcmAuditContext(context, uniqueUserIds);

      const userFcms = await FcmConnections.findAll({
        where: {
          user_id: { [Op.in]: uniqueUserIds },
        },
        raw: true,
      });

      const tokensByUser = userFcms.reduce((acc, { user_id, token }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(token);
        return acc;
      }, {});

      const currentUtcDatetime = moment.utc();
      const status = await NotificationStatus.findOne({
        where: { code: "unread" },
        raw: true,
      });

      // Persist + socket for every target user (including users without FCM tokens)
      for (const userId of uniqueUserIds) {
        let notification = await Notifications.create({
          user_id: userId,
          title: message.title,
          body: message.body,
          url,
          sent_at: currentUtcDatetime,
          status_id: status.id,
          created_at: currentUtcDatetime,
        });

        notification = notification.dataValues;
        notification.status = status;

        SocketIO.sendNotification([Number(userId)], notification);

        const tokens = tokensByUser[userId] || [];
        if (tokens.length === 0) continue;

        const payload = {
          tokens,
          notification: {
            title: message.title,
            body: message.body,
          },
          android: {
            priority: "high",
            notification: { sound: "default" },
          },
          apns: {
            payload: {
              aps: { sound: "default" },
            },
          },
          data: {
            url: url ? String(url) : "/",
            id: String(notification.id),
            title: String(message.title || ""),
            body: String(message.body || ""),
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        };

        const startedAt = Date.now();
        // Prefer recipient org when sender org missing (multi-tenant attribution)
        const recipientAudit =
          audit.organisation?.id
            ? audit
            : {
                user: audit.user,
                organisation: await resolveAuditOrganisation(null, userId),
              };

        admin
          .messaging()
          .sendEachForMulticast(payload)
          .then((result) =>
            handleMulticastResult(
              result,
              tokens,
              startedAt,
              "Send Notification",
              recipientAudit,
            ),
          )
          .catch((err) => {
            console.error("FCM notification error:", err.message);
            logFcm(null, {
              success: false,
              error: err,
              durationMs: Date.now() - startedAt,
              feature: "Send Notification",
              ...recipientAudit,
            });
          });
      }

      return { success: true };
    } catch (error) {
      console.error("FCM sendNotification error:", error);
      return { success: false };
    }
  },

  /**
   * 📱 STORE OR UPDATE FCM TOKEN
   */
  storeAndUpdateToken: async (
    userId = null,
    newToken = null,
    oldToken = null,
    platform = null
  ) => {
    try {
      if (!userId || !newToken || !platform) {
        return { success: false, message: "Missing parameters" };
      }

      const currentUtcDatetime = moment.utc();

      const exists = await FcmConnections.findOne({
        where: { user_id: userId, token: newToken },
        raw: true,
      });

      if (exists) {
        return { success: true };
      }

      if (oldToken) {
        const old = await FcmConnections.findOne({
          where: { user_id: userId, token: oldToken },
        });

        if (old) {
          old.token = newToken;
          old.last_updated_at = currentUtcDatetime;
          await old.save();
          return { success: true };
        }
      }

      await FcmConnections.create({
        user_id: userId,
        token: newToken,
        platform,
        created_at: currentUtcDatetime,
        last_updated_at: currentUtcDatetime,
      });

      return { success: true };
    } catch (error) {
      console.error("FCM store token error:", error);
      return { success: false };
    }
  },
};

export default FirebaseMessaging;
