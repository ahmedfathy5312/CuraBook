/**
 * BulkActionBar.jsx — Floating action bar for bulk operations
 * Sprint 4: Bulk Actions
 *
 * Props:
 *  count         — number of selected rows
 *  onClear       — clears selection
 *  onActivate    — optional: bulk activate
 *  onDeactivate  — optional: bulk deactivate
 *  onDelete      — optional: bulk delete (triggers confirm dialog)
 *  onExport      — export selected to CSV
 *  loading       — disable buttons during mutation
 */
import { tokens } from '../../../theme/tokens';

const PRIMARY  = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const DANGER   = tokens?.colors?.danger?.DEFAULT   || '#E97D61';
const SUCCESS  = '#22C55E';
const WARNING  = '#F59E0B';

export default function BulkActionBar({
  count       = 0,
  onClear,
  onActivate,
  onDeactivate,
  onDelete,
  onExport,
  loading     = false,
}) {
  if (count === 0) return null;

  const btn = (label, onClick, color = PRIMARY, icon = '') => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px',
        background: color,
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
        whiteSpace: 'nowrap',
      }}
      onMouseOver={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
      onMouseOut={e => { e.currentTarget.style.opacity = loading ? '0.7' : '1'; }}
    >
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {label}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="إجراءات جماعية"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: tokens.colors.gray[900] || '#1E293B',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: 'bulkSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        minWidth: 'max-content',
      }}
    >
      {/* Count badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingRight: 12,
        borderRight: '1px solid rgba(255,255,255,0.15)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: PRIMARY,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          {count}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600 }}>
          محدد
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {onActivate   && btn('تفعيل',     onActivate,   SUCCESS,  '✅')}
        {onDeactivate && btn('تعطيل',     onDeactivate, WARNING,  '⏸')}
        {onDelete     && btn('حذف',       onDelete,     DANGER,   '🗑')}
        {onExport     && btn('تصدير CSV', onExport,     '#6366F1','📥')}
      </div>

      {/* Divider + Clear */}
      <div style={{ paddingLeft: 6, borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
        <button
          onClick={onClear}
          disabled={loading}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.65)',
            borderRadius: 7,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
        >
          ✕ إلغاء
        </button>
      </div>

      <style>{`
        @keyframes bulkSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
