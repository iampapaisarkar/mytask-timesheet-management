import express from "express";
import {
  listInternal,
  listExternal,
  listEmail,
  summary,
  getDetail,
  exportCsv,
} from "../../controller/system-logs.controller.js";

const router = express.Router();

router.get("/summary", summary);
router.get("/internal", listInternal);
router.get("/external", listExternal);
router.get("/email", listEmail);
router.get("/export", exportCsv);
router.get("/:type/:id", getDetail);

export default router;
