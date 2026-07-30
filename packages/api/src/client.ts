import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ORG_HEADERS } from "@mytask/constants";
import type { OrganisationContext } from "@mytask/types";

export type TokenGetter = () => string | null | Promise<string | null>;
export type OrganisationGetter = () => OrganisationContext | null;
export type UnauthorizedHandler = () => void;

export interface CreateApiClientOptions {
  baseURL: string;
  getToken: TokenGetter;
  /**
   * Force-refresh path for 401 retry. Should call Firebase getIdToken(true).
   * If omitted, 401 clears session without retry.
   */
  refreshToken?: () => Promise<string | null>;
  getOrganisation?: OrganisationGetter;
  onUnauthorized?: UnauthorizedHandler;
  /** Default request timeout in ms (default 60s) */
  timeoutMs?: number;
}

/** Stable error shape for UI + logging (endpoints unchanged). */
export type ApiErrorCode =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "server"
  | "cancelled"
  | "unknown";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: unknown;
  readonly isApiError = true as const;

  constructor(
    message: string,
    code: ApiErrorCode,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { isApiError?: boolean }).isApiError === true)
  );
}

function messageFromAxiosData(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as {
    message?: string;
    info?: { message?: string | null };
    error?: string;
  };
  return (
    record.info?.message ||
    record.message ||
    (typeof record.error === "string" ? record.error : undefined) ||
    undefined
  );
}

export function normalizeAxiosError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return new ApiError(error.message, "unknown", { cause: error });
    }
    return new ApiError("Something went wrong", "unknown", { details: error });
  }

  const ax = error as AxiosError;
  if (ax.code === "ERR_CANCELED" || ax.name === "CanceledError") {
    return new ApiError("Request cancelled", "cancelled", { cause: ax });
  }
  if (ax.code === "ECONNABORTED" || ax.message?.toLowerCase().includes("timeout")) {
    return new ApiError("Request timed out. Please try again.", "timeout", {
      cause: ax,
    });
  }
  if (!ax.response) {
    return new ApiError(
      "Network unavailable. Check your connection and try again.",
      "network",
      { cause: ax },
    );
  }

  const status = ax.response.status;
  const serverMessage = messageFromAxiosData(ax.response.data);
  if (status === 401) {
    return new ApiError(
      serverMessage || "Session expired. Please sign in again.",
      "unauthorized",
      { status, details: ax.response.data, cause: ax },
    );
  }
  if (status === 403) {
    return new ApiError(
      serverMessage || "You do not have permission for this action.",
      "forbidden",
      { status, details: ax.response.data, cause: ax },
    );
  }
  if (status === 404) {
    return new ApiError(serverMessage || "Not found.", "not_found", {
      status,
      details: ax.response.data,
      cause: ax,
    });
  }
  if (status === 422 || status === 400) {
    return new ApiError(
      serverMessage || "Please check your input and try again.",
      "validation",
      { status, details: ax.response.data, cause: ax },
    );
  }
  if (status >= 500) {
    return new ApiError(
      serverMessage || "Server error. Please try again later.",
      "server",
      { status, details: ax.response.data, cause: ax },
    );
  }
  return new ApiError(serverMessage || ax.message || "Request failed", "unknown", {
    status,
    details: ax.response.data,
    cause: ax,
  });
}

function isIdempotentMethod(method?: string) {
  const m = (method || "get").toLowerCase();
  return m === "get" || m === "head" || m === "options";
}

function shouldRetryAxiosError(error: AxiosError, config?: InternalAxiosRequestConfig) {
  if (!isIdempotentMethod(config?.method)) return false;
  if (error.code === "ERR_CANCELED") return false;
  if (error.code === "ECONNABORTED") return true;
  if (!error.response) return true;
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504;
}

type RetriableConfig = InternalAxiosRequestConfig & {
  __mtRetryCount?: number;
  __mtAuthRetry?: boolean;
};

export type RequestOptions = Pick<
  AxiosRequestConfig,
  "signal" | "timeout" | "headers" | "params"
>;

let client: AxiosInstance | null = null;
let optionsRef: CreateApiClientOptions | null = null;
let authRefreshPromise: Promise<string | null> | null = null;

async function forceRefreshShared(): Promise<string | null> {
  if (!optionsRef?.refreshToken) return null;
  if (authRefreshPromise) return authRefreshPromise;
  authRefreshPromise = optionsRef
    .refreshToken()
    .catch(() => null)
    .finally(() => {
      authRefreshPromise = null;
    });
  return authRefreshPromise;
}

export function createApiClient(options: CreateApiClientOptions): AxiosInstance {
  optionsRef = options;
  client = axios.create({
    baseURL: options.baseURL.replace(/\/$/, ""),
    timeout: options.timeoutMs ?? 60_000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await optionsRef!.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const org = optionsRef!.getOrganisation?.() ?? null;
    if (org) {
      config.headers[ORG_HEADERS.id] = String(org.id);
      config.headers[ORG_HEADERS.code] = org.code;
      if (org.name) {
        config.headers[ORG_HEADERS.name] = org.name;
      }
    }
    // Correlation ID for backend audit trails (generated per request if absent)
    if (!config.headers["X-Request-Id"] && !config.headers["x-request-id"]) {
      const id =
        typeof globalThis.crypto?.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : `mt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      config.headers["X-Request-Id"] = id;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableConfig | undefined;

      if (config && shouldRetryAxiosError(error, config)) {
        const attempt = config.__mtRetryCount ?? 0;
        if (attempt < 1) {
          config.__mtRetryCount = attempt + 1;
          await new Promise<void>((r) => setTimeout(r, 350 * (attempt + 1)));
          return client!.request(config);
        }
      }

      if (error.response?.status === 401 && config && !config.__mtAuthRetry) {
        config.__mtAuthRetry = true;
        const fresh = await forceRefreshShared();
        if (fresh) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${fresh}`;
          return client!.request(config);
        }
        optionsRef?.onUnauthorized?.();
      } else if (error.response?.status === 401) {
        optionsRef?.onUnauthorized?.();
      }

      return Promise.reject(normalizeAxiosError(error));
    },
  );

  return client;
}

export function getApiClient(): AxiosInstance {
  if (!client) {
    throw new Error("API client not initialised. Call createApiClient() first.");
  }
  return client;
}

export function updateApiClientOptions(
  partial: Partial<CreateApiClientOptions>,
): void {
  if (!optionsRef || !client) return;
  optionsRef = { ...optionsRef, ...partial };
  if (partial.baseURL) {
    client.defaults.baseURL = partial.baseURL.replace(/\/$/, "");
  }
  if (partial.timeoutMs != null) {
    client.defaults.timeout = partial.timeoutMs;
  }
}
