import React, { useState } from "react";
import { Search, UserMinus, ToggleLeft, ToggleRight, CheckSquare, Square, Trash2, UserPlus } from "lucide-react";
import { useHospitalDoctors, useRemoveDoctorFromHospital as useRemoveDoctor, useToggleDoctorStatus } from "../../hospital/hooks/useHospitalData";
import { useAuth } from "../../../context/AuthContext";
import Avatar from "../../../components/ui/Avatar";
import Skeleton from "../../../components/ui/Skeleton";
import { useTranslation } from "../../../i18n/useTranslation";
import HospitalDoctorProfileModal from "../../../components/hospital/HospitalDoctorProfileModal";
import AddDoctorToHospitalModal from "../../../components/hospital/AddDoctorToHospitalModal";

const TEAL = "var(--primary)";
const GREEN = "var(--success)";
const RED   = "var(--danger)";

export default function ManageDoctors() {
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds]   = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);
  // Bug #1 Fix: Add doctor modal state
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isLoading, isError, refetch } = useHospitalDoctors({ page_size: 100 });
  const removeMutation = useRemoveDoctor();
  const toggleMutation = useToggleDoctorStatus();

  const doctors  = data?.results || data || [];
  const filtered = doctors.filter(d => {
    const searchable = [
      d.name,
      d.full_name,
      d.doctor_name,
      d.specialty,
      d.specialization,
      d.email,
      d.phone,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchSearch = searchable.includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" ? true : filterStatus === "active" ? d.is_active !== false : d.is_active === false;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll    = ()  => setSelectedIds(filtered.map(d => d.id));
  const clearSelection = ()=> setSelectedIds([]);
  const allSelected  = filtered.length > 0 && filtered.every(d => selectedIds.includes(d.id));

  const handleToggleSingle = (doctor) => {
    toggleMutation.mutate({ doctorId: doctor.id, isActive: doctor.is_active === false });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "remove") {
        await removeMutation.mutateAsync(confirmAction.payload);
      } else if (confirmAction.type === "bulkRemove") {
        await Promise.all(confirmAction.payload.map(id => removeMutation.mutateAsync(id)));
        clearSelection();
      } else if (confirmAction.type === "bulkToggle") {
        await Promise.all(confirmAction.payload.ids.map(id =>
          toggleMutation.mutateAsync({ doctorId: id, isActive: confirmAction.payload.isActive })
        ));
        clearSelection();
      }
    } finally {
      setConfirmAction(null);
    }
  };

  const activeCount   = doctors.filter(d => d.is_active !== false).length;
  const inactiveCount = doctors.filter(d => d.is_active === false).length;

  // Bug #8 Fix: translated filter labels
  const filterLabels = {
    all:      isRTL ? "الكل"     : "All",
    active:   isRTL ? "نشط"     : "Active",
    inactive: isRTL ? "غير نشط" : "Inactive",
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", padding: "28px 24px", maxWidth: "1200px", margin: "0 auto" }}>
      <style>{`
        @media (max-width: 768px) {
          .manage-docs-wrap { padding: 16px 12px !important; }
          .manage-docs-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .manage-docs-filters { flex-direction: column !important; }
          .manage-docs-filters input { min-width: unset !important; width: 100% !important; }
        }
      `}</style>

      {/* Header — Bug #1 Fix: Added "إضافة طبيب" button */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "var(--text-h)" }}>{t('manageDoctorsPage.title')}</h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-hint)" }}>
            {doctors.length} {isRTL ? "إجمالي" : "total"} · {activeCount} {isRTL ? "نشط" : "active"} · {inactiveCount} {isRTL ? "غير نشط" : "inactive"}
          </p>
        </div>
        {/* Bug #1 Fix: Add Doctor button */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "var(--primary)", color: "var(--bg-card)",
            border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 20px", fontSize: "14px", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <UserPlus size={16} />
          {isRTL ? "إضافة طبيب" : "Add Doctor"}
        </button>
      </div>

      {/* Filters — Bug #8 Fix: translated filter labels */}
      <div className="manage-docs-filters" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "18px" }}>
        <div style={{
          flex: 1, minWidth: "200px", display: "flex", alignItems: "center", gap: "8px",
          background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 14px",
        }}>
          <Search size={14} color="var(--text-hint)" />
          <input
            type="text" placeholder={isRTL ? "بحث عن طبيب..." : "Search doctors..."}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", fontFamily: "inherit", flex: 1, color: "var(--text-body)" }}
          />
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-hint)", fontSize: "16px" }}>✕</button>}
        </div>
        {/* Bug #8 Fix: translated labels */}
        {["all", "active", "inactive"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: "8px 16px", borderRadius: "var(--radius-md)", fontSize: "12px", fontWeight: 600,
            border: "1.5px solid", borderColor: filterStatus === s ? TEAL : "var(--border)",
            background: filterStatus === s ? TEAL + "15" : "var(--bg-card)",
            color: filterStatus === s ? TEAL : "var(--text-muted)",
            cursor: "pointer", fontFamily: "inherit",
          }}>{filterLabels[s]}</button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          background: TEAL + "10", border: `1.5px solid ${TEAL}30`, borderRadius: "var(--radius-lg)",
          padding: "12px 18px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: TEAL }}>{t('manageDoctors.selected').replace('{{count}}', selectedIds.length)}</span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setConfirmAction({ type: "bulkToggle", payload: { ids: selectedIds, isActive: true } })}
              style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", border: `1.5px solid ${GREEN}`, background: "var(--success-light)", color: GREEN, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px" }}>
              <ToggleRight size={13} /> {t('manageDoctors.activateAll')}
            </button>
            <button onClick={() => setConfirmAction({ type: "bulkToggle", payload: { ids: selectedIds, isActive: false } })}
              style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--warning)", background: "var(--warning-light)", color: "var(--warning)", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px" }}>
              <ToggleLeft size={13} /> {t('manageDoctors.deactivateAll')}
            </button>
            <button onClick={() => setConfirmAction({ type: "bulkRemove", payload: selectedIds })}
              style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", border: `1.5px solid ${RED}`, background: "var(--danger-light)", color: RED, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px" }}>
              <Trash2 size={13} /> {t('manageDoctors.removeAll')}
            </button>
            <button onClick={clearSelection}
              style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", background: "var(--bg-card)", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {t('manageDoctors.clearSelection')}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="manage-docs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "16px" }}>
          {[1,2,3,4,5,6].map(i => (
            <Skeleton.Doctor key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-hint)" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
          <p>{ t('manageDoctorsPage.loadError') }</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && (
        <>
          {filtered.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <button onClick={allSelected ? clearSelection : selectAll}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: TEAL, fontSize: "13px", fontWeight: 600, fontFamily: "inherit", padding: 0 }}>
                {allSelected ? <CheckSquare size={16} color={TEAL} /> : <Square size={16} color="var(--text-hint)" />}
                {allSelected ? t('manageDoctors.deselectAll') : t('manageDoctors.selectAll').replace('{{count}}', filtered.length)}
              </button>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ fontSize: "12px", color: "var(--text-hint)" }}>
                {filtered.length !== 1
                  ? t('manageDoctors.doctorsCountPlural').replace('{{count}}', filtered.length)
                  : t('manageDoctors.doctorsCount').replace('{{count}}', filtered.length)}
              </span>
            </div>
          )}

          <div className="manage-docs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "16px" }}>
            {filtered.map((doctor) => {
              const isSelected = selectedIds.includes(doctor.id);
              const isActive   = doctor.is_active !== false;
              const specialty  = doctor.specialty || doctor.specialization || (isRTL ? "لم يتم تحديد التخصص" : "Specialty not specified");
              return (
                <div key={doctor.id} style={{
                  background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "18px",
                  boxShadow: isSelected ? `0 0 0 2px ${TEAL}, var(--shadow-md)` : "var(--shadow-sm)",
                  border: `1.5px solid ${isSelected ? TEAL : "var(--bg)"}`,
                  display: "flex", flexDirection: "column", gap: "14px",
                  transition: "box-shadow .2s, border-color .2s",
                  position: "relative",
                }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(doctor.id)} style={{
                    position: "absolute", top: "14px", right: "14px",
                    background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0,
                  }}>
                    {isSelected ? <CheckSquare size={18} color={TEAL} /> : <Square size={18} color="var(--border-dark)" />}
                  </button>

                  {/* Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingInlineEnd: "28px" }}>
                    <Avatar name={doctor.name || doctor.full_name || doctor.doctor_name} src={doctor.image || doctor.profile_image} size="lg" style={{ borderRadius: "var(--radius-md)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700, color: "var(--text-h)", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doctor.name || doctor.full_name || doctor.doctor_name || (isRTL ? "د. غير معروف" : "Dr. Unknown")}
                      </p>
                      <p style={{ margin: "0 0 2px", color: TEAL, fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {specialty}
                      </p>
                      {doctor.phone && <p style={{ margin: 0, color: "var(--text-hint)", fontSize: "11px" }}>{doctor.phone}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      onClick={() => setSelectedDoctorProfile(doctor)}
                      style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        background: "var(--primary-pale, #E0F7FA)", color: "var(--primary)",
                        border: "1.5px solid var(--primary)", borderRadius: "var(--radius-lg)",
                        padding: "4px 10px", fontSize: "11px", fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", transition: "opacity .2s",
                      }}
                    >
                      👤 {t('manageDoctors.viewProfile') || (isRTL ? 'عرض الملف' : 'View Profile')}
                    </button>

                    <button
                      onClick={() => handleToggleSingle(doctor)}
                      disabled={toggleMutation.isPending}
                      title={isActive ? t('manageDoctors.deactivate') : t('manageDoctors.activate')}
                      style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        background: isActive ? "var(--success-light)" : "var(--danger-light)",
                        color: isActive ? GREEN : RED,
                        border: `1.5px solid ${isActive ? GREEN + "50" : RED + "50"}`,
                        borderRadius: "var(--radius-lg)", padding: "4px 10px 4px 7px",
                        fontSize: "11px", fontWeight: 700,
                        cursor: toggleMutation.isPending ? "not-allowed" : "pointer",
                        fontFamily: "inherit", transition: "opacity .2s",
                        opacity: toggleMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {isActive ? <ToggleRight size={14} color={GREEN} /> : <ToggleLeft size={14} color={RED} />}
                      {isActive ? t('manageDoctors.statusActive') : t('manageDoctors.statusInactive')}
                    </button>

                    <button
                      onClick={() => setConfirmAction({ type: "remove", payload: doctor.id })}
                      style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", color: "var(--text-hint)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "color .2s", padding: 0 }}
                      onMouseOver={e => e.currentTarget.style.color = RED}
                      onMouseOut={e => e.currentTarget.style.color = "var(--text-hint)"}
                    >
                      <UserMinus size={13} /> {t('manageDoctors.remove')}
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px", color: "var(--text-hint)" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>👨‍⚕️</div>
                <p style={{ fontSize: "15px" }}>
                  {searchTerm
                    ? t('manageDoctors.noMatch').replace('{{term}}', searchTerm)
                    : t('manageDoctors.noAdded')}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    marginTop: "12px",
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    background: "var(--primary)", color: "var(--bg-card)",
                    border: "none", borderRadius: "var(--radius-md)",
                    padding: "10px 20px", fontSize: "14px", fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <UserPlus size={16} />
                  {isRTL ? "إضافة طبيب" : "Add Doctor"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "32px 28px", maxWidth: "400px", width: "90%", boxShadow: "var(--shadow-modal)", textAlign: "center" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>
              {confirmAction.type.includes("Remove") || confirmAction.type === "remove" ? "⚠️" : confirmAction.payload?.isActive ? "✅" : "⏸️"}
            </div>
            <h3 style={{ margin: "0 0 8px", color: "var(--text-h)", fontSize: "17px", fontWeight: 700 }}>
              {confirmAction.type === "remove"     && t('manageDoctors.removeDoctor')}
              {confirmAction.type === "bulkRemove" && t('manageDoctors.removeDoctors').replace('{{count}}', confirmAction.payload.length)}
              {confirmAction.type === "bulkToggle" && (confirmAction.payload.isActive
                ? t('manageDoctors.activateDoctors').replace('{{count}}', confirmAction.payload.ids.length)
                : t('manageDoctors.deactivateDoctors').replace('{{count}}', confirmAction.payload.ids.length))}
            </h3>
            <p style={{ margin: "0 0 24px", color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}>
              {confirmAction.type === "remove"     && t('manageDoctors.removeMsg')}
              {confirmAction.type === "bulkRemove" && t('manageDoctors.removeMsgBulk')}
              {confirmAction.type === "bulkToggle" && (confirmAction.payload.isActive
                ? t('manageDoctors.activateMsg')
                : t('manageDoctors.deactivateMsg'))}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: "11px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit" }}>
                {t('manageDoctors.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={removeMutation.isPending || toggleMutation.isPending}
                style={{
                  flex: 1, padding: "11px", borderRadius: "var(--radius-md)", border: "none",
                  background: (confirmAction.type === "remove" || confirmAction.type === "bulkRemove") ? RED : confirmAction.payload?.isActive ? GREEN : "var(--warning)",
                  color: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit",
                  opacity: (removeMutation.isPending || toggleMutation.isPending) ? 0.6 : 1,
                }}
              >
                {(removeMutation.isPending || toggleMutation.isPending) ? t('manageDoctors.processing') : t('manageDoctors.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug #10 Fix: Doctor Profile/Edit Modal */}
      {selectedDoctorProfile && (
        <HospitalDoctorProfileModal
          doctor={selectedDoctorProfile}
          language={isRTL ? 'ar' : 'en'}
          onClose={() => setSelectedDoctorProfile(null)}
          onSave={(updatedDoc) => {
            setSelectedDoctorProfile(null);
            refetch();
          }}
        />
      )}

      {/* Bug #1 Fix: Add Doctor Modal */}
      {showAddModal && (
        <AddDoctorToHospitalModal
          hospitalId={user?.hospital_id || user?.id}
          language={isRTL ? 'ar' : 'en'}
          onSuccess={() => {
            setShowAddModal(false);
            refetch();
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
