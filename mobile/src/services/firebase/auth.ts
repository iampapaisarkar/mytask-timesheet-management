import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
  type UserCredential,
} from "firebase/auth";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { ENV, isFirebaseConfigured, isGoogleSignInConfigured } from "../../config/env";
import { getFirebaseAuth } from "./config";
import { AuthCancelledError, isAuthCancelled, mapAuthError } from "./errors";

let googleConfigured = false;

function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  if (!isGoogleSignInConfigured()) {
    throw new Error(
      "Google Sign-In is not configured. Set GOOGLE_WEB_CLIENT_ID in mobile/src/config/env.local.ts.",
    );
  }
  GoogleSignin.configure({
    webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
    ...(ENV.GOOGLE_IOS_CLIENT_ID
      ? { iosClientId: ENV.GOOGLE_IOS_CLIENT_ID }
      : {}),
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });
  googleConfigured = true;
}

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

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

/**
 * Native Google Sign-In → Firebase credential.
 * Session persistence is handled by Firebase Auth (RN AsyncStorage persistence).
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_* values in mobile/src/config/env.local.ts.",
    );
  }

  try {
    ensureGoogleConfigured();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new AuthCancelledError("Sign-in was cancelled.");
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error(
        "Google Sign-In did not return an ID token. Check GOOGLE_WEB_CLIENT_ID.",
      );
    }

    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(getFirebaseAuth(), credential);
  } catch (error: unknown) {
    if (isAuthCancelled(error)) {
      throw new AuthCancelledError(mapAuthError(error));
    }
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new AuthCancelledError("Sign-in was cancelled.");
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error(mapAuthError(error));
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error(mapAuthError(error));
      }
    }
    throw new Error(mapAuthError(error));
  }
}

/** Signs out of Firebase and Google (clears native Google session). */
export async function signOutUser(): Promise<void> {
  try {
    if (isGoogleSignInConfigured()) {
      ensureGoogleConfigured();
      const current = GoogleSignin.getCurrentUser();
      if (current) {
        await GoogleSignin.signOut();
      }
    }
  } catch {
    // Still sign out of Firebase
  }
  await signOut(getFirebaseAuth());
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  try {
    return getFirebaseAuth().currentUser;
  } catch {
    return null;
  }
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
