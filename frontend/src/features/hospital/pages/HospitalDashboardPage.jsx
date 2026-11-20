import { useState, lazy, Suspense, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useHospitalOverview, useHospitalDoctors, useHospitalAppointments, useHospitalAssistants, useHospitalDepartments, useHospitalAnalytics, useAddDoctorToHospital, useRemoveDoctorFromHospital, useAddAssistantToHospital, useRemoveAssistantFromHospital, useCreateDepartment, useDeleteDepartment } from "../hooks/useHospitalData";
import StatCard from "../../../components/shared/StatCard";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { Table } from "../../../components/ui/Table";
import { Tabs } from "../../../components/ui/Tabs";
import { SearchInput } from "../../../components/ui/Input";
import useTranslation from "../../../i18n/useTranslation";
import { Modal } from "../../../components/ui/Modal";
import Avatar from "../../../components/ui/Avatar";
// FIX F-11: Import Skeleton for consistent loading states across all pages
import Skeleton from "../../../components/ui/Skeleton";
import { formatDate, formatTime, getDoctorPrefix, stripDoctorPrefix, formatNumberLocale } from "../../../utils/formatters";
import apiClient from "../../../services/apiClient";
import { API } from "../../../constants/apiRoutes";
import { AppointmentStatusDonut, DoctorSpecialtyBar, WeeklyAppointmentTrend, HospitalKpiCards } from "../../../components/shared/DashboardCharts";  // AUDIT FIX ISSUE #7: moved to shared
import { tokens } from "../../../theme/tokens";
// F-08 FIX: extracted section components for maintainability
import HospitalOverviewSection      from "../components/HospitalOverviewSection";
import HospitalDoctorsSection       from "../components/HospitalDoctorsSection";
import HospitalAppointmentsSection  from "../components/HospitalAppointmentsSection";
import HospitalAssistantsSection    from "../components/HospitalAssistantsSection";
import WelcomeBanner from "../../../components/shared/WelcomeBanner";
import ReportsSection from "../../../components/shared/ReportsSection";
import HospitalAnalyticsDownloadSection from "../../../components/hospital/HospitalAnalyticsDownloadSection";
import HospitalQuickAccess from "../../../components/hospital/HospitalQuickAccess";
import HospitalDoctorProfileModal from "../../../components/hospital/HospitalDoctorProfileModal";

// F-03 FIX: centralized color token — replaces all hardcoded PRIMARY / PRIMARY_DARK
const PRIMARY      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PRIMARY_DARK = tokens?.colors?.primary?.dark || '#0C6478';
const PRIMARY_LITE = tokens?.colors?.primary?.lighter || '#E0F7FA';

const HospitalScheduleManager = lazy(() => import("../../scheduling/components/HospitalScheduleManager"));

// TABS are now built dynamically inside the component using t() for i18n

const SPECIALTIES = [
  "Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology",
  "Oncology","General Surgery","Internal Medicine","Radiology","ENT",
];

