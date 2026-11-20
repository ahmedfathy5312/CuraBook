/**
 * features/hospital/components/HospitalOverviewSection.jsx
 * =========================================================
 * F-08 FIX: Extracted from HospitalDashboardPage.jsx
 * Renders the Overview tab — welcome banner, stat cards, recent appointments, active doctors.
 */
import StatCard from '../../../components/shared/StatCard';
import Badge    from '../../../components/ui/Badge';
import Avatar   from '../../../components/ui/Avatar';
import { Table } from '../../../components/ui/Table';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import { getDoctorPrefix, stripDoctorPrefix } from '../../../utils/formatters';

const PRIMARY      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PRIMARY_DARK = tokens?.colors?.primary?.dark || '#0C6478';
const PRIMARY_LITE = tokens?.colors?.primary?.lighter || '#E0F7FA';

const isDoctorActive = (doctor) =>
  doctor?.status === 'active' || (doctor?.status == null && doctor?.is_active !== false);

export default function HospitalOverviewSection({
  user,
  stats,
  overviewLoading,
  appointments,
  apptLoading,
  apptCols,
  filteredDoctors,
  setActiveTab,
}) {
  const { t, language } = useTranslation();
  const activeDoctors = filteredDoctors.filter(isDoctorActive);
  return (
    <div style={{ animation: 'pageEnter 0.25s ease' }}>
      {/* Welcome Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
        borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24,
        display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '3px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0,
        }}>🏥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '0 0 3px', fontWeight: 500 }}>
            {t('hospitalOverview.welcomeBack')}
          </p>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2 }}>
            {user?.hospital_name || user?.username || 'Hospital'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {[
              { emoji: '👤', value: user?.username },
              { emoji: '📧', value: user?.email },
              { emoji: '📞', value: user?.phone || t('hospitalOverview.noPhone') },
            ].map(({ emoji, value }) => value && (
              <span key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 500 }}>
                <span>{emoji}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              </span>
            ))}
          </div>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '6px 16px', fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }}>
          {t('hospitalOverview.hospitalAdmin')}
        </span>
      </div>

      {/* Stat cards removed per UX review — stats are now in the Analytics tab */}

      {/* Recent appointments + Active doctors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{t('hospitalOverview.recentAppointments')}</h3>
            <button onClick={() => setActiveTab('appointments')} style={{ background: 'none', border: 'none', color: PRIMARY, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {t('hospitalOverview.viewAll')}
            </button>
          </div>
          <Table columns={apptCols} data={appointments.slice(0, 5)} loading={apptLoading} emptyTitle={t('hospitalOverview.noAppointmentsYet')} />
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{t('hospitalOverview.activeDoctors')}</h3>
            <button onClick={() => setActiveTab('doctors')} style={{ background: 'none', border: 'none', color: PRIMARY, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {t('hospitalOverview.manage')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeDoctors.slice(0, 5).map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                <Avatar name={doc.full_name} size="sm" />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--text-h)' }}>{getDoctorPrefix(language)} {stripDoctorPrefix(doc.full_name)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-hint)' }}>{doc.specialty}</p>
                </div>
                <Badge status="active" size="sm" />
              </div>
            ))}
            {activeDoctors.length === 0 && (
              <p style={{ color: 'var(--text-hint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{t('hospitalOverview.noActiveDoctors')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
