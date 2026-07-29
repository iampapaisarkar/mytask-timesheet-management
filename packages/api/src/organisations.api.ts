import { getApiClient } from "./client";
import { buildListQuery } from "@mysheet/utils";
import type { ApiResponse, ListParams } from "@mysheet/types";

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
    return getApiClient().get("/organisations/organisation-invitations");
  },
  acceptInvitation(payload: Record<string, unknown>) {
    return getApiClient().post("/organisations/accept-invitation", payload);
  },
  rejectInvitation(payload: Record<string, unknown>) {
    return getApiClient().post("/organisations/reject-invitation", payload);
  },
};
