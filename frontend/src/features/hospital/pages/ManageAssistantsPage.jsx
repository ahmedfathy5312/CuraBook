import React, { useState } from "react";
import { Search, UserPlus, UserMinus, Phone, Mail, Calendar, MoreVertical } from "lucide-react";
import { useHospitalAssistants, useAddAssistantToHospital, useRemoveAssistantFromHospital } from "../hooks/useHospitalData";
import { useTranslation } from "../../../i18n/useTranslation";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../../context/AuthContext";
import Avatar from "../../../components/ui/Avatar";
import { useNavigate } from "react-router-dom";
import AddAssistantToHospitalModal from "../../../components/hospital/AddAssistantToHospitalModal";

const ITEMS_PER_PAGE = 4;
const HC = {
  textStrong: "var(--text-h, #F8FAFC)",
  textBody: "var(--text-body, #E2E8F0)",
  textMuted: "var(--text-muted, #CBD5E1)",
  border: "var(--border-base, #334155)",
  surface: "var(--bg-card)",
  surfaceSoft: "var(--bg-elevated, var(--bg-card))",
};

const roleLabel = (role, isRTL) => {
  const key = String(role || "").toLowerCase();
  const labels = {
    supervisor: isRTL ? "\u0645\u0634\u0631\u0641" : "Supervisor",
    receptionist: isRTL ? "\u0645\u0648\u0638\u0641 \u0627\u0633\u062a\u0642\u0628\u0627\u0644" : "Receptionist",
    coordinator: isRTL ? "\u0645\u0646\u0633\u0642" : "Coordinator",
    administrative_assistant: isRTL ? "\u0645\u0633\u0627\u0639\u062f \u0625\u062f\u0627\u0631\u064a" : "Administrative Assistant",
    "administrative assistant": isRTL ? "\u0645\u0633\u0627\u0639\u062f \u0625\u062f\u0627\u0631\u064a" : "Administrative Assistant",
  };
  return labels[key] || role || (isRTL ? "\u0645\u0633\u0627\u0639\u062f \u0625\u062f\u0627\u0631\u064a" : "Administrative Assistant");
};

