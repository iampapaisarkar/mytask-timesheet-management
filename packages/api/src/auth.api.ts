import { getApiClient } from "./client";
import type {
  ApiResponse,
  AuthLoginPayload,
  AuthSignupPayload,
  UserProfile,
} from "@mytask/types";

export const authApi = {
  login(payload: AuthLoginPayload) {
    return getApiClient().post<ApiResponse<UserProfile>>("/auth/login", payload);
  },
  signup(payload: AuthSignupPayload) {
    return getApiClient().post<ApiResponse<UserProfile>>("/auth/signup", payload);
  },
  forgotPassword(payload: { email: string }) {
    return getApiClient().post("/auth/forgot-password", payload);
  },
  logout() {
    return getApiClient().post("/auth/logout");
  },
  me() {
    return getApiClient().get<ApiResponse<UserProfile>>("/auth/user");
  },
  updateProfile(payload: Record<string, unknown>) {
    return getApiClient().post<ApiResponse<UserProfile>>("/auth/update-profile", payload);
  },
  updateFcmToken(payload: Record<string, unknown>) {
    return getApiClient().post("/auth/update-fcm-token", payload);
  },
  verifyOrganisationInvitationToken(payload: { token: string }) {
    return getApiClient().post("/auth/verify-organisation-invitation-token", payload);
  },
};
