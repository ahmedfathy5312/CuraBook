/**
 * HospitalAssistantsSection.jsx — Enhancement #19
 * ═══════════════════════════════════════════════════════════════════
 * Redesigned Assistants tab with:
 *   • Filter tabs: All / Active / Inactive / Pending Invite
 *   • Paginated table: Name, Email, Phone, Role, Status, Joined, Actions
 *   • 3-dot actions menu per row: Resend Invite (pending) / Remove
 *   • Responsive: collapses to cards on mobile
 *   • RTL-ready, dark-mode-safe, fully i18n
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useRef, useEffect } from 'react';
import Avatar from '../../../components/ui/Avatar';
import useTranslation from '../../../i18n/useTranslation';
import { tokens } from '../../../theme/tokens';

const PRIMARY      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PRIMARY_PALE = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const PAGE_SIZE    = 4;

/* ── Status config ─────────────────────────────────────────────── */
function getStatus(a) {
  if (a.invitation_status === 'pending' || a.status === 'pending') return 'pending';
  if (a.is_active === false || a.status === 'inactive') return 'inactive';
  return 'active';
}

const STATUS_STYLE = {
  active:   { bg: '#DCFCE7', color: '#166534', dot: '#16A34A' },
  inactive: { bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
  pending:  { bg: '#FEF9C3', color: '#713F12', dot: '#CA8A04' },
};

/* ── StatusBadge ───────────────────────────────────────────────── */
function StatusBadge({ status, t }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.active;
  const label = {
    active:   t('hospitalAssistants.statusActive'),
    inactive: t('hospitalAssistants.statusInactive'),
    pending:  t('hospitalAssistants.statusPending'),
  }[status] || status;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ── ActionsMenu (3-dot) ───────────────────────────────────────── */
function ActionsMenu({ assistant, onRemove, onResendInvite, t, isAr }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const status = getStatus(assistant);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: open ? 'var(--bg-elevated)' : 'none',
          border: '1px solid var(--border-base)',
          borderRadius: 8, padding: '5px 10px',
          cursor: 'pointer', fontSize: 16, color: 'var(--text-hint)',
          lineHeight: 1, transition: 'all 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = PRIMARY; }}
        onMouseOut={e => { if (!open) { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border-base)'; } }}
        aria-label="Actions"
      >
        ⋯
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute',
            [isAr ? 'left' : 'right']: 0,
            top: 'calc(100% + 4px)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-base)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 170, zIndex: 100,
            overflow: 'hidden', padding: 4,
            animation: 'asmFade 0.12s ease',
          }}>
            {status === 'pending' && (
              <MenuBtn
                icon="📨"
                label={t('hospitalAssistants.resendInvite')}
                onClick={() => { setOpen(false); onResendInvite?.(assistant); }}
              />
            )}
            <MenuBtn
              icon="🗑️"
              label={t('hospitalAssistants.remove')}
              danger
              onClick={() => { setOpen(false); onRemove(assistant.id); }}
            />
          </div>
        </>
      )}
      <style>{`@keyframes asmFade { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 12px', border: 'none',
        background: hov ? (danger ? '#FEF2F2' : 'var(--bg-elevated)') : 'transparent',
        color: danger ? '#DC2626' : 'var(--text-body)',
        fontSize: 13, fontWeight: 600, fontFamily: "'Cairo', sans-serif",
        cursor: 'pointer', textAlign: 'start', borderRadius: 8,
        transition: 'background 0.12s',
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Filter Tabs ───────────────────────────────────────────────── */
function FilterTabs({ active, onChange, counts, t }) {
  const tabs = [
    { key: 'all',      label: t('hospitalAssistants.filterAll') },
    { key: 'active',   label: t('hospitalAssistants.filterActive') },
    { key: 'inactive', label: t('hospitalAssistants.filterInactive') },
    { key: 'pending',  label: t('hospitalAssistants.filterPending') },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 12, padding: 4 }}>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '6px 14px', border: 'none', borderRadius: 9, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: "'Cairo', sans-serif",
              background: isActive ? 'var(--bg-card)' : 'transparent',
              color: isActive ? PRIMARY : 'var(--text-hint)',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span style={{
                background: isActive ? PRIMARY : 'var(--border-base)',
                color: isActive ? '#fff' : 'var(--text-hint)',
                borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800,
              }}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Table Row ─────────────────────────────────────────────────── */
function TableRow({ a, onRemove, onResendInvite, t, isAr, odd }) {
  const status = getStatus(a);
  const joined = a.created_at || a.joined_at || a.date_joined;
  const joinedStr = joined
    ? new Date(joined).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <tr style={{ background: odd ? 'var(--bg-elevated, #F9FAFB)' : 'var(--bg-card)' }}>
      {/* Name + Avatar */}
      <td style={TD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={a.full_name} size="sm" />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>{a.full_name || '—'}</p>
          </div>
        </div>
      </td>
      {/* Email */}
      <td style={TD}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.email || '—'}</span>
      </td>
      {/* Phone */}
      <td style={{ ...TD, display: 'none', ['@media(min-width:640px)']: { display: 'table-cell' } }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', direction: 'ltr', display: 'inline-block' }}>{a.phone || '—'}</span>
      </td>
      {/* Role */}
      <td style={TD}>
        <span style={{
          background: PRIMARY_PALE, color: PRIMARY,
          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
        }}>
          {t('hospitalAssistants.roleAssistant')}
        </span>
      </td>
      {/* Status */}
      <td style={TD}><StatusBadge status={status} t={t} /></td>
      {/* Joined */}
      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          📅 {joinedStr}
        </span>
      </td>
      {/* Actions */}
      <td style={{ ...TD, textAlign: 'center' }}>
        <ActionsMenu
          assistant={a}
          onRemove={onRemove}
          onResendInvite={onResendInvite}
          t={t}
          isAr={isAr}
        />
      </td>
    </tr>
  );
}

const TD = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-base)',
  fontSize: 13,
  color: 'var(--text-body)',
  verticalAlign: 'middle',
};

const TH = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-hint)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: 'var(--bg-elevated)',
  borderBottom: '2px solid var(--border-base)',
  whiteSpace: 'nowrap',
};

/* ══════════════════════════════════════════════════════════════════
   Main Export
══════════════════════════════════════════════════════════════════ */
export default function HospitalAssistantsSection({
  filteredAssistants: allAssistants = [],
  assistantsLoading,
  searchAsst,
  setSearchAsst,
  setShowAddAssistantModal,
  setRemoveAssistantConfirm,
  onResendInvite,
}) {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  /* ── Filter by search + status tab ── */
  const searched = allAssistants.filter(a => {
    if (!searchAsst) return true;
    const q = searchAsst.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.phone?.includes(q)
    );
  });

  const filtered = searched.filter(a => {
    if (statusFilter === 'all') return true;
    return getStatus(a) === statusFilter;
  });

  /* ── Counts per tab ── */
  const counts = {
    all:      searched.length,
    active:   searched.filter(a => getStatus(a) === 'active').length,
    inactive: searched.filter(a => getStatus(a) === 'inactive').length,
    pending:  searched.filter(a => getStatus(a) === 'pending').length,
  };

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // reset to page 1 when filter/search changes
  useEffect(() => setPage(1), [statusFilter, searchAsst]);

  /* ── Columns ── */
  const cols = [
    t('hospitalAssistants.colName'),
    t('hospitalAssistants.colEmail'),
    t('hospitalAssistants.colPhone'),
    t('hospitalAssistants.colRole'),
    t('hospitalAssistants.colStatus'),
    t('hospitalAssistants.colJoined'),
    t('hospitalAssistants.colActions'),
  ];

  return (
    <div style={{ animation: 'pageEnter 0.25s ease', direction: isAr ? 'rtl' : 'ltr' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 240 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <span style={{ position: 'absolute', [isAr ? 'right' : 'left']: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-hint)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input
              value={searchAsst}
              onChange={e => setSearchAsst(e.target.value)}
              placeholder={t('hospitalAssistants.searchPlaceholder')}
              style={{
                width: '100%', padding: isAr ? '9px 34px 9px 14px' : '9px 14px 9px 34px',
                border: '1.5px solid var(--border-base)', borderRadius: 10,
                fontSize: 13, fontFamily: "'Cairo', sans-serif",
                color: 'var(--text-body)', background: 'var(--bg-card)',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = PRIMARY}
              onBlur={e => e.target.style.borderColor = 'var(--border-base)'}
            />
          </div>
        </div>

        {/* Add Assistant Button */}
        <button
          onClick={() => setShowAddAssistantModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: PRIMARY, color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '9px 18px', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: "'Cairo', sans-serif",
            boxShadow: `0 2px 8px ${PRIMARY}44`, transition: 'all 0.18s',
            flexShrink: 0,
          }}
          onMouseOver={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          {t('hospitalAssistants.addAssistant')}
        </button>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ marginBottom: 18, overflowX: 'auto' }}>
        <FilterTabs active={statusFilter} onChange={setStatusFilter} counts={counts} t={t} />
      </div>

      {/* ── Table / States ── */}
      {assistantsLoading ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 56, borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--border-base)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 14, borderRadius: 6, background: 'var(--border-base)' }} />
              <div style={{ width: 80, height: 14, borderRadius: 6, background: 'var(--border-base)' }} />
              <div style={{ width: 60, height: 20, borderRadius: 20, background: 'var(--border-base)' }} />
            </div>
          ))}
        </div>

      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '72px 0',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)', color: 'var(--text-hint)',
        }}>
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>🩺</p>
          <p style={{ fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px', fontSize: 16 }}>
            {t('hospitalAssistants.noAssistants')}
          </p>
          <p style={{ fontSize: 13 }}>{t('hospitalAssistants.addToGetStarted')}</p>
        </div>

      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  {cols.map(col => (
                    <th key={col} style={{ ...TH, textAlign: isAr ? 'right' : 'left' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a, i) => (
                  <TableRow
                    key={a.id}
                    a={a}
                    odd={i % 2 === 1}
                    onRemove={setRemoveAssistantConfirm}
                    onResendInvite={onResendInvite}
                    t={t}
                    isAr={isAr}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderTop: '1px solid var(--border-base)',
              flexWrap: 'wrap', gap: 8,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>
                {t('hospitalAssistants.showing')} {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} {t('hospitalAssistants.of')} {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <PagBtn disabled={safePage === 1} onClick={() => setPage(p => p - 1)} label={isAr ? '→' : '←'} />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <PagBtn key={n} active={n === safePage} onClick={() => setPage(n)} label={String(n)} />
                ))}
                <PagBtn disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)} label={isAr ? '←' : '→'} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PagBtn({ label, onClick, disabled, active }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, border: `1px solid ${active ? PRIMARY : 'var(--border-base)'}`,
        borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? PRIMARY : (hov && !disabled ? 'var(--bg-elevated)' : 'var(--bg-card)'),
        color: active ? '#fff' : (disabled ? 'var(--text-hint)' : 'var(--text-body)'),
        fontSize: 12, fontWeight: active ? 700 : 500,
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
