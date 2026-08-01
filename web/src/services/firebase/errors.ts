/**
 * Maps Firebase / Google Sign-In failures to user-friendly copy.
 * Never throws — safe for UI error banners.
 */
export function mapAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Please try again.";
  }

  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  const message =
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. We tried a redirect instead — please complete sign-in if prompted.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
    case "auth/configuration-not-found":
    case "auth/invalid-credential":
      return "Firebase is misconfigured. Check VITE_FIREBASE_* environment values.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google Sign-In. Add it in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Log in with email/password, then link Google from your profile.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled for this Firebase project.";
    case "auth/internal-error":
      return "Authentication service error. Please try again.";
    default:
      break;
  }

  if (/popup/i.test(message) && /block/i.test(message)) {
    return "Your browser blocked the sign-in popup. Allow popups for this site, or try again.";
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
