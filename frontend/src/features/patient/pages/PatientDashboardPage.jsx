/**
 * features/patient/pages/PatientDashboardPage.jsx
 *
 * API-M04 FIX: Split from 563 lines → ~150 lines.
 * Heavy sub-components moved to features/patient/components/:
 *   - HealthSummarySection.jsx
 *   - PrescriptionBanner.jsx
 *   - NextAppointmentHero.jsx
 *
 * Patient main dashboard — shown after login.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatientProfile }         from '../hooks/usePatientProfile';
import { useMyAppointments }         from '../../appointments/hooks/useMyAppointments';
import { useAuth }                   from '../../../context/AuthContext';
import { useRealtimeNotifications }  from '../../../hooks/useRealtimeNotifications';
import { useToast }                  from '../../../context/ToastContext';
import Avatar                        from '../../../components/ui/Avatar';
import Badge                         from '../../../components/ui/Badge';
import Skeleton                      from '../../../components/ui/Skeleton';
import { formatDate, formatTime, getDoctorPrefix, formatNumberLocale } from '../../../utils/formatters';
import useTranslation                from '../../../i18n/useTranslation';
import OnboardingWizard              from '../../auth/components/OnboardingWizard';
import { tokens }                    from '../../../theme/tokens';
import apiClient                     from '../../../services/apiClient';

// Extracted sub-components
import HealthSummarySection  from '../components/HealthSummarySection';
import PrescriptionBanner    from '../components/PrescriptionBanner';
import NextAppointmentHero   from '../components/NextAppointmentHero';
import ReportsSection        from '../../../components/shared/ReportsSection';
import { useReports }        from '../../reports/hooks/useReports';
import WelcomeBanner         from '../../../components/shared/WelcomeBanner';

const PRIMARY      = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PRIMARY_DARK = tokens?.colors?.primary?.dark     || '#0C6478';

// ── Quick Action Card ─────────────────────────────────────────────────────────
function QuickAction({ to, icon, label, description, color }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px',
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        borderTop: `3px solid ${color}`,
      }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      >
        <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '13px', color: 'var(--text-h)' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)' }}>{description}</p>
      </div>
    </Link>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, loading, lang }) {
  if (loading) return <Skeleton height={90} borderRadius={16} />;
  const displayVal = (lang && typeof value === 'number') ? formatNumberLocale(value, lang) : (value ?? '—');
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', borderBottom: `3px solid ${color}` }}>
      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color }}>{displayVal}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────────────────────────────────────
export default function PatientDashboardPage() {
  const { language, t } = useTranslation();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();

  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('curabook_onboarded')
  );
  const handleOnboardingComplete = () => {
    localStorage.setItem('curabook_onboarded', '1');
    setShowOnboarding(false);
  };

  const { data: profile, isLoading: profileLoading } = usePatientProfile();
  const { data: apptData, isLoading: apptLoading }   = useMyAppointments({ page_size: 10 });

  const appointments   = apptData?.results || apptData || [];
  const now            = new Date();
  // FIX: backend returns slot_start (ISO datetime), not .date alone — use slot_start as primary
  const upcoming       = appointments.filter(a =>
    ['pending', 'confirmed'].includes(a.status?.toLowerCase()) &&
    new Date(a.slot_start || a.date) >= now
  );
  const pending        = appointments.filter(a => a.status?.toLowerCase() === 'pending');
  const confirmed      = appointments.filter(a => a.status?.toLowerCase() === 'confirmed');
  const completed      = appointments.filter(a => a.status?.toLowerCase() === 'completed');
  // FIX: use toLowerCase() for status comparison + slot_start as primary date field
  const nextAppointment = appointments.find(
    a => a.status?.toLowerCase() === 'confirmed' && new Date(a.slot_start || a.slot?.date || a.date) > now
  );

  const { unreadCount } = useRealtimeNotifications({
    invalidateAppointments: true,
    onEvent: (n) => {
      if (n.type === 'APPOINTMENT_APPROVED') toast.success(t('patientDashboard.toastApproved'));
      if (n.type === 'APPOINTMENT_REJECTED') toast.error(t('patientDashboard.toastRejected'));
      if (n.type === 'APPOINTMENT_REMINDER') toast.info(n.message || t('patientDashboard.toastReminder'));
    },
  });

  const QUICK_ACTIONS = [
    { to: '/doctors',       icon: '🔍', label: t('patientDashboard.actions.findDoctor'),     description: t('patientDashboard.actions.findDoctorDesc'),    color: PRIMARY },
    { to: '/appointments',  icon: '📅', label: t('patientDashboard.actions.myAppointments'), description: t('patientDashboard.actions.myAppointmentsDesc'), color: '#3B82F6' },
    { to: '/hospitals',     icon: '🏥', label: t('patientDashboard.actions.browseHospitals'),description: t('patientDashboard.actions.browseHospitalsDesc'),color: '#8B5CF6' },
    { to: '/notifications', icon: '🔔', label: t('patientDashboard.actions.notifications'),  description: unreadCount > 0 ? t('patientDashboard.actions.notificationsUnread', { count: unreadCount }) : t('patientDashboard.actions.notificationsNone'), color: '#F59E0B' },
    { to: '/edit-profile',  icon: '⚙️', label: t('patientDashboard.actions.editProfile'),   description: t('patientDashboard.actions.editProfileDesc'),   color: 'var(--text-muted)' },
    { to: '/prescriptions', icon: '💊', label: t('patientDashboard.actions.prescriptions'),  description: t('patientDashboard.actions.prescriptionsDesc'), color: '#31A870' },
    { to: '/chat',          icon: '💬', label: t('chat.title'), description: language === 'ar' ? 'رسائلك مع الأطباء بعد تأكيد الحجز' : 'Messages with doctors after confirmed bookings', color: '#25C7DD' },
  ];

  const { data: reportsData, isLoading: reportsLoading } = useReports();
  const reports = reportsData?.results || reportsData || [];

  const openReportBlob = async (report, download = false) => {
    const url = download
      ? (report.download_url || report.view_url || report.file)
      : (report.view_url || report.file || report.download_url);
    if (!url) {
      toast?.error(language === 'ar' ? 'تعذر فتح التقرير' : 'Unable to open report');
      return;
    }

    try {
      // apiClient already has /api/v1 as its base URL. Older API responses may
      // still include that prefix, so strip it to avoid /api/v1/api/v1/...
      const apiUrl = url.startsWith('/api/v1/') ? url.slice('/api/v1'.length) : url;
      const response = await apiClient.get(apiUrl, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      if (download) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = report.filename || `${report.name || 'report'}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error('Report open failed', error);
      toast?.error(language === 'ar' ? 'تعذر فتح التقرير. حاول مرة أخرى.' : 'Unable to open report. Please try again.');
    }
  };

  const handleDownload = (report) => openReportBlob(report, true);
  const handleView = (report) => openReportBlob(report, false);


  return (
    <>
      {showOnboarding && (
        <OnboardingWizard
          userName={profile?.full_name?.split(' ')[0] || user?.username}
          onComplete={handleOnboardingComplete}
        />
      )}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', fontFamily: "'Cairo', sans-serif" }}>

        {/* ── Welcome ───────────────────────────────────────────────── */}
        <WelcomeBanner
          user={user}
          subtitle={nextAppointment ? t('patientDashboard.withUpcoming') : t('patientDashboard.noUpcomingBanner')}
        />

        {/* ── Prescription Alert Banner ─────────────────────────────── */}
        <PrescriptionBanner navigate={navigate} />

        {/* ── Next Appointment Hero ─────────────────────────────────── */}
        <NextAppointmentHero appointment={upcoming[0] || null} loading={apptLoading} navigate={navigate} />

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <StatCard label={t('patientDashboard.statTotal')}     value={appointments.length} icon="📋" color={PRIMARY}    loading={apptLoading} lang={language} />
          <StatCard label={t('patientDashboard.statUpcoming')}  value={upcoming.length}     icon="📅" color="#3B82F6"    loading={apptLoading} lang={language} />
          <StatCard label={t('patientDashboard.statPending')}   value={pending.length}      icon="⏳" color="#F59E0B"    loading={apptLoading} lang={language} />
          <StatCard label={t('patientDashboard.statCompleted')} value={completed.length}    icon="✅" color="#31A870"    loading={apptLoading} lang={language} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: '24px', alignItems: 'start' }}>

          {/* ── Upcoming Appointments List ───────────────────────────── */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientDashboard.upcomingSection')}</h2>
              <Link to="/appointments" style={{ fontSize: '12px', color: PRIMARY, fontWeight: 600, textDecoration: 'none' }}>{t('patientDashboard.viewAll')}</Link>
            </div>
            {apptLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3].map(i => <Skeleton key={i} height={70} borderRadius={12} />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗓</div>
                <p style={{ margin: 0, color: 'var(--text-hint)', fontSize: '14px' }}>{t('patientDashboard.noUpcomingAppts')}</p>
                <Link to="/doctors">
                  <button style={{ marginTop: '12px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                    {t('patientDashboard.searchDoctor')}
                  </button>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcoming.slice(0, 4).map(appt => (
                  <Link key={appt.public_id || appt.id} to={`/appointments/${appt.public_id || appt.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${PRIMARY}`, transition: 'background 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    >
                      <Avatar name={appt.doctor_name || appt.doctor || 'Dr'} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getDoctorPrefix(language)} {(appt.doctor_name || appt.doctor || '—').replace(/^(د\.\s*|Dr\.\s*)/i, '').trim()}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)' }}>
                          {formatDate(appt.slot_start || appt.date)} · {formatTime(appt.slot_start || appt.time || appt.slot_time)}
                          {appt.location_type && ` · ${appt.location_type}`}
                        </p>
                      </div>
                      <Badge status={appt.status} />
                    </div>
                  </Link>
                ))}
                {upcoming.length > 4 && (
                  <Link to="/appointments" style={{ textAlign: 'center', color: PRIMARY, fontSize: '12px', fontWeight: 600, textDecoration: 'none', marginTop: '4px' }}>
                    {upcoming.length - 4 === 1
                      ? t('patientDashboard.moreAppointments', { count: upcoming.length - 4 })
                      : t('patientDashboard.moreAppointmentsPlural', { count: upcoming.length - 4 })}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Quick Actions Grid ───────────────────────────────────── */}
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientDashboard.quickActions')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {QUICK_ACTIONS.map(action => <QuickAction key={action.to} {...action} />)}
            </div>
          </div>
        </div>

        {/* ── Health Summary ───────────────────────────────────────────── */}
        <HealthSummarySection navigate={navigate} />

        {/* ── Reports ─────────────────────────────────────────────────── */}
        <ReportsSection
          reports={reports.map(r => ({
            ...r,
            name: r.name || r.title || (language === 'ar' ? 'تقرير طبي' : 'Medical Report'),
            date: r.date || (r.created_at ? formatDate(r.created_at) : ''),
          }))}
          loading={reportsLoading}
          onDownload={handleDownload}
          onView={handleView}
        />

      </div>
    </>
  );
}
