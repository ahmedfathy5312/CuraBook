/**
 * Login.jsx — Refactored to use inline styles with design tokens
 * Previously used external CSS classes (login-container, login-btn, etc.)
 * Now consistent with all other pages that use tokens.js directly.
 */
import React, { useState, useCallback, useContext } from 'react';
import logo from '../../../assets/logo.png';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PublicLayout from '../../../layouts/PublicLayout';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import PasswordToggle from '../../../components/ui/PasswordToggle';
import LoadingButton from '../../../components/ui/LoadingButton';

const ROLES = ['patient','doctor','hospital','assistant','admin'];

export default function Login() {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, role: currentRole, ROLE_ROUTES, authInitialized } = useContext(AuthContext);
  const toast = useToast();
  const { t, isRTL } = useTranslation();

  // ── If already logged in, redirect to their dashboard ──────────────────────
  // Wait for authInitialized so we don't redirect based on stale localStorage
  // data before the silent session-restore check completes on reload.
  React.useEffect(() => {
    if (!authInitialized) return; // still restoring session — wait
    if (isAuthenticated && currentRole && currentRole !== 'guest') {
      const homeRoute = ROLE_ROUTES?.[currentRole] || '/';
      navigate(homeRoute, { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate, ROLE_ROUTES, authInitialized]);

  const P  = tokens?.colors?.primary?.DEFAULT || '#1B5E8A';
  const PD = tokens?.colors?.primary?.dark || '#154B6E';
  const PL = tokens?.colors?.primary?.lighter || '#E0F2FE';

  const [selectedRole, setSelectedRole] = useState('patient');
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [serverError, setServerError]   = useState('');
  const [form, setForm]                 = useState({ loginId:'', password:'' });
  const [errors, setErrors]             = useState({});
  const [touched, setTouched]           = useState({});

  const validators = {
    loginId:  v => !v.trim() ? t('auth.errors.usernameRequired') : '',
    password: v => !v       ? t('auth.errors.passwordRequired') : '',
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched[name] && errors[name]) {
      const err = validators[name]?.(value) ?? '';
      if (!err) setErrors(prev => ({ ...prev, [name]:'' }));
    }
  }, [touched, errors]); // eslint-disable-line

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]:true }));
    const err = validators[name]?.(value) ?? '';
    setErrors(prev => ({ ...prev, [name]:err }));
  }, []); // eslint-disable-line

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = {};
    Object.keys(validators).forEach(f => {
      const err = validators[f](form[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    setTouched({ loginId:true, password:true });
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const { user, role } = await login({ username: form.loginId, password: form.password });

      const roleChecks = { patient:'is_patient', doctor:'is_doctor', hospital:'hospital_admin', assistant:'is_assistant', admin:'is_platform_admin' };
      const requiredField = roleChecks[selectedRole];
      if (requiredField && !user[requiredField]) {
        // User authenticated but selected the wrong role — log them out immediately
        // so they cannot accidentally access a dashboard they don't belong to.
        await logout();
        setServerError(t('auth.errors.wrongRole', { role: t(`common.roles.${selectedRole}`) }));
        return;
      }

      toast.success(t('auth.loginSuccess', { name: user.full_name || user.username }));
      const redirectMap = { doctor:'/doctor-dashboard', hospital:'/hospital-dashboard', admin:'/admin-dashboard', assistant:'/assistant-dashboard', patient:'/dashboard' };
      navigate(redirectMap[role] || '/');
    } catch (err) {
      const data   = err.response?.data;
      const fields = err.errorFields || data?.error?.details || {};
      const detail = err.errorDetail  || data?.detail || data?.message || null;
      if      (fields?.username)   setErrors(prev => ({ ...prev, loginId:  Array.isArray(fields.username)  ? fields.username[0]  : fields.username }));
      else if (fields?.password)   setErrors(prev => ({ ...prev, password: Array.isArray(fields.password)  ? fields.password[0]  : fields.password }));
      else if (data?.username)     setErrors(prev => ({ ...prev, loginId:  Array.isArray(data.username)    ? data.username[0]    : data.username }));
      else if (data?.password)     setErrors(prev => ({ ...prev, password: Array.isArray(data.password)    ? data.password[0]    : data.password }));
      else if (detail)             setServerError(detail);
      else if (err.request)        setServerError("❌ لا يمكن الاتصال بالخادم — تأكد أن backend شغال");
      else                         setServerError(t('auth.errors.invalidCredentials'));
    } finally { setLoading(false); }
  };

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    width:'100%', padding:'13px 16px', marginBottom:'4px',
    border:`1.5px solid ${tokens.colors.border}`, borderRadius:tokens.radius.md,
    outline:'none', fontSize:tokens.typography.sizes.base,
    fontFamily:tokens.typography.fontFamily, color:tokens.colors.gray[800],
    background:tokens.colors.background, transition:'border-color 0.2s, box-shadow 0.2s',
    boxSizing:'border-box',
  };
  const onFocus = e => { e.target.style.borderColor = P; e.target.style.boxShadow = '0 0 0 3px rgba(27,94,138,0.12)'; e.target.style.background = 'var(--bg-card)'; };
  const onBlur2 = e => { e.target.style.borderColor = tokens.colors.border; e.target.style.boxShadow = 'none'; };

  return (
    <PublicLayout>
      <div className="join-container" dir={isRTL ? "rtl" : "ltr"}>
        <div style={{
          width:'95%', maxWidth:'520px',
          background:'var(--bg-card)', padding:'44px 32px',
          borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-xl)',
          textAlign:'center', fontFamily:'var(--font-main, sans-serif)',
          margin: '20px' // Added small margin for mobile spacing
        }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'4px' }}>
          <img src={logo} alt="CuraBook logo" style={{ width:'38px', height:'38px', borderRadius:tokens.radius.sm }} />
          <h1 style={{ color:P, fontSize:'24px', fontWeight:tokens.typography.weights.extrabold, letterSpacing:'-0.5px', margin:0 }}>CuraBook</h1>
        </div>

        <h2 style={{ margin:'16px 0 24px', fontSize:'20px', fontWeight:700, color:'var(--text-h)' }}>
          {t('auth.loginTitle')}
        </h2>

        {/* Role selector */}
        <div role="group" aria-label="Select your role" style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'28px', flexWrap:'wrap' }}>
          {ROLES.map(r => (
            <button
              key={r}
              type="button"
              aria-pressed={selectedRole === r}
              onClick={() => setSelectedRole(prev => prev === r ? "" : r)}
              style={{
                padding:'9px 16px', borderRadius:tokens.radius.full,
                border:`1.5px solid ${P}`,
                background:selectedRole===r ? P : 'var(--bg-card)',
                color:selectedRole===r ? 'white' : P,
                cursor:'pointer', fontSize:'14px', fontWeight:tokens.typography.weights.semibold,
                fontFamily:tokens.typography.fontFamily, transition:tokens.transitions.fast,
              }}
              onMouseOver={e => { if (selectedRole !== r) e.currentTarget.style.background = PL; }}
              onMouseOut={e  => { if (selectedRole !== r) e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              {t(`common.roles.${r}`)}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} noValidate style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <label htmlFor="loginId" className="sr-only" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(0,0,0,0)' }}>Username or Email</label>
          <input
            id="loginId" name="loginId" type="text"
            placeholder={t('auth.loginId')}
            value={form.loginId}
            onChange={handleChange} onBlur={handleBlur}
            onFocus={onFocus} onBlurCapture={onBlur2}
            autoComplete="username"
            aria-invalid={!!errors.loginId}
            aria-describedby={errors.loginId ? 'loginId-error' : undefined}
            style={inputStyle}
          />
          {errors.loginId && (
            <p id="loginId-error" role="alert" style={{ color:'var(--danger)', fontSize:'12px', textAlign: isRTL ? 'right' : 'left', margin:'-2px 0 4px' }}>
              {errors.loginId}
            </p>
          )}

          {/* Password */}
          <div style={{ position:'relative', width:'100%' }}>
            <label htmlFor="password" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(0,0,0,0)' }}>Password</label>
            <input
              id="password" name="password"
              type={showPass ? 'text' : 'password'}
              placeholder={t('auth.password')}
              value={form.password}
              onChange={handleChange} onBlur={handleBlur}
              onFocus={onFocus} onBlurCapture={onBlur2}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              style={{ ...inputStyle, paddingInlineEnd:'44px' }}
            />
            <PasswordToggle show={showPass} onToggle={() => setShowPass(v => !v)} isRTL={isRTL} />
          </div>
          {errors.password && (
            <p id="password-error" role="alert" style={{ color:'var(--danger)', fontSize:'12px', textAlign: isRTL ? 'right' : 'left', margin:'-2px 0 4px' }}>
              {errors.password}
            </p>
          )}
          {serverError && (
            <p role="alert" style={{ color:'var(--danger)', fontSize:'12px', textAlign:'center', margin:'2px 0 4px' }}>
              {serverError}
            </p>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <LoadingButton
              type="submit"
              loading={loading}
              style={{ minWidth: '180px' }}
            >
              {t('auth.login')}
            </LoadingButton>
          </div>

          <Link to="/forgot-password" style={{ display:'block', marginTop:'14px', fontSize:'13px', color:P, fontWeight:500 }}>
            {t('auth.forgotPassword')}
          </Link>

          <p style={{ textAlign:'center', fontSize:'13px', color:'var(--text-muted)', marginTop:'12px' }}>
            {t('auth.noAccount')}{' '}
            <Link to="/join" style={{ color:P, fontWeight:700 }}>{t('auth.registerNow')}</Link>
          </p>
        </form>
      </div>
    </div>
  </PublicLayout>
  );
}
