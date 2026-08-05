/**
 * Maps Firebase / Google Sign-In failures to user-friendly copy.
 */
export function mapAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Please try again.";
  }

  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "code" in error && typeof (error as { code?: unknown }).code === "number"
        ? String((error as { code: number }).code)
        : "";
  const message =
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const normalized = `${code} ${message}`.toLowerCase();
  if (
    code === "10" ||
    code === "DEVELOPER_ERROR" ||
    normalized.includes("developer_error") ||
    normalized.includes("apiException: 10")
  ) {
    return "Google Sign-In is misconfigured for Android. Add this app's debug SHA-1/SHA-256 in Firebase (Project settings → Your apps), download a fresh google-services.json, then rebuild.";
  }

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
    case "SIGN_IN_CANCELLED":
    case "-5":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
    case "NETWORK_ERROR":
      return "Network error. Check your connection and try again.";
    case "auth/invalid-api-key":
    case "auth/configuration-not-found":
    case "auth/invalid-credential":
      return "Firebase is misconfigured. Check FIREBASE_* values in env.local.ts.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled for this Firebase project.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "DEVELOPER_ERROR":
      return "Google Sign-In is misconfigured (SHA-1 / package name / webClientId).";
    case "PLAY_SERVICES_NOT_AVAILABLE":
      return "Google Play Services is unavailable on this device.";
    case "IN_PROGRESS":
      return "Sign-in is already in progress.";
    default:
      break;
  }

  if (message) return message;
  return "Unable to sign in with Google. Please try again.";
}


export class AuthCancelledError extends Error {
  readonly code = "auth/cancelled";

  constructor(message = "Sign-in was cancelled.") {
    super(message);
    this.name = "AuthCancelledError";
  }
}

export function isAuthCancelled(error: unknown): boolean {
  if (error instanceof AuthCancelledError) return true;
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error ? String((error as { code: unknown }).code) : "";
  return (
    code === "auth/cancelled" ||
    code === "SIGN_IN_CANCELLED" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/user-cancelled" ||
    code === "-5"
  );
}
