import Auth from "#auth";

function authFail(res, code, message, status = 401) {
  return res.status(status).json({
    code,
    message: message || "Unauthorized",
  });
}

const TokenValidate = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      req.body = {};
    }

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    const orgCode = req.headers["ms-organisation-code"] || null;
    const orgId = req.headers["ms-organisation-id"] || null;
    const orgName = req.headers["ms-organisation-name"] || null;

    if (!token) {
      return authFail(res, "AUTH_MISSING", "Authorization Bearer token required");
    }

    const result = await Auth.verifyIdTokenAndResolveUser(token, {
      touchSession: true,
      orgCode,
      logFeature: "Request Auth Verify ID Token",
      meta: {
        platform: req.body?.platform || req.headers["x-client-platform"] || null,
        user_agent: req.headers["user-agent"] || null,
      },
    });

    if (!result.success) {
      return authFail(
        res,
        result.code || "AUTH_INVALID",
        result.message || "Unauthorized",
      );
    }

    const user = { ...result.user, token };
    req.user = user;
    req.body.user = user;
    if (orgCode) {
      req.body.orgCode = orgCode;
      req.body.orgId = orgId;
      req.body.orgName = orgName;
    }
    return next();
  } catch (err) {
    console.error("TokenValidate error:", err?.message || err);
    return authFail(res, "AUTH_INVALID", "Unauthorized");
  }
};

export default TokenValidate;
