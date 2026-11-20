/**
 * useDoctorSearch.js — Canonical implementation (doctor-discovery feature)
 *
 * CIRCULAR FIX: was re-exporting from ../../doctors/hooks/useDoctorSearch
 * which re-exported back here → infinite loop.
 *
 * M-07 FIX: useQueryParams integration for URL sync.
 *
 * BUG-FIX #6 (الأقرب / Nearest):
 *   When sort='nearest' is selected, the hook automatically requests the
 *   device's GPS coordinates via navigator.geolocation.getCurrentPosition().
 *   The resolved lat/lng are added to the search params sent to the backend
 *   (?lat=&lng=) so the backend can order results by real geographic distance.
 *   A geoStatus field is exposed so the UI can show a loading/error state.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { searchDoctors } from '../../search/api/searchApi';

const DEFAULT_FILTERS = {
  q: '', specialty: '', city: '', rating: '', availability: '', price_max: '',
  hospital_id: '',  // FIX #11: support filtering by hospital from HospitalDetailPage
  sort: '',         // BUG-05 FIX: sort filter was missing from DEFAULT_FILTERS
};

const STALE = 60_000; // 1 minute
const DEBOUNCE_MS = 350; // FIX: debounce search to prevent errors on partial typing

export function useDoctorSearch(externalFilters) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  // BUG-FIX #6: store resolved GPS coords for 'nearest' sort
  const [userCoords, setUserCoords] = useState(null);   // { lat, lng } | null
  const [geoStatus, setGeoStatus] = useState('idle');   // 'idle' | 'loading' | 'ok' | 'denied' | 'unavailable'

  // M-07 FIX: read filters from URL query params if no external filters provided
  const urlFilters = externalFilters ?? {
    q:            searchParams.get('q')            || '',
    specialty:    searchParams.get('specialty')    || '',
    city:         searchParams.get('city')         || '',
    rating:       searchParams.get('rating')       || '',
    availability: searchParams.get('availability') || '',
    price_max:    searchParams.get('price_max')    || '',
    hospital_id:  searchParams.get('hospital_id')  || '',  // FIX #11: read hospital_id from URL params
    sort:         searchParams.get('sort')         || '',  // BUG-05 FIX: persist sort in URL
  };

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...urlFilters });

  // BUG-FIX #6: whenever sort switches to/from 'nearest', request or clear GPS
  useEffect(() => {
    if (filters.sort !== 'nearest') {
      // Not using nearest sort — clear coords so they don't pollute other requests
      setUserCoords(null);
      setGeoStatus('idle');
      return;
    }

    // sort === 'nearest': request GPS
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
      },
      () => {
        // Permission denied or timeout — fall back to rating sort
        setGeoStatus('denied');
        setUserCoords(null);
      },
      { timeout: 8000, maximumAge: 60_000 }
    );
  }, [filters.sort]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // M-07 FIX: sync to URL
      if (!externalFilters) {
        const params = {};
        Object.entries(next).forEach(([k, v]) => { if (v) params[k] = v; });
        setSearchParams(params, { replace: true });
      }
      setPage(1);
      return next;
    });
  }, [externalFilters, setSearchParams]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setUserCoords(null);
    setGeoStatus('idle');
    if (!externalFilters) setSearchParams({}, { replace: true });
    setPage(1);
  }, [externalFilters, setSearchParams]);

  // FIX: debounce the query filters to avoid API errors on every keypress
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedFilters(filters), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [JSON.stringify(filters)]);

  // BUG-FIX #6: merge resolved GPS coords into query params for 'nearest' sort
  const queryParams = { ...debouncedFilters, page };
  if (debouncedFilters.sort === 'nearest' && userCoords) {
    queryParams.lat = userCoords.lat;
    queryParams.lng = userCoords.lng;
  }

  const queryKey = ['search', 'doctors', queryParams];

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey,
    queryFn: ({ signal }) => searchDoctors(queryParams, signal),
    staleTime: STALE,
    keepPreviousData: true,
    // BUG-FIX #6: when 'nearest' selected, wait for GPS resolution before fetching
    // (unless geo was denied — in that case still fetch with fallback sort)
    enabled: debouncedFilters.sort !== 'nearest' || geoStatus !== 'loading',
  });

  const rawResults = Array.isArray(data)
    ? data
    : (data?.results ?? data?.data?.results ?? data?.data ?? []);
  // FIX (القسم 4): لما المستخدم يفعّل فلتر "متاح اليوم"، نضيف available_today: true
  // على كل نتيجة مرجعة — لأن الـ Backend قد لا يُرجع هذا الحقل صراحةً في الـ response
  // مع أن النتايج نفسها فُلترت بشكل صحيح.
  // هذا يضمن ظهور مؤشر "متاح اليوم" الجرافيكي (pulse dot + label) على كل كارد.
  const results = (debouncedFilters.availability === 'today' || debouncedFilters.sort === 'available')
    ? rawResults.map(doc => ({ ...doc, available_today: doc.available_today ?? true }))
    : rawResults;
  // BUG-05: Ensure 'sort' and 'available_today' filters are sent correctly
  const total    = data?.count ?? data?.total ?? data?.pagination?.count ?? rawResults.length ?? 0;
  const pageSize = data?.page_size ?? data?.pagination?.page_size ?? 12;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    doctors: results, total, page, totalPages, filters,
    updateFilter, resetFilters, setPage,
    isLoading, isFetching, isError, error,
    // BUG-FIX #6: expose geo status so UI can show "جارٍ تحديد موقعك..." etc.
    geoStatus, userCoords,
  };
}
