import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { ExternalApiCallLogs } = models;
import moment from "moment";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

async function storeExternalApiCallLog(
  user,
  organisation,
  platform,
  url,
  method,
  body,
  contentType,
  response
) {
  try {
    const currentUTCTime = moment().utc().format();

    await ExternalApiCallLogs.create({
      orgnisaion_id: organisation?.id || "unknown",
      user_id: user?.id || "unknown",
      platform: platform || "unknown",
      url: url || "unknown",
      method: method || "unknown",
      body: body || "unknown",
      content_type: contentType || "unknown",
      response: response || "unknown",
      executed_at: currentUTCTime,
    });
    return true;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to store external api call log!", 500);
  }
}

export default {
  storeExternalApiCallLog,
};
