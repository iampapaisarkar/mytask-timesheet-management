import express from "express";
const router = express.Router();
import {
  list,
  get,
  getDay,
  create,
  save,
  submitForApproval,
  approve,
  reject,
  revert,
  employeePayrollCycles,
} from "../../controller/timesheet-management.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/list", list);
router.get("/:id/get", get);
router.get("/:id/get-day", getDay);
router.post("/create", create);
router.post("/:id/save", save);
router.post("/:id/submit-for-approval", submitForApproval);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/revert", revert);
router.get("/:employee_id/employee-payroll-cycles", employeePayrollCycles);

export default router;
