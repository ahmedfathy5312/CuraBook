/**
 * Card.jsx — Phase 4 Polish
 * ==========================
 * ✅ Uses CSS variables for shadow/border (dark-mode ready)
 * ✅ Keyboard accessible (Enter key fires onClick)
 * ✅ hover/focus shadow via CSS vars
 * ✅ RTL-safe (no fixed directional padding)
 */
import { cn } from '../../utils/cn';
import tokens from '../../theme/tokens';

export function Card({ children, className, style, padding = 'card', hover = false, onClick }) {
  const paddingValue = tokens?.spacing?.[padding] || padding || '24px';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
      className={cn('rounded-2xl card-base', className)}
      style={{
        background:   'var(--bg-card)',
        padding:      paddingValue,
        boxShadow:    'var(--shadow-card)',
        border:       '1px solid var(--border-base)',
        transition:   'var(--transition)',
        cursor:       onClick ? 'pointer' : 'default',
        outline:      'none',
        ...style,
      }}
      onMouseOver={e => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow    = 'var(--shadow-hover)';
          e.currentTarget.style.borderColor  = 'var(--primary)';
          e.currentTarget.style.transform    = 'translateY(-2px)';
        }
      }}
      onMouseOut={e => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow   = 'var(--shadow-card)';
          e.currentTarget.style.borderColor = 'var(--border-base)';
          e.currentTarget.style.transform   = 'none';
        }
      }}
      onFocus={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,116,144,0.25)';
        }
      }}
      onBlur={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      {children}
    </div>
  );
}

export default Card;
