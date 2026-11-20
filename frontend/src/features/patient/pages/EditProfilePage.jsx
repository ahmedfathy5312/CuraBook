/**
 * EditProfilePage.jsx — Sprint 3 i18n
 * All strings via useTranslation()
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { usePatientProfile, useUpdatePatientProfile } from '../hooks/usePatientProfile';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Skeleton from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';

function Field({ label, name, type = 'text', value, onChange, error, placeholder, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)' }}>
        {label}{required && <span style={{ color: '#E97D61' }}> *</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder || label}
        autoComplete={type === 'password' ? 'new-password' : name}
        style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', fontSize: '14px', border: error ? '1.5px solid #E97D61' : '1.5px solid var(--border-base)', outline: 'none', transition: 'border 0.2s', background: 'var(--bg-card)', fontFamily: 'inherit' }}
        onFocus={e => !error && (e.target.style.border = '1.5px solid #1B5E8A')}
        onBlur={e => !error && (e.target.style.border = '1.5px solid var(--border-base)')}
      />
      {error && <p style={{ margin: 0, fontSize: '12px', color: '#E97D61' }}>{error}</p>}
    </div>
  );
}

const EGYPT_CITIES = [
  'Cairo','Alexandria','Giza','Assuit','Luxor','Aswan',
  'Port Said','Suez','Mansoura','Tanta','Zagazig',
  'Ismailia','Fayoum','Minya','Sohag',
];

export default function EditProfilePage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { t, isRTL } = useTranslation();
  // FIX Bug#2: Check auth state before API call — prevents crash if user isn't logged in
  const { user } = useAuth?.() || {};
  const { data: profile, isLoading, isError, error: profileError, refetch } = usePatientProfile();
  const updateMutation = useUpdatePatientProfile();
  const fileInputRef   = useRef(null);

  // FIX Bug#2: Define is404 BEFORE useEffect to avoid ReferenceError (temporal dead zone).
  // Previously is404 was declared after the loading-guard return, causing a crash whenever
  // the component re-rendered with isLoading=false because the hook ran before the variable existed.
  const is404 = [403, 404].includes(profileError?.response?.status) || [403, 404].includes(profileError?.status);

  const [form, setForm] = useState({
    full_name: '', age: '', phone: '', city: '',
    username: '', email: '',
    old_password: '', new_password: '', confirm_password: '',
  });
  const [errors, setErrors]           = useState({});
  const [showPass, setShowPass]       = useState(false);
  const [avatarPreview, setAvatarPreview]     = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('editProfile.errors.imageSize')); return; }
    if (!file.type.startsWith('image/')) { toast.error(t('editProfile.errors.imageType')); return; }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_image', file);
      await apiClient.patch(API.USERS.ME, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refetch();
      toast.success(t('editProfile.success.photoUpdated'));
    } catch {
      toast.error(t('editProfile.errors.uploadFail'));
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    // FIX Bug#11: profile loaded from server -> use it.
    // if 404 (new patient, no profile record yet) -> pre-fill from auth user data
    if (profile) {
      setForm(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        age:       profile.age || '',
        phone:     profile.phone || '',
        city:      profile.city || '',
        username:  profile.username || '',
        email:     profile.email || '',
      }));
    } else if (is404 && user) {
      setForm(prev => ({
        ...prev,
        full_name: user.full_name || user.name || '',
        email:     user.email || '',
        username:  user.username || '',
      }));
    }
  }, [profile, is404, user]);

  const validators = {
    full_name: v => !v.trim() ? t('editProfile.errors.nameRequired') : '',
    phone: v => {
      if (!v) return '';
      const clean = v.replace(/\D/g, '');
      if (clean && !/^(010|011|012|015)\d{8}$/.test(clean)) return t('editProfile.errors.phoneInvalid');
      return '';
    },
    email: v => {
      if (!v.trim()) return t('editProfile.errors.emailRequired');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t('editProfile.errors.emailInvalid');
      return '';
    },
    old_password: v => (v === '' ? '' : ''),
    new_password: v => {
      if (!v) return '';
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(v)) return t('editProfile.errors.passwordWeak');
      return '';
    },
    confirm_password: (v, f) => {
      if (!f.new_password) return '';
      if (v !== f.new_password) return t('editProfile.errors.passwordMismatch');
      return '';
    },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (validators[name]) {
      setErrors(prev => ({ ...prev, [name]: validators[name](value, { ...form, [name]: value }) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(validators).forEach(field => {
      const err = validators[field](form[field] || '', form);
      if (err) newErrors[field] = err;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload = { full_name: form.full_name, phone: form.phone, city: form.city, username: form.username, email: form.email };
    if (form.age) payload.age = Number(form.age);

    try {
      await updateMutation.mutateAsync(payload);

      if (form.new_password) {
        if (!form.old_password) {
          setErrors(prev => ({ ...prev, old_password: t('editProfile.errors.passwordRequiredForNew') }));
          return;
        }
        await apiClient.post(API.USERS.CHANGE_PASSWORD, { old_password: form.old_password, new_password: form.new_password });
        toast.success(t('editProfile.success.passwordChanged'));
      }

      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || '';
      if (detail.toLowerCase().includes('password')) {
        setErrors(prev => ({ ...prev, old_password: t('editProfile.errors.passwordIncorrect') }));
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px' }}>
        <Skeleton.Card />
        <div style={{ marginTop: 16 }}><Skeleton.Card /></div>
      </div>
    );
  }

  // FIX Bug#2: Inline error UI — show retry button instead of crashing to ErrorBoundary.
  // FIX Bug#11: Treat 404/403 as "profile not yet created" — show empty editable form.
  if (isError && !is404) {
    const errMsg =
      profileError?.response?.data?.detail ||
      profileError?.errorDetail ||
      profileError?.message ||
      null;
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: 'var(--text-h)', fontFamily: "'Cairo', sans-serif", marginBottom: 12 }}>
          {t('editProfile.loadError') || 'تعذّر تحميل بيانات الملف الشخصي'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: errMsg ? 8 : 24, fontSize: 14 }}>
          {t('editProfile.loadErrorHint') || 'حاول مرة أخرى أو تحديث الصفحة'}
        </p>
        {errMsg && (
          <p style={{ color: '#E97D61', fontSize: 12, marginBottom: 24, fontFamily: 'monospace', background: 'var(--bg-page)', padding: '8px 14px', borderRadius: 8 }}>
            {errMsg}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => refetch()}
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)', padding: '10px 24px',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t('common.retry') || 'إعادة المحاولة'}
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent', color: 'var(--text-muted)', border: '1.5px solid var(--border-base)',
              borderRadius: 'var(--radius-md)', padding: '10px 24px',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t('common.back') || 'رجوع'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--border-base)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-h)' }}>{t('editProfile.title')}</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('editProfile.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Avatar upload */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {avatarPreview || profile?.profile_image ? (
              <img src={avatarPreview || profile?.profile_image} alt={t('editProfile.title')}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #E6F1FB' }} />
            ) : (
              <Avatar name={form.full_name || profile?.username} size="xl" />
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff', cursor: avatarUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff' }}>
              {avatarUploading ? '…' : '📷'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-h)', fontSize: '16px' }}>{form.full_name || t('editProfile.title')}</p>
            <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: '13px' }}>{form.email}</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              style={{ background: 'none', border: '1.5px solid #1B5E8A', borderRadius: 'var(--radius-md)', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {avatarUploading ? t('editProfile.uploading') : t('editProfile.changePhoto')}
            </button>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>{t('editProfile.personalSection')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={t('editProfile.fields.fullName')} name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
            </div>
            <Field label={t('editProfile.fields.username')} name="username" value={form.username} onChange={handleChange} error={errors.username} required />
            <Field label={t('editProfile.fields.email')}    name="email"    type="email" value={form.email} onChange={handleChange} error={errors.email} required />
            <Field label={t('editProfile.fields.phone')}    name="phone"    type="tel"  value={form.phone} onChange={handleChange} error={errors.phone} placeholder={t('editProfile.placeholders.phone')} />
            <Field label={t('editProfile.fields.age')}      name="age"      type="number" value={form.age} onChange={handleChange} error={errors.age} placeholder={t('editProfile.placeholders.age')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)' }}>{t('editProfile.fields.city')}</label>
              <select name="city" value={form.city} onChange={handleChange}
                style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', fontSize: '14px', border: '1.5px solid var(--border-base)', outline: 'none', background: 'var(--bg-card)', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="">{t('editProfile.placeholders.cityDefault')}</option>
                {EGYPT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)', marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>{t('editProfile.passwordSection')}</h3>
          <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--text-hint)' }}>{t('editProfile.passwordHint')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Field
                label={t('editProfile.fields.newPassword')}
                name="new_password"
                type={showPass ? 'text' : 'password'}
                value={form.new_password}
                onChange={handleChange}
                error={errors.new_password}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '12px', bottom: errors.new_password ? '26px' : '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            <Field
              label={t('editProfile.fields.confirmPassword')}
              name="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
            />
          </div>
          {errors.old_password && (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#E97D61' }}>{errors.old_password}</p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => navigate('/dashboard')} type="button">
            {t('editProfile.cancel')}
          </Button>
          <Button variant="primary" type="submit" loading={updateMutation.isPending}>
            {t('editProfile.saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  );
}
