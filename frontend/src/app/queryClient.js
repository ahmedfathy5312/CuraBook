import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 min
      gcTime: 5 * 60_000,          // 5 min (React Query v5: renamed from cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry 4xx errors (client errors)
        if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // W-5 FIX: retry: 0 caused mutations to fail permanently on momentary
      // network drops. Now we retry once — but only for network/5xx errors.
      // 4xx errors (validation, auth) still fail immediately since retrying
      // them would not change the outcome.
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        const status = error?.statusCode || error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return true; // retry once on network errors or 5xx
      },
    },
  },
});

export default queryClient;
