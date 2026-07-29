// middleware/cronvalidate.js
import getLocaleMessage from "../functions/locale.js";

export default function CronValidate(req, res, next) {
  const cronSecret = process.env.CRON_SECRET;
  const incomingSecret = req.headers["x-cron-secret"];

  if (!incomingSecret || incomingSecret !== cronSecret) {
    return res.status(403).json({
      success: false,
      message: getLocaleMessage(locale, "UNAUTHORIZED_CRON_ACCESS"),
    });
  }

  next();
}
