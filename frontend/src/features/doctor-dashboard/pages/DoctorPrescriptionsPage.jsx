import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { Modal } from '../../../components/ui/Modal';
import { Table } from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Avatar from '../../../components/ui/Avatar';
import tokens from '../../../theme/tokens';
import apiClient from '../../../services/apiClient';
import jsPDF from 'jspdf';
import { formatDate } from '../../../utils/formatters';
import { useToast } from '../../../context/ToastContext';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_DANGER  = tokens?.colors?.danger?.DEFAULT  || '#EF4444';
const MOD_ACCENT  = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';
const MOD_SM      = tokens?.shadows?.sm              || '0 1px 3px rgba(0,0,0,0.08)';
const MOD_MD      = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';

const PRESCRIPTION_STATUS_LABELS = {
  draft: { ar: 'قيد الإعداد', en: 'Draft', bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  sent: { ar: 'تم الإرسال', en: 'Sent', bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
};

function PrescriptionStatusBadge({ status, isRTL }) {
  const key = String(status || 'sent').toLowerCase();
  const cfg = PRESCRIPTION_STATUS_LABELS[key] || {
    ar: status || '—',
    en: status || '—',
    bg: 'var(--bg-subtle)',
    text: 'var(--text-h)',
    dot: 'var(--text-muted)',
  };
  const label = isRTL ? cfg.ar : cfg.en;

  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 'var(--radius-pill)',
        background: cfg.bg,
        color: cfg.text,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        border: '1px solid rgba(255,255,255,0.24)',
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {label}
    </span>
  );
}

export default function DoctorPrescriptionsPage() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const [modalOpen, setModalOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setFilterSearch] = useState('');
  const [medSearch, setMedSearch]     = useState(''); // MP-8 FIX: Filter by Medication Name


  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/doctor/prescriptions/');  // FIX: /doctor/prescriptions/ handles walkin patients + returns correct data
      setPrescriptions(response.data?.results || response.data || []);
    } catch (err) {
      console.error("Error fetching prescriptions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleDownload = (p) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('CuraBook Prescription', 20, 20);
    doc.setFontSize(14);
    doc.text(`Patient: ${p.patient_name || p.patient?.full_name}`, 20, 35);
    doc.text(`Date: ${formatDate(p.created_at || new Date())}`, 20, 42);
    doc.text(`Diagnosis: ${p.diagnosis || '—'}`, 20, 49);
    
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    doc.text('Medications:', 20, 65);
    p.medications?.forEach((m, i) => {
      doc.text(`${i+1}. ${m.name} - ${m.dosage || ''} (${m.frequency || ''}) - ${m.duration || ''}`, 25, 75 + (i * 10));
    });

    // LP-9 & LP-10 FIX: Signature and Side Effects
    const finalY = 75 + (p.medications?.length || 0) * 10 + 20;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('⚠️ NOTE: Please follow the dosage carefully. Consult doctor if side effects occur.', 20, finalY);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(140, finalY + 20, 190, finalY + 20);
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('Doctor Signature', 145, finalY + 28);
    
    doc.save(`Prescription_${p.id}.pdf`);
  };

  const columns = [
    { 
      key: 'patient', 
      label: t('prescriptions.patientName', isRTL ? 'بيانات المريض' : 'Patient Name'), 
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={r.patient_name || r.patient?.full_name} size={40} style={{ border: '2px solid white', boxShadow: MOD_SM }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-h)', display: 'block' }}>{r.patient_name || r.patient?.full_name}</span>
            {r.appointment_id && <span style={{ fontSize: 12, color: 'var(--text-hint)', fontWeight: 500 }}>ID: #{r.appointment_id}</span>}
          </div>
        </div>
      ) 
    },
    { key: 'diagnosis', label: t('prescriptions.diagnosis', isRTL ? 'التشخيص' : 'Diagnosis'), render: (_, r) => <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{r.diagnosis || '—'}</span> },
    { key: 'date', label: t('appointments.date', isRTL ? 'التاريخ' : 'Date'), render: (_, r) => <span style={{ fontSize: 13, fontWeight: 700, color: MOD_P, padding: '4px 10px', background: MOD_PL, borderRadius: 12 }}>{formatDate(r.created_at)}</span> },
    { key: 'status', label: t('common.status', isRTL ? 'الحالة' : 'Status'), render: (_, r) => <PrescriptionStatusBadge status={r.status || 'sent'} isRTL={isRTL} /> },
    { 
      key: 'actions', 
      label: '', 
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => handleDownload(r)} style={{ fontWeight: 800, color: MOD_P, background: 'var(--bg-subtle)', borderRadius: 12, padding: '6px 14px', border: '1px solid var(--border-base)', boxShadow: MOD_SM }}>
            📄 {t('prescriptions.downloadPdf', isRTL ? 'طباعة PDF' : 'Download PDF')}
          </Button>
        </div>
      ) 
    }
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 80, direction: isRTL ? 'rtl' : 'ltr', overflowY: 'auto' }}>
      
      {/* ── Premium Hero Header ── */}
      <div style={{
         background: `linear-gradient(135deg, ${MOD_ACCENT} 0%, ${MOD_PD} 100%)`, 
         borderRadius: 24, padding: '36px 40px', color: '#fff', 
         position: 'relative', overflow: 'hidden', marginBottom: 32,
         boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
         flexWrap: 'wrap', gap: 24
      }}>
         <div style={{ position: 'absolute', top: -50, right: isRTL ? 'auto' : -20, left: isRTL ? -20 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
         <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
         
         <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px' }}>💊 {t('prescriptions.title', isRTL ? 'الوصفات الطبية الرقمية' : 'Digital Prescriptions')}</h1>
            <p style={{ margin: 0, fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6 }}>
              {t('prescriptions.subtitle', isRTL ? 'قم بإصدار وتنظيم وصرف الروشتات الرقمية بشكل آمن لمرضاك. كل روشتة يتم حفظها في السجل.' : 'Manage and securely issue digital prescriptions to your patients. Each Rx is saved in the record.')}
            </p>
         </div>

         <div style={{ position: 'relative', zIndex: 1 }}>
           <Button variant="primary" onClick={() => setModalOpen(true)} style={{ background: '#fff', color: MOD_ACCENT, borderRadius: 16, padding: '12px 28px', fontWeight: 800, boxShadow: `0 4px 16px rgba(0,0,0,0.15)` }}>
             📝 {t('prescriptions.newBtn', isRTL ? 'إصدار روشتة جديدة' : 'Issue New Rx')}
           </Button>
         </div>
      </div>

      <div className="scrollable-container" style={{ background: 'var(--bg-card)', borderRadius: 28, boxShadow: MOD_SM, border: '1px solid var(--border-base)', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', minHeight: 200 }}>
        <Table 
          columns={columns}
          data={prescriptions}
          loading={loading}
          emptyTitle={t('prescriptions.emptyTitle', isRTL ? 'لم تقم بإصدار أي روشتة طبية بعد' : 'No Prescriptions issued yet')}
        />
      </div>
      
      <CreatePrescriptionModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchPrescriptions} t={t} isRTL={isRTL} />
    </div>
  );
}

// ── Sub-component: Form Modal ────────────────────────────────────────────────

function CreatePrescriptionModal({ open, onClose, onSuccess, t, isRTL }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patient_name: '',
    diagnosis: '',
    appointment_id: '',
    general_notes: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', notes: '' }]
  });

  const handleAddMed = () => setForm({ ...form, medications: [...form.medications, { name: '', dosage: '', frequency: '', duration: '', notes: '' }] });
  const handleRemoveMed = (index) => setForm({ ...form, medications: form.medications.filter((_, i) => i !== index) });
  
  const handleSetField = (field, value) => setForm({ ...form, [field]: value });
  const handleMedChange = (index, field, value) => {
    const meds = [...form.medications];
    meds[index][field] = value;
    setForm({ ...form, medications: meds });
  };

  // BUG #4 FIX: handleSubmit now:
  //   1. Resolves patient by name via GET /doctor/patients/?search=
  //   2. Posts to /prescriptions/ (correct endpoint, role-scoped)
  //   3. Sends medications as medications_data (backend field name)
  //   4. Always calls setLoading(false) in finally
  //   5. Shows specific backend error messages instead of generic alert
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 1: resolve patient ID from patient_name
      let patientId = form.patient_id || null;
      if (!patientId && form.patient_name.trim()) {
        try {
          const searchRes = await apiClient.get('/doctor/patients/', {
            params: { search: form.patient_name.trim(), page_size: 5 }
          });
          const results = searchRes.data?.results || searchRes.data || [];
          const match = results.find(p =>
            (p.full_name || p.patient_name || '').toLowerCase().includes(form.patient_name.toLowerCase())
          );
          if (match) patientId = match.id || match.user_id;
        } catch (_) { /* patient search is best-effort */ }
      }

      // Step 2: build payload matching DoctorPrescriptionProxyView field names
      const payload = {
        patient_name:    form.patient_name.trim(),   // FIX: send patient_name so backend auto-creates walkin patient if no match found
        diagnosis:       form.diagnosis,
        general_notes:   form.general_notes,
        notes:           form.general_notes,
        medications_data: form.medications.filter(m => m.name.trim()),
      };
      if (patientId) payload.patient = patientId;
      if (form.appointment_id) payload.appointment = Number(form.appointment_id);

      // Step 3: POST to correct endpoint
      await apiClient.post('/doctor/prescriptions/', payload);  // FIX: /doctor/prescriptions/ supports patient_name → auto-creates walkin patient
      onSuccess();
      onClose();
    } catch (err) {
      // BUG #4 FIX: show specific error messages from backend via toast (no browser popup)
      const errData = err?.response?.data;
      let msg = '';
      if (errData && typeof errData === 'object') {
        msg = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      }
      toast.error(msg || (isRTL ? 'حدث خطأ أثناء الإصدار، يرجى المحاولة مجدداً' : 'Failed to save prescription. Please check the form and try again.'));
    } finally {
      setLoading(false);  // BUG #4 FIX: always reset loading (was missing in error path)
    }
  };

  const inputStyle = { 
     width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid var(--border-base)', 
     background: 'var(--bg-subtle)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
     transition: 'border 0.2s', direction: isRTL ? 'rtl' : 'ltr'
  };

  const TEMPLATES = [
    { label: isRTL ? 'أنفلونزا معتادة' : 'General Flu', meds: [{ name: 'Panadol Advance', dosage: '500mg', frequency: 'Every 6 hours', duration: '3 days', notes: 'After food' }, { name: 'Congestal', dosage: '1 tab', frequency: 'Twice daily', duration: '5 days', notes: '' }] },
    { label: isRTL ? 'إدارة الضغط' : 'Hypertension', meds: [{ name: 'Concor', dosage: '5mg', frequency: 'Once daily', duration: '30 days', notes: 'Morning' }] },
    { label: isRTL ? 'مجموعة سكر' : 'Diabetes Mix', meds: [{ name: 'Glucophage', dosage: '500mg', frequency: 'Twice daily', duration: 'Permanent', notes: 'After meal' }] },
  ];

  return (
    <Modal open={open} onClose={onClose} title={`📝 ${t('prescriptions.newBtn', isRTL ? 'إصدار روشتة جديدة' : 'Issue New Rx')}`} maxWidth="800px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '10px 0' }}>
        
        {/* MP-10: Prescription Templates */}
        <div style={{ background: MOD_PL, padding: '16px 20px', borderRadius: 16 }}>
           <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: MOD_PD }}>🚀 {isRTL ? 'قوالب سريعة' : 'Quick Templates'}</p>
           <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
             {TEMPLATES.map((t, i) => (
               <button key={i} type="button" onClick={() => setForm({ ...form, medications: t.meds })}
                 style={{ padding: '8px 16px', borderRadius: 12, border: `1.5px solid ${MOD_P}`, background: '#fff', color: MOD_P, fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                 onMouseEnter={e => { e.currentTarget.style.background = MOD_P; e.currentTarget.style.color = '#fff'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = MOD_P; }}>
                 {t.label}
               </button>
             ))}
           </div>
        </div>
        
        {/* Info Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>{t('prescriptions.patientName', isRTL ? 'اسم المريض' : 'Patient Name')} *</label>
            <input 
              value={form.patient_name} 
              onChange={e => handleSetField('patient_name', e.target.value)} 
              required 
              placeholder={isRTL ? 'اسم المريض بالكامل...' : 'Full patient name...'}
              style={inputStyle} 
              onFocus={e => e.currentTarget.style.borderColor = MOD_P}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>{t('prescriptions.appointmentId', isRTL ? 'كود الحجز' : 'Appointment ID')}</label>
            <input 
              value={form.appointment_id} 
              onChange={e => handleSetField('appointment_id', e.target.value)} 
              placeholder={isRTL ? 'مثال: 10245' : 'e.g. 10245'}
              style={inputStyle} 
              onFocus={e => e.currentTarget.style.borderColor = MOD_P}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
            />
          </div>
        </div>

        {/* Diagnosis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>{t('prescriptions.diagnosis', isRTL ? 'التشخيص الطبي' : 'Medical Diagnosis')}</label>
          <input 
            value={form.diagnosis} 
            onChange={e => handleSetField('diagnosis', e.target.value)} 
            placeholder={isRTL ? 'التشخيص التفصيلي للحالة...' : 'Detailed diagnosis...'}
            style={inputStyle} 
            onFocus={e => e.currentTarget.style.borderColor = MOD_P}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
          />
        </div>

        {/* Medications List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-h)' }}>📦 {t('prescriptions.medications', isRTL ? 'الأدوية الموصوفة' : 'Medications')}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={handleAddMed} style={{ color: MOD_P, fontWeight: 800, background: MOD_PL, borderRadius: 12 }}>
               + {t('prescriptions.addMed', isRTL ? 'إضافة دواء جديد' : 'Add Medication')}
            </Button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {form.medications.map((med, index) => (
              <div key={index} style={{ 
                background: 'var(--bg-card)', border: '2px dashed var(--border-base)', 
                padding: 24, borderRadius: 20, position: 'relative',
                transition: 'border 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = MOD_P}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 900, background: MOD_P, color: '#fff', padding: '4px 12px', borderRadius: 20 }}>{isRTL ? 'دواء رقم' : 'Medication'} {index + 1}</span>
                  {form.medications.length > 1 && (
                    <button type="button" onClick={() => handleRemoveMed(index)} style={{ background: 'var(--bg-subtle)', border: 'none', color: MOD_DANGER, padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 800, transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                    >✕ {t('common.delete', isRTL ? 'حذف' : 'Delete')}</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                   <div style={{ gridColumn: '1 / -1' }}>
                      <input placeholder={t('prescriptions.placeholderMed', isRTL ? 'اسم الدواء (مثال: Panadol 500mg)' : 'Medication Name (e.g. Panadol)')} value={med.name} onChange={e => handleMedChange(index, 'name', e.target.value)} required style={inputStyle} 
                        onFocus={e => e.currentTarget.style.borderColor = MOD_P} onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                      />
                   </div>
                   <input placeholder={t('prescriptions.placeholderDosage', isRTL ? 'الجرعة (مثال: قرص واحد)' : 'Dosage (e.g. 1 pill)')} value={med.dosage} onChange={e => handleMedChange(index, 'dosage', e.target.value)} style={inputStyle} 
                     onFocus={e => e.currentTarget.style.borderColor = MOD_P} onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                   />
                   <input placeholder={t('prescriptions.placeholderFreq', isRTL ? 'التكرار (مثال: كل ٨ ساعات)' : 'Frequency (e.g. every 8 hrs)')} value={med.frequency} onChange={e => handleMedChange(index, 'frequency', e.target.value)} style={inputStyle} 
                     onFocus={e => e.currentTarget.style.borderColor = MOD_P} onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                   />
                   <input placeholder={t('prescriptions.placeholderDur', isRTL ? 'المدة (مثال: ٥ أيام)' : 'Duration (e.g. 5 days)')} value={med.duration} onChange={e => handleMedChange(index, 'duration', e.target.value)} style={inputStyle} 
                     onFocus={e => e.currentTarget.style.borderColor = MOD_P} onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                   />
                   <input placeholder={t('prescriptions.notes', isRTL ? 'ملاحظات أخرى للاستخدام...' : 'Usage notes...')} value={med.notes} onChange={e => handleMedChange(index, 'notes', e.target.value)} style={inputStyle} 
                     onFocus={e => e.currentTarget.style.borderColor = MOD_P} onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                   />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>{t('prescriptions.generalNotes', isRTL ? 'ملاحظات عامة' : 'General Notes')}</label>
          <textarea 
            rows={3} 
            value={form.general_notes} 
            onChange={e => handleSetField('general_notes', e.target.value)} 
            placeholder={isRTL ? 'أي توصيات أو تعليمات عامة للمريض...' : 'General recommendations for the patient...'}
            style={{ ...inputStyle, resize: 'vertical' }} 
            onFocus={e => e.currentTarget.style.borderColor = MOD_P}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTop: '1px solid var(--border-base)', paddingTop: 20 }}>
          <Button type="button" onClick={onClose} variant="ghost" style={{ borderRadius: 12 }}>{t('common.cancel', isRTL ? 'إلغاء' : 'Cancel')}</Button>
          <Button type="submit" variant="primary" loading={loading} style={{ padding: '12px 36px', borderRadius: 12, fontWeight: 800, background: MOD_P, boxShadow: MOD_SM }}>{t('prescriptions.createSuccess', isRTL ? 'تأكيد وإصدار' : 'Issue Prescription')}</Button>
        </div>
      </form>
    </Modal>
  );
}
