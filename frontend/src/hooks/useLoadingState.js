/**
 * hooks/useLoadingState.js — v31 UX-03
 *
 * Standardizes loading UI across CuraBook:
 *
 *   Skeleton  → for page/section content that has a defined shape
 *   Spinner   → for action buttons and mutations in progress
 *   (nothing) → for background refetches (React Query handles these silently)
 *
 * Usage:
 *   const { showSkeleton, showSpinner } = useLoadingState({ isLoading, isMutating });
 *
 *   if (showSkeleton) return <Skeleton ... />;
 *   return (
 *     <button disabled={showSpinner}>
 *       {showSpinner ? <Spinner size="sm" /> : 'Save'}
 *     </button>
 *   );
 *
 * Design rule (from DESIGN_SYSTEM.md):
 *   - Skeleton → content that has a predictable visual shape (lists, cards, tables)
 *   - Spinner  → actions: button clicks, form submits, file uploads
 *   - Never use Spinner for full-page content loading — use Skeleton instead
 */

/**
 * @param {{ isLoading?: boolean, isMutating?: boolean, isRefetching?: boolean }} params
 * @returns {{ showSkeleton: boolean, showSpinner: boolean, isBackground: boolean }}
 */
export function useLoadingState({ isLoading = false, isMutating = false, isRefetching = false } = {}) {
  return {
    /** True on initial load — show Skeleton for content areas */
    showSkeleton: isLoading && !isRefetching,

    /** True during mutations/actions — show Spinner on buttons */
    showSpinner: isMutating,

    /** True during background refetch — no UI needed (React Query default) */
    isBackground: isRefetching && !isLoading,
  };
}

/**
 * Convenience wrapper for React Query results.
 * Pass the full query result object directly.
 *
 * @param {import('@tanstack/react-query').UseQueryResult} queryResult
 * @param {import('@tanstack/react-query').UseMutationResult} [mutationResult]
 */
export function useQueryLoadingState(queryResult, mutationResult = null) {
  return useLoadingState({
    isLoading:    queryResult?.isLoading    ?? false,
    isRefetching: queryResult?.isRefetching ?? false,
    isMutating:   mutationResult?.isPending ?? false,
  });
}

export default useLoadingState;
