import type { AxiosRequestConfig } from "axios";
import { getApiClient, type RequestOptions } from "./client";
import { buildListQuery } from "@mytask/utils";
import type { ApiResponse, ListParams } from "@mytask/types";

function req(
  options?: RequestOptions,
  params?: Record<string, unknown>,
): AxiosRequestConfig {
  const mergedParams =
    params || options?.params
      ? { ...params, ...options?.params }
      : undefined;
  return {
    ...(mergedParams ? { params: mergedParams } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
    ...(options?.timeout != null ? { timeout: options.timeout } : {}),
    ...(options?.headers ? { headers: options.headers } : {}),
  };
}

export const subscriptionApi = {
  listPlans(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown>>("/subscriptions/plans", req(options));
  },
  comparison(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown>>(
      "/subscriptions/comparison",
      req(options),
    );
  },
  current(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown>>(
      "/subscriptions/current",
      req(options),
    );
  },
  usage(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown>>(
      "/subscriptions/usage",
      req(options),
    );
  },
  featureLimits(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown>>(
      "/subscriptions/feature-limits",
      req(options),
    );
  },
  billingHistory(params: ListParams = {}, options?: RequestOptions) {
    return getApiClient().get<ApiResponse<unknown[]>>(
      "/subscriptions/billing-history",
      req(options, buildListQuery(params)),
    );
  },
  checkout(
    payload: {
      billing_interval: "month" | "year";
      success_url?: string;
      cancel_url?: string;
    },
    options?: RequestOptions,
  ) {
    return getApiClient().post<ApiResponse<{ checkout_url: string; session_id: string }>>(
      "/subscriptions/checkout",
      payload,
      req(options),
    );
  },
  portal(payload: { return_url?: string } = {}, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<{ portal_url: string }>>(
      "/subscriptions/portal",
      payload,
      req(options),
    );
  },
  cancel(payload: { immediate?: boolean } = {}, options?: RequestOptions) {
    return getApiClient().post<ApiResponse<unknown>>(
      "/subscriptions/cancel",
      payload,
      req(options),
    );
  },
  confirmCheckout(
    payload: { session_id: string },
    options?: RequestOptions,
  ) {
    return getApiClient().post<ApiResponse<unknown>>(
      "/subscriptions/confirm-checkout",
      payload,
      req(options),
    );
  },
  sync(options?: RequestOptions) {
    return getApiClient().post<ApiResponse<unknown>>(
      "/subscriptions/sync",
      {},
      req(options),
    );
  },
};
