/**
 * features/search/index.js
 * ========================
 * F-09 FIX: Dedicated search feature — moved from features/doctors/
 * This allows search to be reused for hospital/clinic search independently.
 *
 * Exports:
 *   SearchPage       — /doctors route (doctor search with filters)
 *   useSearch        — unified search hook (debounced, URL-synced)
 *   SearchFilters    — filter sidebar component
 */
export { default as SearchPage }    from './pages/SearchPage';
export { default as useSearch }     from './hooks/useSearch';
export { default as SearchFilters } from './components/SearchFilters';
