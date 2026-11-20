/**
 * features/search/pages/SearchPage.jsx
 * AUDIT FIX #5: Converted 200+ lines of inline styles → Tailwind classes.
 * AUDIT FIX #4 / MISSING #1: Registered at /search in router.jsx.
 * AUDIT FIX v18: Added map view toggle (same DoctorMapView from DoctorSearchPage).
 * TRANSLATION FIX v31: All hardcoded Arabic strings replaced with t() calls.
 */
import { useState, useEffect, useRef } from 'react';
import { useDoctorSearch } from '../hooks/useSearch';
import { DoctorFilters } from '../../doctor-discovery/components/DoctorFilters';
import DoctorCard from '../../doctor-discovery/components/DoctorCard';
import { SearchInput } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { EmptyState } from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';

const EGYPT_COORDS = {
  cairo:[30.0444,31.2357],giza:[29.9870,31.2118],alexandria:[31.2001,29.9187],
  assiut:[27.1809,31.1837],luxor:[25.6872,32.6396],mansoura:[31.0364,31.3807],
  tanta:[30.7865,30.9987],minya:[28.0871,30.7618],sohag:[26.5569,31.6948],
  aswan:[24.0889,32.8998],
};

const cityCoords = (c='') => EGYPT_COORDS[c.toLowerCase().trim()] || [26.82, 30.80];

let lReady = false, lCbs = [];
function loadL() {
  if (lReady) return Promise.resolve();
  return new Promise((res, rej) => {
    lCbs.push(res);
    if (lCbs.length > 1) return;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      .then(([L]) => {
        window.L = L.default; lReady = true;
        lCbs.forEach(f => f()); lCbs = [];
      }).catch(rej);
  });
}

