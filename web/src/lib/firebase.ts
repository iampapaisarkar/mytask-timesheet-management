/**
 * Compatibility re-exports — prefer `@/services/firebase` for new code.
 */
export {
  getFirebaseAuth,
  getFirebaseWebConfig,
  getIdToken,
  initFirebase,
  isFirebaseConfigured,
  firebaseApplyActionCode,
  firebaseConfirmPasswordReset,
  firebaseForgotPassword,
  firebaseLogin,
  firebaseLogout,
  firebaseSignup,
} from "@/services/firebase";
