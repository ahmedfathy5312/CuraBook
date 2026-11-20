import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '../../../i18n/useTranslation';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import tokens from '../../../theme/tokens';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P      = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_DANGER = tokens?.colors?.danger?.DEFAULT  || '#E97D61';
const MOD_SM     = tokens?.shadows?.sm               || '0 1px 3px rgba(0,0,0,0.08)';
const MOD_MD     = tokens?.shadows?.md               || '0 6px 24px rgba(0,0,0,0.08)';

export default function NewPatientRecordPage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { t, language } = useTranslation();

  const [form, setForm] = useState({
    patient_name: '', phone: '', date_of_birth: '',
    gender: '', chief_complaint: '', medical_history: '',
  });

  const mut = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API.DOCTORS.PATIENT_RECORDS, payload);
      return data;
    },
    onSuccess: () => {
      toast.success(t('patientRecords.success'));
      navigate('/patient-management');
    },
    onError: (err) => {
      const detail = err?.errorDetail
        || err?.response?.data?.errors?.patient_name?.[0]
        || err?.response?.data?.detail
        || err?.response?.data?.error
        || (typeof err?.response?.data === 'string' ? err.response.data : null)
        || 'Failed to create record. Please check all fields and try again.';
      toast.error(detail);
    },
  });

  const isValid = form.patient_name.trim() && form.chief_complaint.trim();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Button variant="ghost" onClick={() => navigate(-1)} style={{ borderRadius: 12, width: 44, height: 44, padding: 0 }}>
          {language === 'ar' ? '→' : '←'}
        </Button>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>📋 {t('patientRecords.title')}</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-hint)', fontSize: 14 }}>{t('patientRecords.subtitle')}</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 28, padding: 36, boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Patient Info Section */}
          <div style={{ gridColumn: '1 / -1' }}>
             <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 20 }}>👤</span> {t('profile.personalInfo')}
             </h3>
          </div>

          <FormField 
            label={t('patientRecords.patientName')} 
            required 
            value={form.patient_name} 
            onChange={v => setForm({ ...form, patient_name: v })}
            placeholder={t('patientRecords.placeholderName')}
          />

          <FormField 
            label={t('patientRecords.phone')} 
            type="tel" 
            value={form.phone} 
            onChange={v => setForm({ ...form, phone: v })}
            placeholder="+20 1..."
          />

          <FormField 
            label={t('patientRecords.dob')} 
            type="date" 
            value={form.date_of_birth} 
            onChange={v => setForm({ ...form, date_of_birth: v })}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>{t('patientRecords.gender')}</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['male', 'female'].map(g => (
                <button 
                  key={g} 
                  type="button"
                  onClick={() => setForm({ ...form, gender: g })}
                  style={{ 
                    flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid',
                    borderColor: form.gender === g ? MOD_P : 'var(--border-base)',
                    background: form.gender === g ? MOD_P : 'var(--bg-card)',
                    color: form.gender === g ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {t(`patientRecords.${g}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Info Section */}
          <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
             <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 20 }}>🩺</span> {t('doctor.tabs.overview')}
             </h3>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField 
              label={t('patientRecords.complaint')} 
              required 
              multiline 
              value={form.chief_complaint} 
              onChange={v => setForm({ ...form, chief_complaint: v })}
              placeholder={t('patientRecords.placeholderComplaint')}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField 
              label={t('patientRecords.notes')} 
              multiline 
              value={form.medical_history} 
              onChange={v => setForm({ ...form, medical_history: v })}
              placeholder={t('patientRecords.placeholderNotes')}
              rows={4}
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-base)' }}>
           <Button variant="ghost" onClick={() => navigate(-1)} style={{ borderRadius: 12, padding: '12px 24px' }}>
             {t('common.cancel')}
           </Button>
           <Button 
             variant="primary" 
             onClick={() => {
               // FIX: send clean payload with only non-empty fields
               const payload = {
                 patient_name:    form.patient_name.trim(),
                 phone:           form.phone.trim(),
                 date_of_birth:   form.date_of_birth || undefined,
                 gender:          form.gender || undefined,
                 chief_complaint: form.chief_complaint.trim(),
                 medical_history: form.medical_history.trim(),
               };
               // remove undefined keys so backend doesn't get blank strings for optional fields
               Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
               mut.mutate(payload);
             }} 
             loading={mut.isPending} 
             disabled={!isValid}
             style={{ borderRadius: 12, padding: '12px 40px', fontWeight: 700, boxShadow: MOD_MD }}
           >
             {t('patientRecords.createBtn')}
           </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder, required, multiline, rows = 3 }) {
  const inputProps = {
    value,
    onChange: e => onChange(e.target.value),
    required,
    placeholder,
    style: {
      width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-base)',
      background: 'var(--bg-card)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
      transition: 'border-color 0.2s', resize: multiline ? 'vertical' : 'none'
    },
    onFocus: e => e.target.style.borderColor = MOD_P,
    onBlur: e => e.target.style.borderColor = 'var(--border-base)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>
        {label} {required && <span style={{ color: MOD_DANGER }}>*</span>}
      </label>
      {multiline ? <textarea {...inputProps} rows={rows} /> : <input type={type} {...inputProps} />}
    </div>
  );
}
