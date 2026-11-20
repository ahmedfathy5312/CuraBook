/**
 * HospitalsPage.jsx — Find Hospital (matches Find Doctors style)
 * i18n fix (Sprint 3): كل النصوص عبر useTranslation
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../../hooks/useDebounce';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Avatar from '../../../components/ui/Avatar';
import { useTranslation } from '../../../i18n/useTranslation';

const P = 'var(--primary)', PLT = 'var(--bg-subtle)', BG = 'var(--bg)', TXT = 'var(--text-h)', MT = 'var(--text-muted)', BRD = 'var(--border)';

const getHospitals = async (params) => {
  const hasFilters = params.q || params.city || params.min_rating || params.ordering;
  const endpoint = hasFilters ? API.HOSPITALS.SEARCH : API.HOSPITALS.LIST;
  const { data } = await apiClient.get(endpoint, { params });
  return data;
};

function useHospitals(params) {
  return useQuery({
    queryKey: ['hospitals', params],
    queryFn: () => getHospitals(params),
    staleTime: 5 * 60_000,
    keepPreviousData: true,
  });
}

const CITIES = [
  { value: 'Cairo',      label: { ar: 'القاهرة',      en: 'Cairo' } },
  { value: 'Alexandria', label: { ar: 'الإسكندرية',    en: 'Alexandria' } },
  { value: 'Giza',       label: { ar: 'الجيزة',        en: 'Giza' } },
  { value: 'Mansoura',   label: { ar: 'المنصورة',      en: 'Mansoura' } },
  { value: 'Assiut',     label: { ar: 'أسيوط',         en: 'Assiut' } },
  { value: 'Luxor',      label: { ar: 'الأقصر',        en: 'Luxor' } },
  { value: 'Aswan',      label: { ar: 'أسوان',         en: 'Aswan' } },
  { value: 'Tanta',      label: { ar: 'طنطا',          en: 'Tanta' } },
  { value: 'Zagazig',    label: { ar: 'الزقازيق',      en: 'Zagazig' } },
  { value: 'Ismailia',   label: { ar: 'الإسماعيلية',   en: 'Ismailia' } },
];
const RATINGS = [
  { label: '⭐ 4.5+', value: '4.5' },
  { label: '⭐ 4.0+', value: '4.0' },
  { label: '⭐ 3.5+', value: '3.5' },
];

function HospitalCard({ hospital, t }) {
  const navigate = useNavigate();
  const { lang: cardLang } = useTranslation();
  const rating = hospital.rating ? Number(hospital.rating).toFixed(1) : null;
  const ratingCol = rating >= 4.5 ? '#D97706' : rating >= 4 ? '#16A34A' : 'var(--text-muted)';

  return (
    <div
      onClick={() => navigate(`/hospitals/${hospital.id}`)}
      style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24,
        boxShadow: 'var(--shadow-md)', cursor: 'pointer',
        transition: 'all 0.2s', display: 'flex', gap: 18, alignItems: 'flex-start',
        border: '1.5px solid transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = PLT; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', background: PLT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0, overflow: 'hidden', border: `2px solid ${BRD}` }}>
        {hospital.image || hospital.logo
          ? <img src={hospital.image || hospital.logo} alt={hospital.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '🏥'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {hospital.name}
          </h3>
          {rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-subtle)', border: `1px solid ${BRD}`, borderRadius: 'var(--radius-md)', padding: '3px 10px', flexShrink: 0 }}>
              <span style={{ fontSize: 12 }}>⭐</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: ratingCol }}>{rating}</span>
            </div>
          )}
        </div>
        {hospital.city && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: MT, display: 'flex', alignItems: 'center', gap: 4 }}>
            📍 {(()=>{const c=CITIES.find(x=>x.value.toLowerCase()===String(hospital.city).toLowerCase());return c?(c.label[cardLang]||c.label.en):hospital.city;})()}
          </p>
        )}
        {hospital.specialties?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {hospital.specialties.slice(0, 3).map(s => (
              <span key={s} style={{ background: 'var(--bg-subtle)', color: P, border: `1px solid ${BRD}`, padding: '3px 10px', borderRadius: 'var(--radius-lg)', fontSize: 11, fontWeight: 700 }}>{s}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {hospital.doctors_count !== undefined && (
            <span style={{ fontSize: 12, color: TXT, background: 'var(--bg-subtle)', border: `1px solid ${BRD}`, borderRadius: 'var(--radius-lg)', padding: '3px 10px', fontWeight: 700 }}>
              👨‍⚕️ {t('hospitalsPage.results.doctors', { count: hospital.doctors_count })}
            </span>
          )}
          {hospital.phone && (
            <span style={{ fontSize: 12, color: MT }}>📞 {hospital.phone}</span>
          )}
          {hospital.is_active && (
            <span style={{ fontSize: 11, background: '#F0FDF4', color: '#16A34A', borderRadius: 'var(--radius-lg)', padding: '2px 9px', fontWeight: 600 }}>
              {t('hospitalsPage.results.active')}
            </span>
          )}
        </div>
      </div>
      <div style={{ color: P, fontSize: 20, alignSelf: 'center', flexShrink: 0 }}>›</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 18 }}>
      <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', background: 'var(--border-base)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 18, background: 'var(--border-base)', borderRadius: 'var(--radius-md)', width: '60%' }} />
        <div style={{ height: 14, background: 'var(--border-base)', borderRadius: 'var(--radius-md)', width: '40%' }} />
        <div style={{ height: 12, background: 'var(--border-base)', borderRadius: 'var(--radius-md)', width: '30%' }} />
      </div>
    </div>
  );
}

export default function HospitalsPage() {
  const { t, isRTL, lang } = useTranslation();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 400);

  const params = {
    ...(debouncedQuery && { q: debouncedQuery }),
    ...(city && { city }),
    ...(minRating && { min_rating: minRating }),
    ...(sortBy && { ordering: sortBy }),
    page,
    page_size: 12,
  };

  const { data, isLoading, isFetching } = useHospitals(params);
  const hospitals = data?.results || data || [];
  const total = data?.count || hospitals.length;
  const totalPages = data?.total_pages || Math.ceil(total / 12) || 1;

  const hasFilters = city || minRating || sortBy;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', fontFamily: "'Cairo', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: TXT }}>
          {t('hospitalsPage.title')}
        </h1>
        <p style={{ margin: 0, color: MT, fontSize: 14 }}>
          {isLoading
            ? t('hospitalsPage.loading')
            : t(total === 1 ? 'hospitalsPage.subtitle' : 'hospitalsPage.subtitlePlural', { count: total })}
        </p>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, background: 'var(--bg-card)', border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-lg)', padding: '12px 20px', boxShadow: 'var(--shadow-sm)', maxWidth: 600 }}>
        <span style={{ fontSize: 18 }}>🔍</span>
        <input
          type="text" placeholder={t('hospitalsPage.searchPlaceholder')}
          value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: TXT, background: 'transparent' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: MT, padding: 0 }}>✕</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28, alignItems: 'start' }}>

        {/* Sidebar filters */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TXT }}>{t('hospitalsPage.filters.title')}</h3>
            {hasFilters && (
              <button onClick={() => { setCity(''); setMinRating(''); setSortBy(''); setPage(1); }}
                style={{ background: 'none', border: 'none', color: '#E97D61', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('hospitalsPage.filters.clearAll')}
              </button>
            )}
          </div>

          {/* City */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: MT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('hospitalsPage.filters.city')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => { setCity(''); setPage(1); }}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${city === '' ? P : BRD}`, background: city === '' ? P : 'transparent', color: city === '' ? '#fff' : TXT, fontSize: 13, fontWeight: city === '' ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                {t('hospitalsPage.filters.allCities')}
              </button>
              {CITIES.map(c => (
                <button key={c.value} onClick={() => { setCity(c.value); setPage(1); }}
                  style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${city === c.value ? P : BRD}`, background: city === c.value ? P : 'transparent', color: city === c.value ? '#fff' : TXT, fontSize: 13, fontWeight: city === c.value ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                  📍 {c.label[lang] || c.label.en}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: MT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('hospitalsPage.filters.minRating')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => { setMinRating(''); setPage(1); }}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${minRating === '' ? P : BRD}`, background: minRating === '' ? P : 'transparent', color: minRating === '' ? '#fff' : TXT, fontSize: 13, fontWeight: minRating === '' ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                {t('hospitalsPage.filters.anyRating')}
              </button>
              {RATINGS.map(r => (
                <button key={r.value} onClick={() => { setMinRating(r.value); setPage(1); }}
                  style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${minRating === r.value ? P : BRD}`, background: minRating === r.value ? P : 'transparent', color: minRating === r.value ? '#fff' : TXT, fontSize: 13, fontWeight: minRating === r.value ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: MT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('hospitalsPage.filters.sortBy')}
            </p>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${BRD}`, fontSize: 13, background: 'var(--bg-card)', color: TXT, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">{t('hospitalsPage.filters.sortDefault')}</option>
              <option value="-rating">{t('hospitalsPage.filters.sortRating')}</option>
              <option value="-doctors_count">{t('hospitalsPage.filters.sortDoctors')}</option>
              <option value="name">{t('hospitalsPage.filters.sortName')}</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: MT, fontWeight: 600 }}>
              {isFetching && !isLoading
                ? t('hospitalsPage.results.updating')
                : t('hospitalsPage.results.showing', { shown: hospitals.length, total })}
            </p>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${BRD}`, background: 'var(--bg-card)', color: page === 1 ? MT : TXT, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                  {t('hospitalsPage.results.prev')}
                </button>
                <span style={{ fontSize: 13, color: MT, fontWeight: 600 }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${BRD}`, background: 'var(--bg-card)', color: page === totalPages ? MT : TXT, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                  {t('hospitalsPage.results.next')}
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : hospitals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🏥</div>
              <h3 style={{ margin: '0 0 8px', color: TXT, fontSize: 18, fontWeight: 800 }}>{t('hospitalsPage.empty.title')}</h3>
              <p style={{ margin: '0 0 20px', color: MT, fontSize: 14 }}>{t('hospitalsPage.empty.hint')}</p>
              {hasFilters && (
                <button onClick={() => { setCity(''); setMinRating(''); setSortBy(''); setQuery(''); setPage(1); }}
                  style={{ background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('hospitalsPage.empty.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hospitals.map(h => <HospitalCard key={h.id} hospital={h} t={t} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
