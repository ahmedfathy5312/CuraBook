/**
 * AdminAuditLogsPage.jsx — Platform Audit Trail Viewer
 *
 * F-11 FIX: This page was missing from the codebase. The backend /api/v1/audit/
 * endpoint was fully implemented and the ADMIN.AUDIT_LOGS constant existed in
 * apiRoutes.js, but no frontend page or route consumed it. Platform admins had
 * no way to view the audit trail through the UI.
 *
 * Connects to: GET /api/v1/admin/audit-logs/   (via useAuditLogs hook)
 * Route:       /admin-audit-logs               (registered in router.jsx)
 * Guard:       roles={['admin']}
 */

import { useState, useMemo } from 'react';
import { useAuditLogs } from '../hooks/useAdminData';
import useTranslation from '../../../i18n/useTranslation';

// ── Design tokens (match project palette) ──────────────────────────────────
const P   = 'var(--primary)';
const PL  = '#E6F1FB';
const PD  = '#1e6b66';
const GRAY = 'var(--text-muted)';

// ── Severity / action color map ────────────────────────────────────────────
const ACTION_COLORS = {
  CREATE:   { bg: '#dcfce7', color: '#15803d' },
  UPDATE:   { bg: '#dbeafe', color: '#1d4ed8' },
  DELETE:   { bg: '#fee2e2', color: '#dc2626' },
  LOGIN:    { bg: PL,        color: P          },
  LOGOUT:   { bg: 'var(--border-base)', color: 'var(--text-body)' },
  APPROVE:  { bg: '#dcfce7', color: '#15803d' },
  REJECT:   { bg: '#fee2e2', color: '#dc2626' },
  CANCEL:   { bg: '#fef3c7', color: '#b45309' },
  NO_SHOW:  { bg: '#fde8d8', color: '#c2410c' },
  EXPORT:   { bg: '#f3e8ff', color: '#7c3aed' },
};

function ActionBadge({ action }) {
  const key   = (action || '').toUpperCase().split('_')[0];
  const style = ACTION_COLORS[key] || { bg: 'var(--border-base)', color: 'var(--text-body)' };
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      fontSize: '11px',
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 'var(--radius-lg)',
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      whiteSpace: 'nowrap',
    }}>
      {action || '—'}
    </span>
  );
}

