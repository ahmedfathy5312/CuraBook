/**
 * AdminDashboardPage.jsx â€” CuraBook Admin Panel
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useAdminStats,
  useAdminHospitals,
  useAdminDoctors,
  useAdminPatients,
  useAdminAllUsers,
  useAdminAssistants,
  useAdminAppointments,
  useAuditLogs,
  useSystemHealth,
  useAdminTimeSeries,
  useToggleHospital,
  useToggleDoctor,
  useTogglePatient,
  useToggleAssistant,
  useToggleUser,
  useDeleteUser,
} from '../hooks/useAdminData';
import { useAuth } from '../../../context/AuthContext';
import { SearchInput } from '../../../components/ui/Input';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';

// Sections
import OverviewSection       from '../sections/OverviewSection';
import UsersSection          from '../sections/UsersSection';
import HospitalsSection      from '../sections/HospitalsSection';
import DoctorsSection        from '../sections/DoctorsSection';
import PatientsSection       from '../sections/PatientsSection';
import AppointmentsSection   from '../sections/AppointmentsSection';
import AuditSection          from '../sections/AuditSection';
import MonitoringSection     from '../sections/MonitoringSection';
import NotificationsSection  from '../sections/NotificationsSection';
import SettingsSection       from '../sections/SettingsSection';
import ScheduleSection       from '../sections/ScheduleSection';
import AnalyticsSection      from '../sections/AnalyticsSection';
import ReportsSection        from '../sections/ReportsSection';
import ChatSection           from '../sections/ChatSection';
import AssistantsSection     from '../sections/AssistantsSection';

// Command Palette
import CommandPalette        from '../components/CommandPalette';

// Error Boundary
import AdminErrorBoundary    from '../components/AdminErrorBoundary';

// Welcome Modal
import WelcomeModal          from '../components/WelcomeModal';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const location = useLocation();

  // Map URL paths to section IDs so deep-links work
  // e.g. /admin-notifications â†’ opens 'notifications' section automatically
  const PATH_SECTION_MAP = {
    '/admin-notifications': 'notifications',
    '/admin-audit-logs':    'audit',
    '/admin-users':         'users',
    '/admin-hospitals':     'hospitals',
  };

  const [section, setSection]         = useState(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) return tab;
    return PATH_SECTION_MAP[location.pathname] || 'overview';
  });
  const [q, setQ]                     = useState('');
  const [auditPage, setAuditPage]     = useState(1);

  // When URL path or search changes, update section
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setSection(tab);
      return;
    }
    const mapped = PATH_SECTION_MAP[location.pathname] || 'overview';
    setSection(mapped);
  }, [location.pathname, location.search]);

  // Command Palette state
  const [cmdOpen, setCmdOpen]         = useState(false);

  // Keyboard shortcut: Cmd+K / Ctrl+K â†’ open palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const SECTIONS = useMemo(() => [
    { id: 'overview',       icon: '\u{1f4ca}', label: t('nav.home') },
    { id: 'users',          icon: '\u{1f9d1}\u200d\u{1f4bc}', label: t('admin.users') },
    { id: 'hospitals',      icon: '\u{1f3e5}', label: t('admin.hospitals') },
    { id: 'doctors',        icon: '\u{1f468}\u200d\u2695\ufe0f', label: t('doctors.title') },
    { id: 'patients',       icon: '\u{1f465}', label: t('nav.patients') },
    { id: 'assistants',     icon: '\u{1f91d}', label: isAr ? '\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0648\u0646' : 'Assistants' },
    { id: 'appointments',   icon: '\u{1f4c5}', label: t('appointments.title') },
    { id: 'notifications',  icon: '\u{1f514}', label: isAr ? '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a' : 'Notifications' },
    { id: 'audit',          icon: '\u{1f4cb}', label: t('admin.auditLogs') },
    { id: 'monitoring',     icon: '\u{1f5a5}\ufe0f', label: t('admin.systemHealth') },
    { id: 'analytics',      icon: '\u{1f4c8}', label: isAr ? '\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a' : 'Analytics' },
    { id: 'reports',        icon: '\u{1f4c4}', label: isAr ? '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631' : 'Reports' },
    { id: 'settings',       icon: '\u2699\ufe0f', label: t('nav.settings') },
  ], [t, isAr]);

  // Data fetching â€” also enable when command palette is open so search has data
  const { data: stats,            isLoading: statsLoading  } = useAdminStats();
  // Fix NEW#1: use /admin/users/ (all roles) instead of /admin/patients/ for UsersSection
  const { data: usersData,        isLoading: uLoading       } = useAdminAllUsers({},              section === 'users'        || cmdOpen);
  const { data: hospitalsData,    isLoading: hLoading       } = useAdminHospitals({},             section === 'hospitals'    || section === 'overview' || cmdOpen);
  // FIX Issue #5 & #6: pass page_size=100 so client-side filtering works on full dataset (not just page 1 of 20)
  const { data: doctorsData,      isLoading: dLoading       } = useAdminDoctors({ page_size: 100 },               section === 'doctors'      || cmdOpen);
  const { data: patientsData,     isLoading: pLoading       } = useAdminPatients({},              section === 'patients'     || cmdOpen);
  const { data: apptData,         isLoading: aLoading       } = useAdminAppointments({ page_size: 100 },          section === 'appointments' || section === 'overview' || cmdOpen);
  const { data: auditData,        isLoading: audLoading     } = useAuditLogs({ page: auditPage }, section === 'audit'        || section === 'overview');
  const { data: healthData,       isLoading: healthLoading  } = useSystemHealth(section === 'monitoring');
  // Fix NEW#2 / Gap#3A: dedicated assistants query so AssistantsSection has real data
  const { data: assistantsData,   isLoading: assLoading     } = useAdminAssistants({},            section === 'assistants');
  const { data: timeSeriesData,   isLoading: tsLoading      } = useAdminTimeSeries(7,             section === 'overview');

  const toggleHospital  = useToggleHospital();
  const toggleDoctor    = useToggleDoctor();
  const togglePatient   = useTogglePatient();
  const toggleAssistant = useToggleAssistant();
  const toggleUser      = useToggleUser();
  const deleteUserMut   = useDeleteUser();

  // StandardPagination returns { success, data: [...], pagination: { count, ... } }
  // Fallback chain: .data (standard) â†’ .results (legacy) â†’ direct array
  const hospitals    = hospitalsData?.data   || hospitalsData?.results  || hospitalsData  || [];
  const doctors      = doctorsData?.data     || doctorsData?.results    || doctorsData    || [];
  const patients     = patientsData?.data    || patientsData?.results   || patientsData   || [];
  const appointments = apptData?.data        || apptData?.results       || apptData       || [];
  // ISSUE-014 FIX: auditData is now the array (interceptor unwraps it), with _pagination attached
  const auditLogs    = Array.isArray(auditData) ? auditData : (auditData?.data || auditData?.results || []);
  const auditMeta    = auditData?._pagination || auditData?.pagination || null;
  // Fix NEW#1: allUsers now comes from /admin/users/ â€” real combined list (not patients-only)
  const allUsers     = usersData?.data       || usersData?.results      || usersData      || [];
  // Fix NEW#2: assistants from dedicated /admin/assistants/ endpoint
  const assistants   = assistantsData?.data  || assistantsData?.results || assistantsData || [];

  const filterQ = (arr, keys) => {
    if (!q) return arr;
    const lq = q.toLowerCase();
    return arr.filter(item => keys.some(k => (item[k] || '').toLowerCase().includes(lq)));
  };

  const NO_SEARCH_SECTIONS = ['overview', 'schedule', 'analytics', 'reports', 'notifications', 'monitoring', 'chat'];

  const handleNavigate = useCallback((target) => {
    setSection(target);
    setQ('');
  }, []);

  // Is any data still loading (for palette spinner)
  const paletteLoading = uLoading || dLoading || pLoading || assLoading;

  return (
    <>
      <WelcomeModal stats={stats} />

      {/* Global Search Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={handleNavigate}
        users={allUsers}
        doctors={doctors}
        hospitals={hospitals}
        patients={patients}
        appointments={appointments}
        assistants={assistants}
        isLoading={paletteLoading}
      />

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: 'var(--bg-page)',
        fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
      }}>
        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topbar */}
          <div style={{
            background: 'var(--bg-card)', padding: '14px 24px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid var(--border-base)',
          }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: 0, flex: 1 }}>
              {SECTIONS.find(s => s.id === section)?.label || section}
            </h1>
            {!NO_SEARCH_SECTIONS.includes(section) && (
              <SearchInput value={q} onChange={e => setQ(e.target.value)}
                placeholder={t('adminStats.search')} style={{ width: 'min(240px, 100%)' }} />
            )}

            {/* Global Search: Cmd+K trigger button */}
            <button
              onClick={() => setCmdOpen(true)}
              title={isAr ? '\u0627\u0644\u0628\u062d\u062b \u0627\u0644\u0639\u0627\u0645 (Ctrl+K)' : 'Global Search (Ctrl+K)'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'var(--bg-page)',
                border: '1px solid var(--border-base)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-hint)',
                fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-hint)'; }}
            >
              <span>{"\u{1f50d}"}</span>
              <span>{isAr ? '\u0628\u062d\u062b' : 'Search'}</span>
              <kbd style={{
                padding: '1px 5px', borderRadius: 4,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-base)',
                fontSize: 10, fontFamily: 'monospace',
              }}>Ctrl K</kbd>
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px clamp(20px, 3vw, 44px)' }}>
            <div style={{
              width: '100%',
              maxWidth: 1480,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100%',
            }}>

            {section === 'overview' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <OverviewSection
                  stats={stats}                 statsLoading={statsLoading}
                  hospitals={hospitals}         hLoading={hLoading}
                  appointments={appointments}   aLoading={aLoading}
                  auditLogs={auditLogs}         audLoading={audLoading}
                  timeSeriesData={timeSeriesData} tsLoading={tsLoading}
                  onNavigate={handleNavigate}
                />
              </AdminErrorBoundary>
            )}

            {section === 'users' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <UsersSection
                  users={allUsers}
                  loading={uLoading}
                  onToggle={id => {
                    // Find user to know current is_active state, then toggle
                    const user = allUsers.find(u => u.id === id);
                    if (user) toggleUser.mutate({ id, is_active: !user.is_active });
                  }}
                  onDeleteUser={id => deleteUserMut.mutateAsync(id)}
                  filterFn={filterQ}
                />
              </AdminErrorBoundary>
            )}

            {section === 'hospitals' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <HospitalsSection hospitals={hospitals} loading={hLoading}
                  onToggle={id => toggleHospital.mutate(id)} filterFn={filterQ} />
              </AdminErrorBoundary>
            )}

            {section === 'doctors' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <DoctorsSection doctors={doctors} loading={dLoading}
                  onToggle={id => toggleDoctor.mutate(id)} filterFn={filterQ} />
              </AdminErrorBoundary>
            )}

            {section === 'patients' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <PatientsSection
                  patients={patients}
                  loading={pLoading}
                  onToggle={id => togglePatient.mutate(id)}
                  filterFn={filterQ}
                />
              </AdminErrorBoundary>
            )}

            {section === 'appointments' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <AppointmentsSection appointments={appointments} loading={aLoading} filterFn={filterQ} />
              </AdminErrorBoundary>
            )}

            {section === 'audit' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <AuditSection
                  auditLogs={auditLogs} auditData={auditMeta} loading={audLoading}
                  page={auditPage} onPageChange={p => setAuditPage(p)} filterFn={filterQ} />
              </AdminErrorBoundary>
            )}

            {section === 'monitoring' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <MonitoringSection healthData={healthData} stats={stats} loading={healthLoading || statsLoading} />
              </AdminErrorBoundary>
            )}
            {section === 'notifications' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <NotificationsSection />
              </AdminErrorBoundary>
            )}
            {section === 'settings' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <SettingsSection />
              </AdminErrorBoundary>
            )}

            {section === 'schedule' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <ScheduleSection />
              </AdminErrorBoundary>
            )}
            {section === 'analytics' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <AnalyticsSection />
              </AdminErrorBoundary>
            )}
            {section === 'reports' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <ReportsSection />
              </AdminErrorBoundary>
            )}

            {section === 'chat' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <ChatSection />
              </AdminErrorBoundary>
            )}

            {section === 'assistants' && (
              <AdminErrorBoundary sectionLabel={isAr ? '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629' : 'Overview'}>
                <AssistantsSection
                  assistants={assistants}
                  loading={assLoading}
                  onToggle={id => toggleAssistant.mutate(id)}
                  filterFn={filterQ}
                />
              </AdminErrorBoundary>
            )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

