/**
 * EmailVerification.jsx — Sprint 1 i18n fix
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import PublicLayout from '../../../layouts/PublicLayout';
import { useTranslation } from '../../../i18n/useTranslation';

const P  = 'var(--primary)';
const PL = '#E6F1FB';
const PB = 'var(--primary-dark)';

function EnvelopeIcon({ verified }) {
  return (
    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: verified ? '#D1FAE5' : PL, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px' }}>
      {verified ? '✅' : '📧'}
    </div>
  );
}

export default function EmailVerification() {
  const navigate        = useNavigate();
  const { t, isRTL }   = useTranslation();
  const [params]        = useSearchParams();
  const uid             = params.get('uid');
  const token           = params.get('token');
  const [status, setStatus]     = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail]       = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (uid && token) {
      setStatus('verifying');
      apiClient.get(API.AUTH.VERIFY_EMAIL, { params: { uid, token } })
        .then(() => { setStatus('success'); setTimeout(() => navigate('/login'), 3000); })
        .catch(err => { setErrorMsg(err?.response?.data?.detail || t('emailVerification.defaultError')); setStatus('error'); });
    }
  }, [uid, token, navigate]); // eslint-disable-line

  useEffect(() => {
    if (cooldown <= 0) return;
    const ti = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(ti);
  }, [cooldown]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('resending');
    try {
      await apiClient.post(API.AUTH.RESEND_VERIFICATION, { email: email.trim() });
      setStatus('resent'); setCooldown(60);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || t('emailVerification.resendError'));
      setStatus('error');
    }
  };

  const cardStyle = { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '40px 36px', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '440px', textAlign: 'center' };
  const btnStyle  = { width: '100%', padding: '13px', borderRadius: 'var(--radius-md)', background: P, color: '#fff', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .2s' };
  const wrap      = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '20px' };

  if (status === 'verifying') return (
    <PublicLayout>
      <div style={wrap} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={cardStyle}>
          <img src={logo} alt="CuraBook" style={{ height: '44px', marginBottom: '24px' }} />
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `4px solid ${PL}`, borderTopColor: P, animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 8px' }}>{t('emailVerification.verifyingTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('emailVerification.verifyingSubtitle')}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </PublicLayout>
  );

  if (status === 'success') return (
    <PublicLayout>
      <div style={wrap} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={cardStyle}>
          <img src={logo} alt="CuraBook" style={{ height: '44px', marginBottom: '24px' }} />
          <EnvelopeIcon verified />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 10px' }}>{t('emailVerification.successTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.6 }}>{t('emailVerification.successSubtitle')}</p>
          <button style={btnStyle} onClick={() => navigate('/login')}>{t('emailVerification.goToLogin')}</button>
        </div>
      </div>
    </PublicLayout>
  );

  if (status === 'error' && uid) return (
    <PublicLayout>
      <div style={wrap} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={cardStyle}>
          <img src={logo} alt="CuraBook" style={{ height: '44px', marginBottom: '24px' }} />
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px' }}>❌</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 10px' }}>{t('emailVerification.failedTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>{errorMsg}</p>
          <button style={btnStyle} onClick={() => setStatus('idle')}>{t('emailVerification.resendBtn')}</button>
          <Link to="/login" style={{ display: 'block', marginTop: '16px', color: P, fontSize: '14px', fontWeight: 600 }}>{t('emailVerification.backToLogin')}</Link>
        </div>
      </div>
    </PublicLayout>
  );

  if (status === 'resent') return (
    <PublicLayout>
      <div style={wrap} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={cardStyle}>
          <img src={logo} alt="CuraBook" style={{ height: '44px', marginBottom: '24px' }} />
          <EnvelopeIcon />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 10px' }}>{t('emailVerification.resentTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
            {t('emailVerification.resentSubtitle1')} <strong>{email}</strong>.<br />
            {t('emailVerification.resentSubtitle2')}
          </p>
          <button style={{ ...btnStyle, background: cooldown > 0 ? '#9CA3AF' : P, cursor: cooldown > 0 ? 'not-allowed' : 'pointer' }} onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? t('emailVerification.resendIn').replace('{{count}}', cooldown) : t('emailVerification.resendAgain')}
          </button>
          <Link to="/login" style={{ display: 'block', marginTop: '16px', color: P, fontSize: '14px', fontWeight: 600 }}>{t('emailVerification.backToLogin')}</Link>
        </div>
      </div>
    </PublicLayout>
  );

  return (
    <PublicLayout>
      <div style={wrap} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={cardStyle}>
          <img src={logo} alt="CuraBook" style={{ height: '44px', marginBottom: '24px' }} />
          <EnvelopeIcon />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 10px' }}>{t('emailVerification.checkTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.6 }}>{t('emailVerification.checkSubtitle')}</p>
          <div style={{ background: PL, borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '28px', textAlign: 'start' }}>
            <p style={{ margin: 0, fontSize: '13px', color: PB, lineHeight: 1.6 }}>
              <strong>{t('emailVerification.didntReceive')}</strong> {t('emailVerification.didntReceiveHint')}
            </p>
          </div>
          <form onSubmit={handleResend} style={{ textAlign: 'start' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>{t('emailVerification.emailLabel')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)', fontSize: '14px', outline: 'none', fontFamily: 'inherit', marginBottom: '16px', boxSizing: 'border-box' }} onFocus={e => (e.target.style.borderColor = P)} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            {status === 'error' && <p style={{ color: '#E97D61', fontSize: '13px', margin: '0 0 14px' }}>{errorMsg}</p>}
            <button type="submit" style={{ ...btnStyle, opacity: status === 'resending' ? 0.7 : 1 }} disabled={status === 'resending'}>
              {status === 'resending' ? t('emailVerification.sending') : t('emailVerification.resendBtn')}
            </button>
          </form>
          <Link to="/login" style={{ display: 'block', marginTop: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>← {t('emailVerification.backToLogin')}</Link>
        </div>
      </div>
    </PublicLayout>
  );
}
