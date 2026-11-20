/**
 * HospitalDoctorSignup.jsx — Sprint 1 i18n fix
 * Hospital admin creates a new doctor account directly in their hospital.
 */
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../services/apiClient";
import { API } from "../../../constants/apiRoutes";
import { useAuth } from "../../../context/AuthContext";
import { useTranslation } from "../../../i18n/useTranslation";
import PasswordToggle from "../../../components/ui/PasswordToggle";
import GovernorateSelect from "../../../components/ui/GovernorateSelect";
import SpecialtySelect from "../../../components/ui/SpecialtySelect";
import PasswordStrength from "../../../components/ui/PasswordStrength";
import LoadingButton from "../../../components/ui/LoadingButton";

export default function HospitalDoctorSignup() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { t, isRTL } = useTranslation();

  const [form, setForm] = useState({
    fullName: "", date_of_birth: '', phone: "", city: "",
    specialty: "", username: "", email: "",
    password: "", confirmPassword: "",
  });
  const [errors,     setErrors]     = useState({});
  const [touched,    setTouched]    = useState({});
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError,setServerError]= useState("");
  const [success,    setSuccess]    = useState(false);

  const validators = {
    fullName:        (v) => (!v.trim() ? t('signup.fullNameRequired') : ""),
    date_of_birth: (v) => (!v ? t('signup.ageRequired') : (Number(v) < 25 || Number(v) > 100) ? t('signup.doctorAgeRange') : ""),
    phone:           (v) => { const c = v.replace(/\D/g,""); return !c ? t('signup.phoneRequired') : !/^(010|011|012|015)\d{8}$/.test(c) ? t('signup.phoneFormat') : ""; },
    city:            (v) => (!v.trim() ? t('signup.cityRequired') : ""),
    specialty:       (v) => (!v.trim() ? t('signup.specialtyRequired') : ""),
    username:        (v) => (!v.trim() ? t('signup.usernameRequired') : v.length < 3 ? t('signup.usernameMinLength') : ""),
    email:           (v) => (!v.trim() ? t('signup.emailRequired') : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t('signup.emailInvalid') : ""),
    password:        (v) => (!v ? t('signup.passwordRequired') : !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(v) ? t('signup.passwordStrong') : ""),
    confirmPassword: (v, f) => (!v ? t('signup.confirmPassRequired') : v !== f.password ? t('signup.confirmPassMismatch') : ""),
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (touched[name]) {
      const err = validators[name]?.(value, { ...form, [name]: value }) ?? "";
      if (!err) setErrors(p => ({ ...p, [name]: "" }));
    }
  }, [touched, form]); // eslint-disable-line

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    const err = validators[name]?.(value, form) ?? "";
    setErrors(p => ({ ...p, [name]: err }));
  }, [form]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const newErrors = {};
    Object.keys(validators).forEach(f => {
      const err = validators[f](form[f], form);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(form).map(k => [k, true])));
    if (Object.keys(newErrors).length > 0) return;
    setSubmitting(true);
    try {
      const { data: regData } = await apiClient.post(API.AUTH.REGISTER_DOCTOR, {
        full_name:  form.fullName, date_of_birth: form.date_of_birth, phone: form.phone, city: form.city,
        specialty:  form.specialty, username: form.username, email: form.email,
        password:   form.password, clinic_name: user?.hospital_name || "", role: "doctor",
      });
      const doctorId = regData?.id;
      if (doctorId) {
        try { await apiClient.post(API.HOSPITAL.DOCTORS, { email: form.email }); } catch { /* manual add fallback */ }
      }
      setSuccess(true);
    } catch (err) {
      const data = err?.response?.data;
      const detail = err.errorDetail || data?.error?.message || data?.detail || data?.message || null;
      const fields = err.errorFields || data?.error?.details || {};
      if (fields && Object.keys(fields).length > 0) {
        const msgs = Object.entries(fields).map(([f, v]) => `${f}: ${Array.isArray(v) ? v[0] : v}`).join("\n");
        setServerError(msgs);
      } else if (detail) {
        setServerError(detail);
      } else if (err.request) {
        setServerError("❌ لا يمكن الاتصال بالخادم — تأكد أن backend شغال");
      } else {
        setServerError(t('signup.serverError'));
      }
    } finally { setSubmitting(false); }
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)",
    border: `1.5px solid ${errors[field] && touched[field] ? "#E97D61" : 'var(--border)'}`,
    fontSize: "13px", outline: "none", fontFamily: "inherit",
    background: 'var(--bg-card)', boxSizing: "border-box", color: 'var(--text-h)', transition: "border-color 0.2s",
  });
  const labelStyle = { fontSize: "11px", fontWeight: 600, color: 'var(--text-muted)', textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" };
  const errStyle   = { fontSize: "11px", color: "#E97D61", margin: "4px 0 0" };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", fontFamily: "'Cairo', sans-serif" }} dir={isRTL ? "rtl" : "ltr"}>
        <div style={{ background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "48px 40px", textAlign: "center", boxShadow: "var(--shadow-lg)", maxWidth: "440px", width: "100%" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 800, color: 'var(--text-h)' }}>{t('signup.doctorCreated').split('\n')[0]}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: "14px", marginBottom: "28px" }}>
            {t('common.doctorPrefix')} {form.fullName}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => { setSuccess(false); setForm({ fullName:"",date_of_birth: '',phone:"",city:"",specialty:"",username:"",email:"",password:"",confirmPassword:"" }); setTouched({}); }}
              style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-base)", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit" }}>
              + {t('signup.createAccount')}
            </button>
            <button onClick={() => navigate("/hospital-dashboard")}
              style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", border: "none", background: 'var(--primary)', color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit" }}>
              {t('nav.dashboard')} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-container" dir={isRTL ? "rtl" : "ltr"} style={{ width: '100%' }}>
      <div style={{ maxWidth: "640px", margin: "20px auto" }}>
        <div style={{ background: "linear-gradient(135deg, #1B5E8A 0%, #154E73 100%)", borderRadius: "var(--radius-lg)", padding: "24px 28px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>👨‍⚕️</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#fff" }}>{t('signup.doctorTitle')}</h1>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>{user?.hospital_name || t('roles.hospital')} · Admin</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "12px", fontFamily: "inherit" }}>
            {t('signup.back')}
          </button>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "28px", boxShadow: "var(--shadow-md)" }}>
          {serverError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#DC2626" }}>
              ⚠️ {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>{t('signup.fullName')} *</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.fullNamePlaceholder')} autoComplete="name" style={inputStyle("fullName")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.fullName && touched.fullName && <p style={errStyle}>{errors.fullName}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.age')} *</label>
                <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} onBlur={handleBlur}  style={inputStyle("age")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.date_of_birth && touched.date_of_birth && <p style={errStyle}>{errors.date_of_birth}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.phone')} *</label>
                <input name="phone" value={form.phone} onChange={handleChange} onBlur={handleBlur} placeholder="01XXXXXXXXX" autoComplete="tel" style={inputStyle("phone")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.phone && touched.phone && <p style={errStyle}>{errors.phone}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.city')} *</label>
                <GovernorateSelect 
                  name="city" 
                  value={form.city} 
                  onChange={handleChange} 
                  onBlur={handleBlur}
                  error={errors.city}
                  touched={touched.city}
                  isRTL={isRTL}
                  inputStyle={inputStyle}
                  placeholder={t('signup.cityPlaceholder')} 
                />
                {errors.city && touched.city && <p style={errStyle}>{errors.city}</p>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>{t('signup.specialty')} *</label>
                <SpecialtySelect 
                  name="specialty" 
                  value={form.specialty} 
                  onChange={handleChange} 
                  onBlur={handleBlur}
                  error={errors.specialty}
                  touched={touched.specialty}
                  isRTL={isRTL}
                  inputStyle={inputStyle}
                  placeholder="Select specialty..." 
                />
                {errors.specialty && touched.specialty && <p style={errStyle}>{errors.specialty}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.username')} *</label>
                <input name="username" value={form.username} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.usernamePlaceholder')} autoComplete="username" style={inputStyle("username")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.username && touched.username && <p style={errStyle}>{errors.username}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.email')} *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} placeholder="doctor@email.com" autoComplete="email" style={inputStyle("email")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.email && touched.email && <p style={errStyle}>{errors.email}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.password')} *</label>
                <div style={{ position: "relative" }}>
                  <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.passwordPlaceholder')} autoComplete="new-password" style={{ ...inputStyle("password"), paddingInlineEnd: "40px" }} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                  <PasswordToggle show={showPass} onToggle={() => setShowPass(p => !p)} isRTL={isRTL} />
                </div>
                {form.password && <PasswordStrength password={form.password} />}
                {errors.password && touched.password && <p style={errStyle}>{errors.password}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.confirmPassword')} *</label>
                <div style={{ position: "relative" }}>
                  <input name="confirmPassword" type={showConf ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.confirmPassPlaceholder')} autoComplete="new-password" style={{ ...inputStyle("confirmPassword"), paddingInlineEnd: "40px" }} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                  <PasswordToggle show={showConf} onToggle={() => setShowConf(p => !p)} isRTL={isRTL} />
                </div>
                {errors.confirmPassword && touched.confirmPassword && <p style={errStyle}>{errors.confirmPassword}</p>}
              </div>
            </div>
            <div style={{ marginTop: "20px", background: 'var(--bg)', borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: "12px", color: 'var(--text-body)', border: "1px solid #B8D9EF" }}>
              ℹ️ This doctor will be automatically added to <strong>{user?.hospital_name || "your hospital"}</strong> after registration.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <LoadingButton 
                type="submit" 
                loading={submitting} 
                style={{ minWidth: '220px' }}
              >
                👨‍⚕️ {t('signup.createAccount')}
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
