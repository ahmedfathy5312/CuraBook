/**
 * WelcomeModal.jsx — Welcome Screen for Admin Panel
 *
 * Sprint 1 — UX Design Report رسالة الترحيب:
 *  • Typewriter effect on greeting
 *  • Shows once per day (stored in localStorage by date)
 *  • Auto-closes after 6 seconds or on button click
 *  • Dynamic content: user name, time-based greeting, today tasks
 *  • Arabic RTL, Design Tokens colors
 */
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { tokens } from '../../../theme/tokens';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PRIMARY_DARK = tokens?.colors?.primary?.dark || '#0C6478';

// Time-based greeting (Arabic)
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'صباح الخير';
  if (h >= 12 && h < 18) return 'مساء الخير';
  return 'مساء النور';
}

// Format today's date in Arabic
function getTodayAr() {
  return new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTimeAr() {
  return new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Typewriter hook
function useTypewriter(text, speed = 50, start = false) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!start) return;
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, start]);
  return displayed;
}

// localStorage key: stores last shown date (YYYY-MM-DD)
const STORAGE_KEY = 'curabook_welcome_shown';

function shouldShow() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    return stored !== today;
  } catch {
    return true;
  }
}

function markShown() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, today);
  } catch {}
}

export default function WelcomeModal({ stats }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [started, setStarted] = useState(false);
  const timerRef = useRef(null);

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'مدير';
  const greeting = getGreeting();
  const fullGreeting = `${greeting}، ${firstName} 👋`;
  const typed = useTypewriter(fullGreeting, 55, started);

  useEffect(() => {
    if (!shouldShow()) return;
    // Slight delay so dashboard mounts first
    const t = setTimeout(() => {
      setVisible(true);
      setStarted(true);
      markShown();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => handleClose(), 6000);
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => setVisible(false), 350);
  }

  if (!visible) return null;

  // Task summary from stats
  const pendingDoctors = stats?.pending_doctors ?? 0;
  const pendingHospitals = stats?.pending_hospitals ?? 0;
  const todayAppointments = stats?.today_appointments ?? stats?.appointments ?? 0;

  const tasks = [
    pendingDoctors > 0 && `${pendingDoctors} طبيب يحتاج تفعيل الحساب`,
    pendingHospitals > 0 && `${pendingHospitals} مستشفى تنتظر الموافقة`,
    todayAppointments > 0 && `${todayAppointments} موعد اليوم`,
  ].filter(Boolean);

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1400,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: closing ? 'fadeOut 0.35s ease forwards' : 'fadeIn 0.35s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(32px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .welcome-card { animation: ${closing ? 'none' : 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)'}; }
        .cursor { display: inline-block; width: 2px; height: 1.1em; background: rgba(255,255,255,0.85); margin-right: 2px; vertical-align: middle; animation: pulse 0.8s step-end infinite; }
      `}</style>

      <div
        className="welcome-card"
        onClick={e => e.stopPropagation()}
        dir="rtl"
        style={{
          background: `linear-gradient(145deg, ${PRIMARY}, ${PRIMARY_DARK})`,
          borderRadius: '20px',
          padding: '36px 40px',
          maxWidth: '520px',
          width: '100%',
          color: '#fff',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          position: 'relative',
          fontFamily: "'Cairo', sans-serif",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="إغلاق"
          style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '50%', width: 32, height: 32,
            cursor: 'pointer', color: '#fff', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >×</button>

        {/* Logo / brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🏥</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.75, letterSpacing: 1 }}>CuraBook Admin</p>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>{getTodayAr()} · {getTimeAr()}</p>
          </div>
        </div>

        {/* Typewriter greeting */}
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 20px', lineHeight: 1.4, minHeight: '1.4em' }}>
          {typed}
          {typed.length < fullGreeting.length && <span className="cursor" />}
        </h1>

        {/* Tasks box */}
        {tasks.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 24,
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📊</span> لديك اليوم:
            </p>
            <ul style={{ margin: 0, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map((task, i) => (
                <li key={i} style={{ fontSize: 13, opacity: 0.9 }}>• {task}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tagline */}
        <p style={{ fontSize: 12, opacity: 0.65, margin: '0 0 24px', fontStyle: 'italic', textAlign: 'center' }}>
          "إدارة الرعاية الصحية بذكاء وكفاءة" — فريق CuraBook
        </p>

        {/* CTA button */}
        <button
          onClick={handleClose}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.95)',
            color: PRIMARY_DARK, fontWeight: 800, fontSize: 15,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'none'; }}
        >
          ابدأ العمل 🚀
        </button>

        {/* Auto-close hint */}
        <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: 11, opacity: 0.5 }}>
          سيُغلق هذا تلقائياً خلال ثوانٍ
        </p>
      </div>
    </div>
  );
}
