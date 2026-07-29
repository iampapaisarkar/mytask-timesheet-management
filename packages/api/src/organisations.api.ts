import { getApiClient, type RequestOptions } from "./client";
import { buildListQuery } from "@mytask/utils";
import type { ApiResponse, ListParams } from "@mytask/types";

export const organisationsApi = {
  list(params: ListParams = {}, options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown[]>>("/organisations/list", {
      params: buildListQuery(params),
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
  get(orgCode: string, options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown>>(
      `/organisations/${orgCode}/get`,
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  create(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<unknown>>(
      "/organisations/create",
      payload,
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  update(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<unknown>>(
      "/organisations/update",
      payload,
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  updateSettings(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post("/organisations/update-settings", payload, {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
  invitations(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown[]>>(
      "/organisations/organisation-invitations",
      { signal: options?.signal, timeout: options?.timeout },
    );
  },
  /**
   * Accept / reject require: id, organisation_id, invitation_token, employee_id
   * (see backend organisation.controller acceptInvitation / rejectInvitation).
   */
  acceptInvitation(
    payload: {
      id: string | number;
      organisation_id: string | number;
      invitation_token: string;
      employee_id: string | number;
    },
    options?: RequestOptions,
  ) {
    return getApiClient().post("/organisations/accept-invitation", payload, {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
  rejectInvitation(
    payload: {
      id: string | number;
      organisation_id: string | number;
      invitation_token: string;
      employee_id: string | number;
    },
    options?: RequestOptions,
  ) {
    return getApiClient().post("/organisations/reject-invitation", payload, {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },
};
