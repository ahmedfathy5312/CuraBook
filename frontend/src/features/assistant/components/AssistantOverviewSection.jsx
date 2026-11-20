/**
 * AssistantOverviewSection.jsx — V2
 * Sprint 4: wrapped with React.memo — لا يُعيد الـ render إلا إذا تغيرت الـ props فعلاً.
 *
 * New in V2:
 *  ✅ Status Progress Bar — visual breakdown of appointments by status
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import { getDoctorPrefix } from '../../../utils/formatters';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { formatDate, formatTime } from '../../../utils/formatters';

const C = {
  teal:   'var(--primary)',
  tealD:  'var(--primary-dark)',
  green:  'var(--success)',
  amber:  'var(--warning)',
  red:    'var(--danger)',
  blue:   'var(--info, #60A5FA)',
  purple: '#8B5CF6',
  bg:     'var(--bg-page)',
  card:   'var(--bg-card)',
  border: 'var(--border-base)',
  text:   'var(--text-h)',
  body:   'var(--text-body)',
  muted:  'var(--text-muted)',
  light:  'var(--text-hint)',
};

const Shimmer = ({ h = 44, r = 12 }) => <Skeleton style={{ height: h, borderRadius: r }} />;
const Spinner = ({ size = 14, color = '#fff' }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${color}40`, borderTopColor: color, animation: 'spin .7s linear infinite', flexShrink: 0 }} />
);

const formatAssistantRole = (role, t) => {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('coordinator')) return t('assistantOverview.coordinatorRole');
  if (normalized.includes('admin')) return t('assistantOverview.adminRole');
  return t('assistantOverview.assistantRole');
};

// ── Status Progress Bar ───────────────────────────────────────────────────────
function StatusProgressBar({ stats, loading }) {
  const { t } = useTranslation();
  if (loading) return <Shimmer h={36} r={10} />;
  const total = stats.total || 1;

  const segments = [
    { label: t('assistantOverview.confirmed'),  count: stats.confirmed,  color: C.green,  key: 'confirmed' },
    { label: t('assistantOverview.pending'),    count: stats.pending,    color: C.amber,  key: 'pending' },
    { label: t('assistantOverview.reschedule'), count: stats.reschedule, color: C.purple, key: 'reschedule' },
    { label: t('assistantOverview.other'),      count: Math.max(0, stats.total - stats.confirmed - stats.pending - stats.reschedule), color: C.light, key: 'other' },
  ].filter(s => s.count > 0);

  return (
    <div style={{ background: C.card, borderRadius: 'var(--radius-lg)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)', border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{t('assistantOverview.appointmentBreakdown')}</p>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.teal }}>{t('assistantOverview.totalCount', { count: stats.total })}</span>
      </div>

      {/* Bar */}
      <div role="img" aria-label={`${stats.confirmed} ${t('assistantOverview.confirmed')}, ${stats.pending} ${t('assistantOverview.pending')}, ${stats.reschedule} ${t('assistantOverview.reschedule')}`}
        style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
        {segments.map(s => (
          <div key={s.key}
            title={`${s.label}: ${s.count} (${Math.round(s.count / total * 100)}%)`}
            style={{ width: `${(s.count / total) * 100}%`, background: s.color, minWidth: s.count ? 6 : 0, transition: 'width .5s ease', borderRadius: 2 }} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
              {s.label} <strong style={{ color: C.text }}>{s.count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, loading }) {
  return (
    <div style={{ background: C.card, borderRadius: 'var(--radius-lg)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: `1px solid ${C.border}`, borderInlineStart: `4px solid ${color}` }}>
      {loading ? <Shimmer h={58} r={8} /> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 22 }} aria-hidden="true">{icon}</span>
            <span style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? 0}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.muted }}>{label}</p>
        </>
      )}
    </div>
  );
}

