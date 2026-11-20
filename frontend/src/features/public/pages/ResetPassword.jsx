/**
 * ResetPassword.jsx
 * FIX: Backend uses OTP-based flow via ForgotPassword.jsx.
 * This page redirects automatically.
 */
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PublicLayout from '../../../layouts/PublicLayout';
import { useTranslation } from '../../../i18n/useTranslation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/forgot-password'), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PublicLayout>
      <div className="join-container" dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '40px 36px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-modal)', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>🔑</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800, color: 'var(--text-h)' }}>{t('resetPassword.title')}</h2>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('resetPassword.subtitle')}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
          <Link to="/forgot-password" style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', padding: '12px 32px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            {t('resetPassword.goNow')}
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
