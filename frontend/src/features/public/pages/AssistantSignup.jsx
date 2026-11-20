import React, { useState, useCallback, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerAssistant } from "../../../features/auth/api/authApi";
import PublicLayout from "../../../layouts/PublicLayout";
import logo from "../../../assets/logo.png";
import { useTranslation } from "../../../i18n/useTranslation";
import PasswordToggle from "../../../components/ui/PasswordToggle";
import GovernorateSelect from "../../../components/ui/GovernorateSelect";
import { AuthContext } from "../../../context/AuthContext";

const ROLES = ["receptionist", "coordinator", "supervisor", "nurse", "general"];

export default function AssistantSignup() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { setSession } = useContext(AuthContext);
  const [form, setForm] = useState({
    fullName: "", username: "", email: "", phone: "", city: "",
    role: "receptionist", password: "", confirmPassword: "",
  });
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const validators = {
    fullName:        (v) => (!v.trim() ? t('signup.fullNameRequired') : ""),
    username:        (v) => (!v.trim() ? t('signup.usernameRequired') : v.length < 3 ? t('signup.usernameMinLength') : ""),
    email:           (v) => (!v.trim() ? t('signup.emailRequired') : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t('signup.emailInvalid') : ""),
    phone:           (v) => { const c = v.replace(/\D/g, ""); return !c ? t('signup.phoneRequired') : !/^(010|011|012|015)\d{8}$/.test(c) ? t('signup.phoneFormat') : ""; },
    city:            (v) => (!v.trim() ? t('signup.cityRequired') : ""),
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
      const response = await registerAssistant({
        full_name: form.fullName, username: form.username, email: form.email,
        phone: form.phone, city: form.city, password: form.password, role: "assistant",
      });
      const { redirect } = setSession(response);
      navigate(redirect);
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
        setServerError(t('signup.serverError') + " " + (err.message || ""));
      }
    } finally { setSubmitting(false); }
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)",
    border: `1.5px solid ${errors[field] && touched[field] ? "#E97D61" : 'var(--border)'}`,
    fontSize: "14px", outline: "none", fontFamily: "inherit",
    background: 'var(--bg-card)', boxSizing: "border-box", color: 'var(--text-h)', transition: "border-color 0.2s",
  });

  const labelStyle = { fontSize: "12px", fontWeight: 600, color: 'var(--text-body)', display: "block", marginBottom: "6px" };
  const errStyle   = { fontSize: "11px", color: "#E97D61", margin: "4px 0 0" };

  return (
    <PublicLayout>
      <div className="join-container" dir={isRTL ? "rtl" : "ltr"}>
        <div className="signup-container" style={{ background: 'var(--bg-card)', borderRadius: "var(--radius-lg)", padding: "40px", width: "100%", maxWidth: "600px", boxShadow: "var(--shadow-modal)" }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <button type="button" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-page)', border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-body)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background='var(--bg)'; e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--primary)'; }} onMouseOut={e => { e.currentTarget.style.background='var(--bg-page)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-body)'; }}>
              {t('signup.back')}
            </button>
          </div>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <img src={logo} alt="CuraBook" style={{ height: "48px", marginBottom: "8px" }} />
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: 'var(--text-h)' }}>{t('signup.assistantTitle')}</h1>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: 'var(--text-muted)' }}>{t('signup.assistantSubtitle')}</p>
          </div>
          {serverError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#DC2626" }}>
              ⚠️ {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>{t('signup.fullName')} *</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.fullNamePlaceholder')} autoComplete="name" style={inputStyle("fullName")} onFocus={e => e.target.style.borderColor='var(--primary)'} onBlurCapture={e => e.target.style.borderColor=errors.fullName?"#E97D61":'var(--border)'} />
                {errors.fullName && touched.fullName && <p style={errStyle}>{errors.fullName}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.username')} *</label>
                <input name="username" value={form.username} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.usernamePlaceholder')} autoComplete="username" style={inputStyle("username")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.username && touched.username && <p style={errStyle}>{errors.username}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.email')} *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} placeholder="your@email.com" autoComplete="email" style={inputStyle("email")} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                {errors.email && touched.email && <p style={errStyle}>{errors.email}</p>}
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
              <div>
                <label style={labelStyle}>{t('signup.role')}</label>
                <select name="role" value={form.role} onChange={handleChange} style={{ ...inputStyle("role"), cursor: "pointer" }} onFocus={e => e.target.style.borderColor='var(--primary)'} onBlur={e => e.target.style.borderColor='var(--border)'}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t('signup.password')} *</label>
                <div style={{ position: "relative" }}>
                  <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.passwordPlaceholder')} autoComplete="new-password" style={{ ...inputStyle("password"), paddingInlineEnd: "44px" }} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                  <PasswordToggle show={showPass} onToggle={() => setShowPass(p => !p)} isRTL={isRTL} />
                </div>
                {errors.password && touched.password && <p style={errStyle}>{errors.password}</p>}
              </div>
              <div>
                <label style={labelStyle}>{t('signup.confirmPassword')} *</label>
                <div style={{ position: "relative" }}>
                  <input name="confirmPassword" type={showConfirmPass ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.confirmPassPlaceholder')} autoComplete="new-password" style={{ ...inputStyle("confirmPassword"), paddingInlineEnd: "44px" }} onFocus={e => e.target.style.borderColor='var(--primary)'} />
                  <PasswordToggle show={showConfirmPass} onToggle={() => setShowConfirmPass(p => !p)} isRTL={isRTL} />
                </div>
                {errors.confirmPassword && touched.confirmPassword && <p style={errStyle}>{errors.confirmPassword}</p>}
              </div>
            </div>
            <button type="submit" disabled={submitting} style={{ width: "100%", marginTop: "24px", padding: "14px", background: submitting ? "#9CA3AF" : "linear-gradient(135deg, #1B5E8A 0%, #154E73 100%)", color: "#fff", border: "none", borderRadius: "var(--radius-lg)", fontSize: "15px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: submitting ? "none" : "var(--shadow-md)" }}>
              {submitting ? t('signup.creatingAccount') : t('signup.assistantBtn')}
            </button>
            <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: 'var(--text-muted)' }}>
              {t('signup.alreadyHaveAccount')}{" "}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: "none" }}>{t('signup.signIn')}</Link>
            </p>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
