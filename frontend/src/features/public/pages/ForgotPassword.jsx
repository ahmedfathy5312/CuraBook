import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../../assets/logo.png";
import apiClient from "../../../services/apiClient";
import { API } from "../../../constants/apiRoutes";
import { useToast } from "../../../context/ToastContext";
import PublicLayout from "../../../layouts/PublicLayout";
import { useTranslation } from "../../../i18n/useTranslation";
import LoadingButton from "../../../components/ui/LoadingButton";
import PasswordToggle from "../../../components/ui/PasswordToggle";

function StepBar({ current, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px", gap: "0" }}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: done || active ? 'var(--primary)' : 'var(--border)', color: done || active ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "14px", transition: "all .3s" }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "11px", color: active ? 'var(--primary)' : "#9ca3af", fontWeight: active ? "600" : "400", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: "2px", background: done ? 'var(--primary)' : 'var(--border)', margin: "0 6px", marginBottom: "20px", transition: "background .3s" }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PadlockIcon({ color = "#B8D9EF" }) {
  return (
    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke='var(--primary)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" fill='var(--primary)' />
      </svg>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, tArr, isRTL } = useTranslation();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [passwords, setPasswords] = useState({ newPass: "", confirmPass: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const STEPS = tArr('forgotPassword.steps');

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError(t('forgotPassword.emailRequired')); return; }
    setLoading(true);
    try {
      await apiClient.post(API.AUTH.FORGOT_PASSWORD, { email });
      toast.success(t('forgotPassword.codeSentToast'));
      setStep(1);
    } catch (err) {
      setError(err.request && !err.response ? "❌ لا يمكن الاتصال بالخادم — تأكد أن backend شغال" : (err.errorDetail || err.response?.data?.error?.message || err.response?.data?.detail || err.response?.data?.email?.[0] || "Failed to send code. Please try again."));
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the complete 6-digit code."); return; }
    setLoading(true);
    try {
      await apiClient.post(API.AUTH.RESET_PASSWORD_VERIFY, { email, otp: code });
      toast.success("Email verified successfully!");
      setStep(2);
    } catch (err) {
      setError(err.request && !err.response ? "❌ لا يمكن الاتصال بالخادم" : (err.errorDetail || err.response?.data?.error?.message || err.response?.data?.detail || "Invalid or expired code. Please try again."));
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(""); setLoading(true);
    try {
      await apiClient.post(API.AUTH.FORGOT_PASSWORD, { email });
      toast.info("New code sent!");
      setOtp(["", "", "", "", "", ""]);
      otpRefs[0].current?.focus();
    } catch { setError("Failed to resend code."); } finally { setLoading(false); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!passwords.newPass) { setError(t('forgotPassword.passwordWeak')); return; }
    if (passwords.newPass !== passwords.confirmPass) { setError(t('forgotPassword.passwordMismatch')); return; }
    setLoading(true);
    try {
      await apiClient.post(API.AUTH.RESET_PASSWORD, { email, code: otp.join(""), new_password: passwords.newPass });
      toast.success(t('forgotPassword.passwordSuccess'));
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.request && !err.response ? "❌ لا يمكن الاتصال بالخادم" : (err.errorDetail || err.response?.data?.error?.message || err.response?.data?.detail || "Failed to reset password. Please start over."));
    } finally { setLoading(false); }
  };

  return (
    <PublicLayout>
      <div className="join-container" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="login-container" style={{ maxWidth: '460px', width: '90%' }}>
        <div className="logo-box">
          <img src={logo} alt="CuraBook" className="login-logo" />
          <h1 className="brand">CuraBook</h1>
        </div>
        <StepBar current={step} steps={Array.isArray(STEPS) ? STEPS : [t('forgotPassword.steps[0]'), t('forgotPassword.steps[1]'), t('forgotPassword.steps[2]')]} />

        {step === 0 && (
          <>
            <PadlockIcon />
            <h2 className="login-title" style={{ marginBottom: "4px" }}>{t('forgotPassword.title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: "13px", textAlign: "center", marginBottom: "24px" }}>{t('forgotPassword.subtitle')}</p>
            <form className="login-form" onSubmit={handleSendEmail}>
              <div style={{ position: "relative" }}>
                <input id="email" name="email" type="email" placeholder={t('forgotPassword.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={{ paddingInlineStart: "40px" }} />
                <svg style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <LoadingButton type="submit" loading={loading}>
                  {t('forgotPassword.sendCode')}
                </LoadingButton>
              </div>
              <Link to="/login" style={{ display: "block", textAlign: "center", color: 'var(--primary)', fontSize: "13px", marginTop: "12px" }}>← {t('forgotPassword.backToEmail')}</Link>
            </form>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#B8D9EF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke='var(--primary)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="login-title" style={{ marginBottom: "4px" }}>{t('forgotPassword.enterCode')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: "13px", textAlign: "center", marginBottom: "24px" }}>
              {t('forgotPassword.codeSentTo')} <strong style={{ color: 'var(--primary)' }}>{email}</strong>
            </p>
            <form className="login-form" onSubmit={handleVerifyOtp}>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "8px" }}>
                {otp.map((digit, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} autoComplete="off"
                    style={{ width: "56px", height: "60px", textAlign: "center", fontSize: "24px", fontWeight: "700", borderRadius: "var(--radius-md)", border: digit ? "2px solid #1B5E8A" : "2px solid #d1d5db", outline: "none", color: 'var(--primary)', background: digit ? 'var(--bg)' : 'var(--bg-card)', transition: "all .2s" }}
                  />
                ))}
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <LoadingButton type="submit" loading={loading}>
                  {t('forgotPassword.verifyCode')}
                </LoadingButton>
              </div>
              <p style={{ textAlign: "center", fontSize: "13px", color: 'var(--text-muted)', marginTop: "12px" }}>
                <button type="button" onClick={handleResend} style={{ color: 'var(--primary)', background: "none", border: "none", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }} disabled={loading}>Resend Code</button>
              </p>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <PadlockIcon color="#d1faf5" />
            <h2 className="login-title" style={{ marginBottom: "4px" }}>{t('forgotPassword.newPassword')}</h2>
            <form className="login-form" onSubmit={handleSetPassword}>
              <div className="password-wrapper" style={{ position: 'relative' }}>
                <input id="newPass" name="newPass" type={showNew ? "text" : "password"} placeholder={t('forgotPassword.newPassword')} value={passwords.newPass} onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))} autoComplete="new-password" style={{ paddingInlineEnd: '40px' }} />
                <PasswordToggle show={showNew} onToggle={() => setShowNew(!showNew)} isRTL={isRTL} />
              </div>
              <div className="password-wrapper" style={{ position: 'relative' }}>
                <input id="confirmPass" name="confirmPass" type={showConfirm ? "text" : "password"} placeholder={t('forgotPassword.confirmPassword')} value={passwords.confirmPass} onChange={(e) => setPasswords((p) => ({ ...p, confirmPass: e.target.value }))} autoComplete="new-password" style={{ paddingInlineEnd: '40px' }} />
                <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} isRTL={isRTL} />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <LoadingButton type="submit" loading={loading}>
                  {t('forgotPassword.setPassword')}
                </LoadingButton>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  </PublicLayout>
  );
}
