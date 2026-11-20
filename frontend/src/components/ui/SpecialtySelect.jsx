import React from 'react';
import { SPECIALTIES } from '../../constants/SPECIALTIES_DATA';

export default function SpecialtySelect({ value, onChange, onBlur, name, error, touched, inputStyle, isRTL, placeholder = "Select specialty..." }) {
  return (
    <>
      <select 
        name={name} 
        value={value} 
        onChange={onChange} 
        onBlur={onBlur} 
        style={{ ...(inputStyle ? inputStyle(name) : {}), cursor: "pointer", borderColor: error && touched ? "var(--danger, #EF4444)" : "var(--border, var(--border-base))" }} 
        onFocus={e => e.target.style.borderColor="var(--primary, #1B5E8A)"}
      >
        <option value="">{placeholder}</option>
        {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{isRTL ? s.ar : s.en}</option>)}
      </select>
    </>
  );
}
