import axios, {
  type AxiosError,
  type AxiosInstance,
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
  getOrganisation?: OrganisationGetter;
  onUnauthorized?: UnauthorizedHandler;
}

let client: AxiosInstance | null = null;
let optionsRef: CreateApiClientOptions | null = null;

export function createApiClient(options: CreateApiClientOptions): AxiosInstance {
  optionsRef = options;
  client = axios.create({
    baseURL: options.baseURL.replace(/\/$/, ""),
    timeout: 60000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await options.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const org = options.getOrganisation?.() ?? null;
    if (org) {
      config.headers[ORG_HEADERS.id] = String(org.id);
      config.headers[ORG_HEADERS.code] = org.code;
      if (org.name) {
        config.headers[ORG_HEADERS.name] = org.name;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        options.onUnauthorized?.();
      }
      return Promise.reject(error);
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

export function updateApiClientOptions(partial: Partial<CreateApiClientOptions>): void {
  if (!optionsRef || !client) return;
  optionsRef = { ...optionsRef, ...partial };
  if (partial.baseURL) {
    client.defaults.baseURL = partial.baseURL.replace(/\/$/, "");
  }
}
