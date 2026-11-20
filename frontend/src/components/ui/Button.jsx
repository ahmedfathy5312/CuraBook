/**
 * Button.jsx — Design System v19
 * New palette: Primary #1B5E8A | Accent #E5701F (CTA only) | Surface var(--bg-card)
 */
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary:   'bg-[var(--primary)] hover:bg-[#154E73] text-white',
  accent:    'bg-[#E5701F] hover:bg-[#C45A10] text-white',   // Primary CTA: احجز الآن، تأكيد
  secondary: 'bg-[var(--primary-pale)] hover:bg-[var(--bg-hover)] text-[var(--primary)] border border-[var(--border-base)]',
  ghost:     'bg-transparent hover:bg-[var(--primary-pale)] text-[var(--primary)] border border-[var(--border-base)]',
  outline:   'border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white bg-transparent',
  danger:    'bg-[#D93025] hover:bg-[#B52820] text-white',
  success:   'bg-[#1A8A5A] hover:bg-[#156B46] text-white',
  white:     'bg-[var(--bg-card)] text-[var(--primary)] hover:bg-[var(--primary-pale)] border border-[var(--border-base)]',
  warning:   'bg-[#E97A2F] hover:bg-[#C96020] text-white',
  gold:      'bg-[#C9923A] hover:bg-[#A87430] text-white',
  neutral:   'bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--txt-body)] border border-[var(--border-base)]',
};

const SIZES = {
  xs: 'px-3 py-1.5 text-xs gap-1',
  sm: 'px-4 py-2 text-[13px] gap-1.5',
  md: 'px-6 py-3 text-[14px] gap-2',
  lg: 'px-7 py-3.5 text-[15px] gap-2',
  xl: 'px-8 py-4 text-[16px] gap-2.5',
};

const SHADOWS = {
  primary:   'shadow-[0_2px_8px_rgba(46,134,193,0.28)] hover:shadow-[0_4px_16px_rgba(46,134,193,0.38)]',
  accent:    'shadow-[0_2px_8px_rgba(26,188,156,0.28)] hover:shadow-[0_4px_16px_rgba(26,188,156,0.38)]',
  secondary: '',
  ghost:     '',
  outline:   '',
  danger:    'shadow-[0_2px_8px_rgba(217,48,37,0.22)]',
  success:   'shadow-[0_2px_8px_rgba(26,138,90,0.22)]',
  white:     'shadow-sm',
  warning:   '',
  gold:      '',
  neutral:   '',
};

function Spinner({ size = 'sm' }) {
  const s = size === 'sm' ? 14 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export function Button({
  variant = 'primary', size = 'md', loading = false,
  disabled = false, fullWidth = false, icon, iconRight,
  children, className,
  'aria-label': ariaLabel,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold',
        'transition-all duration-[180ms] ease-out focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
        'rounded-[10px]',
        VARIANTS[variant] || VARIANTS.primary,
        SHADOWS[variant] || '',
        SIZES[size],
        fullWidth && 'w-full',
        !disabled && !loading && 'hover:-translate-y-px',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={size === 'lg' || size === 'xl' ? 'md' : 'sm'} /> : icon}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  );
}

export default Button;
