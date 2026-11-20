/**
 * AdvancedFilterBar.jsx — مكوّن الفلاتر المتقدمة
 * Sprint 3: Advanced Filtering — فلاتر متقدمة لكل الجداول
 *
 * الاستخدام:
 *   <AdvancedFilterBar
 *     filters={filtersConfig}     // مصفوفة من { key, label, type, options? }
 *     values={filterValues}       // { [key]: value }
 *     onChange={setFilterValues}  // setState function
 *     onReset={resetFn}           // دالة إعادة تعيين
 *     resultCount={n}             // عدد النتائج بعد الفلتر
 *   />
 *
 * أنواع الفلاتر:
 *   type: 'select'  — قائمة منسدلة بخيارات
 *   type: 'date'    — اختيار تاريخ
 *   type: 'daterange' — نطاق تاريخ (from/to)
 *   type: 'boolean' — نشط / غير نشط
 */
import { useState } from 'react';
import { tokens } from '../../../theme/tokens';

const P    = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PL   = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const G100 = tokens?.colors?.gray?.[100]       || '#F3F4F6';
const G200 = tokens?.colors?.gray?.[200]       || '#E5E7EB';
const G300 = tokens?.colors?.gray?.[300]       || '#D1D5DB';
const G400 = tokens?.colors?.gray?.[400]       || '#9CA3AF';
const G500 = tokens?.colors?.gray?.[500]       || '#6B7280';
const G700 = tokens?.colors?.gray?.[700]       || '#374151';
const G900 = tokens?.colors?.gray?.[900]       || '#111827';

// ── Shared select / input style ───────────────────────────────────────────────
function ctrlStyle(focused) {
  return {
    padding: '7px 12px', borderRadius: 10, border: `1px solid ${focused ? P : G200}`,
    fontSize: 13, outline: 'none', color: G700,
    background: 'var(--bg-card, #fff)', fontFamily: 'inherit', cursor: 'pointer',
    transition: 'border-color .15s',
  };
}