function AddDoctorModal({ onClose, onAdd }) {
  const { t, lang: language } = useTranslation();
  const [step, setStep] = useState("search"); // "search" | "confirm"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const { data } = await apiClient.get(API.SEARCH.DOCTORS, { params: { q: searchQuery, page_size: 10 } }); // FE-05 FIX: was hardcoded "/doctors/search/"
      const results = data?.results || data || [];
      setSearchResults(results);
      if (results.length === 0) setSearchError(t('hospitalModals.noResults'));
    } catch {
      setSearchError(t('hospitalModals.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  const handleSelect = (doc) => { setSelectedDoctor(doc); setStep("confirm"); };

  const handleConfirm = async () => {
    if (!selectedDoctor) return;
    setLoading(true);
    try {
      // Backend accepts email to look up & link existing doctor
      await onAdd({ email: selectedDoctor.email || selectedDoctor.user?.email });
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={step === "search" ? t('hospitalModals.addDoctorTitle') : t('hospitalModals.confirmAddDoctorTitle')} maxWidth="520px"
      footer={
        step === "search" ? (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>{t('hospitalModals.cancel')}</Button>
            <Button variant="primary" size="sm" loading={searching} onClick={handleSearch} disabled={!searchQuery.trim()}>{t('hospitalModals.search')}</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setStep("search")}>{t('hospitalModals.back')}</Button>
            <Button variant="primary" size="sm" loading={loading} onClick={handleConfirm}>{t('hospitalModals.addToHospital')}</Button>
          </>
        )
      }
    >
      {step === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: 'var(--text-muted)' }}>
            {t('hospitalModals.addDoctorHint')}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder={t('hospitalModals.searchDoctorPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                flex: 1, padding: "10px 14px", borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--border-base)", fontSize: "14px",
                outline: "none", fontFamily: "inherit",
              }}
              onFocus={e => e.target.style.borderColor = PRIMARY}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <Button variant="primary" size="sm" loading={searching} onClick={handleSearch}>{t('hospitalModals.search')}</Button>
          </div>

          {searchError && (
            <p style={{ fontSize: "13px", color: "var(--danger,#E97D61)", margin: 0 }}>{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
              {searchResults.map(doc => {
                const name = doc.full_name || doc.name || doc.username || "Unknown";
                const spec = doc.specialty || doc.doctor_profile?.specialty || "";
                const email = doc.email || doc.user?.email || "";
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleSelect(doc)}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 14px", borderRadius: "var(--radius-lg)",
                      border: "1.5px solid var(--border-base)", background: 'var(--bg-card)',
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.background = PRIMARY_LITE; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                  >
                    <Avatar name={name} src={doc.image || doc.profile_image} size="md" />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "14px", color: 'var(--text-h)' }}>{getDoctorPrefix(language)} {stripDoctorPrefix(name)}</p>
                      {spec && <p style={{ margin: "0 0 2px", fontSize: "12px", color: PRIMARY, fontWeight: 600 }}>{spec}</p>}
                      {email && <p style={{ margin: 0, fontSize: "11px", color: "var(--text-hint)" }}>{email}</p>}
                    </div>
                    <span style={{ fontSize: "18px", color: PRIMARY }}>+</span>
                  </button>
                );
              })}
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery && !searchError && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-hint)" }}>
              <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🔍</p>
              <p style={{ fontSize: "13px", margin: 0 }}>{t('hospitalModals.pressToSearch')}</p>
            </div>
          )}

          {!searchQuery && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-hint)" }}>
              <p style={{ fontSize: "32px", margin: "0 0 8px" }}>👨‍⚕️</p>
              <p style={{ fontSize: "13px", margin: 0 }}>{t('hospitalModals.typeToSearchDoctor')}</p>
            </div>
          )}
        </div>
      )}

      {step === "confirm" && selectedDoctor && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", padding: "8px 0" }}>
          <Avatar name={selectedDoctor.full_name || selectedDoctor.name || t('hospitalModals.doctor')} src={selectedDoctor.image} size="xl" />
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: 'var(--text-h)' }}>
              {getDoctorPrefix(language)} {stripDoctorPrefix(selectedDoctor.full_name || selectedDoctor.name || t('hospitalModals.doctor'))}
            </h3>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: PRIMARY, fontWeight: 600 }}>
              {selectedDoctor.specialty || selectedDoctor.doctor_profile?.specialty || "—"}
            </p>
            {selectedDoctor.email && (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-hint)" }}>{selectedDoctor.email}</p>
            )}
          </div>
          <div style={{ background: PRIMARY_LITE, borderRadius: "var(--radius-md)", padding: "14px 20px", textAlign: "center", width: "100%" }}>
            <p style={{ margin: 0, fontSize: "13px", color: 'var(--text-body)' }}>
              {t('hospitalModals.addDoctorConfirmHint')}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AddAssistantModal({ onClose, onAdd }) {
  const { t } = useTranslation();
  const [step, setStep] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const { data } = await apiClient.get(API.HOSPITAL.ASSISTANTS, { params: { search: searchQuery, page_size: 10 } }); // BUG-05 FIX: was hardcoded '/assistants/'
      const results = data?.results || data || [];
      const flat = results.map(a => ({
        ...a,
        full_name: a.user?.full_name || a.full_name || a.user?.username || "Unknown",
        email:     a.user?.email    || a.email,
      }));
      setSearchResults(flat);
      if (flat.length === 0) setSearchError(t('hospitalModals.noResults'));
    } catch {
      setSearchError(t('hospitalModals.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAssistant) return;
    setLoading(true);
    try {
      await onAdd({ email: selectedAssistant.email });
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={step === "search" ? t('hospitalModals.addAssistantTitle') : t('hospitalModals.confirmAddAssistantTitle')} maxWidth="520px"
      footer={
        step === "search" ? (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>{t('hospitalModals.cancel')}</Button>
            <Button variant="primary" size="sm" loading={searching} onClick={handleSearch} disabled={!searchQuery.trim()}>{t('hospitalModals.search')}</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setStep("search")}>{t('hospitalModals.back')}</Button>
            <Button variant="primary" size="sm" loading={loading} onClick={handleConfirm}>{t('hospitalModals.addToHospital')}</Button>
          </>
        )
      }
    >
      {step === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: 'var(--text-muted)' }}>
            {t('hospitalModals.addAssistantHint')}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text" placeholder={t('hospitalModals.searchAssistantPlaceholder')}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              autoFocus
              style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-base)", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = PRIMARY}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <Button variant="primary" size="sm" loading={searching} onClick={handleSearch}>{t('hospitalModals.search')}</Button>
          </div>

          {searchError && <p style={{ fontSize: "13px", color: "var(--danger,#E97D61)", margin: 0 }}>{searchError}</p>}

          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
              {searchResults.map(a => (
                <button key={a.id} onClick={() => { setSelectedAssistant(a); setStep("confirm"); }}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-base)", background: 'var(--bg-card)', cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.background = PRIMARY_LITE; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                >
                  <Avatar name={a.full_name} size="md" />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "14px", color: 'var(--text-h)' }}>{a.full_name}</p>
                    {a.email && <p style={{ margin: 0, fontSize: "11px", color: "var(--text-hint)" }}>{a.email}</p>}
                  </div>
                  <span style={{ fontSize: "18px", color: PRIMARY }}>+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {step === "confirm" && selectedAssistant && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", padding: "8px 0" }}>
          <Avatar name={selectedAssistant.full_name} size="xl" />
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: 'var(--text-h)' }}>{selectedAssistant.full_name}</h3>
            {selectedAssistant.email && <p style={{ margin: 0, fontSize: "12px", color: "var(--text-hint)" }}>{selectedAssistant.email}</p>}
          </div>
          <div style={{ background: PRIMARY_LITE, borderRadius: "var(--radius-md)", padding: "14px 20px", textAlign: "center", width: "100%" }}>
            <p style={{ margin: 0, fontSize: "13px", color: 'var(--text-body)' }}>
              {t('hospitalModals.addAssistantConfirmHint')}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function HospitalDashboardPage() {
  const { t, language } = useTranslation();

  const TABS = [
    { id: "overview",     icon: "📊", label: t("hospitals.dashboard.overview") },
    { id: "doctors",      icon: "👨‍⚕️", label: t("hospitals.dashboard.doctors") },
    { id: "assistants",   icon: "🩺",  label: t("hospitals.dashboard.assistants") },
    { id: "appointments", icon: "📅", label: t("hospitals.dashboard.appointments") },
    { id: "analytics",    icon: "📈", label: t("hospitals.dashboard.analytics") },
    { id: "schedule",     icon: "🗓",  label: t("hospitals.dashboard.schedules") },
  ];
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ["overview", "doctors", "assistants", "appointments", "analytics", "schedule"];
    return validTabs.includes(tabParam) ? tabParam : "overview";
  });

  // Sync tab when URL ?tab= changes (e.g. from QuickAccess cards)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ["overview", "doctors", "assistants", "appointments", "analytics", "schedule"];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddAssistantModal, setShowAddAssistantModal] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [removeAssistantConfirm, setRemoveAssistantConfirm] = useState(null);
  const [searchDoc, setSearchDoc] = useState("");
  const [searchAsst, setSearchAsst] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [apptStatusFilter, setApptStatusFilter] = useState("all");
  const [apptDoctorFilter, setApptDoctorFilter] = useState("");
  const [apptDeptFilter,   setApptDeptFilter]   = useState("");
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);

  // Real API mutations (replaces local state manipulation)
  const addDoctorMutation       = useAddDoctorToHospital();
  const removeDoctorMutation    = useRemoveDoctorFromHospital();
  const addAssistantMutation    = useAddAssistantToHospital();
  const removeAssistantMutation = useRemoveAssistantFromHospital();

  const { data: overview,         isLoading: overviewLoading }  = useHospitalOverview();
  const { data: doctorsData,      isLoading: doctorsLoading }   = useHospitalDoctors({}, activeTab === "doctors"      || activeTab === "overview");
  const { data: appointmentsData, isLoading: apptLoading }      = useHospitalAppointments({}, activeTab === "appointments" || activeTab === "overview");
  const { data: assistantsData,   isLoading: assistantsLoading }= useHospitalAssistants({}, activeTab === "assistants");
  // F-13 FIX: call useHospitalAnalytics — was imported but never invoked.
  // Fires only when the analytics tab is active to avoid unnecessary requests.
  const { data: analyticsData,    isLoading: analyticsLoading } = useHospitalAnalytics(activeTab === "analytics");
  const activeHospitalId =
    overview?.active_hospital?.id ||
    overview?.hospital?.id ||
    overview?.hospital_id ||
    user?.hospital_id ||
    user?.hospital?.id ||
    user?.hospital_admin_links?.[0]?.hospital_id ||
    user?.hospital_admin_links?.[0]?.hospital?.id ||
    user?.managed_hospitals?.[0]?.id ||
    null;

  const doctors    = doctorsData?.results    || doctorsData    || [];
  const appointments = appointmentsData?.results || appointmentsData || [];
  const assistants = (assistantsData?.results || assistantsData || []).map(a => ({
    ...a,
    full_name:  a.user?.full_name  || a.full_name  || a.user?.username || "Unknown",
    email:      a.user?.email      || a.email,
    phone:      a.user?.phone      || a.phone,
    workplaces: [
      ...(a.workplaces?.clinics   || []).map(c => c.name),
      ...(a.workplaces?.hospitals || []).map(h => h.name),
    ],
  }));

  const filteredDoctors = doctors
    .filter(d => docStatusFilter === "all" || d.status === docStatusFilter)
    .filter(d => !searchDoc || (d.full_name || d.doctor_name || d.name || '')?.toLowerCase().includes(searchDoc.toLowerCase()) || d.specialty?.toLowerCase().includes(searchDoc.toLowerCase()));

  const filteredAssistants = assistants
    .filter(a => !searchAsst || a.full_name?.toLowerCase().includes(searchAsst.toLowerCase()) || a.department?.toLowerCase().includes(searchAsst.toLowerCase()));

  const apptDepts = [...new Set(appointments.map(a => a.department_name || a.department || "").filter(Boolean))];
  const normalizeApptStatus = (status) => String(status || '').toLowerCase();

  const filteredAppts = appointments
    .filter(a => apptStatusFilter === "all" || normalizeApptStatus(a.status) === apptStatusFilter)
    .filter(a => !apptDoctorFilter || a.doctor_name?.toLowerCase().includes(apptDoctorFilter.toLowerCase()))
    .filter(a => !apptDeptFilter || (a.department_name || a.department || "").toLowerCase().includes(apptDeptFilter.toLowerCase()));

  const stats = (() => {
    // toNum: normalises any API value to a safe integer for StatCard rendering.
    // Handles: number → as-is | array → length | object → 0 | null/undefined → 0
    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'object') return 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };
    return {
      total_doctors:        toNum(overview?.total_doctors)        || toNum(doctors.length),
      total_patients:       toNum(overview?.total_patients)       || 0,
      total_appointments:   toNum(overview?.total_appointments)   || toNum(appointments.length),
      pending_appointments: toNum(overview?.pending_appointments) || toNum(appointments.filter(a => normalizeApptStatus(a.status) === "pending").length),
    };
  })();

  // F-13 FIX: Derive chart data from /hospital/analytics/ API response.
  // Falls back to local array counts while the request is loading or unavailable.
  const analyticsStats = (() => {
    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'object') return 0;
      const n = Number(v); return isNaN(n) ? 0 : n;
    };
    return {
      total_doctors:         toNum(analyticsData?.total_doctors)         || toNum(stats.total_doctors),
      total_patients:        toNum(analyticsData?.total_patients)        || toNum(stats.total_patients),
      total_clinics:         toNum(analyticsData?.total_clinics)         || 0,
      total_appointments:    toNum(analyticsData?.total_appointments)    || toNum(stats.total_appointments),
      today_appointments:    toNum(analyticsData?.today_appointments)    || 0,
      pending_appointments:  toNum(analyticsData?.pending_appointments)  || toNum(stats.pending_appointments),
      accepted_appointments: toNum(analyticsData?.accepted_appointments) || toNum(appointments.filter(a => ["confirmed","approved"].includes(normalizeApptStatus(a.status))).length),
      rejected_appointments: toNum(analyticsData?.rejected_appointments) || toNum(appointments.filter(a => normalizeApptStatus(a.status) === "rejected").length),
      cancelled_appointments:toNum(analyticsData?.cancelled_appointments)|| toNum(appointments.filter(a => normalizeApptStatus(a.status) === "cancelled").length),
    };
  })();

  // Pre-built status-donut data sourced from the analytics endpoint.
  // null means "fall back to deriving from the appointments prop" in the chart component.
  const analyticsStatusData = analyticsData
    ? [
        { label: t("appointments.status.confirmed"),  value: analyticsStats.accepted_appointments,   color: "var(--success,#31A870)" },
        { label: t("appointments.status.pending"),    value: analyticsStats.pending_appointments,    color: "var(--warning,#F59E0B)" },
        { label: t("appointments.status.rejected") || "مرفوض",   value: analyticsStats.rejected_appointments,   color: "var(--danger,#E97D61)" },
        { label: t("appointments.status.cancelled"),  value: analyticsStats.cancelled_appointments,  color: "var(--text-hint)" },
      ].filter(d => d.value > 0)
    : null;

  // Real API: Add doctor
  const handleAddDoctor = (form) => {
    return addDoctorMutation.mutateAsync(form);
  };

  // Real API: Remove doctor
  const handleRemoveDoctor = (id) => {
    removeDoctorMutation.mutate(id, {
      onSuccess: () => setRemoveConfirm(null),
    });
  };

  // Real API: Add assistant
  const handleAddAssistant = async (form) => {
    return addAssistantMutation.mutateAsync(form);
  };

  // Real API: Remove assistant
  const handleRemoveAssistant = (id) => {
    removeAssistantMutation.mutate(id, {
      onSuccess: () => setRemoveAssistantConfirm(null),
    });
  };

  const HOSPITAL_REPORTS = [
    { id: 'monthly_summary',     name: t('reports.hospital.monthly', 'الملخص الشهري'),     icon: '🏥', date: 'Monthly', size: 'PDF, Excel' },
    { id: 'doctors_performance', name: t('reports.hospital.doctors', 'أداء الأطباء'),     icon: '👨⚕️', date: 'Monthly', size: 'PDF, Excel' },
    { id: 'revenue_analysis',    name: t('reports.hospital.revenue', 'تحليل الإيرادات'),     icon: '💰', date: 'Monthly', size: 'PDF, Excel' },
  ];

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (report) => {
    if (downloadingId) return;
    setDownloadingId(report.id);
    try {
      const response = await import('../../../services/apiClient').then(m => m.default.get(
        `/api/v1/hospitals/reports/${report.id}/export/`,
        { responseType: 'blob' }
      ));
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast?.error(language === 'ar'
        ? 'حدث خطأ أثناء تحميل التقرير، حاول مرة أخرى'
        : 'Failed to download report, please try again.');
    } finally {
      setDownloadingId(null);
    }
  };


  const APPT_COLS = [
    { header: "Patient",  key: "patient_name", render: (v) => (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Avatar name={v} size="sm" />
        <span style={{ fontWeight: 600, fontSize: "13px" }}>{v || "—"}</span>
      </div>
    )},
    { header: "Doctor",   key: "doctor_name",  render: v => <span style={{ color: PRIMARY, fontWeight: 600, fontSize: "13px" }}>{getDoctorPrefix(language)} {stripDoctorPrefix(v) || "—"}</span> },
    { header: "Date",     key: "date",         render: v => formatDate(v) },
    { header: "Time",     key: "time",         render: v => formatTime(v) },
    { header: "Status",   key: "status",       render: v => <Badge status={v} /> },
  ];

  // Specialty analytics
  const specialtyGroups = doctors.reduce((acc, d) => {
    acc[d.specialty] = (acc[d.specialty] || 0) + 1;
    return acc;
  }, {});
  const maxSpecialtyCount = Math.max(...Object.values(specialtyGroups), 1);

  return (
    <>
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", fontFamily: "'Cairo', sans-serif" }}>
            {/* ── Main Content ── */}
      <main className="hosp-main-content" style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 24px" }}>

        <WelcomeBanner
          user={{ full_name: user?.username || user?.full_name || user?.hospital_name || "Hospital Admin" }}
          subtitle={new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        />

        {/* OVERVIEW — F-08: extracted to HospitalOverviewSection component */}
        {activeTab === "overview" && (
          <>
            {/* Bug #11/#12 Fix: Quick Access section */}
            <HospitalQuickAccess language={language} navigate={navigate} />
            <HospitalOverviewSection
              user={user}
              stats={stats}
              overviewLoading={overviewLoading}
              appointments={appointments}
              apptLoading={apptLoading}
              apptCols={APPT_COLS}
              filteredDoctors={filteredDoctors}
              setActiveTab={setActiveTab}
            />
          </>
        )}

        {/* DOCTORS — F-08: extracted to HospitalDoctorsSection component */}
        {activeTab === "doctors" && (
          <HospitalDoctorsSection
            filteredDoctors={filteredDoctors}
            doctorsLoading={doctorsLoading}
            searchDoc={searchDoc}
            setSearchDoc={setSearchDoc}
            docStatusFilter={docStatusFilter}
            setDocStatusFilter={setDocStatusFilter}
            setShowAddModal={setShowAddModal}
            setRemoveConfirm={setRemoveConfirm}
            onViewProfile={(doc) => setSelectedDoctorProfile(doc)}
          />
        )}

        {/* APPOINTMENTS — F-08: extracted to HospitalAppointmentsSection component */}
        {activeTab === "appointments" && (
          <HospitalAppointmentsSection
            appointments={appointments}
            filteredAppts={filteredAppts}
            apptLoading={apptLoading}
            apptStatusFilter={apptStatusFilter}
            setApptStatusFilter={setApptStatusFilter}
            apptDoctorFilter={apptDoctorFilter}
            setApptDoctorFilter={setApptDoctorFilter}
            apptDeptFilter={apptDeptFilter}
            setApptDeptFilter={setApptDeptFilter}
            apptDepts={apptDepts}
            apptCols={APPT_COLS}
          />
        )}

        {/* ANALYTICS — FIX: now uses real chart components from DashboardCharts.jsx */}
        {activeTab === "analytics" && (
          <div style={{ animation: "pageEnter 0.25s ease", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* F-13 FIX: loading state while /hospital/analytics/ is fetching */}
            {analyticsLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-hint)", padding: "4px 0" }}>
                <span style={{ width: 14, height: 14, border: "2px solid var(--primary-light,#B8D9EF)", borderTop: "2px solid var(--primary,#1B5E8A)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                {language === 'ar' ? 'جاري تحميل بيانات التحليلات…' : 'Loading analytics data…'}
              </div>
            )}

            {/* KPI Cards — F-13 FIX: use analyticsStats (from /hospital/analytics/) instead of overview stats */}
            <HospitalKpiCards
              stats={analyticsStats}
              appointments={appointments}
              loading={analyticsLoading || overviewLoading}
              lang={language}
            />

            {/* Extra KPI row from analytics endpoint — today + clinics */}
            {analyticsData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {[
                  { label: t('hospitals.dashboard.todayAppts') || 'مواعيد اليوم', value: analyticsStats.today_appointments,  icon: "📅", color: "#3B82F6" },
                  { label: t('hospitals.dashboard.totalClinics') || 'إجمالي العيادات',         value: analyticsStats.total_clinics,       icon: "🏥", color: 'var(--primary)' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: "20px 24px", boxShadow: "var(--shadow-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-hint)", fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>{c.value ?? "—"}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: c.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.icon}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts grid — F-13 FIX: AppointmentStatusDonut uses pre-built data from analytics
                endpoint when available (covers ALL appointments, not just the current page) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              <AppointmentStatusDonut
                appointments={appointments}
                analyticsData={analyticsStatusData}
                lang={language}
              />
              <DoctorSpecialtyBar doctors={doctors} lang={language} />
                <WeeklyAppointmentTrend appointments={appointments} lang={language} />
            </div>

            {/* Bug #4 Fix: real blob download replaces alert-based broken downloads */}
            <HospitalAnalyticsDownloadSection language={language} />
          </div>
        )}
        {/* ASSISTANTS — F-08: extracted to HospitalAssistantsSection component */}
        {activeTab === "assistants" && (
          <HospitalAssistantsSection
            filteredAssistants={filteredAssistants}
            assistantsLoading={assistantsLoading}
            searchAsst={searchAsst}
            setSearchAsst={setSearchAsst}
            setShowAddAssistantModal={setShowAddAssistantModal}
            setRemoveAssistantConfirm={setRemoveAssistantConfirm}
          />
        )}
        {/* SCHEDULES */}
        {activeTab === "schedule" && (
          <div style={{ animation: "pageEnter 0.25s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>🗓 {t('hospitals.dashboard.schedules', 'Hospital Schedules')}</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('hospitalDashboardPage.scheduleConfigHint')}</p>
            </div>
            <Suspense fallback={<div style={{ height: 400, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', opacity: 0.6 }} />}>
              <HospitalScheduleManager hospitalId={activeHospitalId} />
            </Suspense>
          </div>
        )}
      </main>

      {/* Add Doctor Modal */}
      {showAddModal && <AddDoctorModal onClose={() => setShowAddModal(false)} onAdd={handleAddDoctor} />}

      {/* Bug #10 Fix: Doctor Profile/Edit Modal */}
      {selectedDoctorProfile && (
        <HospitalDoctorProfileModal
          doctor={selectedDoctorProfile}
          language={language}
          onClose={() => setSelectedDoctorProfile(null)}
          onSave={(updatedDoc) => {
            setSelectedDoctorProfile(null);
          }}
        />
      )}

      {/* Add Assistant Modal */}
      {showAddAssistantModal && <AddAssistantModal onClose={() => setShowAddAssistantModal(false)} onAdd={handleAddAssistant} />}

      {/* Remove Doctor Confirm Modal */}
      <Modal
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        title={t('hospitalModals.removeDoctorTitle')}
        maxWidth="400px"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(null)}>{t('hospitalModals.cancel')}</Button>
            <Button variant="danger" size="sm" onClick={() => handleRemoveDoctor(removeConfirm)}>{t('hospitalModals.remove')}</Button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
          <p style={{ fontSize: "14px", color: 'var(--text-muted)' }}>
            {t('hospitalModals.removeDoctorConfirmHint')}
          </p>
        </div>
      </Modal>

      {/* Remove Assistant Confirm Modal */}
      <Modal
        open={!!removeAssistantConfirm}
        onClose={() => setRemoveAssistantConfirm(null)}
        title={t('hospitalModals.removeAssistantTitle')}
        maxWidth="400px"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRemoveAssistantConfirm(null)}>{t('hospitalModals.cancel')}</Button>
            <Button variant="danger" size="sm" onClick={() => handleRemoveAssistant(removeAssistantConfirm)}>{t('hospitalModals.remove')}</Button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
          <p style={{ fontSize: "14px", color: 'var(--text-muted)' }}>
            {t('hospitalModals.removeAssistantConfirmHint')}
          </p>
        </div>
      </Modal>

      <style>{`
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── E-02 FIX: Mobile responsiveness ────────────────────────────── */
        /* Tab nav: scrollable on small screens so all tabs are reachable */
        .hosp-tab-bar {
          display: flex;
          gap: 0;
          border-bottom: 2px solid transparent;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;         /* Firefox */
        }
        .hosp-tab-bar::-webkit-scrollbar { display: none; }  /* Chrome/Safari */

        /* Header action buttons: hide text labels on very small screens */
        @media (max-width: 640px) {
          .hosp-header-btn-label { display: none; }
          .hosp-header-actions   { gap: 6px; }
          .hosp-header-btn {
            padding: 8px 10px !important;
            font-size: 12px !important;
          }
        }

        /* Main content padding on mobile */
        @media (max-width: 768px) {
          .hosp-main-content { padding: 16px 12px !important; }
          .hosp-header-inner { padding: 0 12px !important; }
          .hosp-tab-inner    { padding: 0 12px !important; }
        }

        /* Stats grid: single column on very small screens */
        @media (max-width: 480px) {
          .hosp-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        /* Overview 2-col cards: stack on mobile */
        @media (max-width: 900px) {
          .hosp-overview-cards {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
    </>
  );
}
