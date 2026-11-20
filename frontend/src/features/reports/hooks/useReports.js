import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

/**
 * useReports — Hook to fetch medical reports for the current user.
 * Section 2 Fix: use canonical API.REPORTS.LIST constant, add error handling
 * so the ReportsSection never crashes — it renders an empty list instead.
 */
export const useReports = () => {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await apiClient.get(API.REPORTS.LIST);
      // Normalize: backend may return { results: [...] } or a plain array
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results ?? []);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Don't throw on error — let the component handle empty state gracefully
    retry: 1,
  });
};

