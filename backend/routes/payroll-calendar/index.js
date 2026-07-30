import express from "express";
const router = express.Router();
import {
  list,
  create,
  // update,
} from "../../controller/payroll-calendar.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/list", list);
router.post("/create", create);
// router.post("/update", update);
// router.post("/:id/update", update);

export default router;
