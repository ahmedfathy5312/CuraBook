import { Select } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import useTranslation from '../../../i18n/useTranslation';

const SPECIALTIES = [
  'Cardiology','Dermatology','ENT','Gastroenterology',
  'Gynecology','Ophthalmology','Orthopedics','Pediatrics',
  'Psychiatry','Neurology','Urology','Internal Medicine',
  'General Practice','Surgery','Radiology','Oncology',
];

const CITIES = [
  'Cairo','Giza','Alexandria','Assiut','Luxor','Aswan',
  'Mansoura','Tanta','Zagazig','Ismailia','Suez','Port Said',
  'Fayoum','Minya','Sohag',
];

const RATINGS = [
  { value: '4.5', label: '⭐ 4.5 & above' },
  { value: '4.0', label: '⭐ 4.0 & above' },
  { value: '3.5', label: '⭐ 3.5 & above' },
  { value: '3.0', label: '⭐ 3.0 & above' },
];

const SORT_OPTIONS = [
  { value: 'rating',       label: '⭐ Highest Rating' },
  { value: 'experience',   label: '🏆 Most Experienced' },
  { value: 'appointments', label: '📅 Most Appointments' },
  { value: 'fee_asc',      label: '💰 Lowest Fee' },
  { value: 'fee_desc',     label: '💰 Highest Fee' },
];

const PRICE_OPTIONS = [
  { value: '200',  label: 'Up to EGP 200' },
  { value: '500',  label: 'Up to EGP 500' },
  { value: '1000', label: 'Up to EGP 1,000' },
  { value: '2000', label: 'Up to EGP 2,000' },
];

export function DoctorFilters({ filters, onUpdate, onReset, loading }) {
  const activeCount = [
    filters.specialty, filters.city, filters.rating,
    filters.availability, filters.price_max, filters.gender,
  ].filter(Boolean).length;

  return (
    <div
      role="search"
      aria-label="Filter doctors"
      style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
          🔧 Filters
          {activeCount > 0 && (
            <span style={{
              marginInlineStart: '8px', background: 'var(--primary)', color: '#fff',
              borderRadius: 'var(--radius-full)', padding: '1px 7px', fontSize: '11px',
            }}>
              {activeCount}
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            aria-label="Clear all filters"
            style={{
              fontSize: '12px', color: '#E97D61', cursor: 'pointer',
              border: '1.5px solid #E97D61', background: 'none', fontWeight: 600,
              fontFamily: 'inherit', padding: '4px 12px', borderRadius: 'var(--radius-full)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
          >
            Clear all
          </button>
        )}
      </div>

      <Select
        label="Specialization"
        value={filters.specialty}
        onChange={e => onUpdate('specialty', e.target.value)}
        placeholder="All Specializations"
        options={SPECIALTIES.map(s => ({ value: s, label: s }))}
        disabled={loading}
      />

      <Select
        label="City / Location"
        value={filters.city}
        onChange={e => onUpdate('city', e.target.value)}
        placeholder="All Cities"
        options={CITIES.map(c => ({ value: c, label: c }))}
        disabled={loading}
      />

      <Select
        label="Minimum Rating"
        value={filters.rating}
        onChange={e => onUpdate('rating', e.target.value)}
        placeholder="Any Rating"
        options={RATINGS}
        disabled={loading}
      />

      <Select
        label="Max Consultation Fee"
        value={filters.price_max}
        onChange={e => onUpdate('price_max', e.target.value)}
        placeholder="Any Price"
        options={PRICE_OPTIONS}
        disabled={loading}
      />

      {/* MISS-04 FIX: Gender Filter */}
      <div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-body)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Doctor Gender
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ value: '', label: 'Any' }, { value: 'male', label: '👨 Male' }, { value: 'female', label: '👩 Female' }].map(opt => (
            <button
              key={opt.value}
              onClick={() => onUpdate('gender', opt.value)}
              disabled={loading}
              style={{
                flex: 1, padding: '8px 4px', fontSize: '12px', fontWeight: 600,
                borderRadius: 'var(--radius-md)', border: '1.5px solid',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                borderColor: filters.gender === opt.value ? 'var(--primary)' : 'var(--border)',
                background: filters.gender === opt.value ? 'var(--bg)' : 'var(--bg-card)',
                color: filters.gender === opt.value ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="Sort By"
        value={filters.sort}
        onChange={e => onUpdate('sort', e.target.value)}
        options={SORT_OPTIONS}
        disabled={loading}
      />

      {/* Availability Toggle */}
      <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filters.availability === 'today'}
            onChange={e => onUpdate('availability', e.target.checked ? 'today' : '')}
            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
            aria-label="Show only doctors available today"
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
            ✅ Available Today Only
          </span>
        </label>
      </div>
    </div>
  );
}

export default DoctorFilters;
