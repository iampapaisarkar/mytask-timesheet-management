import {
  GoogleAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Unsubscribe,
  type User,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./config";
import { AuthCancelledError, mapAuthError } from "./errors";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
googleProvider.addScope("email");
googleProvider.addScope("profile");

let redirectHandled = false;

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

/**
 * Google Sign-In via popup; falls back to redirect when the popup is blocked.
 * Relies on Firebase Auth persistence (IndexedDB / local) — no custom session store.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set VITE_FIREBASE_* values in web/.env.",
    );
  }

  const auth = getFirebaseAuth();

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";

    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/user-cancelled"
    ) {
      throw new AuthCancelledError(mapAuthError(error));
    }

    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      // Navigation leaves this page; caller should not treat as success yet.
      throw new AuthCancelledError(
        "Redirecting to Google Sign-In… complete the flow in the new page.",
      );
    }

    throw new Error(mapAuthError(error));
  }
}

/**
 * Complete a pending Google redirect sign-in (call once on app boot).
 * Returns null when there is no pending redirect result.
 */
export async function completeGoogleRedirectSignIn(): Promise<UserCredential | null> {
  if (redirectHandled || !isFirebaseConfigured()) return null;
  redirectHandled = true;
  try {
    return await getRedirectResult(getFirebaseAuth());
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/user-cancelled"
    ) {
      return null;
    }
    throw new Error(mapAuthError(error));
  }
}

export async function firebaseForgotPassword(email: string): Promise<void> {
  const continueUrl = `${window.location.origin}/auth-actions?email=${encodeURIComponent(email)}`;
  await sendPasswordResetEmail(getFirebaseAuth(), email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
}

export async function firebaseConfirmPasswordReset(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  await confirmPasswordReset(getFirebaseAuth(), oobCode, newPassword);
}

export async function firebaseApplyActionCode(oobCode: string): Promise<void> {
  await applyActionCode(getFirebaseAuth(), oobCode);
}

/** Signs out of Firebase Auth (clears Google session for this app via Firebase). */
export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser;
}

export function onAuthStateChangedListener(
  listener: (user: User | null) => void,
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), listener);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

// Backwards-compatible aliases used across the web app
export const firebaseLogin = signInWithEmail;
export const firebaseSignup = signUpWithEmail;
export const firebaseLogout = signOutUser;
