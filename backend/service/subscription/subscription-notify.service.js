import moment from "moment";
import models from "../../models/index.js";
import { enqueueSendEmail } from "../../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../../queue-jobs/send-notification.job.js";
import subscriptionService from "./subscription.service.js";

const { Users, SubscriptionNotifications } = models;

function nowUtc() {
  return moment().utc().format();
}

/**
 * Send in-app notification always; email only when user has Pro email_notifications.
 */
export async function notifySubscriptionEvent({
  userId,
  subscriptionId,
  type,
  title,
  body,
  metadata,
}) {
  const user = await Users.findByPk(userId);
  if (!user) return { success: false, message: "User not found" };

  const canEmail = await subscriptionService.canSendEmailNotifications(userId);
  const channel = canEmail ? "both" : "in_app";

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

  if (canEmail && user.email) {
    const appName = process.env.APP_NAME || "myTask";
    try {
      await enqueueSendEmail({
        user,
        organisation: null,
        userEmails: [user.email],
        message: {
          subject: `${appName} - ${title}`,
          template: "subscription-notification.html",
          variables: {
            title,
            message: body || title,
            button_url: `${process.env.CLIENT_URL || ""}/subscription`,
            button_label: "View subscription",
          },
        },
      });
    } catch (err) {
      console.error("subscription email notify failed:", err?.message || err);
    }
  }

  return { success: true, channel };
}

export default { notifySubscriptionEvent };
