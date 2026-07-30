import express from "express";
import {
  list,
  get,
  eligible,
  create,
  submit,
  approve,
  release,
  markPaid,
  cancel,
  adjust,
  exportCsv,
} from "../../controller/payout.controller.js";

const router = express.Router();

router.get("/list", list);
router.get("/eligible", eligible);
router.get("/export", exportCsv);
router.get("/:id", get);
router.post("/create", create);
router.post("/:id/submit", submit);
router.post("/:id/approve", approve);
router.post("/:id/release", release);
router.post("/:id/mark-paid", markPaid);
router.post("/:id/cancel", cancel);
router.post("/:id/adjust", adjust);

export default router;
