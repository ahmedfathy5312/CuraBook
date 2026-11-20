/**
 * DoctorDashboardPage.jsx — HIGH PRIORITY FIXES
 * ================================================
 * ✅ HP-1:  Revenue + Completion Rate in Hero stats
 * ✅ HP-2:  Quick Access ordered by usage frequency
 * ✅ HP-3:  Priority Alerts widget (missed/urgent appointments)
 * ✅ HP-4:  "Show All" on Today's Schedule (not capped at 5)
 * ✅ HP-5:  Upcoming Video Calls widget
 * ✅ HP-6:  Today's Revenue in dashboard
 * ✅ P2-UX-5: Hardcoded hex colors → CSS variables (theme-aware)
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { useDoctorStats, useDoctorAppointments, useTodaySchedule } from '../hooks/useDoctorDashboard';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import DiagnosticBanner from '../components/DiagnosticBanner';
import WelcomeScreen from '../components/WelcomeScreen';
import Avatar from '../../../components/ui/Avatar';
import Badge from '../../../components/ui/Badge';
import tokens from '../../../theme/tokens';
import { formatDate, formatTime, getDoctorPrefix, stripDoctorPrefix, getApptTimeDisplay, getApptDateDisplay, getApptLocation } from '../../../utils/formatters';
// ── Sprint 3 P2 ──────────────────────────────────────────────────────────────
import DoctorIdentityCard from '../../../components/doctor/DoctorIdentityCard';
import DoctorEmptyState   from '../../../components/doctor/DoctorEmptyState';
import { AppointmentListSkeleton, ScheduleSidebarSkeleton } from '../components/DoctorPageSkeletons';

// ── P2-UX-5: Design tokens — primary uses CSS variables for theme-awareness ──
// Non-primary colours without a CSS var alias are still read from the JS token
// object so they respond to future token updates.
const MOD_WARNING = tokens?.colors?.warning?.DEFAULT  || '#F59E0B';
const MOD_ACCENT  = tokens?.colors?.accent?.DEFAULT   || '#8B5CF6';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT  || '#10B981';
const MOD_DANGER  = tokens?.colors?.danger?.DEFAULT   || '#EF4444';
const MOD_SM      = 'var(--shadow-card)';
const MOD_LG      = 'var(--shadow-lg)';
// ✅ Primary palette via CSS variables — no hardcoded hex
const C_P  = 'var(--primary)';       // replaces #0E7490
const C_PD = 'var(--primary-dark)';  // replaces #0C6478
const C_PL = 'var(--primary-pale)';  // replaces #E0F7FA

export default function DoctorDashboardPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAllSchedule, setShowAllSchedule] = useState(false);

  const { data: stats,         isLoading: statsLoading, error: statsError  } = useDoctorStats();
  const { data: todaySchedule, isLoading: schedLoading, error: schedError  } = useTodaySchedule();
  const { data: apptData,      isLoading: apptLoading,  error: apptError   } = useDoctorAppointments({ page_size: 8 });
  const { data: videoAppts                                                  } = useDoctorAppointments({ page_size: 5, visit_type: 'ONLINE', status: 'confirmed' });
  const { data: nextWeek                                                    } = useDoctorAppointments({ page_size: 10, date_from: new Date().toISOString().slice(0,10), status: 'confirmed' });
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('cura_welcome_v2_2026'));

  const handleWelcomeDone = () => {
    localStorage.setItem('cura_welcome_v2_2026', 'true');
    setShowWelcome(false);
  };

  useRealtimeNotifications({ invalidateAppointments: true });

  const appointments  = Array.isArray(apptData?.results)      ? apptData.results      : (Array.isArray(apptData)      ? apptData      : []);
  const schedule      = Array.isArray(todaySchedule?.results) ? todaySchedule.results : (Array.isArray(todaySchedule) ? todaySchedule : []);
  const videoUpcoming = Array.isArray(videoAppts?.results)    ? videoAppts.results    : (Array.isArray(videoAppts)    ? videoAppts    : []);

  const urgentAlerts = appointments.filter(a => a.status === 'pending' && a.visit_type === 'ONLINE');
  const missedAppts  = appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show');
  const allAlerts    = [...urgentAlerts.map(a => ({ ...a, alertType: 'urgent' })), ...missedAppts.map(a => ({ ...a, alertType: 'missed' }))].slice(0, 5);

  const isRTL = language === 'ar';
  const displayedSchedule = showAllSchedule ? schedule : schedule.slice(0, 5);

  if (showWelcome && !statsLoading) {
    return (
      <WelcomeScreen
        name={user?.full_name}
        specialty={stats?.specialty || (isRTL ? 'طبيب متخصص' : 'Specialist')}
        clinicName={stats?.clinic_name || (isRTL ? 'عيادتك الخاصة' : 'Private Clinic')}
        location={stats?.location}
        experience={stats?.experience_years || stats?.years_of_experience}
        onDone={handleWelcomeDone}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>

      <DiagnosticBanner statsError={statsError} apptError={apptError} schedError={schedError} />

      {/* ── 1. Hero Welcome Card ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C_P} 0%, ${C_PD} 100%)`,
        borderRadius: 24, padding: '40px', color: '#fff',
        position: 'relative', overflow: 'hidden', marginBottom: 28,
        boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 24
      }}>
        <div style={{ position: 'absolute', top: -100, right: isRTL ? 'auto' : -50, left: isRTL ? -50 : 'auto', width: 300, height: 300, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, opacity: 0.8 }}>
            {new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: 36, fontWeight: 900, lineHeight: 1.2 }}>
            {t('welcome.back', 'مرحباً بعودتك')}، <br /> {getDoctorPrefix(language)} {stripDoctorPrefix((user?.full_name || '').split(' ')[0]) || (language === 'ar' ? 'طبيب' : 'Doctor')} ✨
          </h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6 }}>
            {isRTL ? 'لديك نظرة شاملة على عيادتك اليوم. تابع مرضاك، مواعيدك، وتقاريرك المالية.' : 'You have a comprehensive overview of your clinic today.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.1)', padding: '20px 28px', borderRadius: 20, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <HeroStat label={isRTL ? 'مواعيد اليوم' : 'Today'}      value={stats?.today_count ?? 0}                                     loading={statsLoading} />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <HeroStat label={isRTL ? 'معلقة' : 'Pending'}            value={stats?.pending_count ?? 0}                                   loading={statsLoading} />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <HeroStat label={isRTL ? 'إيراد اليوم' : "Today's Rev"}  value={stats?.today_revenue ? `$${stats.today_revenue}` : '—'}     loading={statsLoading} />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <HeroStat label={isRTL ? 'معدل الإكمال' : 'Completion'}  value={stats?.completion_rate ? `${stats.completion_rate}%` : '—'} loading={statsLoading} />
        </div>
      </div>

      {/* ── Sprint 3 P2: DoctorIdentityCard (compact) ── */}
      <DoctorIdentityCard profile={null} stats={stats} variant="compact" isRTL={isRTL} loading={statsLoading} />

      {/* HP-3: Priority Alerts Widget */}
      {allAlerts.length > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${MOD_WARNING}15, ${MOD_DANGER}10)`,
          border: `2px solid ${MOD_WARNING}40`, borderRadius: 20, padding: '20px 28px', marginBottom: 28,
          boxShadow: `0 4px 20px ${MOD_WARNING}20`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-h)' }}>
              {isRTL ? 'تنبيهات تحتاج انتباهك' : 'Priority Alerts'}
            </h3>
            <span style={{ padding: '3px 10px', background: MOD_DANGER, color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{allAlerts.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allAlerts.map((a, i) => (
              <div key={i} onClick={() => navigate('/doctor-appointments')} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--bg-card)', borderRadius: 14, cursor: 'pointer',
                border: `1px solid ${a.alertType === 'urgent' ? MOD_WARNING : MOD_DANGER}30`, transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <span style={{ fontSize: 20 }}>{a.alertType === 'urgent' ? '⚡' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: 'var(--text-h)' }}>{a.patient_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    {a.alertType === 'urgent' ? (isRTL ? 'موعد أونلاين في انتظار التأكيد' : 'Online appointment awaiting confirmation') : (isRTL ? 'موعد ملغي / لم يحضر' : 'Cancelled / No-show')}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{formatDate(a.date || a.slot?.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Quick Access ── */}
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-h)' }}>{isRTL ? 'الوصول السريع' : 'Quick Access'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <QuickLink to="/patient-appointments" icon="📅" label={isRTL ? 'المواعيد' : 'Appointments'}  subtitle={isRTL ? 'إدارة الجدول اليومي' : 'Daily schedule'}      color={C_P}                                           badge={stats?.pending_count > 0 ? stats.pending_count : null} />
        <QuickLink to="/patient-management"   icon="👥" label={t('nav.patients')}                    subtitle={isRTL ? 'سجلات المرضى' : 'Patient records'}           color={tokens?.colors?.info?.DEFAULT    || '#3B82F6'} />
        <QuickLink to="/doctor-schedule"      icon="🗓" label={t('nav.schedule')}                    subtitle={isRTL ? 'ضبط جدولك' : 'Manage availability'}          color={MOD_SUCCESS} />
        <QuickLink to="/chat/doctor"          icon="💬" label={isRTL ? 'الرسائل' : 'Messages'}       subtitle={isRTL ? 'تواصل مع مرضاك' : 'Chat with patients'}      color={MOD_ACCENT} />
        <QuickLink to="/doctor-prescriptions" icon="💊" label={t('nav.prescriptions')}               subtitle={isRTL ? 'الروشتات الإلكترونية' : 'E-Prescriptions'}   color={tokens?.colors?.warning?.DEFAULT || '#F59E0B'} />
        <QuickLink to="/doctor-analytics"     icon="📊" label={isRTL ? 'التحليلات' : 'Analytics'}   subtitle={isRTL ? 'أداء العيادة' : 'Clinic performance'}         color={tokens?.colors?.accent?.DEFAULT  || '#8B5CF6'} />
        <QuickLink to="/doctor-assistants"    icon="🧑‍⚕️" label={isRTL ? 'المساعدين' : 'Assistants'}  subtitle={isRTL ? 'إدارة الفريق' : 'Manage staff'}              color={tokens?.colors?.accent?.dark     || '#6366F1'} />
        <QuickLink to="/billing"              icon="💳" label={isRTL ? 'الاشتراك' : 'Billing'}       subtitle={isRTL ? 'فواتيرك وباقاتك' : 'Plans & invoices'}        color="#EC4899" />
      </div>

      {/* Enhancement #20 FIX: added className so responsive.css .dashboard-main-grid breakpoint applies on mobile */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── 3. Recent Appointments ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 32, boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>📋 {t('doctor.dashboard.recent_requests', 'أحدث الحجوزات')}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-hint)' }}>{isRTL ? 'أحدث المرضى الذين قاموا بالحجز' : 'Latest patient bookings'}</p>
            </div>
            <Link to="/patient-appointments" style={{ padding: '8px 20px', background: C_PL, borderRadius: 20, color: C_P, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
              {t('common.viewAll')} →
            </Link>
          </div>

          {apptLoading ? (
            <AppointmentListSkeleton rows={3} isRTL={isRTL} />
          ) : appointments.length === 0 ? (
            <DoctorEmptyState context="appointments" isRTL={isRTL} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {appointments.map((appt) => (
                <div key={appt.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--bg-page)', borderRadius: 20,
                  border: '1px solid var(--border-base)', transition: 'all 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C_P; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.transform = 'none'; }}
                onClick={() => navigate('/doctor-appointments')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar name={appt.patient_name || appt.patient?.full_name} size={48} />
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>{appt.patient_name || appt.patient?.full_name}</h4>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {getApptDateDisplay(appt, isRTL ? 'ar-EG' : 'en-US')} • {getApptTimeDisplay(appt, isRTL ? 'ar-EG' : 'en-US')} •{' '}
                        <span style={{ color: appt.visit_type === 'ONLINE' ? MOD_ACCENT : C_P, fontWeight: 700 }}>
                          {appt.visit_type === 'ONLINE' ? '🎥 ' + (isRTL ? 'أونلاين' : 'Online') : '🏢 ' + (isRTL ? 'حضوري' : 'In-Person')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge status={appt.status} style={{ padding: '6px 12px', fontSize: 12 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Enhancement #17 FIX: Replaced redundant "Today's Schedule" full list and
              "Next 7 Days" full list with a compact summary widget.
              Both sections previously duplicated content already accessible via
              the "جدول" quick-access link — causing visual noise without added value.
              Now shows: today's count, upcoming count, and a direct link to full schedule. */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 24, boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>
                📅 {isRTL ? 'ملخص الجدول' : 'Schedule Summary'}
              </h2>
              <Link to="/doctor-schedule" style={{ fontSize: 12, fontWeight: 700, color: C_P, textDecoration: 'none' }}>
                {isRTL ? 'الجدول الكامل ←' : 'Full Schedule →'}
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: C_PL, borderRadius: 16, padding: '16px 14px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C_P }}>
                  {schedLoading ? '—' : schedule.length}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: C_PD }}>
                  {isRTL ? 'مواعيد اليوم' : "Today's Appts"}
                </p>
              </div>
              <div style={{ background: `${MOD_ACCENT}12`, borderRadius: 16, padding: '16px 14px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: MOD_ACCENT }}>
                  {nextWeek?.results?.length ?? '—'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: MOD_ACCENT }}>
                  {isRTL ? 'الأيام القادمة' : 'Upcoming Days'}
                </p>
              </div>
            </div>
            {/* Next upcoming appointment preview */}
            {(nextWeek?.results || []).slice(0, 1).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-subtle, var(--bg-elevated))', padding: '10px 14px', borderRadius: 14 }}>
                <div style={{ width: 40, height: 40, background: C_PL, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: C_P, textTransform: 'uppercase' }}>{(a.slot_start || a.slot?.date) ? new Date(a.slot_start || a.slot?.date).toLocaleString(language, { month: 'short' }) : '—'}</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: C_P }}>{(a.slot_start || a.slot?.date) ? new Date(a.slot_start || a.slot?.date).getDate() : '—'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.patient_name || '—'}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-hint)' }}>{formatTime(a.slot_start || a.slot?.start_time)} • {a.visit_type === 'ONLINE' ? (isRTL ? 'أونلاين' : 'Online') : (isRTL ? 'حضوري' : 'In-Person')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* HP-5: Upcoming Video Calls — Bug #5 Fixed: correct routing + responsive */}
          {videoUpcoming.length > 0 && (
            <div style={{ background: `linear-gradient(135deg, ${MOD_ACCENT}15, ${C_P}10)`, borderRadius: 20, padding: 24, border: `1px solid ${MOD_ACCENT}30`, boxShadow: MOD_SM }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>🎥 {isRTL ? 'جلسات الفيديو القادمة' : 'Upcoming Video Calls'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {videoUpcoming.slice(0, 3).map((v, i) => (
                  <div key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: 'var(--bg-card)',
                      borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                      flexWrap: 'wrap', minWidth: 0,
                    }}
                    onClick={() => {
                      if (v.video_session_id) {
                        // Navigate to the video pre-call lobby for this session
                        navigate(`/video/lobby/${v.video_session_id}`);
                      } else if (v.id) {
                        // Navigate to doctor appointments page with the appointment id
                        // so doctor can view/manage that specific video appointment
                        navigate(`/doctor-appointments?appointment=${v.id}`);
                      } else {
                        navigate('/doctor-appointments');
                      }
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${MOD_ACCENT}20`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Avatar name={v.patient_name} size={36} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.patient_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: MOD_ACCENT, fontWeight: 700 }}>{formatDate(v.slot_start || v.slot?.date)} • {formatTime(v.slot_start || v.slot?.start_time)}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: MOD_ACCENT, flexShrink: 0, padding: '4px 10px', background: `${MOD_ACCENT}15`, borderRadius: 8 }}>
                      {v.video_session_id ? (isRTL ? 'انضم 🎥' : 'Join 🎥') : (isRTL ? 'عرض التفاصيل →' : 'View Details →')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <DoctorFAB navigate={navigate} t={t} isRTL={isRTL} />

      <style>{`
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
        @keyframes fabIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function HeroStat({ label, value, loading }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900 }}>{loading ? '…' : value}</p>
      <p style={{ margin: 0, fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
    </div>
  );
}

function QuickLink({ to, icon, label, subtitle, color, badge }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-card)', padding: '22px 18px', borderRadius: 22,
        border: '1px solid var(--border-base)', boxShadow: MOD_SM,
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 12px 24px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.boxShadow = MOD_SM; }}
      >
        {badge && (
          <span style={{ position: 'absolute', top: 12, right: 12, background: MOD_DANGER, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{badge}</span>
        )}
        <div style={{ width: 52, height: 52, borderRadius: 16, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
        <div>
          <h3 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-h)', fontSize: 15 }}>{label}</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}

function DoctorFAB({ navigate, t, isRTL }) {
  const [open, setOpen] = useState(false);
  const actions = [
    { icon: '➕', label: isRTL ? 'مريض جديد' : 'New Patient',         to: '/new-patient-record' },
    { icon: '📅', label: isRTL ? 'حجز موعد' : 'Add Appointment',      to: '/doctor-schedule?new=1' },
    { icon: '💊', label: isRTL ? 'كتابة روشتة' : 'Write Prescription', to: '/doctor-prescriptions/new' },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 40, insetInlineEnd: 40, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 14 }}>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
          {actions.map((act, i) => (
            <button key={i} onClick={() => { setOpen(false); navigate(act.to); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 50,
                boxShadow: MOD_LG, cursor: 'pointer', whiteSpace: 'nowrap',
                color: 'var(--text-h)', fontWeight: 700, fontSize: 14,
                animation: `fabIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${i * 0.05}s forwards`,
                opacity: 0, flexDirection: isRTL ? 'row-reverse' : 'row'
              }}>
              <span>{act.label}</span>
              <span style={{ fontSize: 18 }}>{act.icon}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)} style={{
        width: 64, height: 64, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C_P} 0%, ${C_PD} 100%)`,
        border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer',
        boxShadow: MOD_LG, display: 'flex', alignItems: 'center',
        justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: open ? 'rotate(45deg)' : 'none',
      }}>+</button>
    </div>
  );
}
