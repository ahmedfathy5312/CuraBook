/**
 * PasswordTab.jsx — Change password tab
 * Extracted from AssistantProfilePage.jsx (Sprint 3 split)
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useTranslation } from '../../../i18n/useTranslation';
import { Lock, Save, CheckCircle, XCircle } from 'lucide-react';
import { FieldInput, SectionCard, PrimaryBtn, COLORS } from '../components/AssistantUI';

/* ── Password strength ── */
function strength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_COLORS = ['', '#E97D61', '#F59E0B', '#3B82F6', '#31A870'];

const changePassword = (p) => apiClient.post(API.USERS.CHANGE_PASSWORD, p).then(r => r.data);

export default function PasswordTab() {
  const { t } = useTranslation();
  const toast  = useToast();

  const [form, setForm]     = useState({ old_password: '', new_password: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success(t('assistantProfilePage.password.successMsg'));
      setForm({ old_password: '', new_password: '', confirm: '' });
      setErrors({});
    },
    onError: (e) => {
      // Backend ChangePasswordView returns: {"detail": "Current password is incorrect."}
      // Envelope-based interceptors may also set e.errorDetail / e.errorFields.
      const respData = e?.response?.data;

      // 1. Try structured field errors first (DRF ValidationError style)
      const fields = e?.errorFields || respData?.error?.details || {};

      // 2. Extract the human-readable message from every possible location
      const detail =
        e?.errorDetail ||
        respData?.detail ||
        respData?.error?.message ||
        respData?.message ||
        null;

      if (fields?.old_password) {
        const msg = Array.isArray(fields.old_password) ? fields.old_password[0] : fields.old_password;
        setErrors(p => ({ ...p, old_password: msg }));
        return;
      }
      if (fields?.new_password) {
        const msg = Array.isArray(fields.new_password) ? fields.new_password[0] : fields.new_password;
        setErrors(p => ({ ...p, new_password: msg }));
        return;
      }

      // 3. Map the backend's plain {"detail":"..."} to the correct field
      if (detail) {
        const lower = detail.toLowerCase();
        if (
          lower.includes('current') ||
          lower.includes('incorrect') ||
          lower.includes('wrong') ||
          lower.includes('old')
        ) {
          setErrors(p => ({ ...p, old_password: detail }));
        } else if (
          lower.includes('new password') ||
          lower.includes('least') ||
          lower.includes('characters') ||
          lower.includes('8')
        ) {
          setErrors(p => ({ ...p, new_password: detail }));
        } else {
          toast.error(detail);
        }
        return;
      }

      // 4. Fallback generic message
      toast.error(t('assistantProfilePage.password.errorMsg'));
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSave = () => {
    const errs = {};
    if (!form.old_password)                           errs.old_password = t('assistantProfilePage.password.errors.required');
    if (!form.new_password)                           errs.new_password = t('assistantProfilePage.password.errors.required');
    else if (form.new_password.length < 8)            errs.new_password = t('assistantProfilePage.password.errors.minLength');
    if (form.new_password !== form.confirm)           errs.confirm = t('assistantProfilePage.password.errors.noMatch');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutation.mutate({ old_password: form.old_password, new_password: form.new_password });
  };

  const pwStrength = strength(form.new_password);
  const strengthLabels = t('assistantProfilePage.password.strengthLabels');

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: '0 24px 40px' }}>
      <SectionCard
        title={t('assistantProfilePage.password.title')}
        subtitle={t('assistantProfilePage.password.subtitle')}
        icon={<Lock size={18} />}
        action={
          <PrimaryBtn onClick={handleSave} loading={mutation.isPending} icon={<Save size={14} />}>
            {t('assistantProfilePage.password.saveBtn')}
          </PrimaryBtn>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
          <FieldInput
            label={t('assistantProfilePage.password.current')}
            name="old_password" type="password"
            value={form.old_password} onChange={handleChange}
            error={errors.old_password} icon={<Lock size={15} />} required
          />
          <FieldInput
            label={t('assistantProfilePage.password.newPass')}
            name="new_password" type="password"
            value={form.new_password} onChange={handleChange}
            error={errors.new_password} icon={<Lock size={15} />} required
          />

          {/* Strength meter */}
          {form.new_password && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 99,
                    background: pwStrength >= i ? STRENGTH_COLORS[pwStrength] : COLORS.border,
                    transition: 'background .3s',
                  }} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: STRENGTH_COLORS[pwStrength] || COLORS.muted }}>
                {Array.isArray(strengthLabels) ? strengthLabels[pwStrength] : ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية'][pwStrength]}
              </p>
            </div>
          )}

          <FieldInput
            label={t('assistantProfilePage.password.confirm')}
            name="confirm" type="password"
            value={form.confirm} onChange={handleChange}
            error={errors.confirm} icon={<Lock size={15} />} required
          />

          {form.new_password && form.confirm && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
              color: form.new_password === form.confirm ? '#31A870' : COLORS.danger,
            }}>
              {form.new_password === form.confirm
                ? <><CheckCircle size={14} /> {t('assistantProfilePage.password.match')}</>
                : <><XCircle size={14} /> {t('assistantProfilePage.password.noMatch')}</>
              }
            </div>
          )}
        </div>

        {/* Warning */}
        <div style={{
          marginTop: 20, padding: '12px 16px', background: '#FEF3C7',
          borderRadius: 'var(--radius-md)', fontSize: 13, color: '#92400E',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span>⚠️</span>
          <p style={{ margin: 0 }}>{t('assistantProfilePage.password.warning')}</p>
        </div>
      </SectionCard>
    </div>
  );
}
