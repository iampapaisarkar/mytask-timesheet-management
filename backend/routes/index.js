import express from "express";
const router = express.Router();
import TokenValidate from "../middleware/tokenvalidate.js";
import OrganisationValidate from "../middleware/organisationvalidate.js";
import Auth from "./auth/index.js";
import organisation from "./organisation/index.js";
import timesheet from "./timesheet/index.js";
import timesheetManagement from "./timesheet-management/index.js";
import employee from "./employee/index.js";
import customer from "./customer/index.js";
import job from "./job/index.js";
import holidayCalendar from "./holiday-calendar/index.js";
import payrollCalendar from "./payroll-calendar/index.js";
import system from "./system/index.js";
import Notification from "./notifications/index.js";
import TimesheetActivity from "./timesheet-activity/index.js";
import Report from "./report/index.js";
import screens from "./screens/index.js";
import payout from "./payout/index.js";
import { SocketIO } from "#socketio";
import { NodeMailer } from "#nodemailer";
import { FirebaseMessaging } from "#firebasemessaging";

import models from "../models/index.js";
const { Users } = models;

// Public routes
router.use("/auth", Auth);

router.use("/organisations", TokenValidate, organisation);
router.use("/timesheets", TokenValidate, OrganisationValidate, timesheet);
router.use(
  "/timesheet-management",
  TokenValidate,
  OrganisationValidate,
  timesheetManagement,
);
router.use("/employees", TokenValidate, OrganisationValidate, employee);
router.use("/customers", TokenValidate, OrganisationValidate, customer);
router.use("/jobs", TokenValidate, OrganisationValidate, job);
router.use(
  "/holiday-calendars",
  TokenValidate,
  OrganisationValidate,
  holidayCalendar,
);
router.use(
  "/payroll-calendars",
  TokenValidate,
  OrganisationValidate,
  payrollCalendar,
);
router.use("/payouts", TokenValidate, OrganisationValidate, payout);
router.use("/system", TokenValidate, system);
router.use("/notifications", TokenValidate, Notification);
router.use("/timesheet-activity", TimesheetActivity);
router.use("/reports", TokenValidate, OrganisationValidate, Report);
router.use("/screens", TokenValidate, screens);

mountTestRoutes(router);

export default router;

function mountTestRoutes(target) {
  const enabled =
    process.env.ENABLE_TEST_ROUTES === "true" ||
    process.env.NODE_ENV !== "production";
  if (!enabled) return;

  target.get("/mail-test", async (req, res) => {
    const { email = null } = req.query;
    const appName = process.env.APP_NAME || "myTask";

    if (!email) {
      return res.status(400).json({
        message: "Pass ?email=you@example.com to send a test message",
      });
    }

    try {
      const message = {
        subject: `${appName} - Mail test`,
        template: "forgot-password.html",
        variables: {
          title: `${appName} mail test`,
          message:
            "If you can read this, myTask SMTP delivery is working with the updated templates.",
          button_url: process.env.CLIENT_URL || "http://localhost:9000/",
          button_label: "Open myTask",
        },
      };
      const response = await NodeMailer.send(
        { email },
        null,
        [email],
        message,
      );

      res.json({ response });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  target.get("/socket-io-test", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(500).json({
        message: "User ID is required!",
      });
    }

    try {
      let message = {};
      message = {
        name: "Papai Sarkar",
      };

      const response = await SocketIO.sendMessage([user_id], message);

      res.json({ response });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  target.get("/firebase-notification-test", async (req, res) => {
    const { user_id, url } = req.query;

    try {
      let message = {
        title: "Test Notification",
        body: "Ignore this is test notification",
      };

      const response = await FirebaseMessaging.sendNotification(
        [user_id],
        message,
        url,
      );

      res.json({ response });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  target.get("/firebase-messaging-test", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(500).json({
        message: "User Id is required!",
      });
    }

    try {
      let message = {
        title: "myTask test data message",
      };

      const response = await FirebaseMessaging.sendMessage([user_id], message);

      res.json({ response });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
