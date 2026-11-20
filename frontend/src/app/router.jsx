/**
 * CuraBook — Central Route Configuration
 * ========================================
 * FIX ISSUE #2: router.jsx was an export-null stub. All 209 lines of routing lived
 * in App.js as a monolith. Routes are now here; App.js is a lean provider wrapper.
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

import { RoleGuard }  from './guards/RoleGuard';
import { PageLoader } from '../components/ui/Spinner';
import ErrorBoundary      from './ErrorBoundary';
import NotFoundPage      from '../components/NotFoundPage';
import UnauthorizedPage  from '../components/UnauthorizedPage';

import DoctorLayout    from '../layouts/DoctorLayout';
import HospitalLayout  from '../layouts/HospitalLayout';
import AssistantLayout from '../layouts/AssistantLayout';
import AdminLayout     from '../layouts/AdminLayout';
import PatientLayout   from '../layouts/PatientLayout';

// ─── Public pages (eager) — FIX ISSUE #1: migrated from src/pages/ → src/features/public/pages/ ──
import Home                 from '../features/public/pages/Home';
import Login                from '../features/public/pages/Login';
import JoinCuraBook         from '../features/public/pages/JoinCura';
import UserSignup           from '../features/public/pages/UserSignup';
import DoctorSignup         from '../features/public/pages/DoctorSignup';
import HospitalSignup       from '../features/public/pages/HospitalSignup';
import AssistantSignup      from '../features/public/pages/AssistantSignup';
import HospitalDoctorSignup from '../features/public/pages/HospitalDoctorSignup';
import AboutUs              from '../features/public/pages/AboutUs';
import Contact              from '../features/public/pages/Contact';
import ForgotPassword       from '../features/public/pages/ForgotPassword';
import ResetPassword        from '../features/public/pages/ResetPassword';
import EmailVerification    from '../features/public/pages/EmailVerification';

// ─── Feature pages (lazy) ────────────────────────────────────────────────────
const PatientDashboard    = lazy(() => import('../features/patient/pages/PatientDashboardPage'));
// AUDIT FIX ISSUE #2: Renamed features/doctors/ → doctor-discovery (patient-facing search)
const DoctorSearchPage    = lazy(() => import('../features/doctor-discovery/pages/DoctorSearchPage'));
const DoctorProfilePage   = lazy(() => import('../features/doctor-discovery/pages/DoctorProfilePage'));
const AppointmentsPage    = lazy(() => import('../features/appointments/pages/AppointmentsPage'));
const AppointmentDetail   = lazy(() => import('../features/appointments/pages/AppointmentDetailPage'));
const AdminDashboard      = lazy(() => import('../features/admin/pages/AdminDashboardPage'));
const AdminNotificationsPage = lazy(() => import('../features/admin/pages/AdminNotificationsPage')); // ISSUE-002 FIX
const AssistantAppointments   = lazy(() => import('../features/assistant/pages/AssistantAppointmentsPage'));   // HIGH-01 FIX
const AssistantDashboard      = lazy(() => import('../features/assistant/pages/AssistantDashboardPage'));
const AssistantProfile        = lazy(() => import('../features/assistant/pages/AssistantProfilePage'));
const AssistantNotifications  = lazy(() => import('../features/assistant/pages/AssistantNotificationsPage')); // Sprint 2
const AssistantSettings       = lazy(() => import('../features/assistant/pages/AssistantSettingsPage'));      // Sprint 2
const AssistantPatients       = lazy(() => import('../features/assistant/pages/AssistantPatientsPage'));      // Sprint 2
const AssistantAnalytics      = lazy(() => import('../features/assistant/pages/AssistantAnalyticsPage'));     // Sprint 2
const AssistantChat           = lazy(() => import('../features/assistant/pages/AssistantChatPage'));          // Sprint 3
const AssistantReports        = lazy(() => import('../features/assistant/pages/AssistantReportsPage'));       // Sprint 3
const AssistantOnboarding     = lazy(() => import('../features/assistant/pages/AssistantOnboardingPage'));    // Sprint 3
const AssistantPrescriptions  = lazy(() => import('../features/assistant/pages/AssistantPrescriptionsPage')); // Sprint 3
const HospitalDashboard   = lazy(() => import('../features/hospital/pages/HospitalDashboardPage'));
const PatientProfile      = lazy(() => import('../features/patient/pages/PatientProfilePage'));
const EditProfile         = lazy(() => import('../features/patient/pages/EditProfilePage'));
const Hospitals           = lazy(() => import('../features/patient/pages/HospitalsPage'));
const HospitalDetail      = lazy(() => import('../features/patient/pages/HospitalDetailPage'));
const PatientNotifications= lazy(() => import('../features/patient/pages/NotificationsPage'));
const Prescriptions       = lazy(() => import('../features/patient/pages/PrescriptionsPage'));
const MedicalHistory      = lazy(() => import('../features/patient/pages/MedicalHistoryPage')); // v30 MISS-02
// AUDIT FIX ISSUE #2: Renamed features/doctor/ → doctor-dashboard (doctor's own panel)
const DoctorDashboard     = lazy(() => import('../features/doctor-dashboard/pages/DoctorDashboardPage'));
const PatientManagement   = lazy(() => import('../features/doctor-dashboard/pages/DoctorPatientsPage'));
const NewPatientRecord    = lazy(() => import('../features/doctor-dashboard/pages/NewPatientRecordPage'));
const PatientRecordDetails= lazy(() => import('../features/doctor-dashboard/pages/PatientRecordDetailsPage'));
const PatientAppointments = lazy(() => import('../features/doctor-dashboard/pages/DoctorAppointmentsPage'));
const ProfileSettings     = lazy(() => import('../features/doctor-dashboard/pages/DoctorProfileSettingsPage'));
const ProfilePage         = lazy(() => import('../features/doctor-dashboard/pages/DoctorProfileOverviewPage'));
const DoctorPrescriptions = lazy(() => import('../features/doctor-dashboard/pages/DoctorPrescriptionsPage'));
const DoctorAnalytics     = lazy(() => import('../features/doctor-dashboard/pages/DoctorAnalyticsPage'));
const DoctorAssistants    = lazy(() => import('../features/doctor-dashboard/pages/DoctorAssistantsPage'));
const DoctorReports       = lazy(() => import('../features/doctor-dashboard/pages/DoctorReportsPage'));
const ManageDoctors       = lazy(() => import('../features/hospital/pages/ManageDoctorsPage'));
const ManagePatients      = lazy(() => import('../features/hospital/pages/ManagePatientsPage'));
const ManageAssistants    = lazy(() => import('../features/hospital/pages/ManageAssistantsPage'));
const HospitalProfileSettings = lazy(() => import('../features/hospital/pages/HospitalProfileSettingsPage'));
const HospitalDepartments = lazy(() => import('../features/hospital/pages/DepartmentsPage'));         // FIX S1-8
const DoctorSchedule      = lazy(() => import('../features/scheduling/pages/DoctorSchedulePage'));    // FIX S1-9
const HospitalNotifications = lazy(() => import('../features/hospital/pages/HospitalNotificationsPage')); // NEW

// ─── NEW PAGES (audit fixes) ──────────────────────────────────────────────────
const DoctorNotifications  = lazy(() => import('../features/doctor-dashboard/pages/DoctorNotificationsPage'));   // AUDIT FIX ISSUE #2
const AssistantSchedule    = lazy(() => import('../features/assistant/pages/AssistantSchedulePage'));  // F-07
const AdminUsersPage       = lazy(() => import('../features/admin/pages/AdminUsersPage'));             // F-06
const AdminHospitalsPage   = lazy(() => import('../features/admin/pages/AdminHospitalsPage'));         // F-06
const AdminAuditLogsPage   = lazy(() => import('../features/admin/pages/AdminAuditLogsPage'));         // F-11
const BookingSuccess       = lazy(() => import('../features/appointments/pages/BookingSuccessPage'));  // F-13
const BookingPage          = lazy(() => import('../features/appointments/pages/BookingPage'));           // F-05: dedicated booking flow
const SearchPage           = lazy(() => import('../features/search/pages/SearchPage'));                   // AUDIT FIX: /search route

// ─── Video Consultation ──────────────────────────────────────────────────────
const VideoConsultation  = lazy(() => import('../features/video/pages/VideoConsultationPage'));
const VideoPreCallLobby  = lazy(() => import('../features/video/pages/VideoPreCallLobbyPage'));

// ─── New pages (v17-fix) ─────────────────────────────────────────────────────
const PostAppointmentReview = lazy(() => import('../features/appointments/pages/PostAppointmentReviewPage'));
const NearbyClinics         = lazy(() => import('../features/patient/pages/NearbyClinicsPage'));
const PrescriptionDetail    = lazy(() => import('../features/patient/pages/PrescriptionDetailPage'));
// Bug #15 FIX: HospitalReportsPage removed — Reports content merged into Analytics tab.

// ─── Chat ─────────────────────────────────────────────────────────────────────
const ChatPage = lazy(() => import('../features/chat/pages/ChatPage'));


const BillingPage         = lazy(() => import('../features/billing/pages/BillingPage'));
const BillingSuccessPage  = lazy(() => import('../features/billing/pages/BillingSuccessPage'));

function Lazy({ component: Component }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// HOME-FIX: SmartHome — shows public Home by default.
// Authenticated users with a valid role are redirected to their dashboard.
// We wait for authInitialized (silent session restore complete) before redirecting,
// so we never bounce a user with a valid HttpOnly cookie to /login on reload.
function SmartHome() {
  const { isAuthenticated, role, authInitialized, ROLE_ROUTES } = useContext(AuthContext);

  // Wait until the mount-time session restore has settled.
  // While pending, show the public Home page (safe for everyone).
  if (!authInitialized) return <Home />;

  // Session restore complete — if the user is authenticated redirect to their dashboard.
  if (isAuthenticated && role && role !== 'guest') {
    const dest = ROLE_ROUTES?.[role] || '/dashboard';
    return <Navigate to={dest} replace />;
  }

  // Default: public Home page (unauthenticated)
  return <Home />;
}

// BUG-03 FIX: Each Guard is wrapped with its own ErrorBoundary so route-level crashes
// are caught before they can propagate past the Suspense boundary.
function Guard({ roles, component: C, layout: Layout }) {
  const inner = (
    <ErrorBoundary>
      <Lazy component={C} />
    </ErrorBoundary>
  );
  return (
    <RoleGuard allowedRoles={roles}>
      {Layout ? <Layout>{inner}</Layout> : inner}
    </RoleGuard>
  );
}


export default function AppRouter() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/"                        element={<SmartHome />} />
      <Route path="/login"                   element={<Login />} />
      <Route path="/join"                    element={<JoinCuraBook />} />
      <Route path="/signup"                  element={<UserSignup />} />
      <Route path="/doctor-signup"           element={<DoctorSignup />} />
      <Route path="/hospital-signup"         element={<HospitalSignup />} />
      <Route path="/assistant-signup"        element={<AssistantSignup />} />
      <Route path="/hospital-doctor-signup"  element={<Guard roles={['hospital']} component={HospitalDoctorSignup} layout={HospitalLayout} />} />
      <Route path="/about-us"                element={<AboutUs />} />
      <Route path="/About-Us"                element={<Navigate to="/about-us" replace />} />
      <Route path="/contact-us"              element={<Contact />} />
      <Route path="/Contact-Us"              element={<Navigate to="/contact-us" replace />} />
      <Route path="/forgot-password"         element={<ForgotPassword />} />
      <Route path="/reset-password"          element={<ResetPassword />} />
      <Route path="/verify-email"            element={<EmailVerification />} />
      <Route path="/unauthorized"            element={<UnauthorizedPage />} />

      {/* PATIENT — BUG-02 FIX: layout={PatientLayout} passed from router (consistent with doctor/hospital pattern) */}
      <Route path="/doctors"                 element={<Guard roles={['patient']} component={DoctorSearchPage}      layout={PatientLayout} />} />
      <Route path="/doctors/:id"             element={<ErrorBoundary><Guard roles={['patient']} component={DoctorProfilePage}     layout={PatientLayout} /></ErrorBoundary>} />
      <Route path="/search"                  element={<Guard roles={['patient']} component={SearchPage}           layout={PatientLayout} />} />
      <Route path="/appointments"            element={<Guard roles={['patient']} component={AppointmentsPage}      layout={PatientLayout} />} />
      <Route path="/appointments/:id"        element={<Guard roles={['patient']} component={AppointmentDetail}     layout={PatientLayout} />} />
      <Route path="/profile"                 element={<Guard roles={['patient']} component={PatientProfile}        layout={PatientLayout} />} />
      <Route path="/dashboard"               element={<Guard roles={['patient']} component={PatientDashboard}      layout={PatientLayout} />} />
      <Route path="/edit-profile"            element={<Guard roles={['patient']} component={EditProfile}           layout={PatientLayout} />} />
      <Route path="/hospitals"               element={<Guard roles={['patient']} component={Hospitals}             layout={PatientLayout} />} />
      <Route path="/hospitals/:id"           element={<Guard roles={['patient']} component={HospitalDetail}        layout={PatientLayout} />} />
      <Route path="/notifications"           element={<Guard roles={['patient']} component={PatientNotifications}  layout={PatientLayout} />} />
      <Route path="/prescriptions"           element={<Guard roles={['patient']} component={Prescriptions}         layout={PatientLayout} />} />
      {/* /prescriptions/:id → detail page (handled below in new routes) */}
      <Route path="/medical-history"         element={<Guard roles={['patient']} component={MedicalHistory}        layout={PatientLayout} />} /> {/* v30 MISS-02 */}

      {/* DOCTOR */}
      <Route path="/doctor-dashboard"              element={<Guard roles={['doctor']} component={DoctorDashboard}      layout={DoctorLayout} />} />
      <Route path="/patient-management"            element={<Guard roles={['doctor']} component={PatientManagement}    layout={DoctorLayout} />} />
      <Route path="/new-patient-record"            element={<Guard roles={['doctor']} component={NewPatientRecord}     layout={DoctorLayout} />} />
      <Route path="/patient-record-details/:id"    element={<Guard roles={['doctor']} component={PatientRecordDetails} layout={DoctorLayout} />} />
      <Route path="/patient-appointments"          element={<Guard roles={['doctor']} component={PatientAppointments}  layout={DoctorLayout} />} />
      <Route path="/doctor-appointments"           element={<Guard roles={['doctor']} component={PatientAppointments}  layout={DoctorLayout} />} />
      <Route path="/profile-settings"              element={<Guard roles={['doctor']}   component={ProfileSettings}      layout={DoctorLayout} />} />
      {/* BUG-03 FIX: Hospital profile-settings uses /profile-settings-hospital with HospitalLayout — see HOSPITAL section below */}
      <Route path="/profile-page"                  element={<Guard roles={['doctor']} component={ProfilePage}          layout={DoctorLayout} />} />
      <Route path="/doctor-prescriptions"          element={<Guard roles={['doctor']} component={DoctorPrescriptions}  layout={DoctorLayout} />} />
      <Route path="/doctor-prescriptions/new"      element={<Guard roles={['doctor']} component={DoctorPrescriptions}  layout={DoctorLayout} />} />
      <Route path="/doctor-schedule"               element={<Guard roles={['doctor']} component={DoctorSchedule}       layout={DoctorLayout} />} />  {/* FIX S1-9 */}
      <Route path="/doctor-analytics"              element={<Guard roles={['doctor']} component={DoctorAnalytics}      layout={DoctorLayout} />} />
      <Route path="/doctor-assistants"             element={<Guard roles={['doctor']} component={DoctorAssistants}     layout={DoctorLayout} />} />
      <Route path="/doctor-reports"                element={<Guard roles={['doctor']} component={DoctorReports}        layout={DoctorLayout} />} />

      {/* HOSPITAL */}
      <Route path="/hospital-dashboard"            element={<Guard roles={['hospital']} component={HospitalDashboard}      layout={HospitalLayout} />} />
      <Route path="/manage-doctors"                element={<Guard roles={['hospital']} component={ManageDoctors}           layout={HospitalLayout} />} />
      <Route path="/manage-patients"               element={<Guard roles={['hospital']} component={ManagePatients}          layout={HospitalLayout} />} />
      <Route path="/manage-assistants"             element={<Guard roles={['hospital']} component={ManageAssistants}        layout={HospitalLayout} />} />
      <Route path="/hospital-departments"          element={<Guard roles={['hospital']} component={HospitalDepartments}     layout={HospitalLayout} />} />  {/* FIX S1-8 */}
      <Route path="/hospital-notifications"        element={<Guard roles={['hospital']} component={HospitalNotifications}    layout={HospitalLayout} />} />  {/* NEW */}
      <Route path="/profile-settings-hospital"     element={<Guard roles={['hospital']} component={HospitalProfileSettings} layout={HospitalLayout} />} />
      <Route path="/hospital-profile-settings"     element={<Guard roles={['hospital']} component={HospitalProfileSettings} layout={HospitalLayout} />} />{/* FIX v29: alias for navbar link */}

      {/* ADMIN */}
      <Route path="/admin-dashboard"               element={<Guard roles={['admin']} component={AdminDashboard}          layout={AdminLayout} />} />
      <Route path="/admin-notifications"           element={<Guard roles={['admin']} component={AdminNotificationsPage}  layout={AdminLayout} />} />  {/* ISSUE-002 FIX */}
      <Route path="/admin-users"                   element={<Guard roles={['admin']} component={AdminUsersPage}          layout={AdminLayout} />} />
      <Route path="/admin-hospitals"               element={<Guard roles={['admin']} component={AdminHospitalsPage}  layout={AdminLayout} />} />
      <Route path="/admin-audit-logs"              element={<Guard roles={['admin']} component={AdminAuditLogsPage}  layout={AdminLayout} />} />  {/* F-11 */}

      {/* ASSISTANT */}
      <Route path="/assistant-dashboard"           element={<Guard roles={['assistant']} component={AssistantDashboard}     layout={AssistantLayout} />} />
      <Route path="/assistant-profile"             element={<Guard roles={['assistant']} component={AssistantProfile}       layout={AssistantLayout} />} />
      <Route path="/assistant-schedule"            element={<Guard roles={['assistant']} component={AssistantSchedule}      layout={AssistantLayout} />} />
      <Route path="/assistant-notifications"       element={<Guard roles={['assistant']} component={AssistantNotifications} layout={AssistantLayout} />} />
      <Route path="/assistant-settings"            element={<Guard roles={['assistant']} component={AssistantSettings}      layout={AssistantLayout} />} />
      <Route path="/assistant-patients"            element={<Guard roles={['assistant']} component={AssistantPatients}      layout={AssistantLayout} />} />
      <Route path="/assistant-analytics"           element={<Guard roles={['assistant']} component={AssistantAnalytics}     layout={AssistantLayout} />} />
      <Route path="/assistant-chat"                element={<Guard roles={['assistant']} component={AssistantChat}          layout={AssistantLayout} />} />
      <Route path="/assistant-reports"             element={<Guard roles={['assistant']} component={AssistantReports}       layout={AssistantLayout} />} />
      <Route path="/assistant-onboarding"          element={<Guard roles={['assistant']} component={AssistantOnboarding} />} />
      <Route path="/assistant-prescriptions"       element={<Guard roles={['assistant']} component={AssistantPrescriptions} layout={AssistantLayout} />} /> {/* Sprint 3 */}
      <Route path="/assistant-appointments"        element={<Guard roles={['assistant']} component={AssistantAppointments}   layout={AssistantLayout} />} /> {/* HIGH-01 FIX: dedicated page */}

      {/* DOCTOR EXTRA */}
      <Route path="/doctor-notifications"          element={<Guard roles={['doctor']} component={DoctorNotifications} layout={DoctorLayout} />} />

      {/* BOOKING SUCCESS */}
      <Route path="/booking-success/:id"           element={<ErrorBoundary><Guard roles={['patient']} component={BookingSuccess} layout={PatientLayout} /></ErrorBoundary>} />
      {/* F-05 FIX: Dedicated booking page (slot → details → confirm) per prototype slide 37 */}
      <Route path="/book/:doctorId"                element={<ErrorBoundary><Guard roles={['patient']} component={BookingPage}    layout={PatientLayout} /></ErrorBoundary>} />

      {/* CHAT — patient uses PatientLayout, doctor uses DoctorLayout */}
      <Route path="/chat" element={<ErrorBoundary><Guard roles={['patient']} component={ChatPage} layout={PatientLayout} /></ErrorBoundary>} />
      <Route path="/chat/doctor" element={<ErrorBoundary><Guard roles={['doctor']} component={ChatPage} layout={DoctorLayout} /></ErrorBoundary>} />

      {/* BILLING — accessible to doctors and hospital admins */}
      <Route path="/billing"         element={<Guard roles={['doctor','hospital']} component={BillingPage}        layout={DoctorLayout} />} />
      <Route path="/billing/success" element={<Guard roles={['doctor','hospital']} component={BillingSuccessPage} layout={DoctorLayout} />} />

      {/* VIDEO CONSULTATION */}
      <Route path="/video/lobby/:sessionId" element={<Guard roles={['doctor','patient']} component={VideoPreCallLobby}  layout={PatientLayout} />} />
      <Route path="/video/:sessionId"       element={<Guard roles={['doctor','patient']} component={VideoConsultation}  layout={PatientLayout} />} />

      {/* NEW — v17-fix */}
      <Route path="/review/:appointmentId"  element={<Guard roles={['patient']} component={PostAppointmentReview} layout={PatientLayout} />} />
      <Route path="/nearby"                 element={<Guard roles={['patient']} component={NearbyClinics}         layout={PatientLayout} />} />
      <Route path="/prescriptions/:id"      element={<Guard roles={['patient']} component={PrescriptionDetail}    layout={PatientLayout} />} />
      {/* Bug #15 FIX: /hospital-reports route removed — analytics tab in dashboard replaces it */}

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
