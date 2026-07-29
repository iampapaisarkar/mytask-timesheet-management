import { mailQueue } from "../queue/email.queue.js";

export async function enqueueSendEmail({
  user,
  organisation,
  userEmails,
  message,
}) {
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
    }
  );
}
