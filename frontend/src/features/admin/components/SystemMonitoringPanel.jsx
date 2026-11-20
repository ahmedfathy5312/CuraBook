import { API } from '../../../constants/apiRoutes';
/**
 * features/admin/components/SystemMonitoringPanel.jsx
 * AUDIT FIX — MISSING #4: System monitoring panel for Admin Dashboard.
 * Shows: server health, active WS connections, real-time user counts,
 * recent errors, queue depth.
 *
 * Data source: GET /api/v1/admin/stats/ + GET /api/v1/health/
 */
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color = 'var(--primary)', sub, loading }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)', display: 'flex',
      alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-hint)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        {loading ? (
          <div style={{ height: 28, width: 60, background: 'var(--border-base)', borderRadius: 'var(--radius-sm)' }} />
        ) : (
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>
            {value ?? '—'}
          </div>
        )}
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: 6 }}>{sub}</div>}
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)',
        background: color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ ok, labelOk = 'Healthy', labelBad = 'Degraded' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600,
      background: ok ? '#D1FAE5' : '#FEE2E2',
      color: ok ? '#065F46' : '#991B1B',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#31A870' : '#E97D61' }} />
      {ok ? labelOk : labelBad}
    </span>
  );
}

// ─── Service Row ──────────────────────────────────────────────────────────────
function ServiceRow({ name, status, latency }) {
  const ok = status === 'ok' || status === true || status === 'healthy';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-base)' }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-body)' }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {latency != null && (
          <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>{latency}ms</span>
        )}
        <StatusBadge ok={ok} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// ISSUE-017 FIX: Accept healthData + stats as props (single source of truth).
// No independent fetch — MonitoringSection provides the same healthData to avoid conflicting status display.
export default function SystemMonitoringPanel({ healthData: propHealthData, stats: propStats, loading: propLoading }) {
  // Fallback: fetch independently if not provided as props
  const { data: ownHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.ADMIN.HEALTH);
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: !propHealthData,
  });

  const { data: ownStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.ADMIN.STATS);
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: !propStats,
  });

  const health = propHealthData || ownHealth;
  const stats  = propStats || ownStats;
  const isLoading = propLoading !== undefined ? propLoading : (healthLoading || statsLoading);

  // ISSUE-017 FIX: API returns 'checks' not 'services' — unified field name
  const checks   = health?.checks || {};
  const dbOk     = checks.db?.status     === 'ok';
  const redisOk  = checks.redis?.status  === 'ok';
  const wsOk     = checks.websocket?.status === 'ok' || checks.channels?.status === 'ok' || redisOk;
  const celeryOk = checks.celery?.status === 'ok' || checks.celery?.status === 'warn';

  const realtime = stats?.realtime || health?.realtime || health?.monitoring || {};

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
          🖥️ System Monitoring
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: health ? '#31A870' : '#9CA3AF', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            {health ? 'Live · refreshes every 30s' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Real-time metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <MetricCard
          label="Active Users"
          value={realtime.active_users ?? stats?.active_users}
          icon="👥" color='var(--primary)'
          sub="online right now"
          loading={isLoading}
        />
        <MetricCard
          label="WS Connections"
          value={realtime.ws_connections ?? stats?.ws_connections}
          icon="🔌" color="#3B82F6"
          sub="open sockets"
          loading={isLoading}
        />
        <MetricCard
          label="Celery Queue"
          value={realtime.queue_depth ?? realtime.celery_queue ?? stats?.queue_depth ?? 0}
          icon="📬" color="#F59E0B"
          sub="pending tasks"
          loading={isLoading}
        />
        <MetricCard
          label="Requests / min"
          value={realtime.requests_per_min ?? stats?.requests_per_min ?? 0}
          icon="📈" color="#8B5CF6"
          sub="last 60 seconds"
          loading={isLoading}
        />
      </div>

      {/* Service health table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 4px' }}>
          Service Health
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-hint)', margin: '0 0 16px' }}>
          All backend services checked via <code style={{ fontSize: '11px', background: 'var(--border-base)', padding: '1px 5px', borderRadius: 'var(--radius-xs)' }}>/api/v1/health/</code>
        </p>

        {healthLoading ? (
          <div style={{ padding: '20px 0', color: 'var(--text-hint)', fontSize: '13px' }}>Loading health status…</div>
        ) : (
          <>
            <ServiceRow name="PostgreSQL Database" status={dbOk ? 'ok' : 'error'} latency={checks.db?.latency_ms} />
            <ServiceRow name="Redis Cache"         status={redisOk ? 'ok' : 'error'} latency={checks.redis?.latency_ms} />
            <ServiceRow name="WebSocket / Channels" status={wsOk ? 'ok' : 'error'} latency={checks.websocket?.latency_ms} />
            <ServiceRow name="Celery Workers"      status={celeryOk ? 'ok' : 'error'} />
            <div style={{ paddingTop: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Overall status:</span>
              <StatusBadge ok={dbOk && redisOk} labelOk="All Systems Operational" labelBad="Degraded" />
            </div>
          </>
        )}
      </div>

      {/* Recent errors / logs summary */}
      {stats?.recent_errors?.length > 0 && (
        <div style={{ background: '#FFF5F5', borderRadius: 'var(--radius-lg)', padding: '20px 24px', border: '1px solid #FEE2E2' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B', margin: '0 0 12px' }}>
            ⚠️ Recent Errors ({stats.recent_errors.length})
          </h3>
          {stats.recent_errors.slice(0, 5).map((err, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#7F1D1D', padding: '6px 0', borderBottom: i < 4 ? '1px solid #FEE2E2' : 'none' }}>
              <span style={{ fontWeight: 600 }}>[{err.level || 'ERROR'}]</span> {err.message}
              {err.timestamp && <span style={{ color: 'var(--text-hint)', marginInlineStart: 8 }}>{err.timestamp}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
