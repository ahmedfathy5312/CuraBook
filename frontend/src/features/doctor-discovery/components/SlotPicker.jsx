/**
 * SlotPicker.jsx — Slot selection component (canonical implementation)
 * CRITICAL FIX: was circular re-export chain with no actual implementation
 *
 * Bug #9 FIX: Enhanced empty state — shows a clear, helpful message with a
 * "Try another date" button instead of a bare "no slots" text, so the patient
 * isn't left confused on an empty page.
 */
import { useTranslation } from '../../../i18n/useTranslation';
import { tokens } from '../../../theme/tokens';

const P   = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PLT = tokens?.colors?.primary?.lighter || '#E0F7FA';

/**
 * FIX Bug#1: API returns "start" as a full ISO datetime string (e.g. "2024-12-01T09:00:00Z").
 * The old code expected "start_time" as "HH:MM" which does not exist in SlotSerializer.
 * This function now handles both formats.
 */
function formatSlotTime(timeInput) {
  if (!timeInput) return '—';
  try {
    // Full ISO datetime string (e.g. "2024-12-01T09:00:00Z" or "2024-12-01T09:00:00")
    if (timeInput.includes('T') || timeInput.length > 8) {
      const d = new Date(timeInput);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        const m = d.getMinutes();
        const period = h >= 12 ? 'PM' : 'AM';
        const hour   = h > 12 ? h - 12 : h || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
      }
    }
    // HH:MM fallback
    const [h, m] = timeInput.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h > 12 ? h - 12 : h || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  } catch { return timeInput; }
}

export function SlotPicker({ slots = [], selectedSlot, onSelect, loading, onPickAnotherDate }) {
  const { t, isRTL } = useTranslation();

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ height: 40, borderRadius: 'var(--radius-md)', background: 'var(--border-base)', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  // Bug #9 FIX: enhanced empty state with actionable guidance
  if (!slots.length) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '28px 20px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1.5px dashed var(--border-strong, var(--border-base))',
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
          {isRTL ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots for this date'}
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {isRTL
            ? 'جرّب يوماً آخر — قد تكون هناك مواعيد في أيام مختلفة'
            : 'Try a different date — slots may be available on other days'}
        </p>
        {onPickAnotherDate && (
          <button
            onClick={onPickAnotherDate}
            style={{
              background: P,
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '9px 22px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {isRTL ? '← اختر يوماً آخر' : '← Pick another date'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
      {slots.map(slot => {
        const isSelected = selectedSlot?.id === slot.id;
        const isBooked   = slot.is_booked || slot.status === 'booked';
        return (
          <button
            key={slot.id}
            disabled={isBooked}
            onClick={() => !isBooked && onSelect?.(slot)}
            style={{
              padding: '10px 8px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${isSelected ? P : isBooked ? 'var(--border-base)' : 'var(--border)'}`,
              background: isSelected ? P : isBooked ? 'var(--bg-page)' : 'var(--bg-card)',
              color: isSelected ? '#fff' : isBooked ? 'var(--text-muted)' : 'var(--text-body)',
              fontSize: 13, fontWeight: 600, cursor: isBooked ? 'not-allowed' : 'pointer',
              transition: 'all .15s', textAlign: 'center',
            }}
          >
            {formatSlotTime(slot.start_time || slot.start)}
          </button>
        );
      })}
    </div>
  );
}

export default SlotPicker;
