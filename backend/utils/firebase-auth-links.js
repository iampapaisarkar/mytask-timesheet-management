import admin from "firebase-admin";

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

/**
 * Generate a password-reset link via Admin SDK.
 * Returns null when Admin credentials are unavailable/invalid.
 */
export async function generatePasswordResetAppLink(email) {
  const actionCodeSettings = {
    url: authActionContinueUrl(email),
    handleCodeInApp: true,
  };
  const firebaseLink = await admin
    .auth()
    .generatePasswordResetLink(email, actionCodeSettings);
  return toAppAuthActionLink(firebaseLink);
}

/**
 * Generate an email-verification link via Admin SDK.
 */
export async function generateEmailVerificationAppLink(email) {
  const actionCodeSettings = {
    url: authActionContinueUrl(email),
    handleCodeInApp: true,
  };
  const firebaseLink = await admin
    .auth()
    .generateEmailVerificationLink(email, actionCodeSettings);
  return toAppAuthActionLink(firebaseLink);
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

  async function request(payload) {
    const response = await fetch(
      `${apiUrl}/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

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

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Firebase sendOobCode failed (${response.status})`;
    const err = new Error(message);
    err.code = data?.error?.message;
    throw err;
  }
  return data;
}
