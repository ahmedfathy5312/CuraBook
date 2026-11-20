import React from 'react';
import { EGYPT_GOVERNORATES } from '../../constants/GOVERNORATES';

export default function GovernorateSelect({ value, onChange, onBlur, name, error, touched, inputStyle, isRTL, placeholder = "Select Governorate..." }) {
  return (
    <>
      <select 
        name={name} 
        value={value} 
        onChange={onChange} 
        onBlur={onBlur} 
        aria-label={placeholder}
        title={placeholder}
        style={{ ...(inputStyle ? inputStyle(name) : {}), cursor: "pointer", borderColor: error && touched ? "var(--danger, #EF4444)" : "var(--border, var(--border-base))" }} 
        onFocus={e => e.target.style.borderColor="var(--primary, #1B5E8A)"}
      >
        <option value="">{placeholder}</option>
        {EGYPT_GOVERNORATES.map(g => <option key={g.value} value={g.value}>{isRTL ? g.ar : g.en}</option>)}
      </select>
    </>
  );
}
