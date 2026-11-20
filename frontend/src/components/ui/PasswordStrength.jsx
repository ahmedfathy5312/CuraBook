import React from 'react';
import useTranslation from '../../i18n/useTranslation';

export default function PasswordStrength({ password, style = {} }) {
  const { t, language } = useTranslation();
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteria = [
    { label: language === 'ar' ? '8 أحرف على الأقل' : '8 characters minimum', met: hasMinLength },
    { label: language === 'ar' ? 'حرف كبير واحد' : 'One uppercase letter', met: hasUpperCase },
    { label: language === 'ar' ? 'رقم واحد' : 'One number', met: hasNumber },
    { label: language === 'ar' ? 'رمز خاص واحد' : 'One special character', met: hasSpecial },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const progressText = metCount === 4 ? (language === 'ar' ? 'قوي' : 'Strong') : metCount >= 2 ? (language === 'ar' ? 'متوسط' : 'Fair') : (language === 'ar' ? 'ضعيف' : 'Weak');
  const progressColor = metCount === 4 ? '#1A8A5A' : metCount >= 2 ? '#C9923A' : '#E53E3E';

  if (!password) return null;

  return (
    <div style={{ marginTop: '8px', ...style }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: step <= metCount ? progressColor : 'var(--border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: progressColor, marginBottom: '8px', display: 'flex', justifyContent: 'flex-end', fontFamily: "'Cairo', sans-serif" }}>
        {progressText}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {criteria.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '14px', height: '14px', borderRadius: '50%',
              background: c.met ? '#E8F5EF' : 'var(--bg-body)',
              color: c.met ? '#1A8A5A' : 'var(--text-hint)',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {c.met ? '✓' : '—'}
            </span>
            <span style={{ fontSize: '11px', color: c.met ? 'var(--text-body)' : 'var(--text-hint)', fontFamily: "'Cairo', sans-serif" }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
