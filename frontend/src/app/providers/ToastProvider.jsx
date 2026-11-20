/**
 * ToastProvider.jsx — Design System v18
 * - RTL: toast بيجي من اليمين (fixed per proposal)
 * - ألوان جديدة: primary #1B5E8A / accent #E5701F
 * - font-family: Cairo
 * - animation: slideInFromRight (RTL-aware)
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const CONFIG = {
  success: {
    bg: 'rgba(232, 245, 239, 0.85)', border: 'rgba(26, 138, 90, 0.4)', color: '#0D4A30',
    icon: '✓', iconBg: '#1A8A5A', iconColor: '#fff',
  },
  error: {
    bg: 'rgba(254, 226, 226, 0.85)', border: 'rgba(229, 62, 62, 0.4)', color: '#991B1B',
    icon: '✕', iconBg: '#E53E3E', iconColor: '#fff',
  },
  info: {
    bg: 'rgba(234, 244, 251, 0.85)', border: 'rgba(27, 94, 138, 0.4)', color: '#1E3A5F',
    icon: 'i', iconBg: 'var(--primary)', iconColor: '#fff',
  },
  warning: {
    bg: 'rgba(253, 244, 231, 0.85)', border: 'rgba(201, 146, 58, 0.4)', color: '#92400E',
    icon: '!', iconBg: '#C9923A', iconColor: '#fff',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => {
      // The same realtime event can reach more than one mounted subscriber,
      // and a successful mutation can race with its WebSocket echo. Keep one
      // visible toast per message so the user sees a single confirmation.
      if (prev.some(t => t.message === message)) return prev;
      return [...prev.slice(-4), { id, message, type }];
    });
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, d) => addToast(msg, 'success', d),
    error:   (msg, d) => addToast(msg, 'error',   d),
    info:    (msg, d) => addToast(msg, 'info',     d),
    warning: (msg, d) => addToast(msg, 'warning',  d),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container — RTL: bottom-right (visually right side of screen) */}
      <div
        role="region"
        aria-label="الإشعارات"
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',      /* RTL: من اليمين دايماً */
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '360px',
          width: 'calc(100vw - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => {
          const cfg = CONFIG[t.type] || CONFIG.info;
          return (
            <div
              key={t.id}
              role="alert"
              onClick={() => dismiss(t.id)}
              title="اضغط للإغلاق"
              style={{
                background: cfg.bg,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1.5px solid ${cfg.border}`,
                color: cfg.color,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'toastSlideInRTL 0.28s cubic-bezier(0,0,0.2,1)',
                fontFamily: "'Cairo', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                pointerEvents: 'all',
                cursor: 'pointer',
                lineHeight: 1.6,
                direction: 'rtl',
              }}
            >
              {/* Icon circle */}
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: cfg.iconBg,
                color: cfg.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 700,
              }} aria-hidden="true">
                {cfg.icon}
              </span>

              {/* Message */}
              <span style={{ flex: 1 }}>{t.message}</span>

              {/* Close */}
              <span style={{
                fontSize: '16px',
                opacity: 0.5,
                flexShrink: 0,
                lineHeight: 1,
              }} aria-hidden="true">×</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastSlideInRTL {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
export default ToastProvider;
