/**
 * AvailabilityCalendar.jsx — Date selection calendar (canonical implementation)
 * CRITICAL FIX: was circular re-export chain with no actual implementation
 * i18n FIX: DAYS and MONTHS now use useTranslation
 */
import { useState } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { tokens } from '../../../theme/tokens';

const P   = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PLT = tokens?.colors?.primary?.lighter || '#E0F7FA';

function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return toISO(a) === toISO(b);
}

export function AvailabilityCalendar({ selectedDate, onDateChange, availableDates, onSelectDate }) {
  // Bug #9 FIX: support both onDateChange and onSelectDate prop names (BookingPage uses onSelectDate)
  const handleSelect = onSelectDate || onDateChange;
  const { t, isRTL } = useTranslation();
  const DAYS   = t('availabilityCalendar.days');
  const MONTHS = t('availabilityCalendar.months');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });

  const firstDay    = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDay     = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));

  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const monthName = Array.isArray(MONTHS) ? MONTHS[viewDate.getMonth()] : '';
  const dayNames  = Array.isArray(DAYS)   ? DAYS                        : [];

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 16, border: '1px solid var(--border-base)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 'var(--radius-md)' }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
          {monthName} {viewDate.getFullYear()}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 'var(--radius-md)' }}>›</button>
      </div>

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {dayNames.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const isPast     = date < today;
          const isToday    = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, new Date(selectedDate));
          const hasSlots   = !availableDates || availableDates.includes(toISO(date));
          const disabled   = isPast || !hasSlots;
          const availableBg = isToday ? 'rgba(34, 211, 238, 0.20)' : (hasSlots && !disabled ? 'rgba(14, 116, 144, 0.18)' : 'transparent');
          const availableColor = disabled ? 'var(--text-hint)' : (hasSlots ? 'var(--text-h)' : 'var(--text-hint)');

          return (
            <button
              key={date.getDate()}
              disabled={disabled}
              onClick={() => !disabled && handleSelect?.(toISO(date))}
              style={{
                padding: '8px 2px', borderRadius: 'var(--radius-md)', border: isSelected ? `1.5px solid ${P}` : (hasSlots && !disabled ? '1px solid rgba(34, 211, 238, 0.35)' : '1px solid transparent'), cursor: disabled ? 'not-allowed' : 'pointer',
                background: isSelected ? `linear-gradient(135deg, ${P}, #22D3EE)` : availableBg,
                color: isSelected ? '#fff' : availableColor,
                fontSize: 13, fontWeight: isSelected || isToday || hasSlots ? 800 : 500,
                transition: 'all .15s', textAlign: 'center',
                opacity: disabled ? 0.42 : 1,
                boxShadow: isSelected ? `0 8px 18px ${P}35` : 'none',
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
