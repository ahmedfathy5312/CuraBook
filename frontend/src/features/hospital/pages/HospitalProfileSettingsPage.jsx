import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "../../../services/apiClient";
import { API } from "../../../constants/apiRoutes";
import useTranslation from "../../../i18n/useTranslation";
import { Eye, EyeOff, Camera, Save, X, Building2, User, Mail, Phone, MapPin, Lock, FileText } from "lucide-react";

/* ── Reusable input field ── */
function Field({ label, icon, value, onChange, type = "text", placeholder, readOnly = false, multiline = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 700, color: 'var(--text-body)', letterSpacing: "0.03em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{ position: "absolute", left: "12px", top: multiline ? "13px" : "50%", transform: multiline ? "none" : "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
            {icon}
          </span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={4}
            style={{
              width: "100%", padding: "11px 14px 11px 38px",
              border: "1.5px solid var(--border-base)", borderRadius: "var(--radius-md)",
              fontSize: "14px", fontFamily: "inherit", outline: "none",
              background: readOnly ? "var(--bg-page)" : 'var(--bg-card)', resize: "vertical",
              color: 'var(--text-h)', boxSizing: "border-box", lineHeight: 1.6,
              transition: "border-color 0.2s",
            }}
            onFocus={e => { if (!readOnly) e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            style={{
              width: "100%", padding: "11px 14px 11px 38px",
              border: "1.5px solid var(--border-base)", borderRadius: "var(--radius-md)",
              fontSize: "14px", fontFamily: "inherit", outline: "none",
              background: readOnly ? "var(--bg-page)" : 'var(--bg-card)',
              color: 'var(--text-h)', boxSizing: "border-box",
              transition: "border-color 0.2s", cursor: readOnly ? "not-allowed" : "text",
            }}
            onFocus={e => { if (!readOnly) e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        )}
      </div>
    </div>
  );
}

/* ── Password field ── */
function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 700, color: 'var(--text-body)', letterSpacing: "0.03em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
          <Lock size={15} />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "11px 42px 11px 38px",
            border: "1.5px solid var(--border-base)", borderRadius: "var(--radius-md)",
            fontSize: "14px", fontFamily: "inherit", outline: "none",
            background: 'var(--bg-card)', color: 'var(--text-h)', boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          type="button"
          onClick={() => setShow(p => !p)}
          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: "2px" }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function HospitalProfileSettings() {
  const { user, refreshUser } = useAuth();
  const { t, language } = useTranslation();
  const isRTL = language === "ar";
  const label = {
    profileSettings: isRTL ? "إعدادات الملف الشخصي" : "Profile Settings",
    profileSubtitle: isRTL ? "إدارة معلومات حساب المستشفى" : "Manage your hospital account information",
    welcomeBack: isRTL ? "مرحباً بعودتك" : "Welcome back",
    keepCurrent: isRTL ? "اترك الحقل فارغاً إذا كنت لا ترغب في تغيير كلمة المرور" : "leave blank to keep current",
    cancel: isRTL ? "إلغاء" : "Cancel",
    saveChanges: isRTL ? "حفظ التغييرات" : "Save Changes",
    saving: isRTL ? "جاري الحفظ..." : "Saving...",
    saved: isRTL ? "تم الحفظ!" : "Saved!",
    noPhone: isRTL ? "لا يوجد رقم هاتف" : "No phone added",
  };
  const [saveError, setSaveError] = useState("");
  const { hash } = useLocation();

  /* scroll to anchor (#change-password) when navigated from Navbar dropdown */
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [hash]);

  const [img, setImg]         = useState(user?.profile_image || null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const [form, setForm] = useState({
    hospital_name: "",
    username:      "",
    email:         "",
    phone:         "",
    address:       "",
    city:          "",
    about:         "",
    old_password:  "",
    password:      "",
    confirm_password: "",
  });

  /* populate from auth user on mount / when user changes */
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        hospital_name: user.hospital_name || user.full_name || "",
        username:      user.username       || "",
        email:         user.email          || "",
        phone:         user.phone          || "",
        address:       user.address        || "",
        city:          user.city           || "",
        about:         user.about          || "",
      }));
      if (user.profile_image) setImg(user.profile_image);
    }
  }, [user]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleImageClick = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) setImg(URL.createObjectURL(file));
    };
    input.click();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");
    if (form.password && form.password !== form.confirm_password) {
      setSaveError(t('hospitalProfileSettings.alertPasswordMismatch') || 'كلمتا المرور غير متطابقتين');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        hospital_name: form.hospital_name,
        phone:         form.phone,
        address:       form.address,
        city:          form.city,
        about:         form.about,
      };
      await apiClient.patch(API.HOSPITAL.PROFILE, payload);  // FIX: OVERVIEW is GET-only dashboard; PROFILE supports PATCH

      // Change password via dedicated endpoint (requires old_password for security)
      if (form.password) {
        if (!form.old_password) {
          setSaveError(t('hospitalProfileSettings.alertNeedOldPassword') || 'يرجى إدخال كلمة المرور الحالية');
          setSaving(false);
          return;
        }
        try {
          await apiClient.post(API.USERS.CHANGE_PASSWORD, {
            old_password: form.old_password,
            new_password: form.password,
          });
        } catch (pwErr) {
          const detail = pwErr?.response?.data?.detail || "";
          if (detail.toLowerCase().includes("incorrect") || detail.toLowerCase().includes("password")) {
            setSaveError(t('hospitalProfileSettings.alertWrongPassword') || 'كلمة المرور الحالية غير صحيحة');
          } else if (detail) {
            setSaveError(detail);
          } else {
            setSaveError('فشل تغيير كلمة المرور — تحقق من كلمة المرور الحالية وحاول مجدداً');
          }
          setSaving(false);
          return;
        }
      }

      await refreshUser();
      setSaved(true);
      setSaveError("");
      setTimeout(() => setSaved(false), 3000);
      setForm(f => ({ ...f, old_password: "", password: "", confirm_password: "" }));
    } catch (err) {
      const detail = err?.response?.data?.detail || "";
      setSaveError(detail || t('hospitalProfileSettings.alertSaveFailed') || 'فشل حفظ التغييرات. يرجى المحاولة مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setForm(f => ({
        ...f,
        hospital_name: user.hospital_name || user.full_name || "",
        username:      user.username       || "",
        email:         user.email          || "",
        phone:         user.phone          || "",
        address:       user.address        || "",
        city:          user.city           || "",
        about:         user.about          || "",
        password:      "",
        confirm_password: "",
      }));
      if (user.profile_image) setImg(user.profile_image);
      else setImg(null);
    }
  };

  /* initials fallback */
  const initials = (user?.hospital_name || user?.username || "H")
    .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
    <div style={{ fontFamily: "'Cairo', sans-serif", padding: "32px 24px", maxWidth: "900px", margin: "0 auto", direction: isRTL ? "rtl" : "ltr" }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: 'var(--text-h)' }}>
          ⚙️ {label.profileSettings}
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
          {label.profileSubtitle}
        </p>
      </div>

      {/* ── Welcome banner ── */}
      <div style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
        borderRadius: "var(--radius-lg)", padding: "24px 28px", marginBottom: "28px",
        display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.5)",
            overflow: "hidden", background: 'var(--primary-dark)',
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }} onClick={handleImageClick}>
            {img
              ? <img src={img} alt="hospital" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"/>
              : <span style={{ fontSize: "24px", fontWeight: 800, color: "#fff" }}>{initials}</span>
            }
          </div>
          <button aria-label="Edit"
            type="button"
            onClick={handleImageClick}
            style={{
              position: "absolute", bottom: 0, right: 0,
              background: 'var(--bg-card)', border: "2px solid var(--primary)",
              borderRadius: "50%", width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}
          ><Camera size={12} color='var(--primary)' /></button>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", margin: "0 0 2px", fontWeight: 500 }}>
            {label.welcomeBack} 👋
          </p>
          <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 800, margin: "0 0 10px" }}>
            {form.hospital_name || form.username || user?.username || "Hospital"}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
            {[
              { icon: "👤", label: form.username || "—" },
              { icon: "📧", label: form.email    || "—" },
              { icon: "📞", label: form.phone    || label.noPhone },
            ].map(({ icon, label }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.88)", fontSize: "13px" }}>
                <span>{icon}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSave}>
        <div style={{ background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "28px", boxShadow: "var(--shadow-md)", marginBottom: "16px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: 'var(--text-h)', display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={16} color='var(--primary)' /> {t('hospitalProfileSettings.infoSection')}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px" }}>
            <Field label={t('hospitalProfileSettings.fieldHospitalName')} icon={<Building2 size={15}/>} value={form.hospital_name} onChange={set("hospital_name")} placeholder={t('hospitalProfileSettings.phHospitalName')} />
            <Field label={t('hospitalProfileSettings.fieldUsername')} icon={<User size={15}/>} value={form.username} onChange={set("username")} placeholder="admin username" readOnly />
            <Field label={t('hospitalProfileSettings.fieldEmail')} icon={<Mail size={15}/>} value={form.email} onChange={set("email")} type="email" placeholder="hospital@email.com" readOnly />
            <Field label={t('hospitalProfileSettings.fieldPhone')} icon={<Phone size={15}/>} value={form.phone} onChange={set("phone")} placeholder={t('hospitalProfileSettings.phPhone')} />
            <Field label={t('hospitalProfileSettings.fieldAddress')} icon={<MapPin size={15}/>} value={form.address} onChange={set("address")} placeholder={t('hospitalProfileSettings.phAddress')} />
            <Field label={t('hospitalProfileSettings.fieldCity')} icon={<MapPin size={15}/>} value={form.city} onChange={set("city")} placeholder={t('hospitalProfileSettings.phCity')} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label={t('hospitalProfileSettings.fieldAbout')} icon={<FileText size={15}/>} value={form.about} onChange={set("about")} placeholder={t('hospitalProfileSettings.phAbout')} multiline />
            </div>
          </div>
        </div>

        {/* Password section — id for direct anchor navigation from Navbar dropdown */}
        <div id="change-password" style={{ background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "28px", boxShadow: "var(--shadow-md)", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: 'var(--text-h)', display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock size={16} color='var(--primary)' /> {t('hospitalProfileSettings.changePassword')}
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>({label.keepCurrent})</span>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px" }}>
            <PasswordField label={t('hospitalProfileSettings.fieldCurrentPassword')} value={form.old_password} onChange={set("old_password")} placeholder={t('hospitalProfileSettings.phCurrentPassword')} />
            <PasswordField label={t('hospitalProfileSettings.fieldNewPassword')} value={form.password} onChange={set("password")} placeholder={t('hospitalProfileSettings.phNewPassword')} />
            <PasswordField label={t('hospitalProfileSettings.fieldConfirmPassword')} value={form.confirm_password} onChange={set("confirm_password")} placeholder={t('hospitalProfileSettings.phConfirmPassword')} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "11px 24px", borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--border-base)", background: 'var(--bg-card)',
              cursor: "pointer", fontWeight: 600, fontSize: "14px",
              fontFamily: "inherit", color: 'var(--text-muted)', transition: "all 0.2s",
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <X size={14} /> {label.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "11px 28px", borderRadius: "var(--radius-md)",
              border: "none", background: saved ? "var(--success)" : 'var(--primary)',
              color: "#fff", cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "14px", fontFamily: "inherit",
              opacity: saving ? 0.75 : 1,
              boxShadow: "var(--shadow-md)",
              transition: "all 0.2s",
            }}
          >
            <Save size={14} />
            {saving ? label.saving : saved ? (`✓ ${label.saved}`) : label.saveChanges}
          </button>
        </div>

        {/* Inline error message — replaces alert() */}
        {saveError && (
          <div style={{
            marginTop: 12, padding: "10px 16px",
            background: "var(--danger-light)", border: "1px solid var(--danger)",
            borderRadius: "var(--radius-md)",
            color: "var(--danger)", fontSize: 13, fontWeight: 600,
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            {saveError}
          </div>
        )}
      </form>

      <style>{`
        @media (max-width: 600px) {
          form > div > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  </>
  );
}
