import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { registerDoctor } from "../../../features/auth/api/authApi";
import logo from "../../../assets/logo.png";
import PublicLayout from "../../../layouts/PublicLayout";
import { useTranslation } from "../../../i18n/useTranslation";
import PasswordToggle from "../../../components/ui/PasswordToggle";
import GovernorateSelect from "../../../components/ui/GovernorateSelect";
import SpecialtySelect from "../../../components/ui/SpecialtySelect";
import PasswordStrength from "../../../components/ui/PasswordStrength";

import LoadingButton from "../../../components/ui/LoadingButton";
import { useAuth } from "../../../features/auth/context/AuthContext";

export default function DoctorSignup() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    fullName: "", date_of_birth: '', phone: "", city: "", specialty: "", clinic_name: "",
    username: "", email: "", password: "", confirmPassword: "",
  });
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validators = {
    fullName:        (v) => (!v.trim() ? t('signup.fullNameRequired') : ""),
    date_of_birth: (v) => {
      if (!v) return t('signup.ageRequired');
      const birthDate = new Date(v);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return (age < 25 || age > 100) ? t('signup.doctorAgeRange') : "";
    },
    phone:           (v) => { const c = v.replace(/\D/g, ""); return !c ? t('signup.phoneRequired') : !/^(010|011|012|015)\d{8}$/.test(c) ? t('signup.phoneFormat') : ""; },
    city:            (v) => (!v.trim() ? t('signup.cityRequired') : ""),
    specialty:       (v) => (!v.trim() ? t('signup.specialtyRequired') : ""),
    clinic_name:     (v) => (!v.trim() ? t('signup.clinicRequired') : ""),
    username:        (v) => (!v.trim() ? t('signup.usernameRequired') : ""),
    email:           (v) => (!v.trim() ? t('signup.emailRequired') : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t('signup.emailInvalid') : ""),
    password:        (v) => (!v ? t('signup.passwordRequired') : !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(v) ? t('signup.passwordStrong') : ""),
    confirmPassword: (v, f) => (!v ? t('signup.confirmPassRequired') : v !== f.password ? t('signup.confirmPassMismatch') : ""),
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (touched[name]) {
      const err = validators[name]?.(value, { ...form, [name]: value }) ?? "";
      if (!err) setErrors((p) => ({ ...p, [name]: "" }));
    }
  }, [touched, form]); // eslint-disable-line

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
    const err = validators[name]?.(value, form) ?? "";
    setErrors((p) => ({ ...p, [name]: err }));
  }, [form]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(validators).forEach((f) => {
      const err = validators[f](form[f], form);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(form).map(k => [k, true])));
    if (Object.keys(newErrors).length > 0) return;
    if (!agreedTerms) { alert(t('signup.acceptTerms')); return; }
    setSubmitting(true);
    try {
      const response = await registerDoctor({
        full_name: form.fullName, date_of_birth: form.date_of_birth, phone: form.phone, city: form.city,
        specialty: form.specialty, clinic_name: form.clinic_name,
        username: form.username, email: form.email, password: form.password,
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
          <img src={logo} alt="logo" className="logo-img" />
          <h1><span className="logo-icon">C</span>uraBook</h1>
        </div>
        <h2>{t('signup.doctorTitle')}</h2>
        <p className="subtitle">{t('signup.doctorSubtitle')}</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-left">
              <input id="fullName"  name="fullName"  value={form.fullName}  onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.fullName')} autoComplete="name" />
              {errors.fullName  && <p className="error">{errors.fullName}</p>}
              <input id="age"       name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} onBlur={handleBlur}  autoComplete="off" />
              {errors.date_of_birth       && <p className="error">{errors.date_of_birth}</p>}
              <input id="phone"     name="phone"     value={form.phone}     onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.phone')} autoComplete="tel" />
              {errors.phone     && <p className="error">{errors.phone}</p>}
              <GovernorateSelect 
                name="city" 
                value={form.city} 
                onChange={handleChange} 
                onBlur={handleBlur} 
                error={errors.city} 
                touched={touched.city} 
                isRTL={isRTL} 
                placeholder={t('signup.cityPlaceholder', 'Select city...')} 
              />
              {errors.city      && <p className="error">{errors.city}</p>}
              <SpecialtySelect 
                name="specialty" 
                value={form.specialty} 
                onChange={handleChange} 
                onBlur={handleBlur} 
                error={errors.specialty} 
                touched={touched.specialty} 
                isRTL={isRTL} 
                placeholder={t('signup.specialtyPlaceholder', 'Select specialty...')} 
              />
              {errors.specialty && <p className="error">{errors.specialty}</p>}
            </div>
            <div className="form-right">
              <input id="clinic_name"   name="clinic_name"   value={form.clinic_name}   onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.clinic')} autoComplete="organization" />
              {errors.clinic_name   && <p className="error">{errors.clinic_name}</p>}
              <input id="username" name="username" value={form.username} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.username')} autoComplete="username" />
              {errors.username && <p className="error">{errors.username}</p>}
              <input id="email"    name="email"    type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.email')} autoComplete="email" />
              {errors.email    && <p className="error">{errors.email}</p>}
              <div className="password-wrapper" style={{ position: 'relative' }}>
                <input id="password" name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.password')} autoComplete="new-password" style={{ width: '100%', paddingRight: '40px' }} />
                <PasswordToggle show={showPass} onToggle={() => setShowPass(!showPass)} isRTL={isRTL} />
              </div>
              <PasswordStrength password={form.password} />
              {errors.password && <p className="error">{errors.password}</p>}
              <div className="password-wrapper" style={{ position: 'relative' }}>
                <input id="confirmPassword" name="confirmPassword" type={showConfirmPass ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder={t('signup.confirmPassword')} autoComplete="new-password" style={{ width: '100%', paddingRight: '40px' }} />
                <PasswordToggle show={showConfirmPass} onToggle={() => setShowConfirmPass(!showConfirmPass)} isRTL={isRTL} />
              </div>
              {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '12px 0 4px', fontFamily: 'inherit' }}>
            <input type="checkbox" id="terms-doc" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer' }} />
            <label htmlFor="terms-doc" style={{ fontSize: '12px', color: 'var(--text-body)', cursor: 'pointer', lineHeight: 1.5 }}>
              {t('signup.agreeTerms')}{" "}<a href="/terms" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{t('signup.termsOfService')}</a>
              {" "}{t('signup.and')}{" "}<a href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{t('signup.privacyPolicy')}</a>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <LoadingButton
              type="submit"
              loading={submitting}
              disabled={!agreedTerms || submitting}
              style={{ minWidth: '220px' }}
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
