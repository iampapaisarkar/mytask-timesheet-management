import express from "express";
const router = express.Router();
import {
  list,
  get,
  getDay,
  save,
  submitForApproval,
} from "../../controller/timesheet.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/list", list);
router.get("/:id/get", get);
router.get("/:id/get-day", getDay);
router.post("/:id/save", save);
router.post("/:id/submit-for-approval", submitForApproval);

export default router;
