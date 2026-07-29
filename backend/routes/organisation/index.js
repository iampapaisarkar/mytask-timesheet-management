import express from "express";
const router = express.Router();
import {
  list,
  get,
  create,
  update,
  updateSettings,
  orgniastionInvitations,
  acceptInvitation,
  rejectInvitation,
} from "../../controller/organisation.controller.js";
import OrganisationValidate from "../../middleware/organisationvalidate.js";

router.get("/list", list);
router.get("/:orgCode/get", get);
router.post("/create", create);

router.post("/update", OrganisationValidate, update);
router.post("/update-settings", OrganisationValidate, updateSettings);

router.get("/organisation-invitations", orgniastionInvitations);
router.post("/accept-invitation", acceptInvitation);
router.post("/reject-invitation", rejectInvitation);

export default router;
