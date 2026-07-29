import express from "express";
const router = express.Router();
import {
  list,
  create,
  update,
  invite,
  searchUserByEmail,
} from "../../controller/employee.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/list", list);
router.post("/create", create);
router.post("/:id/update", update);
router.post("/:id/invite", invite);
router.post("/search-user-by-email", searchUserByEmail);

export default router;
