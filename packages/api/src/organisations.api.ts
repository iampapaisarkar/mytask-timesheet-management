import { getApiClient } from "./client";
import { buildListQuery } from "@mytask/utils";
import type { ApiResponse, ListParams } from "@mytask/types";

export const organisationsApi = {
  list(params: ListParams = {}) {
    return getApiClient().get<ApiResponse<unknown[]>>("/organisations/list", {
      params: buildListQuery(params),
    });
  },
  get(orgCode: string) {
    return getApiClient().get<ApiResponse<unknown>>(`/organisations/${orgCode}/get`);
  },
  create(payload: Record<string, unknown>) {
    return getApiClient().post<ApiResponse<unknown>>("/organisations/create", payload);
  },
  update(payload: Record<string, unknown>) {
    return getApiClient().post<ApiResponse<unknown>>("/organisations/update", payload);
  },
  updateSettings(payload: Record<string, unknown>) {
    return getApiClient().post("/organisations/update-settings", payload);
  },
  invitations() {
    return getApiClient().get<ApiResponse<unknown[]>>(
      "/organisations/organisation-invitations",
    );
  },
  /**
   * Accept / reject require: id, organisation_id, invitation_token, employee_id
   * (see backend organisation.controller acceptInvitation / rejectInvitation).
   */
  acceptInvitation(payload: {
    id: string | number;
    organisation_id: string | number;
    invitation_token: string;
    employee_id: string | number;
  }) {
    return getApiClient().post("/organisations/accept-invitation", payload);
  },
  rejectInvitation(payload: {
    id: string | number;
    organisation_id: string | number;
    invitation_token: string;
    employee_id: string | number;
  }) {
    return getApiClient().post("/organisations/reject-invitation", payload);
  },
};
