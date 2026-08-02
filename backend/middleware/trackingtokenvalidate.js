import trackingAuthService from "../service/tracking-auth.service.js";

function authFail(res, code, message, status = 401) {
  return res.status(status).json({
    code,
    message: message || "Unauthorized",
  });
}

/**
 * Auth for timesheet-activity location endpoints.
 * Expects Authorization: Bearer mttrk_…
 * Does not use Firebase ID tokens or FCM.
 */
const TrackingTokenValidate = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      req.body = {};
    }

    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];
    const raw =
      authHeader && String(authHeader).startsWith("Bearer ")
        ? String(authHeader).slice(7).trim()
        : null;

    if (!raw) {
      return authFail(
        res,
        "TRACKING_TOKEN_MISSING",
        "Tracking Authorization Bearer token required",
      );
    }

    const result = await trackingAuthService.verifyTrackingToken(raw);
    if (!result.success) {
      return authFail(
        res,
        result.code || "TRACKING_TOKEN_INVALID",
        result.message || "Unauthorized",
      );
    }

    req.user = result.user;
    req.body.user = result.user;
    req.trackingToken = raw;

    const orgCode =
      req.body?.organisationCode ||
      req.body?.organisation_code ||
      req.headers["ms-organisation-code"] ||
      null;
    if (orgCode) {
      req.body.orgCode = orgCode;
      req.body.organisationCode = orgCode;
    }

    return next();
  } catch (err) {
    console.error("TrackingTokenValidate error:", err?.message || err);
    return authFail(res, "TRACKING_TOKEN_INVALID", "Unauthorized");
  }
};

export default TrackingTokenValidate;
