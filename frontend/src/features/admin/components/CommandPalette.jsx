/**
 * CommandPalette.jsx — Global Search / Command Palette (Cmd+K / Ctrl+K)
 * Sprint 4: Global Search
 *
 * Props:
 *  open          — boolean
 *  onClose       — close handler
 *  onNavigate    — (sectionId) => void
 *  users         — array
 *  doctors       — array
 *  hospitals     — array
 *  patients      — array
 *  appointments  — array
 *  isLoading     — bool: show spinner while data loads
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { tokens } from '../../../theme/tokens';
import Avatar from '../../../components/ui/Avatar';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';

/* ── helpers ─────────────────────────────────────────────── */
function normalize(str = '') {
  return String(str).toLowerCase().trim();
}

function highlight(text, query) {
  if (!query || !text) return text ?? '—';
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    normalize(p) === normalize(query)
      ? <mark key={i} style={{ background: `${PRIMARY}33`, color: PRIMARY, borderRadius: 3, padding: '0 1px' }}>{p}</mark>
      : p
  );
}

/* ── category definitions ────────────────────────────────── */
const CATEGORIES = [
  {
    id: 'users',
    label: 'المستخدمون',
    icon: '🧑‍💼',
    section: 'users',
    fields: ['full_name', 'email'],
    getTitle: r => r.full_name || r.email || '—',
    getSub:   r => `${r.role || 'مستخدم'} · ${r.email || ''}`,
    getAvatar: r => r.full_name,
  },
  {
    id: 'doctors',
    label: 'الأطباء',
    icon: '👨‍⚕️',
    section: 'doctors',
    fields: ['name', 'specialty', 'hospital_name'],
    getTitle: r => r.name || '—',
    getSub:   r => `${r.specialty || ''}${r.hospital_name ? ' · ' + r.hospital_name : ''}`,
    getAvatar: r => r.name,
  },
  {
    id: 'hospitals',
    label: 'المستشفيات',
    icon: '🏥',
    section: 'hospitals',
    fields: ['name', 'city'],
    getTitle: r => r.name || '—',
    getSub:   r => r.city || '',
    getAvatar: r => r.name,
  },
  {
    id: 'patients',
    label: 'المرضى',
    icon: '👥',
    section: 'patients',
    fields: ['full_name', 'email', 'phone'],
    getTitle: r => r.full_name || r.email || '—',
    getSub:   r => r.email || r.phone || '',
    getAvatar: r => r.full_name,
  },
  {
    id: 'appointments',
    label: 'المواعيد',
    icon: '📅',
    section: 'appointments',
    fields: ['patient_name', 'doctor_name', 'hospital_name'],
    getTitle: r => `${r.patient_name || '—'} ← ${r.doctor_name || '—'}`,
    getSub:   r => `${r.date || ''} · ${r.status || ''}`,
    getAvatar: r => r.patient_name,
  },
];

const QUICK_LINKS = [
  { id: 'overview',     label: 'الرئيسية',       icon: '📊' },
  { id: 'analytics',   label: 'التحليلات',       icon: '📈' },
  { id: 'reports',     label: 'التقارير',        icon: '📄' },
  { id: 'schedule',    label: 'الجدول الزمني',   icon: '🗓️' },
  { id: 'chat',        label: 'المحادثات',       icon: '💬' },
  { id: 'monitoring',  label: 'مراقبة النظام',   icon: '🖥️' },
  { id: 'settings',    label: 'الإعدادات',       icon: '⚙️' },
  { id: 'notifications', label: 'الإشعارات',    icon: '🔔' },
];

