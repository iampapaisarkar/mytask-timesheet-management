export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseNativeConfig,
  initFirebase,
} from "./config";
export {
  applyActionCode,
  confirmPasswordReset,
  getCurrentUser,
  getIdToken,
  onAuthStateChangedListener,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from "./auth";
export {
  AuthCancelledError,
  isAuthCancelled,
  mapAuthError,
} from "./errors";
