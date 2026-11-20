/**
 * ProfileTab.jsx — Personal information tab
 * Fixes applied:
 *  - isDirty: Save button disabled until data is changed
 *  - first_name + last_name: Two separate fields per spec (PDF p.10)
 *  - Phone with country code selector (no external lib needed)
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useTranslation } from '../../../i18n/useTranslation';
import Skeleton from '../../../components/ui/Skeleton';
import { Camera, User, Mail, Phone, MapPin, Save, ChevronRight } from 'lucide-react';
import {
  FieldInput, SectionCard, Avatar, PrimaryBtn, COLORS, PageHeader,
} from '../components/AssistantUI';

/* ── API helpers ── */
const getProfile   = () => apiClient.get(API.USERS.ME).then(r => r.data);
const patchProfile = (p) => apiClient.patch(API.USERS.ME, p).then(r => r.data);
const uploadImage  = (file) => {
  const form = new FormData();
  form.append('profile_image', file);
  return apiClient.patch(API.USERS.ME, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

/* ── Country code selector ────────────────────────────────────────────── */
const COUNTRY_CODES = [
  { code: '+20',  flag: '🇪🇬', name: 'مصر' },
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+1',   flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44',  flag: '🇬🇧', name: 'بريطانيا' },
];

function PhoneInput({ countryCode, onCountryChange, phone, onPhoneChange, error }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
        رقم الهاتف
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={countryCode}
          onChange={e => onCountryChange(e.target.value)}
          style={{
            padding: '9px 8px', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${error ? '#dc2626' : 'var(--border-base)'}`,
            fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
            background: '#fff', color: 'var(--text-body)', cursor: 'pointer',
            flexShrink: 0, width: 100,
          }}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <input
          type="tel"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          placeholder="01xxxxxxxxx"
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${error ? '#dc2626' : 'var(--border-base)'}`,
            fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
            background: '#fff', color: 'var(--text-body)',
          }}
        />
      </div>
      {error && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

/* ── Helpers ── */
function parsePhone(raw) {
  if (!raw) return { code: '+20', number: '' };
  const found = COUNTRY_CODES.find(c => raw.startsWith(c.code));
  if (found) return { code: found.code, number: raw.slice(found.code.length).trim() };
  return { code: '+20', number: raw };
}

const EMPTY_FORM = { first_name: '', last_name: '', email: '', phone_code: '+20', phone: '', address: '', bio: '' };

export default function ProfileTab({ onBack }) {
  const { t } = useTranslation();
  const { user: authUser, updateUser } = useAuth();
  const toast = useToast();
  const qc    = useQueryClient();
  const fileRef = useRef();

  const [form, setForm]         = useState(EMPTY_FORM);
  const [origForm, setOrigForm] = useState(EMPTY_FORM); // snapshot to track isDirty
  const [errors, setErrors]     = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['assistant', 'profile'],
    queryFn: getProfile,
    onSuccess: (d) => {
      const { code, number } = parsePhone(d.phone || d.phone_number || '');
      const initial = {
        first_name: d.first_name || (d.full_name || d.name || '').split(' ')[0] || '',
        last_name:  d.last_name  || (d.full_name || d.name || '').split(' ').slice(1).join(' ') || '',
        email:      d.email      || '',
        phone_code: code,
        phone:      number,
        address:    d.address    || '',
        bio:        d.bio        || '',
      };
      setForm(initial);
      setOrigForm(initial);
    },
  });

  // Sync if authUser changes (after save)
  useEffect(() => {
    if (authUser && !profile) {
      const { code, number } = parsePhone(authUser.phone || authUser.phone_number || '');
      const initial = {
        first_name: authUser.first_name || '',
        last_name:  authUser.last_name  || '',
        email:      authUser.email      || '',
        phone_code: code,
        phone:      number,
        address:    authUser.address    || '',
        bio:        authUser.bio        || '',
      };
      setForm(initial);
      setOrigForm(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  /* isDirty: true if any field differs from original snapshot */
  const isDirty = JSON.stringify(form) !== JSON.stringify(origForm);

  const updateMutation = useMutation({
    mutationFn: patchProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'profile'] });
      setOrigForm({ ...form }); // reset dirty state
      toast.success(t('assistantProfilePage.profile.successMsg'));
    },
    onError: (e) => toast.error(e?.errorDetail || t('assistantProfilePage.profile.errorMsg')),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadImage,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['assistant', 'profile'] });
      const url = d.profile_image || null;
      setAvatarPreview(url);
      updateUser({ profile_image: url });
      toast.success(t('assistantProfilePage.profile.imageSuccess'));
    },
    onError: () => toast.error(t('assistantProfilePage.profile.imageError')),
  });

  const handleChange = (field) => (e) => {
    const value = typeof e === 'string' ? e : e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const handleSave = () => {
    const errs = {};
    if (!form.first_name?.trim()) errs.first_name = 'الاسم الأول مطلوب';
    if (!form.email?.trim())      errs.email       = t('assistantProfilePage.profile.errors.emailRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Strip leading zero from local number before combining with country code
    // e.g. +966 + 0501234567 → +966501234567 (correct), not +9660501234567 (wrong)
    const localPhone = form.phone.startsWith('0') ? form.phone.slice(1) : form.phone;
    const fullPhone  = localPhone ? `${form.phone_code}${localPhone}` : '';
    updateMutation.mutate({
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      phone:      fullPhone,
      address:    form.address,
      bio:        form.bio,
    });
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    uploadMutation.mutate(file);
  };

  const displayName = [form.first_name, form.last_name].filter(Boolean).join(' ')
    || profile?.full_name || authUser?.full_name || 'Assistant';
  const avatarSrc   = avatarPreview || profile?.profile_image || null;

  return (
    <>
      {/* Header banner */}
      <PageHeader>
        {onBack && (
          <button onClick={onBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 16,
            fontFamily: 'inherit',
          }}>
            <ChevronRight size={16} /> العودة للإعدادات
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.4)', overflow: 'hidden',
              background: 'rgba(255,255,255,0.18)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: '#fff',
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : displayName.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
              }
            </div>
            <button onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', bottom: 0, insetInlineEnd: 0,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--bg-card)', border: '2px solid #1B5E8A',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: COLORS.primary,
            }}>
              <Camera size={12} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px', color: '#fff', fontSize: 22, fontWeight: 800 }}>{displayName}</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              مساعد طبي · {form.email || profile?.email || authUser?.email || ''}
            </p>
          </div>
        </div>
      </PageHeader>

      {/* Form card */}
      <div style={{ maxWidth: 860, margin: '-44px auto 0', padding: '0 24px 40px', position: 'relative', zIndex: 5 }}>
        <SectionCard
          title={t('assistantProfilePage.profile.title')}
          subtitle={t('assistantProfilePage.profile.subtitle')}
          icon={<User size={18} />}
          action={
            <PrimaryBtn
              onClick={handleSave}
              loading={updateMutation.isPending}
              disabled={!isDirty || updateMutation.isPending}
              icon={<Save size={14} />}
              style={{ opacity: (!isDirty || updateMutation.isPending) ? 0.5 : 1 }}
            >
              {t('assistantProfilePage.profile.saveBtn')}
            </PrimaryBtn>
          }
        >
          {isLoading ? (
            <Skeleton.List count={4} />
          ) : (
            <>
              {/* Row 1: First Name + Last Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                    الاسم الأول <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', color: COLORS.muted }}>
                      <User size={15} />
                    </span>
                    <input
                      name="first_name" value={form.first_name}
                      onChange={handleChange('first_name')}
                      style={{
                        width: '100%', padding: '9px 36px 9px 12px', boxSizing: 'border-box',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${errors.first_name ? '#dc2626' : 'var(--border-base)'}`,
                        fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
                      }}
                    />
                  </div>
                  {errors.first_name && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{errors.first_name}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                    اسم العائلة
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', color: COLORS.muted }}>
                      <User size={15} />
                    </span>
                    <input
                      name="last_name" value={form.last_name}
                      onChange={handleChange('last_name')}
                      style={{
                        width: '100%', padding: '9px 36px 9px 12px', boxSizing: 'border-box',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid var(--border-base)`,
                        fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email + Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <FieldInput
                  label={t('assistantProfilePage.profile.email')}
                  name="email" type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  error={errors.email}
                  icon={<Mail size={15} />}
                  required
                />
                <FieldInput
                  label={t('assistantProfilePage.profile.address')}
                  name="address"
                  value={form.address}
                  onChange={handleChange('address')}
                  icon={<MapPin size={15} />}
                />
              </div>

              {/* Row 3: Phone with country code */}
              <div style={{ marginTop: 16 }}>
                <PhoneInput
                  countryCode={form.phone_code}
                  onCountryChange={handleChange('phone_code')}
                  phone={form.phone}
                  onPhoneChange={handleChange('phone')}
                  error={errors.phone}
                />
              </div>

              {/* Bio */}
              <div style={{ marginTop: 16 }}>
                <FieldInput
                  label={t('assistantProfilePage.profile.bio')}
                  name="bio" type="textarea"
                  value={form.bio}
                  onChange={handleChange('bio')}
                  placeholder={t('assistantProfilePage.profile.bioPlaceholder')}
                />
              </div>

              {profile?.workplaces?.length > 0 && (
                <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-page)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('assistantProfilePage.profile.workplaces')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profile.workplaces.map((wp, i) => (
                      <span key={i} style={{ background: COLORS.primaryL, color: COLORS.primary, borderRadius: 'var(--radius-md)', padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
                        🏥 {wp.name || wp.hospital_name || `Workplace #${wp.id}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </>
  );
}
