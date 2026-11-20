/**
 * Input.jsx — Design System v18
 * Rules:
 *  - Label always above input (never placeholder-only)
 *  - Focus ring: primary-light color, 3px
 *  - border-radius: 10px (--radius-button)
 *  - Phone/number inputs: dir="ltr" even in RTL interface
 *  - Error: red border + Arabic message below
 */
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const BASE_STYLE = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--border-base)',
  fontSize: '15px',
  color: 'var(--text-h)',
  background: 'var(--bg-card)',
  outline: 'none',
  transition: 'all 0.15s ease',
  fontFamily: "'Cairo', sans-serif",
  boxSizing: 'border-box',
  lineHeight: '1.5',
};

const LABEL_STYLE = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-body)',
  display: 'block',
  marginBottom: '6px',
  fontFamily: "'Cairo', sans-serif",
};

const REQUIRED_STAR = {
  color: 'var(--danger)',
  marginInlineStart: '3px',
};

// ── Base Input ─────────────────────────────────────────────────────────────
export const Input = forwardRef(function Input({
  label, error, hint, icon, iconRight, fullWidth = true, required = false,
  className, containerClassName, id, type = 'text',
  ...props
}, ref) {
  const inputId = id || `input-${(label || '').toLowerCase().replace(/\s+/g, '-')}`;
  const isNumericType = ['tel', 'number', 'email'].includes(type);

  return (
    <div className={cn('flex flex-col', containerClassName)}>
      {label && (
        <label htmlFor={inputId} style={LABEL_STYLE}>
          {label}
          {required && <span style={REQUIRED_STAR} aria-hidden="true">*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            insetInlineStart: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            pointerEvents: 'none',
            color: 'var(--text-hint)',
          }}>
            {icon}
          </span>
        )}

        <input
          autoComplete="off"
          ref={ref}
          id={inputId}
          type={type}
          dir={isNumericType ? 'ltr' : undefined}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          style={{
            ...BASE_STYLE,
            width: fullWidth ? '100%' : 'auto',
            paddingInlineStart: icon ? '44px' : '16px',
            paddingInlineEnd: iconRight ? '44px' : '16px',
            border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--primary)';
            e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(220,38,38,0.12)' : 'rgba(14,116,144,0.12)'}`;
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
          className={className}
          {...props}
        />

        {iconRight && (
          <span style={{
            position: 'absolute',
            insetInlineEnd: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            color: 'var(--text-hint)',
          }}>
            {iconRight}
          </span>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 500, marginTop: '6px', fontFamily: "'Cairo', sans-serif" }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          id={`${inputId}-hint`}
          style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '4px', fontFamily: "'Cairo', sans-serif" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
});

// ── Search Input ─────────────────────────────────────────────────────────────
export const SearchInput = forwardRef(function SearchInput({
  value, onChange, placeholder = 'ابحث...', style, className, 'aria-label': ariaLabel,
  ...props
}, ref) {
  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <span style={{
        position: 'absolute',
        insetInlineStart: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '16px',
        pointerEvents: 'none',
        color: 'var(--text-hint)',
      }}>🔍</span>
      <input
        autoComplete="off"
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        role="searchbox"
        style={{
          ...BASE_STYLE,
          paddingInlineStart: '44px',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 3px rgba(46,134,193,0.12)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      />
    </div>
  );
});

// ── Select ───────────────────────────────────────────────────────────────────
export const Select = forwardRef(function Select({
  label, error, options = [], placeholder = 'اختر...', value, onChange,
  disabled, containerClassName, id, required = false, ...props
}, ref) {
  const selectId = id || `select-${(label || '').toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={cn('flex flex-col', containerClassName)}>
      {label && (
        <label htmlFor={selectId} style={LABEL_STYLE}>
          {label}
          {required && <span style={REQUIRED_STAR} aria-hidden="true">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
        aria-required={required}
        style={{
          ...BASE_STYLE,
          border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          color: value ? 'var(--text-h)' : 'var(--text-hint)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A0AEC0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left 14px center',
          paddingInlineStart: '36px',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 3px rgba(14,116,144,0.12)';
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p role="alert" style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 500, marginTop: '6px', fontFamily: "'Cairo', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
