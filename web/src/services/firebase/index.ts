export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseWebConfig,
  initFirebase,
  isFirebaseConfigured,
} from "./config";
export {
  completeGoogleRedirectSignIn,
  firebaseApplyActionCode,
  firebaseConfirmPasswordReset,
  firebaseForgotPassword,
  firebaseLogin,
  firebaseLogout,
  firebaseSignup,
  getCurrentUser,
  getIdToken,
  onAuthStateChangedListener,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from "./auth";
export { AuthCancelledError, mapAuthError } from "./errors";
