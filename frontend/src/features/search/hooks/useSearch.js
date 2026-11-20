/**
 * useDoctorSearch.js — Advanced Search Hook
 * ✓ Debounced (400ms) ✓ All filters ✓ URL-synced ✓ React Query ✓ Pagination
 */
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import { searchDoctors } from '../../../features/search/api/searchApi';

const PAGE_SIZE = 12;

export function useDoctorSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    q:            searchParams.get('q')            || '',
    specialty:    searchParams.get('specialty')    || '',
    city:         searchParams.get('city')         || '',
    rating:       searchParams.get('rating')       || '',
    availability: searchParams.get('availability') || '',
    price_max:    searchParams.get('price_max')    || '',
    gender:       searchParams.get('gender')       || '',
    sort:         searchParams.get('sort')         || 'rating',
    page:         Number(searchParams.get('page')) || 1,
  };

  const debouncedQ = useDebounce(filters.q, 400);
  const queryParams = { ...filters, q: debouncedQ, page_size: PAGE_SIZE };

  const query = useQuery({
    queryKey: ['doctors', 'search', queryParams],
    // Improvement 5.1E: AbortController — cancel stale requests when user types fast.
    // React Query passes the AbortSignal automatically via queryFn context.
    queryFn: ({ signal }) => searchDoctors(queryParams, signal),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  const updateFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value !== '' && value !== null && value !== undefined) {
        next.set(key, String(value));
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.set('page', '1');
      return next;
    });
  }, [setSearchParams]);

  const updateFilters = useCallback((updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          next.set(key, String(value));
        } else {
          next.delete(key);
        }
      });
      next.set('page', '1');
      return next;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => setSearchParams({}), [setSearchParams]);
  const goToPage = useCallback((page) => updateFilter('page', page), [updateFilter]);

  const activeFilterCount = useMemo(() => {
    const filterKeys = ['specialty', 'city', 'rating', 'availability', 'price_max', 'gender'];
    return filterKeys.filter(k => filters[k] !== '').length + (filters.q ? 1 : 0);
  }, [filters]);

  const rawDoctors = query.data?.results || [];
  // FIX (القسم 4): نفس إصلاح useDoctorSearch — ضمان ظهور مؤشر "متاح اليوم" على الكارد
  const doctors    = filters.availability === 'today'
    ? rawDoctors.map(doc => ({ ...doc, available_today: doc.available_today ?? true }))
    : rawDoctors;
  const total      = query.data?.count   || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    ...query, doctors, total, totalPages,
    hasNextPage: !!query.data?.next,
    hasPrevPage: !!query.data?.previous,
    filters, activeFilterCount,
    updateFilter, updateFilters, resetFilters, goToPage,
  };
}

export default useDoctorSearch;
