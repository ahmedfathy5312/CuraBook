/**
 * AssistantOnboardingPage.jsx — Sprint 3
 * Welcome onboarding flow for first-time assistant login.
 * 5 steps: Welcome → Profile → Workplace → Schedule → Done
 * Saves completion flag to localStorage so it shows only once.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useAuth } from '../../../context/AuthContext';

const P  = 'var(--primary)';
const PL = '#E6F1FB';

const STEPS = [
  { id: 'welcome',   icon: '👋', title: 'أهلاً بك في CuraBook', subtitle: 'سنساعدك على إعداد حسابك في دقائق' },
  { id: 'profile',   icon: '👤', title: 'أكمل ملفك الشخصي',    subtitle: 'أضف بياناتك الأساسية' },
  { id: 'workplace', icon: '🏥', title: 'بيئات العمل',          subtitle: 'تعرف على أماكن عملك المرتبطة' },
  { id: 'schedule',  icon: '📅', title: 'الجدول والمواعيد',     subtitle: 'اكتشف كيف تدير الجدول' },
  { id: 'done',      icon: '🎉', title: 'أنت جاهز!',            subtitle: 'يمكنك البدء في إدارة المواعيد الآن' },
];

const DOT_STYLE = (active, done) => ({
  width: active ? 32 : 10, height: 10, borderRadius: 8,
  background: done || active ? P : 'var(--border-base)',
  transition: 'all 0.3s ease', flexShrink: 0,
});

export function hasCompletedOnboarding() {
  try { return localStorage.getItem('cb_onboarding_done') === 'true'; } catch { return true; }
}

export function markOnboardingDone() {
  try { localStorage.setItem('cb_onboarding_done', 'true'); } catch {}
}

export default function AssistantOnboardingPage() {
  const [step, setStep]       = useState(0);
  const [phone, setPhone]     = useState('');
  const [saving, setSaving]   = useState(false);
  const navigate              = useNavigate();
  const { user }              = useAuth();

  const current = STEPS[step];

  const handleNext = async () => {
    if (step === 1 && phone) {
      setSaving(true);
      try { await apiClient.patch(API.AUTH.USER, { phone_number: phone }); } catch {}
      setSaving(false);
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleDone = () => {
    markOnboardingDone();
    navigate('/assistant-dashboard', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
      padding: 24, fontFamily: 'Cairo, sans-serif', direction: 'rtl',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={DOT_STYLE(i === step, i < step)} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.10)',
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Top accent */}
          <div style={{ height: 5, background: `linear-gradient(90deg, ${P}, #06b6d4)` }} />

          {/* Icon + heading */}
          <div style={{ textAlign: 'center', padding: '44px 40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>{current.icon}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{current.title}</h1>
            <p  style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>{current.subtitle}</p>
          </div>

          {/* Step content */}
          <div style={{ padding: '32px 40px 40px' }}>
            {step === 0 && <WelcomeStep user={user} />}
            {step === 1 && <ProfileStep phone={phone} setPhone={setPhone} user={user} />}
            {step === 2 && <WorkplaceStep />}
            {step === 3 && <ScheduleStep />}
            {step === 4 && <DoneStep user={user} />}
          </div>

          {/* Navigation */}
          <div style={{ padding: '0 40px 36px', display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            {step > 0 && step < 4 ? (
              <button onClick={() => setStep(s => s - 1)}
                style={{ padding: '12px 28px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'Cairo,sans-serif' }}>
                ← رجوع
              </button>
            ) : <div />}

            {step < 4 ? (
              <button onClick={handleNext} disabled={saving}
                style={{ padding: '12px 32px', borderRadius: 'var(--radius-pill)', border: 'none', background: P, color: '#fff', cursor: saving ? 'default' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Cairo,sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'جارٍ الحفظ...' : step === 3 ? 'إنهاء الإعداد ✓' : 'التالي →'}
              </button>
            ) : (
              <button onClick={handleDone}
                style={{ flex: 1, padding: '14px 32px', borderRadius: 'var(--radius-pill)', border: 'none', background: `linear-gradient(135deg, ${P}, #06b6d4)`, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 800, fontFamily: 'Cairo,sans-serif' }}>
                🚀 ابدأ الاستخدام
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        {step < 4 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={handleDone}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', fontSize: 13, fontFamily: 'Cairo,sans-serif', textDecoration: 'underline' }}>
              تخطي وابدأ مباشرة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WelcomeStep({ user }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 15, color: '#166534', fontWeight: 600 }}>
          مرحباً {user?.first_name || 'بك'} 👋<br/>
          <span style={{ fontWeight: 400, fontSize: 13, color: '#15803d' }}>
            تم ربط حسابك كمساعد طبي. ستتمكن من إدارة المواعيد والجداول الطبية.
          </span>
        </p>
      </div>
      {[
        { icon: '📋', text: 'إدارة المواعيد وتأكيدها أو رفضها' },
        { icon: '🗓️', text: 'عرض الجدول الأسبوعي والشهري للدكتور' },
        { icon: '👥', text: 'الاطلاع على بيانات المرضى وتاريخ مواعيدهم' },
        { icon: '📊', text: 'تتبع الإحصائيات ومعدلات التأكيد' },
      ].map(({icon, text}) => (
        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileStep({ phone, setPhone, user }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>البريد الإلكتروني (للقراءة فقط)</label>
        <input value={user?.email || ''} readOnly
          style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #e5e7eb', fontSize: 14, color: '#9ca3af', background: '#f9fafb', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>رقم الهاتف</label>
        <input
          type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="01xxxxxxxxx"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1e293b', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'Cairo,sans-serif' }} />
        <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>سيُستخدم للتواصل معك في حالات الطوارئ</p>
      </div>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>💡 يمكنك تعديل بياناتك في أي وقت من صفحة الإعدادات</p>
      </div>
    </div>
  );
}

function WorkplaceStep() {
  return (
    <div style={{ textAlign: 'center' }}>
      {[
        { icon: '🏥', title: 'عيادة أو مستشفى', desc: 'يمكن ربطك بأكثر من مكان عمل' },
        { icon: '🔗', title: 'الربط التلقائي',  desc: 'سيتم ربطك تلقائياً من قِبل الدكتور أو المستشفى' },
        { icon: '👁️', title: 'عرض الجداول',      desc: 'ترى جداول جميع الأطباء المرتبطين بك' },
      ].map(({icon, title, desc}) => (
        <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleStep() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { icon: '✅', color: '#f0fdf4', border: '#bbf7d0', text: 'تأكيد المواعيد' },
          { icon: '❌', color: '#fef2f2', border: '#fecaca', text: 'رفض أو إلغاء' },
          { icon: '🔒', color: '#fffbeb', border: '#fde68a', text: 'حجب أوقات فراغ' },
          { icon: '📊', color: '#eff6ff', border: '#bfdbfe', text: 'إحصائيات فورية' },
        ].map(({icon, color, border, text}) => (
          <div key={text} style={{ background: color, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{text}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>استكشف العرض الأسبوعي والشهري للجدول من القائمة الجانبية</p>
    </div>
  );
}

function DoneStep({ user }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #e0f2fe)', borderRadius: 20, padding: '28px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎊</div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          مرحباً {user?.first_name || ''} في فريق CuraBook!
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          حسابك جاهز بالكامل. يمكنك الآن البدء في إدارة المواعيد والجداول الطبية بكل كفاءة.
        </p>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-hint)' }}>لن يظهر هذا الدليل مرة أخرى. يمكنك دائماً الرجوع للمساعدة من القائمة الجانبية.</p>
    </div>
  );
}