function MetaCell({ label, value }) {
  return (
    <div style={{ marginBottom: '4px', fontSize: '12px' }}>
      <span style={{ color: GRAY, fontWeight: 600, marginInlineEnd: '4px' }}>{label}:</span>
      <span style={{ color: 'var(--text-h)', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function LogRow({ log, expanded, onToggle }) {
  const ts = log.timestamp || log.created_at || log.time;
  const date = ts ? new Date(ts) : null;

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          background: expanded ? PL : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {/* Timestamp */}
        <td style={TD}>
          {date ? (
            <div>
              <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827' }}>
                {date.toLocaleDateString('en-GB')}
              </div>
              <div style={{ fontSize: '11px', color: GRAY }}>
                {date.toLocaleTimeString('en-GB', { hour12: false })}
              </div>
            </div>
          ) : '—'}
        </td>

        {/* Actor */}
        <td style={TD}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>
            {log.actor_username || log.user || log.actor || '—'}
          </div>
          {log.actor_role && (
            <div style={{ fontSize: '11px', color: P, textTransform: 'capitalize' }}>
              {log.actor_role}
            </div>
          )}
        </td>

        {/* Action */}
        <td style={TD}>
          <ActionBadge action={log.action} />
        </td>

        {/* Object */}
        <td style={TD}>
          <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
            <span style={{ fontWeight: 600 }}>{log.content_type || log.object_type || '—'}</span>
            {log.object_id && (
              <span style={{ color: GRAY, marginInlineStart: '4px' }}>#{log.object_id}</span>
            )}
          </div>
        </td>

        {/* IP */}
        <td style={{ ...TD, fontFamily: 'monospace', fontSize: '12px', color: GRAY }}>
          {log.ip_address || '—'}
        </td>

        {/* Expand arrow */}
        <td style={{ ...TD, textAlign: 'center', color: P }}>
          <span style={{ fontSize: '16px', transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ›
          </span>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr style={{ background: PL }}>
          <td colSpan={6} style={{ padding: '12px 20px 16px', borderBottom: `1px solid #c8e8e6` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px' }}>
              <div>
                <MetaCell label="Action"      value={log.action} />
                <MetaCell label="Object Type" value={log.content_type || log.object_type} />
                <MetaCell label="Object ID"   value={log.object_id} />
                <MetaCell label="IP Address"  value={log.ip_address} />
              </div>
              <div>
                {log.metadata && (
                  <div>
                    <div style={{ fontWeight: 600, color: GRAY, fontSize: '11px', marginBottom: '4px' }}>METADATA</div>
                    <pre style={{
                      background: 'var(--bg-card)',
                      border: `1px solid #c8e8e6`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px',
                      fontSize: '11px',
                      overflowX: 'auto',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      margin: 0,
                    }}>
                      {typeof log.metadata === 'string'
                        ? log.metadata
                        : JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const TD = {
  padding: '12px 14px',
  borderBottom: '1px solid var(--border-base)',
  verticalAlign: 'middle',
  fontSize: '13px',
};

const TH = {
  ...TD,
  background: 'var(--bg-page)',
  color: GRAY,
  fontWeight: 700,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid var(--border-base)',
};

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminAuditLogsPage() {
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [actionFilter,setActionFilter]= useState('all');
  const [expandedId,  setExpandedId]  = useState(null);

  const { data: auditData, isLoading, isError, refetch } = useAuditLogs({ page }, true);

  const logs = useMemo(() => {
    const raw = auditData?.results || auditData?.data || auditData || [];
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [auditData]);

  const totalPages = auditData?.pagination?.total_pages || auditData?.total_pages || 1;
  const totalCount = auditData?.pagination?.count       || auditData?.count       || logs.length;

  // Client-side filter (search + action)
  const filtered = useMemo(() => {
    let out = logs;
    if (actionFilter !== 'all') {
      out = out.filter(l => (l.action || '').toUpperCase().startsWith(actionFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(l =>
        (l.actor_username || l.user || l.actor || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.content_type  || l.object_type || '').toLowerCase().includes(q) ||
        (l.ip_address || '').includes(q)
      );
    }
    return out;
  }, [logs, search, actionFilter]);

  const ACTION_OPTIONS = ['all', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'CANCEL'];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-base)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
            background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
          }}>📋</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
              Audit Logs
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: GRAY }}>
              Full platform activity trail — {totalCount.toLocaleString()} records
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          style={{
            background: P, color: '#fff', border: 'none',
            padding: '8px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: '24px 32px' }}>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-base)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: GRAY }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by actor, action, object type, IP…"
              style={{
                width: '100%', padding: '8px 10px 8px 32px',
                border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Action filter chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ACTION_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setActionFilter(opt)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-lg)',
                  border: `1.5px solid ${actionFilter === opt ? P : 'var(--border)'}`,
                  background: actionFilter === opt ? PL : 'var(--bg-card)',
                  color: actionFilter === opt ? PD : GRAY,
                  fontWeight: actionFilter === opt ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textTransform: opt === 'all' ? 'capitalize' : 'uppercase',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-base)',
          overflow: 'hidden',
        }}>
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: GRAY }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <div style={{ fontSize: '14px' }}>Loading audit logs…</div>
            </div>
          ) : isError ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load audit logs</div>
              <button
                onClick={refetch}
                style={{ marginTop: '12px', padding: '8px 20px', background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: GRAY }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '14px' }}>No audit logs found</div>
              {(search || actionFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setActionFilter('all'); }}
                  style={{ marginTop: '12px', padding: '8px 20px', background: 'var(--border-base)', color: 'var(--text-body)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Timestamp</th>
                    <th style={TH}>Actor</th>
                    <th style={TH}>Action</th>
                    <th style={TH}>Object</th>
                    <th style={TH}>IP Address</th>
                    <th style={{ ...TH, width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const id = log.id ?? i;
                    return (
                      <LogRow
                        key={id}
                        log={log}
                        expanded={expandedId === id}
                        onToggle={() => setExpandedId(expandedId === id ? null : id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)',
                background: page <= 1 ? 'var(--bg-page)' : 'var(--bg-card)',
                color: page <= 1 ? '#9ca3af' : 'var(--text-body)',
                cursor: page <= 1 ? 'default' : 'pointer',
                fontWeight: 600, fontSize: '13px',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '13px', color: GRAY, fontWeight: 500 }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)',
                background: page >= totalPages ? 'var(--bg-page)' : 'var(--bg-card)',
                color: page >= totalPages ? '#9ca3af' : 'var(--text-body)',
                cursor: page >= totalPages ? 'default' : 'pointer',
                fontWeight: 600, fontSize: '13px',
              }}
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
