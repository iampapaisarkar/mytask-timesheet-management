import express from "express";
const router = express.Router();
import {
  login,
  signup,
  logout,
  authUser,
  updateProfile,
  updateFCMToken,
  forgotPassword,
  verifyOrganisationInvitationToken,
  issueTrackingToken,
} from "../../controller/auth.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";

router.post("/login", login);
router.post("/signup", signup);
router.post("/forgot-password", forgotPassword);
router.post(
  "/verify-organisation-invitation-token",
  verifyOrganisationInvitationToken
);
router.post("/logout", TokenValidate, logout);
router.get("/user", TokenValidate, authUser);
router.post("/update-profile", TokenValidate, updateProfile);
router.post("/update-fcm-token", TokenValidate, updateFCMToken);
router.post("/tracking-token", TokenValidate, issueTrackingToken);

export default router;
