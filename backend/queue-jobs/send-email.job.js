import { mailQueue } from "../queue/email.queue.js";
import { NodeMailer } from "#nodemailer";

/**
 * Prefer queue; if Redis/queue is down, send immediately so auth emails still go out.
 */
export async function enqueueSendEmail({
  user,
  organisation,
  userEmails,
  message,
  immediate = false,
}) {
  if (immediate) {
    return sendEmailNow({ user, organisation, userEmails, message });
  }

  try {
    await mailQueue.add(
      "send-mail",
      {
        user,
        organisation,
        userEmails,
        message,
      },
      {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    return { queued: true };
  } catch (err) {
    console.error(
      "Email queue unavailable, sending immediately:",
      err?.message || err,
    );
    return sendEmailNow({ user, organisation, userEmails, message });
  }
}

export async function sendEmailNow({
  user,
  organisation,
  userEmails,
  message,
}) {
  const response = await NodeMailer.send(
    user,
    organisation,
    userEmails,
    message,
  );
  if (!response?.success) {
    throw new Error(response?.message || "Failed to send email");
  }
  return { queued: false, sent: true, data: response.data };
}
