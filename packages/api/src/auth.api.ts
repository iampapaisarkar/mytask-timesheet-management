import { getApiClient, type RequestOptions } from "./client";
import type {
  ApiResponse,
  AuthLoginPayload,
  AuthSignupPayload,
  UserProfile,
} from "@mytask/types";

export const authApi = {
  login(payload: AuthLoginPayload, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<UserProfile>>(
      "/auth/login",
      payload,
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  signup(payload: AuthSignupPayload, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<UserProfile>>(
      "/auth/signup",
      payload,
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  forgotPassword(payload: { email: string }, options?: RequestOptions) {
    return getApiClient().post("/auth/forgot-password", payload, {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
  logout(options?: RequestOptions) {
    return getApiClient().post(
      "/auth/logout",
      {},
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  me(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<UserProfile>>("/auth/user", {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
  updateProfile(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<UserProfile>>(
      "/auth/update-profile",
      payload,
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  updateFcmToken(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post("/auth/update-fcm-token", payload, {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
  verifyOrganisationInvitationToken(
    payload: { token: string },
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      "/auth/verify-organisation-invitation-token",
      { invitation_token: payload.token },
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
};
