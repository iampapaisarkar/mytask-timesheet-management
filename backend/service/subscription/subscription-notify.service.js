/**
 * Send in-app notification always.
 * Billing lifecycle emails (expiry / payment failure / ended) always email
 * even after downgrade to Free — otherwise users would never get the reason.
 * Other subscription emails still respect Pro email_notifications.
 */
import moment from "moment";
import models from "../../models/index.js";
import { enqueueSendEmail } from "../../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../../queue-jobs/send-notification.job.js";
import subscriptionService from "./subscription.service.js";
import { SUBSCRIPTION_NOTIFICATION_TYPES } from "../../config/subscription.config.js";

const { Users, SubscriptionNotifications } = models;

const ALWAYS_EMAIL_TYPES = new Set([
  SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_7_DAYS,
  SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_3_DAYS,
  SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_1_DAY,
  SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRED,
  SUBSCRIPTION_NOTIFICATION_TYPES.PAYMENT_FAILED,
  SUBSCRIPTION_NOTIFICATION_TYPES.PLAN_CANCELLED,
]);

function nowUtc() {
  return moment().utc().format();
}

export async function notifySubscriptionEvent({
  userId,
  subscriptionId,
  type,
  title,
  body,
  metadata,
  forceEmail = false,
}) {
  const user = await Users.findByPk(userId);
  if (!user) return { success: false, message: "User not found" };

  const canEmailPro = await subscriptionService.canSendEmailNotifications(userId);
  const shouldEmail =
    Boolean(forceEmail) || ALWAYS_EMAIL_TYPES.has(type) || canEmailPro;
  const channel = shouldEmail ? "both" : "in_app";

  await SubscriptionNotifications.create({
    user_id: userId,
    subscription_id: subscriptionId || null,
    notification_type: type,
    channel,
    title,
    body: body || null,
    sent_at: nowUtc(),
    metadata: metadata || null,
    created_at: nowUtc(),
  });

  try {
    await enqueueSendNotification({
      user: user.toJSON ? user.toJSON() : user,
      sentToUserIds: [userId],
      message: { title, body: body || title },
      url: "/subscription",
    });
  } catch (err) {
    console.error("subscription in-app notify failed:", err?.message || err);
  }

  if (shouldEmail && user.email) {
    const appName = process.env.APP_NAME || "myTask";
    try {
      await enqueueSendEmail({
        user,
        organisation: null,
        userEmails: [user.email],
        message: {
          subject: `${appName} - ${title}`,
          template: "subscription-notification.html",
          feature: "Billing",
          variables: {
            title,
            message: body || title,
            button_url: `${process.env.CLIENT_URL || ""}/subscription`,
            button_label: "View subscription",
          },
        },
        immediate: Boolean(forceEmail) || ALWAYS_EMAIL_TYPES.has(type),
      });
    } catch (err) {
      console.error("subscription email notify failed:", err?.message || err);
    }
  }

  return { success: true, channel };
}

export default { notifySubscriptionEvent };
