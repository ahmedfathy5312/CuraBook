/**
 * WelcomeScreen.jsx — BUG-5 FIX
 * ================================
 * FIXED: was English-only ("Welcome Back" / "Dr. {name}")
 * NOW: Full RTL/LTR i18n support, time-based greeting, skip button
 */
import React, { useEffect, useState } from 'react';
import useTranslation from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import tokens from '../../../theme/tokens';

const MOD_P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD = tokens?.colors?.primary?.dark    || '#0C6478';

function getTimeGreeting(isRTL) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return isRTL ? 'صباح الخير' : 'Good Morning';
  if (hour >= 12 && hour < 17) return isRTL ? 'مساء الخير' : 'Good Afternoon';
  if (hour >= 17 && hour < 21) return isRTL ? 'مساء النور' : 'Good Evening';
  return isRTL ? 'مرحباً' : 'Welcome';
}

export default function WelcomeScreen({ name, specialty, clinicName, location, experience, phone, onDone }) {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const [phase, setPhase] = useState('enter'); // enter → hold → exit

  useEffect(() => {
    // MP-1 FIX: Shorter display duration for better UX efficiency
    const t1 = setTimeout(() => setPhase('hold'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 1000);
    const t3 = setTimeout(() => { if (onDone) onDone(); }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const doctorTitle = isRTL ? 'د.' : 'Dr.';
  const firstName   = (name || '').split(' ')[0] || (isRTL ? 'طبيب' : 'Doctor');
  const greeting    = getTimeGreeting(isRTL);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: `linear-gradient(135deg, ${MOD_P} 0%, ${MOD_PD} 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: "'Cairo', 'Poppins', sans-serif",
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s ease-in-out',
      }}
    >
      {/* Skip button */}
      <button
        onClick={() => { setPhase('exit'); setTimeout(onDone, 300); }}
        style={{
          position: 'absolute', top: 24,
          // W-3 FIX: Use logical CSS property instead of physical left/right.
          // insetInlineEnd resolves to 'right' in LTR and 'left' in RTL
          // automatically — no need for the isRTL ternary at all.
          insetInlineEnd: 24,
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13,
          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          backdropFilter: 'blur(8px)'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        {isRTL ? 'تخطّي' : 'Skip'} ✕
      </button>

      {/* Main splash content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center',
        transform: phase === 'enter' ? 'scale(0.85) translateY(30px)' : 'scale(1) translateY(0)',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Avatar */}
        <div style={{
          borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.3)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden'
        }}>
          <Avatar name={name} size={120} />
        </div>

        {/* Time-based greeting */}
        <p style={{
          margin: 0, fontSize: 16, letterSpacing: 2, opacity: 0.85,
          fontWeight: 600, textTransform: 'uppercase'
        }}>
          {greeting}
        </p>

        {/* Doctor name */}
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, lineHeight: 1.2 }}>
          {doctorTitle} {firstName} 👋
        </h1>

        {/* Subtitle */}
        <p style={{ margin: 0, fontSize: 16, opacity: 0.85, fontWeight: 500 }}>
          {isRTL ? 'لوحة التحكم جاهزة لك' : 'Your dashboard is ready'}
        </p>

        {/* 🏥 Real Clinical Identity Card */}
        <div style={{
           marginTop: 10, padding: '16px 28px', background: 'rgba(255,255,255,0.12)', 
           borderRadius: 24, border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(12px)',
           display: 'flex', flexDirection: 'column', gap: 6, minWidth: 280,
           animation: ' CuraCardFadeIn 1s ease-out'
        }}>
           <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              🏢 {clinicName || (isRTL ? 'عيادة CuraBook' : 'CuraBook Clinic')}
           </div>
           <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
               🩺 {specialty || (isRTL ? 'التخصص الطبي' : 'Specialization')} 
               {experience && ` • ${experience} ${isRTL ? 'سنة خبرة' : 'years exp'}`}
            </div>
            {(location || phone) && (
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                 {location && <span>📍 {location}</span>}
                 {phone && <span>📱 {phone}</span>}
              </div>
            )}
        </div>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              animation: 'cura-blink 1.4s infinite both',
              animationDelay: `${i * 0.2}s`
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes cura-blink {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes CuraCardFadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
