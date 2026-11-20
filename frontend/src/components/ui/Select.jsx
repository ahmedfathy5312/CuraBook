import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Select = forwardRef(function Select({
  label,
  error,
  options = [],
  placeholder,
  size = 'md',
  fullWidth = true,
  className,
  style,
  ...props
}, ref) {
  const heights  = { sm: '36px', md: '44px', lg: '52px' };
  const fontSize = { sm: '12px', md: '14px', lg: '15px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: fullWidth ? '100%' : undefined }}>
      {label && (
        <label style={{
          fontSize: '13px', fontWeight: '600',
          color: error ? '#E97D61' : 'var(--text-body)',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(className)}
        style={{
          width:        fullWidth ? '100%' : undefined,
          height:       heights[size],
          padding:      '0 36px 0 14px',
          fontSize:     fontSize[size],
          fontFamily:   "'Cairo', sans-serif",
          color:        'var(--text-h)',
          background:   `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 12px center`,
          border:       `1.5px solid ${error ? '#E97D61' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          outline:      'none',
          appearance:   'none',
          cursor:       'pointer',
          transition:   'border-color 0.2s ease, box-shadow 0.2s ease',
          boxSizing:    'border-box',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow   = '0 0 0 3px #1B5E8A18';
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? '#E97D61' : 'var(--border)';
          e.target.style.boxShadow   = 'none';
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p style={{ fontSize: '12px', color: '#E97D61', margin: 0, fontFamily: "'Cairo', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
