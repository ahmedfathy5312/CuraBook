/**
 * OnboardingWizard.jsx — Post-signup onboarding flow for new patients
 * UX FIX v16: New patients went directly to dashboard with no guidance.
 * 3-step wizard: Complete Profile → Choose Interests → Book First Appointment
 *
 * Usage: Render inside PatientDashboard when profile.onboarding_complete === false
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n/useTranslation';

const P  = 'var(--primary)';
const PL = '#E6F1FB';
const PD = 'var(--primary-dark)';

const SPECIALTIES = [
  { emoji: '🫀', label: 'Cardiology'   },
  { emoji: '👶', label: 'Pediatrics'   },
  { emoji: '🩺', label: 'Dermatology'  },
  { emoji: '👁',  label: 'Ophthalmology'},
  { emoji: '🦷', label: 'Dentistry'    },
  { emoji: '🧠', label: 'Neurology'    },
  { emoji: '🦴', label: 'Orthopedics'  },
  { emoji: '🏥', label: 'General'      },
];

export default function OnboardingWizard({ userName = 'there', onComplete }) {
  const [step, setStep]             = useState(1);
  const [selectedSpecs, setSpecs]   = useState([]);
  const [phone, setPhone]           = useState('');
  const [city, setCity]             = useState('');
  const navigate = useNavigate();
  const { lang } = useTranslation();

  const STEPS = [
    { num: 1, label: 'Welcome'   },
    { num: 2, label: 'Profile'   },
    { num: 3, label: 'Interests' },
  ];

  const toggleSpec = (label) =>
    setSpecs(prev => prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]);

  const handleFinish = () => {
    // In production: call PATCH /api/v1/patients/me/ with phone, city, interests
    // and set onboarding_complete = true
    if (onComplete) onComplete({ phone, city, interests: selectedSpecs });
    else navigate('/doctors');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480,
        boxShadow: 'var(--shadow-modal)', overflow: 'hidden',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* Progress bar */}
        <div style={{ background: 'var(--border-base)', height: 4, position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: '0 auto 0 0',
            background: P, width: `${(step / 3) * 100}%`,
            borderRadius: 'var(--radius-xs)', transition: 'width .4s ease',
          }} />
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 24px 0' }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step >= s.num ? P : 'var(--border)',
                color: step >= s.num ? '#fff' : '#9CA3AF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, transition: 'all .3s',
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: 11, color: step >= s.num ? P : '#9CA3AF', fontWeight: 600 }}>
                {s.label}
              </span>
              {s.num < 3 && <div style={{ width: 24, height: 1, background: step > s.num ? P : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 28px 28px' }}>

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>👋</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 10px' }}>
                Welcome, {userName}!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
                You're all set! Let's take 2 minutes to personalize your experience
                so we can show you the most relevant doctors and services.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  { icon: '🔍', text: 'Find doctors by specialty & location' },
                  { icon: '📅', text: 'Book & manage appointments easily' },
                  { icon: '🔔', text: 'Get real-time notifications' },
                  { icon: '💊', text: 'Access your prescriptions anytime' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', background: PL, borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                    <span style={{ fontSize: 20 }}>{f.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{f.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} style={{
                width: '100%', background: P, color: '#fff', border: 'none', borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Let's get started →
              </button>
            </div>
          )}

          {/* ── Step 2: Profile Info ── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 6px' }}>
                Complete your profile
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
                Help doctors know a bit more about you.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>
                    📱 Phone Number
                  </label>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+20 10 0000 0000"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-base)', fontSize: 14, fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = P}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-body)', marginBottom: 6 }}>
                    📍 {lang === 'ar' ? 'مدينتك' : 'Your City'}
                  </label>
                  <select value={city} onChange={e => setCity(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-base)', fontSize: 14, fontFamily: 'inherit',
                      background: 'var(--bg-card)', cursor: 'pointer',
                    }}>
                    <option value="">{lang === 'ar' ? 'اختر مدينتك' : 'Select your city'}</option>
                    {[
                      {value:'Cairo',      ar:'القاهرة',      en:'Cairo'},
                      {value:'Giza',       ar:'الجيزة',        en:'Giza'},
                      {value:'Alexandria', ar:'الإسكندرية',    en:'Alexandria'},
                      {value:'Assiut',     ar:'أسيوط',         en:'Assiut'},
                      {value:'Luxor',      ar:'الأقصر',        en:'Luxor'},
                      {value:'Mansoura',   ar:'المنصورة',      en:'Mansoura'},
                      {value:'Minya',      ar:'المنيا',        en:'Minya'},
                      {value:'Tanta',      ar:'طنطا',          en:'Tanta'},
                      {value:'Sohag',      ar:'سوهاج',         en:'Sohag'},
                      {value:'Aswan',      ar:'أسوان',         en:'Aswan'},
                    ].map(c => (
                      <option key={c.value} value={c.value}>{lang === 'ar' ? c.ar : c.en}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1.5px solid var(--border-base)',
                  borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>← Back</button>
                <button onClick={() => setStep(3)} style={{
                  flex: 2, background: P, color: '#fff', border: 'none', borderRadius: 14,
                  padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>Next →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Specialty Interests ── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 6px' }}>
                Your health interests
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 18px' }}>
                Pick specialties you care about — we'll show you relevant doctors first.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                {SPECIALTIES.map(s => {
                  const sel = selectedSpecs.includes(s.label);
                  return (
                    <button key={s.label} onClick={() => toggleSpec(s.label)} style={{
                      padding: '12px 6px', borderRadius: 'var(--radius-md)', border: `2px solid ${sel ? P : 'var(--border)'}`,
                      background: sel ? PL : 'var(--bg-card)', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all .2s',
                    }}>
                      <span style={{ fontSize: 22 }}>{s.emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: sel ? P : 'var(--text-body)', lineHeight: 1.2 }}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(2)} style={{
                  flex: 1, background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1.5px solid var(--border-base)',
                  borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>← Back</button>
                <button onClick={handleFinish} style={{
                  flex: 2, background: P, color: '#fff', border: 'none', borderRadius: 14,
                  padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {selectedSpecs.length > 0 ? `Finish (${selectedSpecs.length} selected)` : 'Skip & Finish'}
                </button>
              </div>
            </div>
          )}

          {/* Skip link */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={handleFinish} style={{
              background: 'none', border: 'none', color: 'var(--text-hint)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Skip onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