// ── Single filter field ───────────────────────────────────────────────────────
function FilterField({ filter, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const onFocus = () => setFocused(true);
  const onBlur  = () => setFocused(false);

  if (filter.type === 'select') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: G500, letterSpacing: 0.4 }}>
          {filter.label}
        </label>
        <select
          value={value || ''}
          onChange={e => onChange(filter.key, e.target.value || null)}
          style={ctrlStyle(focused)}
          onFocus={onFocus} onBlur={onBlur}
        >
          <option value="">الكل</option>
          {(filter.options || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (filter.type === 'boolean') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: G500, letterSpacing: 0.4 }}>
          {filter.label}
        </label>
        <select
          value={value === null || value === undefined ? '' : String(value)}
          onChange={e => {
            const v = e.target.value;
            onChange(filter.key, v === '' ? null : v === 'true');
          }}
          style={ctrlStyle(focused)}
          onFocus={onFocus} onBlur={onBlur}
        >
          <option value="">الكل</option>
          <option value="true">نشط</option>
          <option value="false">غير نشط</option>
        </select>
      </div>
    );
  }

  if (filter.type === 'date') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: G500, letterSpacing: 0.4 }}>
          {filter.label}
        </label>
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(filter.key, e.target.value || null)}
          style={ctrlStyle(focused)}
          onFocus={onFocus} onBlur={onBlur}
        />
      </div>
    );
  }

  if (filter.type === 'daterange') {
    const from = value?.from || '';
    const to   = value?.to   || '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: G500, letterSpacing: 0.4 }}>
          {filter.label}
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="date"
            value={from}
            onChange={e => onChange(filter.key, { from: e.target.value || null, to })}
            style={{ ...ctrlStyle(focused), flex: 1, minWidth: 0 }}
            placeholder="من"
            onFocus={onFocus} onBlur={onBlur}
          />
          <span style={{ fontSize: 11, color: G400 }}>←</span>
          <input
            type="date"
            value={to}
            onChange={e => onChange(filter.key, { from, to: e.target.value || null })}
            style={{ ...ctrlStyle(focused), flex: 1, minWidth: 0 }}
            placeholder="إلى"
            onFocus={onFocus} onBlur={onBlur}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdvancedFilterBar({
  filters = [],
  values  = {},
  onChange,
  onReset,
  resultCount,
}) {
  const [expanded, setExpanded] = useState(false);

  // Count active filters (non-null / non-empty)
  const activeCount = Object.values(values).filter(v => {
    if (v === null || v === undefined || v === '') return false;
    if (typeof v === 'object') return Object.values(v).some(vv => vv);
    return true;
  }).length;

  const handleChange = (key, val) => {
    onChange({ ...values, [key]: val });
  };

  const handleReset = () => {
    onReset?.();
    // Collapse if all filters were already shown
  };

  return (
    <div style={{
      background: 'var(--bg-card, #fff)',
      border: `1px solid ${activeCount > 0 ? P : G200}`,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      transition: 'border-color .2s',
      boxShadow: activeCount > 0 ? `0 0 0 3px ${PL}` : 'none',
    }}>
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '12px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: G900 }}>فلاتر متقدمة</span>
        {activeCount > 0 && (
          <span style={{
            background: P, color: '#fff', fontSize: 10, fontWeight: 800,
            borderRadius: 99, padding: '1px 8px',
          }}>
            {activeCount} نشط
          </span>
        )}
        {resultCount !== undefined && (
          <span style={{ fontSize: 12, color: G500, marginRight: 'auto' }}>
            {resultCount.toLocaleString('ar-EG')} نتيجة
          </span>
        )}
        <span style={{
          color: G400, fontSize: 12, marginRight: resultCount !== undefined ? 0 : 'auto',
          transition: 'transform .2s', display: 'inline-block',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
      </button>

      {/* Filter fields */}
      {expanded && (
        <div style={{ padding: '4px 16px 16px', borderTop: `1px solid ${G100}` }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px 16px',
            marginTop: 14,
          }}>
            {filters.map(filter => (
              <FilterField
                key={filter.key}
                filter={filter}
                value={values[filter.key]}
                onChange={handleChange}
              />
            ))}
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${G100}` }}>
              <span style={{ fontSize: 12, color: G500, alignSelf: 'center' }}>فعّال:</span>
              {filters.map(filter => {
                const val = values[filter.key];
                if (val === null || val === undefined || val === '') return null;
                if (typeof val === 'object' && !Object.values(val).some(v => v)) return null;

                let label = '';
                if (filter.type === 'boolean') label = val ? 'نشط' : 'غير نشط';
                else if (filter.type === 'daterange') label = `${val.from || '?'} → ${val.to || '?'}`;
                else if (filter.type === 'select') {
                  const opt = filter.options?.find(o => o.value === val);
                  label = opt?.label || val;
                } else label = String(val);

                return (
                  <span
                    key={filter.key}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: PL, color: P, fontSize: 12, fontWeight: 600,
                      padding: '4px 10px', borderRadius: 99, border: `1px solid ${P}33`,
                    }}
                  >
                    {filter.label}: {label}
                    <button
                      onClick={() => handleChange(filter.key, null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: P, padding: 0, lineHeight: 1, fontSize: 14 }}
                    >×</button>
                  </span>
                );
              })}
              <button
                onClick={handleReset}
                style={{
                  fontSize: 12, color: tokens.colors.danger.DEFAULT, background: 'none',
                  border: `1px solid ${tokens.colors.danger.DEFAULT}44`, borderRadius: 99,
                  padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                مسح الكل ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hook: apply filters to array ─────────────────────────────────────────────
/**
 * applyFilters(data, filterValues, fieldMap)
 *
 * fieldMap: { [filterKey]: fieldNameOrFn }
 * e.g. { status: 'is_active', specialty: 'specialty', joined_from: (item, val) => ... }
 */
export function applyFilters(data, filterValues, fieldMap) {
  if (!data?.length) return data;
  let result = data;

  Object.entries(filterValues).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') return;
    if (typeof val === 'object' && !Object.values(val).some(v => v)) return;

    const fieldOrFn = fieldMap[key];
    if (!fieldOrFn) return;

    if (typeof fieldOrFn === 'function') {
      result = result.filter(item => fieldOrFn(item, val));
    } else {
      // boolean filter
      if (typeof val === 'boolean') {
        result = result.filter(item => Boolean(item[fieldOrFn]) === val);
      }
      // date range
      else if (typeof val === 'object' && ('from' in val || 'to' in val)) {
        const { from, to } = val;
        result = result.filter(item => {
          const d = item[fieldOrFn] ? new Date(item[fieldOrFn]).getTime() : null;
          if (!d) return true;
          if (from && d < new Date(from).getTime()) return false;
          if (to   && d > new Date(to).getTime() + 86_400_000) return false;
          return true;
        });
      }
      // string match
      else {
        result = result.filter(item => String(item[fieldOrFn] || '') === String(val));
      }
    }
  });

  return result;
}