export default function ManageAssistants() {
  const toast    = useToast();
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();
  const [searchTerm,    setSearchTerm]    = useState("");
  const [filterTab,     setFilterTab]     = useState("all");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [page,          setPage]          = useState(1);
  const [openMenuId,    setOpenMenuId]    = useState(null);
  const ui = {
    title: isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u0627\u0639\u062f\u064a\u0646" : "Manage Assistants",
    assistantInHospital: isRTL ? "\u0645\u0633\u0627\u0639\u062f \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0634\u0641\u0649" : "assistants total",
    addExisting: isRTL ? "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u0627\u0639\u062f \u0645\u0648\u062c\u0648\u062f" : "Add Existing Assistant",
    all: isRTL ? "\u0627\u0644\u0643\u0644" : "All",
    active: isRTL ? "\u0646\u0634\u0637" : "Active",
    inactive: isRTL ? "\u063a\u064a\u0631 \u0646\u0634\u0637" : "Inactive",
    pendingInvitation: isRTL ? "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0639\u0648\u0629" : "Pending Invitation",
    pending: isRTL ? "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0639\u0648\u0629" : "Pending",
    searchPlaceholder: isRTL ? "\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a..." : "Search by name or email...",
    noAssistants: isRTL ? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u0627\u0639\u062f\u0648\u0646" : "No assistants found",
    noResultsPrefix: isRTL ? "\u0644\u0627 \u0646\u062a\u0627\u0626\u062c \u0644\u0640" : "No results for",
    addToGetStarted: isRTL ? "\u0623\u0636\u0641 \u0645\u0633\u0627\u0639\u062f\u0627\u064b \u0644\u0644\u0628\u062f\u0621" : "Add an assistant to get started",
    resendInvite: isRTL ? "\u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062f\u0639\u0648\u0629" : "Resend Invite",
    removeAssistant: isRTL ? "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u0627\u0639\u062f" : "Remove",
    previous: isRTL ? "\u0627\u0644\u0633\u0627\u0628\u0642" : "Prev",
    next: isRTL ? "\u0627\u0644\u062a\u0627\u0644\u064a" : "Next",
    columns: [
      isRTL ? "\u0627\u0644\u0645\u0633\u0627\u0639\u062f" : "Assistant",
      isRTL ? "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email",
      isRTL ? "\u0627\u0644\u0647\u0627\u062a\u0641" : "Phone",
      isRTL ? "\u0627\u0644\u062f\u0648\u0631" : "Role",
      isRTL ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645" : "Join Date",
      isRTL ? "\u0627\u0644\u062d\u0627\u0644\u0629" : "Status",
      isRTL ? "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a" : "Actions",
    ],
  };

  const { data: rawData, isLoading } = useHospitalAssistants({}, true);
  const removeMutation = useRemoveAssistantFromHospital();

  // Normalize data
  const raw = rawData?.results || rawData || [];
  const assistants = raw.map(a => ({
    ...a,
    full_name:  a.user?.full_name  || a.full_name  || a.user?.username || "Unknown",
    email:      a.user?.email      || a.email      || "\u2014",
    phone:      a.user?.phone      || a.phone      || null,
    joined_date: a.created_at || a.joined_at || null,
    role:       a.role || a.department || 'administrative_assistant',
    status:     a.status || (a.is_active === false ? "inactive" : a.invitation_pending ? "pending" : "active"),
  }));

  // Bug #9 Fix: 4 filter tabs
  const tabs = [
    { key: "all",     label: ui.all },
    { key: "active",  label: ui.active },
    { key: "inactive",label: ui.inactive },
    { key: "pending", label: ui.pendingInvitation },
  ];

  const filtered = assistants.filter(a => {
    const matchSearch = (a.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (a.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchTab =
      filterTab === "all"      ? true :
      filterTab === "active"   ? a.status === "active" :
      filterTab === "inactive" ? a.status === "inactive" :
      filterTab === "pending"  ? a.status === "pending" :
      true;
    return matchSearch && matchTab;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleTabChange = (tab) => {
    setFilterTab(tab);
    setPage(1);
  };

  const handleRemove = () => {
    if (!confirmRemove) return;
    removeMutation.mutate(confirmRemove, {
      onSuccess: () => setConfirmRemove(null),
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      active:   { bg: "var(--success-light)", color: "var(--success)", label: ui.active },
      inactive: { bg: "var(--danger-light)",  color: "var(--danger)",  label: ui.inactive },
      pending:  { bg: "#FEF3C7",              color: "#D97706",        label: ui.pending },
    };
    const c = config[status] || config.active;
    return (
      <span style={{
        background: c.bg, color: c.color,
        borderRadius: "var(--radius-full)", padding: "2px 10px",
        fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap",
      }}>
        {c.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "\u2014";
    try {
      return new Date(dateStr).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return "\u2014"; }
  };

  return (
    <div style={{ padding: "28px 24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Cairo', sans-serif" }}>
      <style>{`
        .asst-table-row:hover { background: var(--bg, #F8FAFC) !important; }
        .asst-table-row td { border-bottom: 1px solid var(--border, #E5E7EB); }
        @media (max-width: 768px) {
          .asst-table-wrap { overflow-x: auto; }
          .asst-header { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      {/* Header */}
      <div className="asst-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, color: HC.textStrong, margin: "0 0 4px" }}>
            {ui.title}
          </h1>
          <p style={{ color: HC.textMuted, fontSize: "14px", fontWeight: 700, margin: 0 }}>
            {assistants.length} {ui.assistantInHospital}
          </p>
        </div>
        {/* Bug #9 Fix: Removed "طھط³ط¬ظٹظ„ ظ…ط³ط§ط¹ط¯ ط¬ط¯ظٹط¯" button â€” only "ط¥ط¶ط§ظپط© ظ…ط³ط§ط¹ط¯ ظ…ظˆط¬ظˆط¯" */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "var(--primary)", color: "#fff", border: "none",
            borderRadius: "var(--radius-md)", padding: "10px 20px", fontSize: "14px",
            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <UserPlus size={16} />
          {ui.addExisting}
        </button>
      </div>

      {/* Bug #9 Fix: 4 Filter Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: HC.surfaceSoft, border: `1px solid ${HC.border}`, borderRadius: "var(--radius-md)", padding: "4px", width: "fit-content" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: "7px 16px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              background: filterTab === tab.key ? "var(--primary)" : "transparent",
              color: filterTab === tab.key ? "#fff" : HC.textBody,
            }}
          >
            {tab.label}
            <span style={{
              marginInlineStart: "6px",
              background: filterTab === tab.key ? "rgba(255,255,255,0.25)" : "var(--bg-card)",
              color: filterTab === tab.key ? "#fff" : HC.textStrong,
              borderRadius: "var(--radius-full)", padding: "1px 7px", fontSize: "11px", fontWeight: 700,
            }}>
              {tab.key === "all" ? assistants.length :
               tab.key === "active"   ? assistants.filter(a => a.status === "active").length :
               tab.key === "inactive" ? assistants.filter(a => a.status === "inactive").length :
               assistants.filter(a => a.status === "pending").length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        background: HC.surface, border: `1.5px solid ${HC.border}`, borderRadius: "var(--radius-md)",
        padding: "10px 16px", marginBottom: "16px",
      }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder={ui.searchPlaceholder}
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          style={{ border: "none", outline: "none", flex: 1, fontSize: "14px", fontFamily: "inherit", color: HC.textStrong, background: "transparent", fontWeight: 600 }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-hint)", fontSize: "16px" }}>&times;</button>
        )}
      </div>

      {/* Bug #9 Fix: Table layout */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 64, background: "var(--bg)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-hint)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>{"\u{1f464}"}</p>
          <p style={{ fontWeight: 600, color: "var(--text-h)", margin: "0 0 4px", fontSize: "16px" }}>
            {ui.noAssistants}
          </p>
          <p style={{ fontSize: "14px" }}>
            {searchTerm ? `${ui.noResultsPrefix} "${searchTerm}"` : ui.addToGetStarted}
          </p>
        </div>
      ) : (
        <>
          <div className="asst-table-wrap" style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "inherit" }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "2px solid var(--border)" }}>
                  {ui.columns.map((col, i) => (
                    <th key={i} style={{
                      padding: "12px 16px", textAlign: isRTL ? "right" : "left",
                      fontSize: "12px", fontWeight: 700, color: "var(--text-hint)",
                      whiteSpace: "nowrap",
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((a) => (
                  <tr key={a.id} className="asst-table-row" style={{ background: "var(--bg-card)", transition: "background 0.15s" }}>
                    {/* Assistant */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Avatar name={a.full_name} size="md" />
                        <span style={{ fontWeight: 700, color: "var(--text-h)", fontSize: "14px", whiteSpace: "nowrap" }}>
                          {a.full_name}
                        </span>
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)" }}>
                        <Mail size={13} color="var(--text-hint)" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px", display: "block" }}>{a.email}</span>
                      </div>
                    </td>
                    {/* Phone */}
                    <td style={{ padding: "14px 16px" }}>
                      {a.phone ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)" }}>
                          <Phone size={13} color="var(--text-hint)" />
                          <span>{a.phone}</span>
                        </div>
                      ) : <span style={{ color: "var(--border-dark)" }}>{"\u2014"}</span>}
                    </td>
                    {/* Role */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        background: "var(--primary-pale, #E0F7FA)", color: "var(--primary)",
                        borderRadius: "var(--radius-md)", padding: "3px 10px",
                        fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        {roleLabel(a.role, isRTL)}
                      </span>
                    </td>
                    {/* Join Date */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        <Calendar size={13} color="var(--text-hint)" />
                        {formatDate(a.joined_date)}
                      </div>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "14px 16px" }}>
                      {getStatusBadge(a.status)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-hint)", padding: "4px", borderRadius: "var(--radius-sm)" }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === a.id && (
                          <div style={{
                            position: "absolute", [isRTL ? "left" : "right"]: 0, top: "28px", zIndex: 100,
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
                            minWidth: "150px", overflow: "hidden",
                          }}>
                            {a.status === "pending" && (
                              <button
                                style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-body)", fontFamily: "inherit" }}
                                onMouseOver={e => e.currentTarget.style.background = "var(--bg)"}
                                onMouseOut={e => e.currentTarget.style.background = "none"}
                              >
                                {ui.resendInvite}
                              </button>
                            )}
                            <button
                              onClick={() => { setConfirmRemove(a.id); setOpenMenuId(null); }}
                              style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--danger)", fontFamily: "inherit" }}
                              onMouseOver={e => e.currentTarget.style.background = "var(--danger-light)"}
                              onMouseOut={e => e.currentTarget.style.background = "none"}
                            >
                              <UserMinus size={14} /> {ui.removeAssistant}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bug #9 Fix: Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: "16px", flexWrap: "wrap", gap: "8px",
            }}>
              <span style={{ fontSize: "13px", color: "var(--text-hint)" }}>
                {isRTL
                  ? `عرض ${(page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(page * ITEMS_PER_PAGE, filtered.length)} من ${filtered.length} مساعد`
                  : `Showing ${(page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} assistants`}
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)",
                    background: "var(--bg-card)", cursor: page === 1 ? "not-allowed" : "pointer",
                    fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
                    color: page === 1 ? "var(--text-hint)" : "var(--text-body)",
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  {ui.previous}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    style={{
                      width: 36, height: 36, borderRadius: "var(--radius-md)",
                      border: "1.5px solid", fontWeight: 700, fontSize: "13px",
                      cursor: "pointer", fontFamily: "inherit",
                      borderColor: pg === page ? "var(--primary)" : "var(--border)",
                      background: pg === page ? "var(--primary)" : "var(--bg-card)",
                      color: pg === page ? "var(--bg-card)" : "var(--text-muted)",
                    }}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)",
                    background: "var(--bg-card)", cursor: page === totalPages ? "not-allowed" : "pointer",
                    fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
                    color: page === totalPages ? "var(--text-hint)" : "var(--text-body)",
                    opacity: page === totalPages ? 0.5 : 1,
                  }}
                >
                  {ui.next}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Assistant Modal */}
      {showAddModal && (
        <AddAssistantToHospitalModal
          hospitalId={user?.hospital_id || user?.id}
          language={isRTL ? 'ar' : 'en'}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={() => setConfirmRemove(null)}
        >
          <div
            style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "28px", width: "100%", maxWidth: "380px", boxShadow: "var(--shadow-lg)", textAlign: "center" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>{"\u26a0"}</div>
            <h3 style={{ margin: "0 0 8px", color: "var(--text-h)", fontSize: "17px", fontWeight: 700 }}>
              {t('manageAssistants.removeAssistant')}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
              {t('manageAssistants.removeMsg')}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmRemove(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", background: "transparent", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {t('manageAssistants.cancel')}
              </button>
              <button onClick={handleRemove} disabled={removeMutation.isPending}
                style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-md)", border: "none", background: "var(--danger)", color: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", opacity: removeMutation.isPending ? 0.6 : 1 }}>
                {removeMutation.isPending ? t('manageAssistants.removing') : t('manageAssistants.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

