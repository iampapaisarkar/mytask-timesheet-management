import express from "express";
const router = express.Router();
import {
  list,
  create,
  update,
} from "../../controller/award-rate.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.get("/list", list);
router.post("/create", create);
router.post("/:id/update", update);

export default router;