function SearchMapView({ doctors, t }) {
  const P = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  const PL = tokens?.colors?.primary?.lighter || '#E0F2FE';
  const ref = useRef(null), mapRef = useRef(null), markers = useRef([]);
  const [ready, setReady] = useState(lReady);
  useEffect(() => { if (!ready) loadL().then(() => setReady(true)); }, [ready]);
  useEffect(() => {
    if (!ready || !ref.current) return;
    const L = window.L; if (!L) return;
    if (!mapRef.current) {
      mapRef.current = L.map(ref.current).setView([26.82, 30.80], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mapRef.current);
    }
    markers.current.forEach(m => m.remove()); markers.current = [];
    if (!doctors?.length) return;
    const bounds = [];
    doctors.forEach(doc => {
      const lat = parseFloat(doc.lat ?? doc.latitude ?? 'NaN');
      const lng = parseFloat(doc.lng ?? doc.longitude ?? 'NaN');
      const city = doc.city || doc.location || '';
      const [dlat, dlng] = isNaN(lat) || isNaN(lng) ? cityCoords(city) : [lat, lng];
      const name = doc.full_name || doc.name || 'Doctor';
      const spec = doc.specialty || '';
      const fee  = doc.consultation_fee ?? doc.fee;
      const viewLabel = t ? t('doctorSearch.viewProfile') || 'View Profile →' : 'View Profile →';
      const m = L.marker([dlat, dlng])
        .bindPopup(`<div style="font-family:inherit;min-width:180px">
          <b style="font-size:13px">${name}</b>
          ${spec ? `<br/><span style="color:${P};font-size:12px">${spec}</span>` : ''}
          ${city ? `<br/><span style="font-size:11px;color:var(--text-muted)">📍 ${city}</span>` : ''}
          ${fee ? `<br/><span style="font-size:12px">EGP ${fee}</span>` : ''}
          <br/><a href="/doctors/${doc.id}" style="display:block;margin-top:8px;background:${P};color:white;text-align:center;padding:7px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">${viewLabel}</a>
        </div>`)
        .addTo(mapRef.current);
      markers.current.push(m);
      bounds.push([dlat, dlng]);
    });
    if (bounds.length) { try { mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch {} }
  }, [ready, doctors, P]);

  if (!ready) return (
    <div style={{ height: 480, borderRadius: 'var(--radius-lg)', background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: P, fontWeight: 600 }}>{t ? t('doctorSearch.mapLoadingDoctors') : 'Loading map...'}</p>
    </div>
  );
  return <div ref={ref} style={{ height: 480, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: tokens?.shadows?.card || '0 2px 4px rgba(0,0,0,0.1)' }} />;
}

export default function SearchPage() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const { t, lang } = useTranslation();
  const {
    doctors, total, totalPages, filters, updateFilter, resetFilters,
    isLoading, isFetching, isError,
  } = useDoctorSearch();

  const P  = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  const PL = tokens?.colors?.primary?.lighter || '#E0F2FE';

  const activeFilterCount = [
    filters.specialty, filters.city, filters.rating,
    filters.availability, filters.price_max,
  ].filter(Boolean).length;

  const isAr = lang === 'ar';

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Page Header */}
      <div className="mb-7" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-1.5">
            🔍 {t('doctorSearch.title')}
          </h1>
          <p className="text-gray-500 text-sm">
            {total > 0
              ? t('doctorSearch.hospitalDoctorCount', { count: total })
              : t('doctorSearch.subtitle')}
          </p>
        </div>
        {/* Map / List toggle */}
        <div style={{ display: 'flex', border: `1px solid var(--border-base)`, borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 38 }}>
          {[
            { m: 'list', l: `☰ ${t('doctorSearch.listView')}` },
            { m: 'map',  l: `🗺 ${t('doctorSearch.mapView')}` },
          ].map(({ m, l }) => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '0 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: viewMode === m ? P : 'var(--bg-card)',
              color: viewMode === m ? 'white' : 'var(--text-muted)',
              fontFamily: 'inherit', transition: 'all .2s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchInput
          value={filters.q}
          onChange={e => updateFilter('q', e.target.value)}
          placeholder={t('doctorSearch.placeholder')}
          className="max-w-[560px]"
        />
      </div>

      {/* Mobile Filter Toggle */}
      <div className="mb-5 md:hidden">
        <button
          onClick={() => setShowMobileFilters(v => !v)}
          className={`inline-flex items-center gap-2 rounded-xl px-[18px] py-2.5 text-[13px] font-semibold cursor-pointer transition-all duration-200 border-[1.5px] ${
            activeFilterCount > 0
              ? 'bg-main text-white border-main'
              : 'bg-[var(--bg-page)] text-gray-700 border-[var(--border-base)]'
          }`}
        >
          🔧 {t('doctorSearch.filterBtn')} {activeFilterCount > 0 && `(${activeFilterCount})`}
          <span className="ml-1">{showMobileFilters ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Mobile Filters panel */}
      {showMobileFilters && (
        <div className="mb-5 md:hidden">
          <DoctorFilters
            filters={filters}
            onUpdate={updateFilter}
            onReset={() => { resetFilters(); setShowMobileFilters(false); }}
            loading={isLoading}
          />
        </div>
      )}

      {/* Main grid: sidebar + results */}
      <div className="hidden md:grid md:grid-cols-[260px_1fr] gap-6 items-start search-layout-grid">

        {/* Sidebar Filters — desktop only */}
        <div className="sticky top-20">
          <DoctorFilters
            filters={filters}
            onUpdate={updateFilter}
            onReset={resetFilters}
            loading={isLoading}
          />
        </div>

        {/* Map view */}
        {viewMode === 'map' && (
          <div style={{ marginBottom: 24 }}>
            {isLoading ? (
              <div style={{ height: 480, borderRadius: 'var(--radius-lg)', background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: P, fontWeight: 600 }}>{t('doctorSearch.mapLoadingDoctors')}</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {t('doctorSearch.mapDoctorsOnMap', { count: doctors.length, total })}
                </p>
                <SearchMapView doctors={doctors} t={t} />
              </>
            )}
          </div>
        )}

        {/* Results — only show in list mode */}
        {viewMode === 'list' && <div>
          {/* Results count */}
          <div className="flex items-center gap-2.5 mb-[18px]">
            <span className="text-sm text-gray-500 font-medium">
              {isLoading
                ? t('doctorSearch.searching')
                : t('doctorSearch.hospitalDoctorCount', { count: total })}
            </span>
            {isFetching && !isLoading && (
              <span className="text-xs text-main font-semibold">↻ {t('doctorSearch.updating')}</span>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton.Doctor key={i} />)}
            </div>

          ) : isError ? (
            <EmptyState preset="error" action={
              <button
                onClick={() => window.location.reload()}
                className="bg-main text-white rounded-xl px-6 py-2.5 cursor-pointer font-semibold text-[13px] border-none hover:opacity-90 transition-opacity"
              >
                {t('doctorSearch.retry')}
              </button>
            } />

          ) : !doctors.length ? (
            <EmptyState
              preset="doctors"
              message={t('doctorSearch.noResultsMsg')}
              action={
                <button
                  onClick={resetFilters}
                  className="bg-[var(--primary-pale)] text-main border border-second rounded-xl px-6 py-2.5 cursor-pointer font-semibold text-[13px] hover:bg-second transition-colors"
                >
                  {t('doctorSearch.clearAll')}
                </button>
              }
            />

          ) : (
            <>
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                {doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} />)}
              </div>
              <div className="mt-8 flex justify-center">
                <Pagination
                  page={filters.page}
                  totalPages={totalPages}
                  onChange={(p) => updateFilter('page', p)}
                />
              </div>
            </>
          )}
        </div>}
      </div>
    </div>
  );
}
