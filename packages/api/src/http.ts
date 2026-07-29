import type { AxiosResponse } from "axios";
import type { ApiResponse } from "@mytask/types";
import { getApiClient, type RequestOptions } from "./client";

/**
 * Unwrap the standard `{ data: T }` envelope used by the backend.
 * Keeps UI free of repeated casts.
 */
export function unwrapData<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
  const body = response.data as ApiResponse<T> & T;
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as ApiResponse<T>).data !== undefined
  ) {
    return (body as ApiResponse<T>).data as T;
  }
  return body as T;
}

/** Merge AbortSignal / timeout into Axios config without changing URLs. */
export function withRequestOptions(
  base: Record<string, unknown> = {},
  options?: RequestOptions,
): Record<string, unknown> {
  if (!options) return base;
  return {
    ...base,
    ...(options.params ? { params: { ...(base.params as object), ...options.params } } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.timeout != null ? { timeout: options.timeout } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  };
}

export async function apiGet<T>(
  url: string,
  options?: RequestOptions & { params?: Record<string, unknown> },
): Promise<T> {
  const res = await getApiClient().get(url, withRequestOptions({}, options));
  return unwrapData<T>(res as AxiosResponse<ApiResponse<T>>);
}

export async function apiPost<T>(
  url: string,
  payload?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const res = await getApiClient().post(
    url,
    payload ?? {},
    withRequestOptions({}, options),
  );
  return unwrapData<T>(res as AxiosResponse<ApiResponse<T>>);
}
