/**
 * DoctorCard.jsx — Design System v18
 * Changes from old design:
 *  - Avatar border-radius: 50% (دائري — standard طبي)
 *  - Specialty with emoji icon
 *  - Price visible in card directly (not after click)
 *  - Accent CTA button in card
 *  - Hover: translateY(-2px) + shadow-md + border-color primary-light
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import { getLocalizedName, translateCity } from '../../../utils/getLocalizedName';

function StarRating({ value }) {
  const n = Math.round(Math.min(Math.max(Number(value || 0), 0), 5));
  return (
    <span aria-label={`تقييم ${value} من 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? 'var(--gold)' : 'var(--border-base)', fontSize: '13px' }}>★</span>
      ))}
    </span>
  );
}

export default function DoctorCard({ doctor }) {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  if (!doctor) return null;

  const rating       = doctor.rating ? Number(doctor.rating).toFixed(1) : null;
  const fee          = doctor.consultation_fee;
  const yearsExp     = doctor.years_of_experience;
  const specialty    = doctor.specialty || doctor.specialization || '—';
  const name         = getLocalizedName(doctor, lang, 'doctor') || `د. ${doctor.first_name || ''}`;
  // Section 8 Fix: translate raw English city from backend to Arabic when UI is Arabic
  const cityRaw      = doctor.city || doctor.clinic_city || doctor.hospital_city || '';
  const city         = translateCity(cityRaw, lang);
  const reviewsCount = doctor.reviews_count ?? 0;
  const isAvailToday = doctor.available_today ||
    doctor.next_available_date === new Date().toISOString().slice(0, 10);
  const nextAvailable = doctor.next_available_date;
  const availLabel = isAvailToday
    ? t('doctorCard.availableToday')
    : nextAvailable ? t('doctorCard.nextAvailable').replace('{{date}}', nextAvailable) : null;
  const bookableLocations = Array.isArray(doctor.locations) && doctor.locations.length
    ? doctor.locations
    : [
        doctor.clinic_id && {
          type: 'clinic',
          id: doctor.clinic_id,
          name: doctor.clinic_name,
          fee,
        },
        doctor.hospital_id && {
          type: 'hospital',
          id: doctor.hospital_id,
          name: doctor.hospital_name,
          fee,
        },
      ].filter(Boolean);

  // Map specialty to emoji
  const SPEC_ICONS = {
    'قلب': '🫀', 'cardio': '🫀', 'أطفال': '👶', 'pediatric': '👶',
    'نساء': '🤱', 'ob': '🤱', 'عظام': '🦴', 'ortho': '🦴',
    'جلدية': '🧴', 'derm': '🧴', 'باطنة': '🩺', 'internal': '🩺',
    'أعصاب': '🧠', 'neuro': '🧠', 'عيون': '👁', 'opth': '👁',
    'أنف': '👃', 'ent': '👃', 'نفسية': '🧘', 'psych': '🧘',
  };
  const specIcon = Object.entries(SPEC_ICONS).find(([k]) =>
    specialty.toLowerCase().includes(k.toLowerCase())
  )?.[1] || '👨‍⚕️';

  return (
    <div
      onClick={() => navigate(`/doctors/${doctor.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/doctors/${doctor.id}`)}
      aria-label={`عرض بروفايل ${name}`}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        border: '1px solid var(--border-base)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        gap: '16px',
        outline: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* ── Avatar: 50% دائري — standard طبي ── */}
      <div style={{ flexShrink: 0, position: 'relative', display: 'inline-block' }}>
        {/* Available Today Pulse Indicator */}
        {isAvailToday && (
          <div style={{
            position: 'absolute', bottom: '2px', right: '2px', zIndex: 2,
            width: '13px', height: '13px', borderRadius: '50%',
            background: 'var(--success)', border: '2px solid white',
          }}>
            <style>{`
              @keyframes availPulse {
                0%, 100% { box-shadow: 0 0 0 0 var(--success-light); }
                50% { box-shadow: 0 0 0 5px rgba(26,138,90,0); }
              }
            `}</style>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', animation: 'availPulse 2s infinite' }} />
          </div>
        )}
        {doctor.avatar || doctor.profile_image ? (
          <img
            src={doctor.avatar || doctor.profile_image}
            alt={name}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',   /* دائري — standard طبي */
              objectFit: 'cover',
              border: '2px solid var(--primary-pale)',
            }}
          />
        ) : (
          <Avatar
            name={name}
            size={72}
            style={{
              borderRadius: '50%',
              background: 'var(--primary-pale)',
              color: 'var(--primary)',
              fontSize: '22px',
              fontWeight: 700,
            }}
          />
        )}
      </div>

      {/* ── Info ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Name */}
        <p style={{
          margin: '0 0 3px',
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text-h)',
          fontFamily: "'Cairo', sans-serif",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </p>

        {/* Specialty with emoji */}
        <p style={{
          margin: '0 0 10px',
          fontSize: '13px',
          color: 'var(--primary)',
          fontWeight: 600,
          fontFamily: "'Cairo', sans-serif",
        }}>
          {specIcon} {specialty}
        </p>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
          {rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <StarRating value={rating} />
              <strong style={{ color: 'var(--text-h)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{rating}</strong>
              {reviewsCount > 0 && <span>({reviewsCount})</span>}
            </span>
          )}
          {yearsExp && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Cairo', sans-serif" }}>
              🏆 {yearsExp} سنة خبرة
            </span>
          )}
          {city && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Cairo', sans-serif" }}>
              📍 {city}
            </span>
          )}
        </div>

        {/* Availability badge */}
        {availLabel && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              background: isAvailToday ? 'var(--success-light)' : 'var(--primary-pale)',
              color:      isAvailToday ? 'var(--success-dark)'  : 'var(--primary-dark)',
              fontFamily: "'Cairo', sans-serif",
            }}>
              {isAvailToday ? '✓ ' : '📅 '}{availLabel}
            </span>
          </div>
        )}

        {/* ── Footer: Price + CTA ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {fee ? (
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)', fontFamily: "'Cairo', sans-serif" }}>سعر الكشف</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {fee} <span style={{ fontSize: '12px', fontFamily: "'Cairo', sans-serif" }}>جنيه</span>
              </p>
            </div>
          ) : <span />}

          {/* Accent CTA — احجز الآن */}
          {/* BUG#1 FIX: Navigate directly to /book/:id with clinic/hospital context.
              Search API now returns clinic_id and hospital_id so BookingPage can
              fetch the correct available slots for this doctor's location. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(bookableLocations.length ? bookableLocations : [null]).map((loc) => {
              const params = new URLSearchParams();
              if (loc?.type && loc?.id) params.set(loc.type, loc.id);
              const qs = params.toString();
              const label = loc?.name
                ? `${loc.type === 'clinic' ? 'Clinic' : 'Hospital'}: ${loc.name}`
                : t('doctorCard.bookNow');
              return (
                <button
                  key={loc ? `${loc.type}-${loc.id}` : 'default'}
                  onClick={e => {
                    e.stopPropagation();
                    navigate(`/book/${doctor.id}${qs ? `?${qs}` : ''}`);
                  }}
                  title={label}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow-sm)',
                    whiteSpace: 'nowrap',
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'var(--primary-dark)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {loc?.name ? `${loc.type === 'clinic' ? '🏥' : '🏨'} ${loc.name}` : t('doctorCard.bookNow')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