// ── Workplace Card ────────────────────────────────────────────────────────────
function WorkplaceCard({ type, item }) {
  const { t, language } = useTranslation();
  const isHosp = type === 'hospital';
  const accent = isHosp ? C.blue : C.teal;
  return (
    <div style={{ background: C.card, borderRadius: 'var(--radius-lg)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: `1px solid ${C.border}`, borderTop: `3px solid ${accent}`, transition: 'all .25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: `color-mix(in srgb, ${accent} 18%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }} aria-hidden="true">🏥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)`, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {isHosp ? t('assistantOverview.hospital') : t('assistantOverview.clinic')} · {formatAssistantRole(item.role, t)}
          </span>
        </div>
      </div>
      {item.address && <p style={{ margin: '0 0 4px', fontSize: 12, color: C.muted, display: 'flex', gap: 5 }}><span aria-hidden="true">📍</span><span>{item.address}</span></p>}
      {item.doctor  && <p style={{ margin: 0, fontSize: 12, color: C.muted, display: 'flex', gap: 5 }}><span aria-hidden="true">👨‍⚕️</span><span>{getDoctorPrefix(language)} {item.doctor}</span></p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default memo(function AssistantOverviewSection({
  user, stats, rawAppts, allWP, clinics, hospitals,
  apptLoading, wpLoading, wpData,
  approveMut, openReject,
  onGoToAppointments, onGoToWorkplaces,
}) {
  const { t } = useTranslation();
  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>

      {/* Hero banner */}
      <div style={{ background: `linear-gradient(135deg,var(--primary-dark),var(--primary))`, borderRadius: 22, padding: '28px 32px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxShadow: 'var(--shadow-card)' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', color: '#fff', fontSize: 22, fontWeight: 800 }}>
            {t('assistantOverview.welcomeBack', { name: user?.full_name?.split(' ')[0] || t('assistantOverview.assistantRole') })}
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,.75)', fontSize: 14 }}>
            {allWP.length > 0
              ? t('assistantOverview.manageWorkplacesHint', { count: allWP.length, pending: stats.pending })
              : t('assistantOverview.noWorkplacesHint')}
          </p>
        </div>
      </div>

      {/* ── Quick Access Cards ── */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.muted }}>{t('assistantOverview.quickAccess')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
          {[
            { icon: '📊', label: t('assistantOverview.quickDashboard'), to: '/assistant-dashboard', color: C.teal },
            { icon: '🗓️', label: t('assistantOverview.quickSchedule'), to: '/assistant-schedule', color: '#8B5CF6' },
            { icon: '📋', label: t('assistantOverview.quickAppointments'), to: '/assistant-appointments', color: C.green },
            { icon: '📈', label: t('assistantOverview.quickAnalytics'), to: '/assistant-analytics', color: C.amber },
            { icon: '⚙️', label: t('assistantOverview.quickSettings'), to: '/assistant-settings', color: C.blue },
            { icon: '🔔', label: t('assistantOverview.quickNotifications'), to: '/assistant-notifications', color: '#EC4899' },
          ].map(card => (
            <Link key={card.to} to={card.to} style={{ textDecoration: 'none' }}>
              <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 213, 239, 0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in srgb, ${card.color} 18%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {card.icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{card.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Status progress bar ── */}
      {(apptLoading || stats.total > 0) && (
        <div style={{ marginBottom: 22 }}>
          <StatusProgressBar stats={stats} loading={apptLoading} />
        </div>
      )}

      {/* ── Pending queue ── */}
      {stats.pending > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⏳ {t('assistantOverview.awaitingApproval')}
              <span style={{ background: 'color-mix(in srgb, var(--warning) 18%, transparent)', color: C.amber, fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>{stats.pending}</span>
            </h3>
            <button onClick={() => onGoToAppointments('pending')} aria-label="View all pending appointments"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.teal, fontSize: 13, fontWeight: 600, fontFamily: 'Cairo,sans-serif' }}>
              {t('assistantOverview.viewAll')}
            </button>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {rawAppts.filter(a => a.status?.toLowerCase() === 'pending').slice(0, 6).map((apt, i) => (
              <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < 5 ? `1px solid ${C.border}` : 'none' }}>
                <Avatar name={apt.patient_name || apt.patientName} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{apt.patient_name || apt.patientName || '—'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>
                    {apt.doctor_name || apt.doctor || '—'} · {formatDate(apt.date || apt.slot_date)}
                    {(apt.time || apt.slot_time) ? ' · ' + formatTime(apt.time || apt.slot_time) : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => approveMut.mutate({ id: apt.id })} disabled={approveMut.isPending}
                    aria-label={`${t('assistantOverview.approveBtn')} ${apt.patient_name || 'patient'}`}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {approveMut.isPending && (approveMut.variables?.id ?? approveMut.variables) === apt.id && <Spinner size={11} />}
                    {t('assistantOverview.approveBtn')}
                  </button>
                  <button onClick={() => openReject(apt.id, 'reject')}
                    aria-label={`${t('assistantOverview.rejectBtn')} ${apt.patient_name || 'patient'}`}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>
                    {t('assistantOverview.rejectBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Workplaces preview ── */}
      {!wpLoading && allWP.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>🏢 {t('assistantOverview.myWorkplaces')}</h3>
            <button onClick={onGoToWorkplaces} aria-label="View all workplaces"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.teal, fontSize: 13, fontWeight: 600, fontFamily: 'Cairo,sans-serif' }}>
              {t('assistantOverview.viewAll')}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 }}>
            {allWP.slice(0, 4).map(w => <WorkplaceCard key={`${w._type}_${w.id}`} type={w._type} item={w} />)}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!apptLoading && !wpLoading && rawAppts.length === 0 && allWP.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🩺</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('assistantOverview.allSetTitle')}</p>
          <p style={{ fontSize: 13, color: C.muted }}>{t('assistantOverview.allSetHint')}</p>
        </div>
      )}
    </div>
  );
});


