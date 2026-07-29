import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";
import { isApiError } from "@mytask/api";

/**
 * Shared React Query defaults for web + mobile.
 * Deduplication, stale-while-revalidate, and cancelation come from RQ + AbortSignal.
 */
export function createAppQueryClient(
  overrides?: QueryClientConfig,
): QueryClient {
  return new QueryClient({
    ...overrides,
    defaultOptions: {
      ...overrides?.defaultOptions,
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isApiError(error)) {
            if (
              error.code === "unauthorized" ||
              error.code === "forbidden" ||
              error.code === "validation" ||
              error.code === "not_found" ||
              error.code === "cancelled"
            ) {
              return false;
            }
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        ...overrides?.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...overrides?.defaultOptions?.mutations,
      },
    },
  });
}
