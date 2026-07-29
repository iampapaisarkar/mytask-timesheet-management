import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { EmailSendLogs } = models;
import moment from "moment";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

async function storeEmailSendLog(user, organisation, emails, message) {
  try {
    const currentUTCTime = moment().utc().format();

    await EmailSendLogs.create({
      subject: message?.subject,
      template: message?.template,
      body: message?.variables?.message,
      email_to: emails?.length ? JSON.stringify(emails) : null,
      sent_by: user ? user?.email : null,
      sent_at: currentUTCTime,
    });
    return true;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to store mail log!", 500);
  }
}

export default {
  storeEmailSendLog,
};
