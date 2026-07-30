import admin from "firebase-admin";
import externalApiLogService from "../service/external-api-log.service.js";
import { resolveAuditContextByEmail } from "../service/audit/audit-context.service.js";

/**
 * Build continue URL for Firebase email action links.
 */
export function authActionContinueUrl(email) {
  const base = (process.env.CLIENT_URL || "http://localhost:9000/").replace(
    /\/?$/,
    "/",
  );
  return `${base}auth-actions?email=${encodeURIComponent(email)}`;
}

/**
 * Convert a Firebase oob link into our frontend auth-actions URL.
 */
export function toAppAuthActionLink(firebaseLink) {
  const base = (process.env.CLIENT_URL || "http://localhost:9000/").replace(
    /\/?$/,
    "/",
  );
  const urlParams = new URLSearchParams(firebaseLink.split("?")[1] || "");
  const mode = urlParams.get("mode");
  const oobCode = urlParams.get("oobCode");
  if (!mode || !oobCode) return firebaseLink;
  return `${base}auth-actions?mode=${encodeURIComponent(mode)}&oobCode=${encodeURIComponent(oobCode)}`;
}

function logFirebaseExternal({
  user,
  organisation,
  apiName,
  feature,
  endpoint,
  method = "POST",
  success,
  statusCode,
  durationMs,
  response,
  error,
  body,
}) {
  void externalApiLogService
    .storeExternalApiCallLog(
      user || null,
      organisation || null,
      "Firebase",
      endpoint,
      method,
      body || null,
      "application/json",
      response || null,
      {
        apiName,
        feature,
        success,
        statusCode,
        durationMs,
        error,
        technicalMessage: error
          ? String(error?.message || error)
          : undefined,
      },
    )
    .catch(() => {});
}

/**
 * Generate a password-reset link via Admin SDK.
 * Returns null when Admin credentials are unavailable/invalid.
 */
export async function generatePasswordResetAppLink(email) {
  const actionCodeSettings = {
    url: authActionContinueUrl(email),
    handleCodeInApp: true,
  };
  const startedAt = Date.now();
  const { user, organisation } = await resolveAuditContextByEmail(email);
  try {
    const firebaseLink = await admin
      .auth()
      .generatePasswordResetLink(email, actionCodeSettings);
    logFirebaseExternal({
      user,
      organisation,
      apiName: "Firebase Auth Admin",
      feature: "Password Reset Link",
      endpoint: "firebase.auth.generatePasswordResetLink",
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      response: { success: true },
      body: { email },
    });
    return toAppAuthActionLink(firebaseLink);
  } catch (err) {
    logFirebaseExternal({
      user,
      organisation,
      apiName: "Firebase Auth Admin",
      feature: "Password Reset Link",
      endpoint: "firebase.auth.generatePasswordResetLink",
      success: false,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      error: err,
      body: { email },
    });
    throw err;
  }
}

/**
 * Generate an email-verification link via Admin SDK.
 */
export async function generateEmailVerificationAppLink(email) {
  const actionCodeSettings = {
    url: authActionContinueUrl(email),
    handleCodeInApp: true,
  };
  const startedAt = Date.now();
  const { user, organisation } = await resolveAuditContextByEmail(email);
  try {
    const firebaseLink = await admin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);
    logFirebaseExternal({
      user,
      organisation,
      apiName: "Firebase Auth Admin",
      feature: "Email Verification Link",
      endpoint: "firebase.auth.generateEmailVerificationLink",
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      response: { success: true },
      body: { email },
    });
    return toAppAuthActionLink(firebaseLink);
  } catch (err) {
    logFirebaseExternal({
      user,
      organisation,
      apiName: "Firebase Auth Admin",
      feature: "Email Verification Link",
      endpoint: "firebase.auth.generateEmailVerificationLink",
      success: false,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      error: err,
      body: { email },
    });
    throw err;
  }
}

/**
 * Ask Firebase Identity Toolkit to send the reset email (API key).
 * Does not require Admin SDK Auth Admin permissions.
 */
export async function sendFirebasePasswordResetEmail(email) {
  const apiKey = process.env.FIREBASE_API_KEY;
  const apiUrl = (
    process.env.FIREBASE_API_URL ||
    "https://identitytoolkit.googleapis.com/v1"
  ).replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY is not configured");
  }

  const { user, organisation } = await resolveAuditContextByEmail(email);
  const endpoint = `${apiUrl}/accounts:sendOobCode`;

  async function request(payload) {
    const response = await fetch(
      `${endpoint}?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  const startedAt = Date.now();
  let { response, data } = await request({
    requestType: "PASSWORD_RESET",
    email,
    continueUrl: authActionContinueUrl(email),
  });

  // Unauthorized continue URL is common in local/dev — retry without it.
  if (
    !response.ok &&
    String(data?.error?.message || "").includes("INVALID_CONTINUE_URI")
  ) {
    ({ response, data } = await request({
      requestType: "PASSWORD_RESET",
      email,
    }));
  }

  const ok = response.ok;
  logFirebaseExternal({
    user,
    organisation,
    apiName: "Firebase Identity Toolkit",
    feature: "Password Reset Email",
    endpoint: "identitytoolkit.googleapis.com/v1/accounts:sendOobCode",
    success: ok,
    statusCode: response.status,
    durationMs: Date.now() - startedAt,
    response: {
      status: response.status,
      // Never store API key or full oob payloads
      error: data?.error?.message || null,
      kind: data?.kind || null,
      email: data?.email || email,
    },
    error: ok ? null : { message: data?.error?.message || `HTTP ${response.status}` },
    body: { requestType: "PASSWORD_RESET", email },
  });

  if (!ok) {
    const message =
      data?.error?.message ||
      `Firebase sendOobCode failed (${response.status})`;
    const err = new Error(message);
    err.code = data?.error?.message;
    throw err;
  }
  return data;
}
