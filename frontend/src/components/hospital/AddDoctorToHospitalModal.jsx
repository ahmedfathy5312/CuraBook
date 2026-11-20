import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { API } from '../../constants/apiRoutes';

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid var(--border-base)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-card)',
  color: 'var(--text-h)',
  fontFamily: 'inherit',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
};

function Field({ label, error, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-body)' }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
      {error && <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 700 }}>{error}</span>}
    </div>
  );
}

export default function AddDoctorToHospitalModal({ language = 'ar', onSuccess, onClose }) {
  const isAr = language === 'ar';
  const [mode, setMode] = useState('create');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: '',
    profile_image: '',
    specialty: '',
    job_title: '',
    experience_years: '',
    bio: '',
    is_active: true,
  });

  const txt = {
    title: isAr ? 'إضافة طبيب للمستشفى' : 'Add Doctor to Hospital',
    create: isAr ? 'إنشاء طبيب جديد' : 'Create New Doctor',
    link: isAr ? 'ربط طبيب موجود' : 'Link Existing Doctor',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    save: isAr ? 'حفظ الطبيب' : 'Save Doctor',
    saving: isAr ? 'جاري الحفظ...' : 'Saving...',
    search: isAr ? 'بحث' : 'Search',
    noResults: isAr ? 'لا توجد نتائج مطابقة' : 'No matching results',
    linkBtn: isAr ? 'ربط الطبيب بالمستشفى' : 'Link Doctor',
    personal: isAr ? 'البيانات الشخصية' : 'Personal Information',
    professional: isAr ? 'البيانات المهنية' : 'Professional Information',
    status: isAr ? 'الحالة' : 'Status',
  };

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const fieldError = (key) => {
    const value = errors[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const validate = () => {
    const next = {};
    if (!form.first_name.trim()) next.first_name = isAr ? 'الاسم الأول مطلوب' : 'First name is required';
    if (!form.last_name.trim()) next.last_name = isAr ? 'الاسم الأخير مطلوب' : 'Last name is required';
    if (!form.phone.trim()) next.phone = isAr ? 'رقم الهاتف مطلوب' : 'Phone is required';
    if (!form.email.trim()) next.email = isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = isAr ? 'البريد الإلكتروني غير صحيح' : 'Invalid email';
    if (!form.specialty.trim()) next.specialty = isAr ? 'التخصص مطلوب' : 'Specialty is required';
    if (form.experience_years !== '' && Number(form.experience_years) < 0) next.experience_years = isAr ? 'سنوات الخبرة غير صحيحة' : 'Invalid years';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        create_new: true,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        experience_years: form.experience_years === '' ? undefined : Number(form.experience_years),
      };
      await apiClient.post(API.HOSPITAL.DOCTORS, payload);
      onSuccess?.();
    } catch (err) {
      const data = err?.response?.data || {};
      const fieldErrors = data.errors || {};
      setErrors(fieldErrors);
      setError(data.detail || (isAr ? 'فشل حفظ الطبيب. راجع البيانات وحاول مرة أخرى.' : 'Failed to save doctor.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    setResults([]);
    setSelectedDoctor(null);
    try {
      const { data } = await apiClient.get(API.SEARCH.DOCTORS, { params: { q: query.trim() } });
      setResults(Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []));
    } catch {
      setError(isAr ? 'تعذر البحث عن الأطباء.' : 'Could not search doctors.');
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!selectedDoctor) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post(API.HOSPITAL.DOCTORS, {
        doctor_id: selectedDoctor.user_id || selectedDoctor.id,
        email: selectedDoctor.email,
      });
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.detail || (isAr ? 'فشل ربط الطبيب بالمستشفى.' : 'Failed to link doctor.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ width: '100%', maxWidth: 720, maxHeight: '92vh', overflow: 'auto', background: 'var(--bg-card)', color: 'var(--text-h)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>🔎 {txt.title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              ['create', txt.create],
              ['link', txt.link],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setMode(key); setError(''); setErrors({}); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${mode === key ? 'var(--primary)' : 'var(--border-base)'}`,
                  background: mode === key ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: mode === key ? '#fff' : 'var(--text-body)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 13, fontWeight: 800 }}>
              {error}
            </div>
          )}

          {mode === 'create' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--primary)' }}>{txt.personal}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                <Field label={isAr ? 'الاسم الأول' : 'First Name'} required error={fieldError('first_name')}><input style={fieldStyle} value={form.first_name} onChange={set('first_name')} /></Field>
                <Field label={isAr ? 'الاسم الأخير' : 'Last Name'} required error={fieldError('last_name')}><input style={fieldStyle} value={form.last_name} onChange={set('last_name')} /></Field>
                <Field label={isAr ? 'رقم الهاتف' : 'Phone'} required error={fieldError('phone')}><input style={fieldStyle} value={form.phone} onChange={set('phone')} /></Field>
                <Field label={isAr ? 'البريد الإلكتروني' : 'Email'} required error={fieldError('email')}><input style={fieldStyle} type="email" value={form.email} onChange={set('email')} /></Field>
                <Field label={isAr ? 'النوع' : 'Gender'}><select style={fieldStyle} value={form.gender} onChange={set('gender')}><option value="">{isAr ? 'اختر النوع' : 'Select gender'}</option><option value="male">{isAr ? 'ذكر' : 'Male'}</option><option value="female">{isAr ? 'أنثى' : 'Female'}</option></select></Field>
                <Field label={isAr ? 'رابط صورة الطبيب' : 'Doctor Image URL'}><input style={fieldStyle} value={form.profile_image} onChange={set('profile_image')} placeholder="https://..." /></Field>
              </div>

              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--primary)' }}>{txt.professional}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                <Field label={isAr ? 'التخصص الطبي' : 'Medical Specialty'} required error={fieldError('specialty')}><input style={fieldStyle} value={form.specialty} onChange={set('specialty')} /></Field>
                <Field label={isAr ? 'الدرجة الوظيفية' : 'Job Title'}><input style={fieldStyle} value={form.job_title} onChange={set('job_title')} /></Field>
                <Field label={isAr ? 'سنوات الخبرة' : 'Years of Experience'} error={fieldError('experience_years')}><input style={fieldStyle} type="number" min="0" value={form.experience_years} onChange={set('experience_years')} /></Field>
                <Field label={txt.status}><select style={fieldStyle} value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}><option value="active">{isAr ? 'نشط' : 'Active'}</option><option value="inactive">{isAr ? 'غير نشط' : 'Inactive'}</option></select></Field>
              </div>
              <Field label={isAr ? 'نبذة تعريفية عن الطبيب' : 'Doctor Bio'}><textarea style={{ ...fieldStyle, minHeight: 90, resize: 'vertical' }} value={form.bio} onChange={set('bio')} /></Field>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={fieldStyle}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={isAr ? 'ابحث بالاسم أو البريد أو التخصص' : 'Search by name, email, or specialty'}
                />
                <button onClick={handleSearch} disabled={searching || !query.trim()} style={{ padding: '0 20px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  {searching ? '...' : txt.search}
                </button>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {query && !searching && results.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-hint)', padding: 24 }}>{txt.noResults}</div>}
                {results.map((doctor) => {
                  const selected = selectedDoctor?.id === doctor.id;
                  return (
                    <button
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor)}
                      style={{ textAlign: isAr ? 'right' : 'left', padding: 12, borderRadius: 'var(--radius-md)', border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border-base)'}`, background: selected ? 'rgba(34,211,238,.12)' : 'var(--bg-subtle)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{doctor.full_name || doctor.name || doctor.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doctor.email} {doctor.specialty ? `- ${doctor.specialty}` : ''}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'var(--bg-subtle)' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', color: 'var(--text-body)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{txt.cancel}</button>
          <button
            onClick={mode === 'create' ? handleCreate : handleLink}
            disabled={saving || (mode === 'link' && !selectedDoctor)}
            style={{ padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? txt.saving : mode === 'create' ? txt.save : txt.linkBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
