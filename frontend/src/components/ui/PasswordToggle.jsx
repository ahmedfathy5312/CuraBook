import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordToggle({ show, onToggle, isRTL = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="pwd-toggle-btn"
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [isRTL ? 'left' : 'right']: '12px',
        background: 'none',
        border: 'none',
        color: 'var(--text-muted, #6B7280)',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
