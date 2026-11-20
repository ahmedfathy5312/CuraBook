import React from 'react';

/**
 * LoadingButton — Design System v18
 * A premium, stateful button with built-in loading spinner and hover effects.
 */
export default function LoadingButton({
  children,
  loading = false,
  variant = 'primary', // primary, secondary, danger, ghost, accent
  disabled = false,
  className = '',
  style = {},
  onClick,
  type = 'button',
  fullWidth = false,
  ...props
}) {
  const isDark = document.documentElement.classList.contains('dark');

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 16px rgba(27, 94, 138, 0.35)',
        };
      case 'accent':
        return {
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(229, 112, 31, 0.25)',
        };
      case 'secondary':
        return {
          background: 'var(--primary-pale)',
          color: 'var(--primary)',
          border: '1.5px solid var(--primary-light)',
        };
      case 'danger':
        return {
          background: 'var(--danger)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(217, 48, 37, 0.2)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-muted)',
          border: '1.5px solid var(--border)',
        };
      default:
        return {
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
        };
    }
  };

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '9.5px 22px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: loading || disabled ? 'not-allowed' : 'pointer',
    opacity: loading || disabled ? 0.65 : 1,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'var(--font-main, sans-serif)',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    position: 'relative',
    overflow: 'hidden',
    ...getVariantStyles(),
    ...style,
  };

  return (
    <>
      <style>{`
        .loading-btn:not(:disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
          box-shadow: 0 8px 24px rgba(27, 94, 138, 0.45);
        }
        .loading-btn:not(:disabled):active {
          transform: translateY(0) scale(0.98);
        }
        .loading-btn-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: btn-spin 0.6s linear infinite;
        }
        @keyframes btn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <button
        type={type}
        className={`loading-btn ${className}`}
        onClick={!loading && !disabled ? onClick : undefined}
        disabled={loading || disabled}
        style={baseStyles}
        {...props}
      >
        {loading && <div className="loading-btn-spinner" aria-hidden="true" />}
        <span style={{ opacity: loading ? 0.8 : 1 }}>{children}</span>
      </button>
    </>
  );
}
