import express from "express";
const router = express.Router();
import {
  notifications,
  markAs,
  markAllAs,
  sendServerNotification,
} from "../../controller/notification.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/list", TokenValidate, notifications);
router.post("/:id/mark-as", TokenValidate, markAs);
router.post("/mark-all-as", TokenValidate, markAllAs);
router.post("/send", TokenValidate, sendServerNotification);

export default router;
