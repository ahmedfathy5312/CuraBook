import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerHospital } from "../../../features/auth/api/authApi";
import logo from "../../../assets/logo.png";
import PublicLayout from "../../../layouts/PublicLayout";
import { useTranslation } from "../../../i18n/useTranslation";
import PasswordToggle from "../../../components/ui/PasswordToggle";
import GovernorateSelect from "../../../components/ui/GovernorateSelect";
import PasswordStrength from "../../../components/ui/PasswordStrength";

import LoadingButton from "../../../components/ui/LoadingButton";
import { useAuth } from "../../../features/auth/context/AuthContext";

export default function HospitalSignup() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    fullName: "", city: "", location: "", phone: "",
    username: "", email: "", password: "", confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validators = {
    fullName:        (v) => (!v.trim() ? t('signup.hospitalRequired') : ""),
    city:            (v) => (!v.trim() ? t('signup.cityRequired') : ""),
    location:        (v) => (!v.trim() ? t('signup.locationRequired') : ""),
    phone:           (v) => { const c = v.replace(/\D/g,""); return !c ? t('signup.phoneRequired') : !/^(010|011|012|015)\d{8}$/.test(c) ? t('signup.phoneFormat') : ""; },
    username:        (v) => (!v.trim() ? t('signup.usernameRequired') : ""),
    email:           (v) => (!v.trim() ? t('signup.emailRequired') : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t('signup.emailInvalid') : ""),
    password:        (v) => (!v ? t('signup.passwordRequired') : !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(v) ? t('signup.passwordStrong') : ""),
    confirmPassword: (v, f) => (!v ? t('signup.confirmPassRequired') : v !== f.password ? t('signup.confirmPassMismatch') : ""),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (validators[name]) setErrors((p) => ({ ...p, [name]: validators[name](value, form) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(validators).forEach((f) => { const err = validators[f](form[f], form); if (err) newErrors[f] = err; });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (!agreedTerms) { alert(t('signup.acceptTerms')); return; }
    setSubmitting(true);
    try {
      const response = await registerHospital({
        full_name: form.fullName, city: form.city, phone: form.phone,
        username: form.username, email: form.email, password: form.password,
        hospital_name: form.fullName, hospital_address: form.location,
      });
      
      const { redirect } = setSession(response);
      navigate(redirect);
    } catch (err) {
      if (err.response?.data) {
        const d = err.response.data;
        const details = err.errorFields || d?.error?.details || d;
        const errorMsg = err.errorDetail || d?.error?.message || null;
        if (details && typeof details === 'object' && !Array.isArray(details)) {
          const msgs = Object.entries(details)
            .map(([f, v]) => `${f}: ${Array.isArray(v) ? v[0] : v}`)
            .join("\n");
          alert(t('signup.regFailed') + "\n" + (msgs || errorMsg || JSON.stringify(d)));
        } else {
          alert(t('signup.regFailed') + "\n" + (errorMsg || JSON.stringify(d)));
        }
      } else if (err.request) {
        alert("❌ لا يمكن الاتصال بالخادم — تأكد أن backend شغال");
      } else {
        alert(t('signup.serverError') + "\n" + (err.message || ""));
      }
    } finally { setSubmitting(false); }
  };

  return (
    <PublicLayout>
      <div className="join-container" dir={isRTL ? "rtl" : "ltr"}>
        <div className="signup-container">
          <div className="logo">
          <img src={logo} alt="CuraBook Logo" className="logo-img" />
          <h1><span className="logo-icon">C</span>uraBook</h1>
        </div>
        <h2>{t('signup.hospitalTitle')}</h2>
        <p className="subtitle">{t('signup.hospitalSubtitle')}</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-left">
              <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} placeholder={t('signup.hospitalName')} autoComplete="name" />
              {errors.fullName && <p className="error">{errors.fullName}</p>}
              <GovernorateSelect 
                name="city" 
                value={form.city} 
                onChange={handleChange} 
                isRTL={isRTL} 
                placeholder={t('signup.cityPlaceholder', 'Select city...')} 
              />
              {errors.city && <p className="error">{errors.city}</p>}
              <input id="location" name="location" value={form.location} onChange={handleChange} placeholder={t('signup.location')} autoComplete="street-address" />
              {errors.location && <p className="error">{errors.location}</p>}
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder={t('signup.phone')} autoComplete="tel" />
              {errors.phone && <p className="error">{errors.phone}</p>}
            </div>
            <div className="form-right">
              <input id="username" name="username" value={form.username} onChange={handleChange} placeholder={t('signup.username')} autoComplete="username" />
              {errors.username && <p className="error">{errors.username}</p>}
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder={t('signup.email')} autoComplete="email" />
              {errors.email && <p className="error">{errors.email}</p>}
              <div className="password-wrapper" style={{ position: 'relative' }}>
                <input id="password" name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} placeholder={t('signup.password')} autoComplete="new-password" style={{ width: '100%', paddingRight: '40px' }} />
                <PasswordToggle show={showPass} onToggle={() => setShowPass(!showPass)} isRTL={isRTL} />
              </div>
              {errors.password && <p className="error">{errors.password}</p>}
              <PasswordStrength password={form.password} />
              <div className="password-wrapper" style={{ position: 'relative' }}>
                <input id="confirmPassword" name="confirmPassword" type={showConfirmPass ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} placeholder={t('signup.confirmPassword')} autoComplete="new-password" style={{ width: '100%', paddingRight: '40px' }} />
                <PasswordToggle show={showConfirmPass} onToggle={() => setShowConfirmPass(!showConfirmPass)} isRTL={isRTL} />
              </div>
              {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '12px 0 4px', fontFamily: 'inherit' }}>
            <input type="checkbox" id="terms-hosp" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer' }} />
            <label htmlFor="terms-hosp" style={{ fontSize: '12px', color: 'var(--text-body)', cursor: 'pointer', lineHeight: 1.5 }}>
              {t('signup.agreeTerms')}{" "}<a href="/terms" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{t('signup.termsOfService')}</a>
              {" "}{t('signup.and')}{" "}<a href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{t('signup.privacyPolicy')}</a>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <LoadingButton
              type="submit"
              loading={submitting}
              disabled={!agreedTerms || submitting}
              style={{ minWidth: '200px' }}
            >
              {t('signup.createAccount')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  </PublicLayout>
  );
}
