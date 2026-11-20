import React from 'react';
import useTranslation from '../../i18n/useTranslation';

export default function WelcomeBanner({ user, subtitle, customGreeting, prefix = '' }) {
  const { language } = useTranslation();
  const hour = new Date().getHours();
  
  let timeGreeting = '';
  if (language === 'ar') {
    timeGreeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء النور' : 'مساء الخير';
  } else {
    timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  }

  const greeting = customGreeting || timeGreeting;
  const rawName = user?.full_name?.split(' ')[0] || user?.first_name || user?.name || user?.username || '';
  const displayName = rawName ? ` ${prefix}${rawName}` : '';

  return (
    <div className="welcome-banner" style={{
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px 32px',
      marginBottom: '28px',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div className="decorative-circle" style={{
        position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px',
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)', zIndex: 0
      }} />
      <div className="decorative-circle" style={{
        position: 'absolute', bottom: '-40px', right: '40px', width: '100px', height: '100px',
        borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Cairo', sans-serif" }}>
          {greeting}{displayName} 👋
        </h1>
        {subtitle && (
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '15px' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
