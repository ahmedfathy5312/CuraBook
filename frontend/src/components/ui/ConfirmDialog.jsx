/**
 * ConfirmDialog.jsx — Reusable destructive-action confirmation modal
 *
 * Usage:
 *   <ConfirmDialog
 *     open={confirmOpen}
 *     title="Remove Doctor"
 *     message="Are you sure you want to remove Dr. Ahmed? This cannot be undone."
 *     confirmLabel="Remove"
 *     variant="danger"          // "danger" | "warning" | "default"
 *     loading={mutation.isPending}
 *     onConfirm={handleConfirm}
 *     onCancel={() => setConfirmOpen(false)}
 *   />
 */
import { useEffect, useRef } from 'react';
import { tokens } from '../../theme/tokens';

const VARIANTS = {
  danger: {
    icon: '🗑️',
    confirmBg:   tokens?.colors?.danger?.DEFAULT || '#E97D61',
    confirmHover: tokens.colors.danger.dark,
    iconBg:      tokens.colors.danger.bg,
    headerColor: tokens?.colors?.danger?.DEFAULT || '#E97D61',
  },
  warning: {
    icon: '⚠️',
    confirmBg:   tokens?.colors?.warning?.DEFAULT || '#F59E0B',
    confirmHover: tokens?.colors?.warning?.dark || '#D97706',
    iconBg:      tokens.colors.warning.bg,
    headerColor: tokens?.colors?.warning?.DEFAULT || '#F59E0B',
  },
  default: {
    icon: '❓',
    confirmBg:   tokens?.colors?.primary?.DEFAULT || '#0E7490',
    confirmHover: tokens?.colors?.primary?.dark || '#0C6478',
    iconBg:      tokens?.colors?.primary?.lighter || '#E0F7FA',
    headerColor: tokens?.colors?.primary?.DEFAULT || '#0E7490',
  },
};

export function ConfirmDialog({
  open,
  title        = 'Are you sure?',
  message      = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const v = VARIANTS[variant] || VARIANTS.danger;

  // Focus cancel button when modal opens + ESC to close
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    cancelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      style={{
        position: 'fixed', inset: 0, zIndex: tokens.zIndex.modal,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'cdFadeIn .18s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel?.(); }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: tokens.radius['2xl'],
          boxShadow: tokens.shadows.modal,
          width: '100%', maxWidth: '420px',
          animation: 'cdSlideUp .22s ease',
          overflow: 'hidden',
        }}
      >
        {/* Icon header */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '32px 28px 20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: tokens.radius.full,
            background: v.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 16,
          }}>
            {v.icon}
          </div>

          <h3
            id="confirm-title"
            style={{
              margin: '0 0 8px',
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.bold,
              color: tokens.colors.gray[800],
            }}
          >
            {title}
          </h3>

          <p
            id="confirm-desc"
            style={{
              margin: 0,
              fontSize: tokens.typography.sizes.sm,
              color: tokens.colors.gray[500],
              lineHeight: tokens.typography.lineHeights.normal,
              maxWidth: '320px',
            }}
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 10,
          padding: '0 24px 24px',
        }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: tokens.radius.md,
              border: `1.5px solid ${tokens.colors.border}`,
              background: 'var(--bg-card)',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.semibold,
              color: tokens.colors.gray[600],
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: tokens.typography.fontFamily,
              opacity: loading ? 0.6 : 1,
              transition: tokens.transitions.fast,
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = tokens.colors.gray[50]; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: tokens.radius.md,
              border: 'none',
              background: v.confirmBg,
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.semibold,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: tokens.typography.fontFamily,
              opacity: loading ? 0.75 : 1,
              transition: tokens.transitions.fast,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = v.confirmHover; }}
            onMouseOut={(e) => { e.currentTarget.style.background = v.confirmBg; }}
          >
            {loading && (
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                animation: 'cdSpin .7s linear infinite',
                display: 'inline-block',
              }} />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cdFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes cdSlideUp { from { opacity:0; transform:translateY(14px) scale(.97) } to { opacity:1; transform:none } }
        @keyframes cdSpin    { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}

export default ConfirmDialog;
