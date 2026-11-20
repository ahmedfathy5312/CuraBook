/**
 * hooks/usePagination.js — Pagination State Hook
 *
 * Works with Django REST Framework's standard pagination format:
 *   { count, next, previous, results }
 *
 * Usage:
 *   const { page, pageSize, setPage, paginationProps } = usePagination({ defaultPageSize: 12 });
 *   const { data } = useQuery({
 *     queryKey: ['doctors', { page, pageSize }],
 *     queryFn: () => searchDoctors({ page, page_size: pageSize }),
 *   });
 *   <Pagination {...paginationProps} total={data?.count} />
 */
import { useState, useCallback, useMemo } from 'react';

export function usePagination({ defaultPage = 1, defaultPageSize = 12 } = {}) {
  const [page,     setPage]     = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);

  const reset = useCallback(() => {
    setPage(defaultPage);
    setPageSize(defaultPageSize);
  }, [defaultPage, defaultPageSize]);

  // When filters change, reset to page 1
  const resetPage = useCallback(() => setPage(1), []);

  const paginationProps = useMemo(() => ({
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
  }), [page, pageSize]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    reset,
    resetPage,
    paginationProps,
    // Query params for API calls
    queryParams: { page, page_size: pageSize },
  };
}

export default usePagination;
