/**
 * MonitoringSection.jsx — Admin System Monitoring Section
 */
import SystemMonitoringPanel from '../components/SystemMonitoringPanel';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';

const PRIMARY      = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PRIMARY_LITE = tokens?.colors?.primary?.lighter   || '#E0F7FA';

export default function MonitoringSection({ healthData, stats, loading }) {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        {/* ISSUE-017 FIX: Pass healthData as prop — single source of truth, no conflicting status */}
        <SystemMonitoringPanel healthData={healthData} stats={stats} loading={loading} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: 0 }}>
          {t('adminStats.health.title')}
        </h2>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontSize: 12, fontWeight: 600, color: PRIMARY,
            background: PRIMARY_LITE, border: `1.5px solid ${PRIMARY}`,
            borderRadius: 'var(--radius-full)', padding: '6px 16px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {t('adminStats.actions.refresh')}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-hint)' }}>
          {t('adminStats.health.checking')}
        </div>
      ) : healthData ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {/* Overall banner */}
          <div style={{
            gridColumn: '1 / -1',
            padding: '20px 24px', borderRadius: 'var(--radius-lg, 16px)',
            background: healthData.success ? tokens.colors.success.light : tokens.colors.danger.light,
            border: `2px solid ${healthData.success ? tokens.colors.success.DEFAULT : tokens.colors.danger.DEFAULT}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{healthData.success ? '✅' : '⚠️'}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: healthData.success ? tokens.colors.success.text : tokens.colors.danger.text }}>
                {t('adminStats.health.status')} {healthData.success ? t('adminStats.health.healthy') : t('adminStats.health.degraded')}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: healthData.success ? tokens.colors.success.DEFAULT : tokens.colors.danger.DEFAULT }}>
                Version {healthData.version || '1.0'} · {healthData.status}
              </p>
            </div>
          </div>

          {/* Component cards */}
          {healthData.checks && Object.entries(healthData.checks).map(([key, check]) => {
            const ok   = check.status === 'ok';
            const warn = check.status === 'warn';
            return (
              <div key={key} style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
                padding: 20, boxShadow: 'var(--shadow-sm)',
                border: `2px solid ${ok ? 'var(--border-base)' : warn ? tokens.colors.warning.light : tokens.colors.danger.light}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)', textTransform: 'capitalize' }}>
                    {key === 'db' ? '🗄️ PostgreSQL' : key === 'redis' ? '⚡ Redis' : '⚙️ Celery'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: ok ? tokens.colors.success.light : warn ? tokens.colors.warning.light : tokens.colors.danger.light,
                    color:      ok ? tokens.colors.success.text  : warn ? tokens.colors.warning.text  : tokens.colors.danger.text,
                  }}>
                    {check.status.toUpperCase()}
                  </span>
                </div>
                {check.latency_ms !== undefined && (
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: check.latency_ms < 50 ? PRIMARY : check.latency_ms < 200 ? tokens.colors.warning.DEFAULT : tokens.colors.danger.DEFAULT }}>
                    {check.latency_ms} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>ms</span>
                  </p>
                )}
                {check.workers && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    {check.workers.length} worker{check.workers.length !== 1 ? 's' : ''} active
                  </p>
                )}
                {check.note  && <p style={{ margin: 0, fontSize: 12, color: tokens.colors.warning.text }}>{check.note}</p>}
                {check.error && <p style={{ margin: 0, fontSize: 12, color: tokens.colors.danger.text, wordBreak: 'break-all' }}>{check.error}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-hint)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🖥️</div>
          <p style={{ fontWeight: 600 }}>Could not load health data</p>
          <p style={{ fontSize: 13 }}>Check that the backend /api/v1/health/ endpoint is reachable</p>
        </div>
      )}
    </div>
  );
}
