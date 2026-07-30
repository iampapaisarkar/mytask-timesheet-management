import express from "express";
import {
  list,
  eligible,
  create,
  markPaid,
} from "../../controller/payout.controller.js";

const router = express.Router();

router.get("/list", list);
router.get("/eligible", eligible);
router.post("/create", create);
router.post("/:id/mark-paid", markPaid);

export default router;
