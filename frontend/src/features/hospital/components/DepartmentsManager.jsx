/**
 * DepartmentsManager.jsx — Hospital Department Management Widget
 * Fixed: auto-assigns hospital from backend session, removed head_doctor_email field
 * MISS-06 FIX: Added doctor assignment panel — assign/unassign doctors to departments
 */
import { useState } from 'react';
import {
  useHospitalDepartments, useCreateDepartment, useDeleteDepartment,
  useAssignDoctorToDepartment, useHospitalDoctors,
} from '../hooks/useHospitalData';
import Button from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import { useTranslation } from '../../../i18n/useTranslation';

const DEPT_ICONS = {
  'cardiology': '❤️', 'neurology': '🧠', 'orthopedics': '🦴',
  'pediatrics': '👶', 'dermatology': '🩺', 'oncology': '🎗',
  'radiology': '📡', 'surgery': '🔪', 'ent': '👂',
  'internal': '🩻', 'default': '🏥',
};

function getDeptIcon(name = '') {
  const key = name.toLowerCase();
  return DEPT_ICONS[Object.keys(DEPT_ICONS).find(k => key.includes(k))] || DEPT_ICONS.default;
}

const EMPTY_FORM = { name: '', description: '' };
const P = 'var(--primary)';

export default function DepartmentsManager() {
  const { t } = useTranslation();
  const [showAdd, setShowAdd]             = useState(false);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [formError, setFormError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assignDept, setAssignDept]       = useState(null);
  const [assignSearch, setAssignSearch]   = useState('');

  const { data, isLoading }     = useHospitalDepartments(true);
  const { data: doctorsData }   = useHospitalDoctors({});
  const createMutation          = useCreateDepartment();
  const deleteMutation          = useDeleteDepartment();
  const assignMutation          = useAssignDoctorToDepartment();

  const departments = data?.results || data || [];
  const allDoctors  = doctorsData?.results || doctorsData || [];

  const handleCreate = () => {
    if (!form.name.trim()) { setFormError(t('departments.nameRequired')); return; }
    setFormError('');
    createMutation.mutate(
      { name: form.name.trim(), description: form.description.trim() },
      {
        onSuccess: () => { setShowAdd(false); setForm(EMPTY_FORM); setFormError(''); },
        onError: (err) => {
          setFormError(
            err?.response?.data?.name?.[0] || err?.response?.data?.detail ||
            err?.response?.data?.non_field_errors?.[0] || 'Failed to create department. Please try again.'
          );
        },
      }
    );
  };

  const handleAssign = (doctor) => {
    if (!assignDept) return;
    const alreadyAssigned = doctor.department === assignDept.id;
    assignMutation.mutate({ doctorId: doctor.id, departmentId: alreadyAssigned ? null : assignDept.id });
  };

  const filteredDoctors = allDoctors.filter(d => {
    const name = (d.full_name || d.user?.full_name || d.name || '').toLowerCase();
    return name.includes(assignSearch.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px', background: P, color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', padding: '9px 18px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: 'var(--shadow-md)', transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--primary-dark)'}
          onMouseOut={e => e.currentTarget.style.background = P}
        >
          + {t('departments.addDept')}
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} height={120} borderRadius={16} />)}
        </div>
      ) : departments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-hint)' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏛</div>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-body)' }}>{t('departments.empty')}</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{t('departments.emptyHint')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {departments.map(dept => (
            <div key={dept.id} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
              boxShadow: 'var(--shadow-sm)', position: 'relative',
              borderTop: `3px solid ${P}`,
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{getDeptIcon(dept.name)}</div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px', color: 'var(--text-h)' }}>{dept.name}</p>
              {dept.description && (
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-hint)', lineHeight: '1.5' }}>{dept.description}</p>
              )}
              {dept.doctors_count != null && (
                <span style={{ fontSize: '11px', background: 'var(--primary-pale,#E6F1FB)', color: P, borderRadius: 'var(--radius-lg)', padding: '2px 10px', fontWeight: 600 }}>
                  {dept.doctors_count} {t('departments.doctorsCount', { count: dept.doctors_count })}
                </span>
              )}
              <button
                onClick={() => { setAssignDept({ id: dept.id, name: dept.name }); setAssignSearch(''); }}
                style={{
                  display: 'block', marginTop: '12px', width: '100%', padding: '7px 0',
                  background: 'var(--primary-pale,#E6F1FB)', color: P, border: `1px solid var(--primary-light,#B8D9EF)`,
                  borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = P; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'var(--primary-pale,#E6F1FB)'; e.currentTarget.style.color = P; }}
              >
                👥 {t('departments.assignDoctors')}
              </button>
              <button
                onClick={() => setConfirmDelete(dept)}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-hint,#D1D5DB)', padding: '4px' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--danger,#EF4444)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-hint,#D1D5DB)'}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Department Modal ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); setFormError(''); }} title={t('departments.addNewTitle')}
        footer={<><Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>{t('departments.cancel')}</Button><Button variant="primary" size="sm" loading={createMutation.isPending} onClick={handleCreate}>{t('departments.create')}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('departments.createHint')}</p>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-body)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('departments.nameLabel')} <span style={{ color: 'var(--danger,#EF4444)' }}>*</span>
            </label>
            <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(''); }}
              placeholder={t('departments.namePlaceholder')} onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${formError && !form.name.trim() ? 'var(--danger,#EF4444)' : 'var(--border)'}`, fontSize: '14px', outline: 'none', fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-body)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('departments.descLabel')} <span style={{ color: 'var(--text-hint)', fontWeight: 500, textTransform: 'none', fontSize: '11px' }}>({t('departments.optional')})</span>
            </label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('departments.descPlaceholder')} rows={3}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)', fontSize: '14px', outline: 'none', fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          {formError && <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)', fontWeight: 500 }}>⚠️ {formError}</div>}
        </div>
      </Modal>

      {/* ── MISS-06: Assign Doctors Modal ── */}
      <Modal open={!!assignDept} onClose={() => setAssignDept(null)} title={`${t('departments.assignDoctorsTitle')} — ${assignDept?.name || ''}`}
        footer={<Button variant="ghost" size="sm" onClick={() => setAssignDept(null)}>{t('departments.done')}</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('departments.assignHint')}</p>
          <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder={t('departments.searchDoctors')}
            style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)', fontSize: '13px', outline: 'none', fontFamily: "'Cairo', sans-serif" }}
            onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredDoctors.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-hint)', fontSize: '13px', padding: '20px 0' }}>{t('departments.noDoctors')}</p>
            ) : filteredDoctors.map(doctor => {
              const inThisDept = doctor.department === assignDept?.id;
              const name = doctor.full_name || doctor.user?.full_name || doctor.name || `Doctor #${doctor.id}`;
              const spec = doctor.specialty || doctor.specialization || '';
              return (
                <div key={doctor.id} onClick={() => handleAssign(doctor)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: `1.5px solid ${inThisDept ? P : 'var(--border)'}`,
                  background: inThisDept ? 'var(--primary-pale,#E6F1FB)' : 'var(--bg-card)', transition: 'all 0.15s',
                }}
                  onMouseOver={e => { if (!inThisDept) e.currentTarget.style.background = 'var(--bg-page)'; }}
                  onMouseOut={e => { if (!inThisDept) e.currentTarget.style.background = 'var(--bg-card)'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: inThisDept ? P : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, color: inThisDept ? '#fff' : 'var(--text-muted)' }}>
                    👨‍⚕️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--text-h)' }}>{name}</p>
                    {spec && <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{spec}</p>}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-lg)', background: inThisDept ? P : 'var(--border-base)', color: inThisDept ? '#fff' : 'var(--text-muted)' }}>
                    {inThisDept ? t('departments.assigned') : t('departments.assign')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete Modal ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('departments.deleteTitle')}
        footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>{t('departments.cancel')}</Button><Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirmDelete?.id, { onSuccess: () => setConfirmDelete(null) })}>{t('departments.delete')}</Button></>}
      >
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          {t('departments.deleteConfirm', { name: confirmDelete?.name })}
        </p>
      </Modal>
    </div>
  );
}
