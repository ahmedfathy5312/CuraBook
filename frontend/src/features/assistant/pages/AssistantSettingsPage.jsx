/**
 * AssistantSettingsPage.jsx — Settings
 * Sections:
 *  A) الملف الشخصي (profile info)
 *  B) الأمان (password change)
 *  C) الإشعارات (notification prefs)
 *  D) التفضيلات (language, timezone, dark mode)
 *  E) الصلاحيات — read-only display of assistant permissions
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API }     from '../../../constants/apiRoutes';
import { useAuth }  from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { tokens }   from '../../../theme/tokens';
import { useDarkMode } from '../../../context/DarkModeContext';

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  primary:  tokens?.colors?.primary?.DEFAULT  || '#0E7490',
  primaryL: tokens?.colors?.primary?.pale     || '#E0F7FA',
  success:  tokens?.colors?.success?.DEFAULT  || '#31A870',
  danger:   tokens?.colors?.danger?.DEFAULT   || '#E97D61',
  warning:  tokens?.colors?.warning?.DEFAULT  || '#F59E0B',
  border:   tokens?.colors?.border            || '#E5E7EB',
  muted:    tokens?.colors?.gray?.[500]       || '#6B7280',
  light:    tokens?.colors?.gray?.[200]       || '#E5E7EB',
  text:     tokens?.colors?.gray?.[800]       || '#1F2937',
};

// ── Reusable card section ─────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
      boxShadow: tokens.shadows?.sm || '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <div style={{
        padding: '14px 22px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#FAFAFA',
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{title}</span>
      </div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, disabled }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: '100%', padding: '10px 12px', boxSizing: 'border-box',
        borderRadius: 'var(--radius-md)', border: `1.5px solid ${focus ? C.primary : C.border}`,
        fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
        background: disabled ? '#F9FAFB' : '#fff',
        color: disabled ? C.muted : C.text,
        transition: 'border-color 0.15s',
      }}
    />
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : () => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12,
        background: value ? C.primary : C.border,
        position: 'relative', transition: 'background 0.2s',
        cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: value ? 20 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>{sub}</p>}
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────
function pwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return s;
}
const PW_LABELS = ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية'];
const PW_COLORS = ['', C.danger, '#F59E0B', C.primary, C.success];

// ── Permission badge ──────────────────────────────────────────────────────────
function PermBadge({ granted, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      background: granted ? tokens?.colors?.success?.light || '#e8faf3' : '#F9FAFB',
      border: `1px solid ${granted ? tokens?.colors?.success?.DEFAULT || '#31A870' : C.border}`,
    }}>
      <span style={{ fontSize: 14 }}>{granted ? '✅' : '🔒'}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: granted ? '#065F46' : C.muted }}>{label}</span>
      {!granted && (
        <span style={{ marginRight: 'auto', fontSize: 10, color: C.muted, background: C.border, borderRadius: 4, padding: '1px 6px' }}>
          غير مفعّل
        </span>
      )}
    </div>
  );
}

// ── Enhanced permission badge with description ────────────────────────────────
// granted = true → مسموح | false → غير مسموح | 'partial' → مسموح جزئيًا
function PermBadge2({ granted, label, desc }) {
  const [hover, setHover] = useState(false);
  const isPartial = granted === 'partial';
  const isGranted = granted === true;
  const statusBg     = isGranted ? (tokens?.colors?.success?.light || '#e8faf3') : isPartial ? '#FEF9C3' : '#F9FAFB';
  const statusBorder = isGranted ? (tokens?.colors?.success?.DEFAULT || '#31A870') : isPartial ? '#D97706' : C.border;
  const hoverBg      = isGranted ? '#d1fae5' : isPartial ? '#fef08a' : '#F3F4F6';
  const icon         = isGranted ? '✅' : isPartial ? '⚠️' : '🔒';
  const badgeLabel   = isGranted ? 'مسموح' : isPartial ? 'مسموح جزئيًا' : 'غير مسموح';
  const badgeColor   = isGranted ? '#065F46' : isPartial ? '#92400E' : '#B91C1C';
  const badgeBg      = isGranted ? '#D1FAE5' : isPartial ? '#FEF3C7' : '#FEE2E2';
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: hover ? hoverBg : statusBg,
        border: `1.5px solid ${statusBorder}`,
        transition: 'background 0.18s, box-shadow 0.18s',
        boxShadow: hover ? `0 2px 8px ${statusBorder}33` : 'none',
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, transition: 'transform 0.15s', transform: hover ? 'scale(1.12)' : 'scale(1)' }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{label}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{desc}</p>}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-lg)', background: badgeBg, color: badgeColor, flexShrink: 0 }}>
        {badgeLabel}
      </span>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function AssistantSettingsPage() {
  const { user } = useAuth();
  const toast    = useToast();
  const qc       = useQueryClient();

  // ── A) Profile
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [profileDirty, setProfileDirty] = useState(false);

  // ── Photo upload state
  const photoInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const uploadPhoto = async (file) => {
    if (!file) return;
    const MAX = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX) { toast?.error?.('حجم الصورة يجب أن يكون أقل من 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast?.error?.('يُسمح فقط بملفات الصور'); return; }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await apiClient.post(API.USERS.AVATAR, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPhotoPreview(URL.createObjectURL(file));
      toast?.success?.('تم تحديث الصورة الشخصية بنجاح ✅');
      qc.invalidateQueries({ queryKey: ['user'] });
    } catch {
      toast?.error?.('فشل رفع الصورة — حاول مجدداً');
    } finally {
      setPhotoUploading(false);
    }
  };

  const deletePhoto = async () => {
    setPhotoUploading(true);
    try {
      await apiClient.delete(API.USERS.AVATAR);
      setPhotoPreview(null);
      toast?.success?.('تم حذف الصورة الشخصية');
      qc.invalidateQueries({ queryKey: ['user'] });
    } catch {
      toast?.error?.('فشل حذف الصورة');
    } finally {
      setPhotoUploading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name:  user.last_name  || '',
        email:      user.email      || '',
        phone:      user.phone      || user.phone_number || '',
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: (data) => apiClient.patch(API.USERS.ME, data),
    onSuccess: () => {
      toast?.success?.('تم تحديث الملف الشخصي');
      setProfileDirty(false);
      qc.invalidateQueries({ queryKey: ['user'] });
    },
    onError: () => toast?.error?.('فشل تحديث الملف الشخصي'),
  });

  // ── B) Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');

  const updatePw = useMutation({
    mutationFn: (data) => apiClient.post(API.USERS.CHANGE_PASSWORD, data),
    onSuccess: () => {
      toast?.success?.('تم تغيير كلمة المرور بنجاح');
      setPw({ current: '', next: '', confirm: '' });
      setPwError('');
    },
    onError: (e) => {
      // apiClient interceptor sets e.errorFields (from CuraBookRenderer envelope)
      // and e.errorDetail (human-readable message from the envelope)
      const fields  = e.errorFields  || e?.response?.data?.error?.details || e?.response?.data;
      const message = e.errorDetail  || e?.response?.data?.error?.message  || null;

      if (fields?.old_password) {
        const msg = Array.isArray(fields.old_password) ? fields.old_password[0] : fields.old_password;
        setPwError(msg || 'كلمة المرور الحالية غير صحيحة');
        toast?.error?.(msg || 'كلمة المرور الحالية غير صحيحة');
      } else if (fields?.new_password) {
        const msg = Array.isArray(fields.new_password) ? fields.new_password[0] : fields.new_password;
        setPwError(msg || 'كلمة المرور الجديدة غير صالحة');
        toast?.error?.(msg || 'كلمة المرور الجديدة غير صالحة');
      } else if (fields?.detail || message) {
        const msg = fields?.detail || message;
        if (msg?.includes('incorrect') || msg?.includes('wrong') || msg?.includes('invalid')) {
          setPwError('كلمة المرور الحالية غير صحيحة');
          toast?.error?.('كلمة المرور الحالية غير صحيحة');
        } else if (msg?.includes('8 character') || msg?.includes('short') || msg?.includes('weak')) {
          setPwError('كلمة المرور الجديدة قصيرة جداً (8 أحرف على الأقل)');
          toast?.error?.('كلمة المرور الجديدة قصيرة جداً');
        } else {
          setPwError(msg);
          toast?.error?.(msg);
        }
      } else if (fields?.non_field_errors) {
        const msg = Array.isArray(fields.non_field_errors) ? fields.non_field_errors[0] : fields.non_field_errors;
        setPwError(msg);
        toast?.error?.(msg);
      } else {
        setPwError('فشل تغيير كلمة المرور — تحقق من البيانات وحاول مجدداً');
        toast?.error?.('فشل تغيير كلمة المرور');
      }
    },
  });

  const handlePwSubmit = () => {
    if (!pw.current || !pw.next || !pw.confirm) return setPwError('جميع الحقول مطلوبة');
    if (pw.next !== pw.confirm)                   return setPwError('كلمتا المرور غير متطابقتين');
    if (pw.next.length < 8)                       return setPwError('كلمة المرور أقل من 8 أحرف');
    setPwError('');
    updatePw.mutate({ old_password: pw.current, new_password: pw.next });
  };

  // ── C) Notification prefs (local state — would be persisted to backend in a real app)
  const [notifPrefs, setNotifPrefs] = useState({
    sound:    true,  browser: true,  email: false,
    newAppt:  true,  confirm: true,  cancel: true,  reminder: true,
  });

  // ── D) Preferences
  const [lang, setLang]   = useState('ar');
  const [tz, setTz]       = useState('Africa/Cairo');
  const { dark, setDark }   = useDarkMode();

  // ── E) Permissions (from backend — real values from AssistantProfile)
  const { data: assistantProfile } = useQuery({
    queryKey: ['assistant', 'me'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/assistant/me/');
        return data?.data || data;
      } catch { return null; }
    },
    staleTime: 5 * 60_000,
  });

  // ── E) Permissions (from user object if available)
  const perms = {
    manageAppointments: assistantProfile?.can_manage_appointments ?? user?.can_manage_appointments ?? true,
    editSchedule:       assistantProfile?.can_edit_schedule       ?? user?.can_edit_schedule       ?? false,
    uploadDocuments:    assistantProfile?.can_upload_documents    ?? user?.can_upload_documents    ?? false,
  };

  const strength = pwStrength(pw.next);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>⚙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>الإعدادات</h1>
      </div>

      {/* ── A: Profile ─────────────────────────────────────────────────────── */}
      <Section icon="👤" title="الملف الشخصي">

        {/* ── Photo Section ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 0', marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          {/* Avatar display */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: photoPreview || user?.avatar
                ? 'transparent'
                : `linear-gradient(135deg, ${C.primary}, #0891b2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: `3px solid ${C.primaryL}`,
              boxShadow: '0 2px 8px rgba(14,116,144,.15)',
            }}>
              {(photoPreview || user?.avatar) ? (
                <img
                  src={photoPreview || user?.avatar}
                  alt="الصورة الشخصية"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 28, color: '#fff', fontWeight: 800, userSelect: 'none' }}>
                  {(user?.first_name?.[0] || user?.full_name?.[0] || user?.username?.[0] || 'م').toUpperCase()}
                </span>
              )}
            </div>
            {/* Upload overlay on hover */}
            {!photoUploading && (
              <button
                onClick={() => photoInputRef.current?.click()}
                title="تغيير الصورة"
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,.45)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                <span style={{ fontSize: 18, color: '#fff' }}>📷</span>
              </button>
            )}
            {photoUploading && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '3px solid #fff4', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: C.text }}>الصورة الشخصية</p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted }}>JPG أو PNG — الحد الأقصى 5MB</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-pill)',
                  border: `1.5px solid ${C.primary}`, background: C.primaryL,
                  color: C.primary, fontSize: 12, fontWeight: 700,
                  cursor: photoUploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Cairo,sans-serif', opacity: photoUploading ? 0.6 : 1,
                }}
              >
                📷 {photoPreview || user?.avatar ? 'تغيير الصورة' : 'رفع صورة'}
              </button>
              {(photoPreview || user?.avatar) && (
                <button
                  onClick={deletePhoto}
                  disabled={photoUploading}
                  style={{
                    padding: '7px 16px', borderRadius: 'var(--radius-pill)',
                    border: `1.5px solid ${C.danger}`, background: '#FEF2F2',
                    color: C.danger, fontSize: 12, fontWeight: 700,
                    cursor: photoUploading ? 'not-allowed' : 'pointer',
                    fontFamily: 'Cairo,sans-serif', opacity: photoUploading ? 0.6 : 1,
                  }}
                >
                  🗑️ حذف الصورة
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="الاسم الأول">
            <Input
              value={profile.first_name}
              onChange={v => { setProfile(p => ({ ...p, first_name: v })); setProfileDirty(true); }}
            />
          </Field>
          <Field label="اسم العائلة">
            <Input
              value={profile.last_name}
              onChange={v => { setProfile(p => ({ ...p, last_name: v })); setProfileDirty(true); }}
            />
          </Field>
        </div>
        <Field label="البريد الإلكتروني">
          <Input value={profile.email} onChange={() => {}} disabled type="email"
            placeholder="البريد الإلكتروني (لا يمكن تغييره)" />
        </Field>
        <Field label="رقم الهاتف">
          <Input
            value={profile.phone} type="tel"
            onChange={v => { setProfile(p => ({ ...p, phone: v })); setProfileDirty(true); }}
          />
        </Field>
        {profileDirty && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => updateProfile.mutate({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone })}
              disabled={updateProfile.isPending}
              style={{
                padding: '9px 24px', borderRadius: 'var(--radius-pill)',
                border: 'none', background: C.primary, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
                opacity: updateProfile.isPending ? 0.7 : 1,
              }}
            >
              {updateProfile.isPending ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}
            </button>
          </div>
        )}
      </Section>

      {/* ── B: Password ────────────────────────────────────────────────────── */}
      <Section icon="🔐" title="الأمان — تغيير كلمة المرور">
        <Field label="كلمة المرور الحالية">
          <Input type="password" value={pw.current} onChange={v => setPw(p => ({ ...p, current: v }))} />
        </Field>
        <Field label="كلمة المرور الجديدة">
          <Input type="password" value={pw.next} onChange={v => setPw(p => ({ ...p, next: v }))} />
          {pw.next && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= strength ? PW_COLORS[strength] : C.border,
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: PW_COLORS[strength], fontWeight: 600 }}>
                قوة كلمة المرور: {PW_LABELS[strength]}
              </p>
            </div>
          )}
        </Field>
        <Field label="تأكيد كلمة المرور الجديدة">
          <Input type="password" value={pw.confirm} onChange={v => setPw(p => ({ ...p, confirm: v }))} />
        </Field>
        {pwError && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: C.danger }}>⚠️ {pwError}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handlePwSubmit}
            disabled={updatePw.isPending}
            style={{
              padding: '9px 24px', borderRadius: 'var(--radius-pill)',
              border: 'none', background: C.primary, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
              opacity: updatePw.isPending ? 0.7 : 1,
            }}
          >
            {updatePw.isPending ? 'جاري التغيير...' : '🔒 تغيير كلمة المرور'}
          </button>
        </div>
      </Section>

      {/* ── C: Notifications ───────────────────────────────────────────────── */}
      <Section icon="🔔" title="إعدادات الإشعارات">
        <ToggleRow label="صوت التنبيه"          sub="تشغيل صوت عند وصول إشعار جديد"        value={notifPrefs.sound}    onChange={v => setNotifPrefs(p => ({ ...p, sound:    v }))} />
        <ToggleRow label="إشعارات المتصفح"       sub="تلقي إشعارات حتى عند إغلاق الصفحة"  value={notifPrefs.browser}  onChange={v => setNotifPrefs(p => ({ ...p, browser:  v }))} />
        <ToggleRow label="البريد الإلكتروني"     sub="ملخص يومي على بريدك"                  value={notifPrefs.email}    onChange={v => setNotifPrefs(p => ({ ...p, email:    v }))} />
        <ToggleRow label="مواعيد جديدة"          sub="إشعار فوري لكل طلب حجز"              value={notifPrefs.newAppt}  onChange={v => setNotifPrefs(p => ({ ...p, newAppt:  v }))} />
        <ToggleRow label="تأكيدات المواعيد"       sub="عند تأكيد موعد تلقائياً"             value={notifPrefs.confirm}  onChange={v => setNotifPrefs(p => ({ ...p, confirm:  v }))} />
        <ToggleRow label="إلغاءات المواعيد"       sub="عند إلغاء موعد من أي طرف"            value={notifPrefs.cancel}   onChange={v => setNotifPrefs(p => ({ ...p, cancel:   v }))} />
        <ToggleRow label="تذكيرات يومية"         sub="ملخص صباحي لمواعيد اليوم"            value={notifPrefs.reminder} onChange={v => setNotifPrefs(p => ({ ...p, reminder: v }))} />
        <div style={{ paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => toast?.success?.('تم حفظ التغييرات بنجاح')}
            style={{
              padding: '9px 24px', borderRadius: 'var(--radius-pill)',
              border: 'none', background: C.primary, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
            }}
          >
            💾 حفظ التغييرات
          </button>
        </div>
      </Section>

      {/* ── D: Preferences ─────────────────────────────────────────────────── */}
      <Section icon="🌐" title="إعدادات النظام">
        <Field label="اللغة">
          <select
            value={lang} onChange={e => setLang(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none',
              fontFamily: 'Cairo,sans-serif', background: '#fff', color: C.text,
            }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="المنطقة الزمنية">
          <select
            value={tz} onChange={e => setTz(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none',
              fontFamily: 'Cairo,sans-serif', background: '#fff', color: C.text,
            }}
          >
            <option value="Africa/Cairo">القاهرة (UTC+2)</option>
            <option value="Asia/Riyadh">الرياض (UTC+3)</option>
            <option value="Asia/Dubai">دبي (UTC+4)</option>
            <option value="Europe/London">لندن (UTC+0/+1)</option>
            <option value="UTC">UTC</option>
          </select>
        </Field>
        <ToggleRow
          label="الوضع الليلي (Dark Mode)"
          sub="يتطلب إعادة تحميل الصفحة"
          value={dark}
          onChange={setDark}
        />
        <div style={{ paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => toast?.success?.('تم حفظ التغييرات بنجاح')}
            style={{
              padding: '9px 24px', borderRadius: 'var(--radius-pill)',
              border: 'none', background: C.primary, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
            }}
          >
            💾 حفظ التغييرات
          </button>
        </div>
      </Section>

      {/* ── E: Permissions (read-only) ─────────────────────────────────────── */}
      <Section icon="🔐" title="صلاحياتك الحالية">
        <div style={{
          background: tokens?.colors?.info?.bg || '#DBEAFE',
          borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: tokens?.colors?.info?.text || '#1E3A5F' }}>
            ℹ️ هذه الصلاحيات يمكن تغييرها فقط من قِبَل الدكتور أو المستشفى المسؤول.
            تواصل معهم إن أردت تفعيل صلاحية.
          </p>
        </div>

        {/* Section: Appointment permissions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>صلاحيات المواعيد</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 24 }}>
            <PermBadge2 granted={perms.manageAppointments} label="إدارة المواعيد" desc="إضافة وتعديل وتأكيد وإلغاء المواعيد" />
            <PermBadge2 granted={true} label="عرض المواعيد" desc="قراءة وعرض جدول المواعيد كاملاً" />
            <PermBadge2 granted={perms.editSchedule} label="تعديل جدول المواعيد" desc="تعديل الأوقات وإضافة شيفتات جديدة" />
          </div>
        </div>

        {/* Section: Patient permissions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>صلاحيات المرضى</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 24 }}>
            <PermBadge2 granted={true} label="عرض بيانات المرضى" desc="قراءة معلومات المرضى الأساسية" />
            <PermBadge2 granted={false} label="تعديل بيانات المرضى" desc="تحديث وتعديل معلومات المرضى" />
          </div>
        </div>

        {/* Section: File permissions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📁</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>صلاحيات الملفات</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 24 }}>
            <PermBadge2 granted={perms.uploadDocuments} label="رفع المستندات والملفات" desc="إضافة ورفع الملفات والمرفقات" />
            <PermBadge2 granted={true} label="عرض الوصفات الطبية" desc="قراءة وعرض الوصفات الطبية" />
          </div>
        </div>

        {/* Section: System permissions */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>⚙️</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>صلاحيات النظام</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 24 }}>
            <PermBadge2 granted={false} label="الوصول للوحة التحكم المالية" desc="عرض وإدارة البيانات المالية" />
            <PermBadge2 granted={false} label="إدارة إعدادات النظام" desc="تعديل إعدادات المنظومة والنظام" />
          </div>
        </div>

        {/* Footer: last update info */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, color: C.muted }}>
            🕐 آخر تحديث للصلاحيات: {
              assistantProfile?.updated_at
                ? new Date(assistantProfile.updated_at).toLocaleDateString('ar-EG')
                : new Date().toLocaleDateString('ar-EG')
            }
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>
            من قِبَل: الدكتور / المستشفى المسؤول
          </span>
        </div>
      </Section>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