/* ── main component ──────────────────────────────────────── */
export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  users        = [],
  doctors      = [],
  hospitals    = [],
  patients     = [],
  appointments = [],
  isLoading    = false,
}) {
  const [query, setQuery]       = useState('');
  const [cursor, setCursor]     = useState(0);
  const inputRef                = useRef(null);
  const listRef                 = useRef(null);

  /* Reset state on open */
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  /* ESC to close */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* Build results */
  const allData = useMemo(() => ({ users, doctors, hospitals, patients, appointments }), [users, doctors, hospitals, patients, appointments]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];

    const groups = [];

    for (const cat of CATEGORIES) {
      const arr = allData[cat.id] || [];
      const hits = arr.filter(r =>
        cat.fields.some(f => normalize(r[f]).includes(q))
      ).slice(0, 4);  // max 4 per category

      if (hits.length > 0) {
        groups.push({ ...cat, hits });
      }
    }
    return groups;
  }, [query, allData]);

  /* Flatten for keyboard nav */
  const flatItems = useMemo(() => {
    const q = normalize(query);
    if (!q) return QUICK_LINKS.map(l => ({ type: 'link', ...l }));
    return results.flatMap(g => g.hits.map(r => ({ type: 'result', cat: g, row: r })));
  }, [query, results]);

  /* Keyboard navigation */
  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flatItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[cursor];
      if (!item) return;
      if (item.type === 'link') { onNavigate?.(item.id); onClose?.(); }
      else { onNavigate?.(item.cat.section); onClose?.(); }
    }
  }, [flatItems, cursor, onNavigate, onClose]);

  /* Scroll cursor into view */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  /* Reset cursor on query change */
  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  const q = normalize(query);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="البحث العام"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'cpFadeIn 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 620,
          background: 'var(--bg-card)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          border: '1px solid var(--border-base)',
          animation: 'cpSlideDown 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-base)',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="ابحث في المستخدمين، الأطباء، المستشفيات، المرضى، المواعيد..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 15, fontWeight: 500,
              background: 'transparent',
              color: 'var(--txt-heading)',
              fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
            }}
          />
          {isLoading && (
            <span style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid var(--border-base)',
              borderTopColor: PRIMARY,
              animation: 'cpSpin 0.7s linear infinite',
              flexShrink: 0,
            }} />
          )}
          <kbd style={{
            padding: '3px 8px', borderRadius: 5,
            background: 'var(--bg-page)',
            border: '1px solid var(--border-base)',
            fontSize: 11, color: 'var(--text-hint)',
            fontFamily: 'monospace', flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0' }}>

          {/* No query → Quick links */}
          {!q && (
            <div>
              <div style={{ padding: '6px 20px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: 1 }}>
                روابط سريعة
              </div>
              {QUICK_LINKS.map((link, idx) => (
                <ItemRow
                  key={link.id}
                  idx={idx}
                  active={cursor === idx}
                  onClick={() => { onNavigate?.(link.id); onClose?.(); }}
                >
                  <span style={{ fontSize: 17, flexShrink: 0 }}>{link.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt-heading)' }}>{link.label}</span>
                </ItemRow>
              ))}
            </div>
          )}

          {/* Query → grouped results */}
          {q && results.length === 0 && !isLoading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-hint)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <p style={{ margin: 0, fontSize: 14 }}>لا توجد نتائج لـ «{query}»</p>
            </div>
          )}

          {q && results.length > 0 && (() => {
            let globalIdx = 0;
            return results.map(group => (
              <div key={group.id}>
                {/* Category header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px 4px',
                  fontSize: 10, fontWeight: 700, color: 'var(--text-hint)',
                  textTransform: 'uppercase', letterSpacing: 1,
                  borderTop: '1px solid var(--bg-page)',
                  marginTop: 4,
                }}>
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                  <button
                    onClick={() => { onNavigate?.(group.section); onClose?.(); }}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      color: PRIMARY, fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', padding: '2px 6px',
                      fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
                    }}
                  >
                    عرض الكل ←
                  </button>
                </div>

                {/* Hits */}
                {group.hits.map(row => {
                  const idx = globalIdx++;
                  return (
                    <ItemRow
                      key={row.id ?? idx}
                      idx={idx}
                      active={cursor === idx}
                      onClick={() => { onNavigate?.(group.section); onClose?.(); }}
                    >
                      <Avatar name={group.getAvatar(row)} size="sm" src={row.image} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt-heading)' }}>
                          {highlight(group.getTitle(row), query)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 1 }}>
                          {highlight(group.getSub(row), query)}
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        background: `${PRIMARY}15`, color: PRIMARY,
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {group.icon}
                      </span>
                    </ItemRow>
                  );
                })}
              </div>
            ));
          })()}

        </div>

        {/* Footer hint */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'var(--bg-page)',
        }}>
          {[
            ['↑↓', 'تنقل'],
            ['↵',  'فتح'],
            ['ESC','إغلاق'],
          ].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-hint)' }}>
              <kbd style={{
                padding: '2px 6px', borderRadius: 4,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-base)',
                fontFamily: 'monospace', fontSize: 11,
              }}>{key}</kbd>
              <span>{label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-hint)', opacity: 0.6 }}>
            Cmd+K للفتح
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cpFadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes cpSlideDown { from { opacity:0; transform:translateY(-16px) scale(0.97) } to { opacity:1; transform:none } }
        @keyframes cpSpin     { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}

/* ── Row sub-component ───────────────────────────────────── */
function ItemRow({ idx, active, onClick, children }) {
  const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';
  return (
    <button
      data-idx={idx}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 20px',
        background: active ? `${PRIMARY}12` : 'none',
        border: 'none', cursor: 'pointer',
        textAlign: 'right',
        transition: 'background 0.1s',
        fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
        borderLeft: active ? `3px solid ${PRIMARY}` : '3px solid transparent',
      }}
      onMouseOver={e => e.currentTarget.style.background = `${PRIMARY}10`}
      onMouseOut={e => e.currentTarget.style.background = active ? `${PRIMARY}12` : 'none'}
    >
      {children}
    </button>
  );
}
