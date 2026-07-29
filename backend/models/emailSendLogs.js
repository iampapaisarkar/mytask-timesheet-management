import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EmailSendLogs = db.define(
  "EmailSendLogs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subject: {
      type: DataTypes.STRING,
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    },
    template: {
      type: DataTypes.STRING,
    },
    body: {
      type: DataTypes.TEXT,
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    },
    email_to: {
      type: DataTypes.TEXT,
    },
    sent_by: {
      type: DataTypes.STRING,
    },
    sent_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "email_send_logs", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

export default EmailSendLogs;
