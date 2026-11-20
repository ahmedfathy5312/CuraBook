import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import Avatar from '../../../components/ui/Avatar';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/apiClient';
import tokens from '../../../theme/tokens';
import { AppointmentStatusBadge } from '../../../components/ui/AppointmentStatusBadge';
import Button from '../../../components/ui/Button';
// ── Sprint 3 P2 ──────────────────────────────────────────────────────────────
import DoctorIdentityCard from '../../../components/doctor/DoctorIdentityCard';
import DoctorEmptyState   from '../../../components/doctor/DoctorEmptyState';
import { AppointmentListSkeleton, ProfileFormSkeleton } from '../components/DoctorPageSkeletons';
import WelcomeScreen from '../components/WelcomeScreen';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark     || '#0C6478';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT  || '#31A870';
const MOD_SM      = tokens?.shadows?.sm               || '0 1px 3px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg               || '0 8px 32px rgba(0,0,0,0.10)';
const MOD_GRAY100 = tokens?.colors?.gray?.[100]       || '#F3F4F6';
const MOD_GRAY500 = tokens?.colors?.gray?.[500]       || '#6B7280';
const MOD_GRAY800 = tokens?.colors?.gray?.[800]       || '#1F2937';


export default function DoctorProfileOverviewPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('cura_welcome_v2_2026');
    if (!hasSeenWelcome) {
       setShowWelcome(true);
       localStorage.setItem('cura_welcome_v2_2026', 'true');
    }

    const fetchProfile = async () => {
      try {
        const { data } = await apiClient.get('/doctor/profile-overview/');
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile overview", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const greetingPrefix = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return isRTL ? 'صباح الخير' : 'Good Morning';
    if (hour >= 12 && hour < 17) return isRTL ? 'مساء الخير' : 'Good Afternoon';
    return isRTL ? 'مساء النور' : 'Good Evening';
  })();

  if (showWelcome && !loading) {
     return (
       <WelcomeScreen 
         name={doctorInfo.name} 
         specialty={doctorInfo.specialty}
         clinicName={profile?.clinic_name || (isRTL ? 'عيادتك الخاصة' : 'Private Clinic')}
         location={doctorInfo.location}
         phone={doctorInfo.phone}
         experience={doctorInfo.experience}
         onDone={() => setShowWelcome(false)} 
       />
     );
  }

  const isRTL = language === 'ar';

  // Mock data falling back from profile
  const doctorInfo = {
    name: user?.full_name || 'د. أحمد السيد المحمود',
    specialty: profile?.specialty || (isRTL ? 'طبيب أطفال' : 'Pediatrician'),
    experience: profile?.experience || 15,
    email: user?.email || 'doctor@example.com',
    phone: profile?.phone || '+20 010 xxxx xxxx',
    location: profile?.location || (isRTL ? 'القاهرة، مصر' : 'Cairo, Egypt'),
  };

  const recentAppointments = profile?.recent_appointments || [
    { id: 1, patient_name: isRTL ? 'محمد عبدالله' : 'Mohamed Abdallah', datetime: '15 أبريل 09:00', status: 'completed' },
    { id: 2, patient_name: isRTL ? 'سارة محمود' : 'Sarah Mahmoud', datetime: '17 أبريل 10:30', status: 'pending' },
    { id: 3, patient_name: isRTL ? 'أحمد خالد' : 'Ahmed Khaled', datetime: '16 أبريل 14:00', status: 'cancelled' },
  ];

  const recentPrescriptions = profile?.recent_prescriptions || [
    { id: '1234', patient: 'محمد عبدالله', date: '15 أبريل' },
    { id: '1233', patient: 'أحمد محمود', date: '12 أبريل' },
    { id: '1232', patient: 'ليلى خليل', date: '10 أبريل' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Gradient Header */}
      <div style={{
         background: `linear-gradient(135deg, ${MOD_P} 0%, ${MOD_PD} 100%)`, 
         borderRadius: 24, padding: 32, color: '#fff', position: 'relative', overflow: 'hidden',
         boxShadow: MOD_LG, marginBottom: 32
      }}>
         <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
         <div style={{ position: 'absolute', bottom: -50, right: 150, width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
         
         <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar name={doctorInfo.name} size={120} style={{ border: '4px solid rgba(255,255,255,0.2)' }} />
            <div style={{ flex: 1, minWidth: 300 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, opacity: 0.9 }}>{greetingPrefix}،</h4>
                    <h1 style={{ margin: '0 0 12px', fontSize: 36, fontWeight: 900, letterSpacing: -0.5 }}>{doctorInfo.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.95, flexWrap: 'wrap' }}>
                       <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 800 }}>
                          🩺 {doctorInfo.specialty}
                       </span>
                       <span style={{ fontSize: 15, fontWeight: 600 }}>
                          📍 {doctorInfo.location}
                       </span>
                    </div>
                  </div>
                  <Link to="/profile-settings">
                    <Button variant="outline" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                      ✏️ {t('profile.edit', 'تعديل الملف')}
                    </Button>
                  </Link>
               </div>

               <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <span style={{ opacity: 0.8 }}>📧</span>
                     <span style={{ fontWeight: 600 }}>{doctorInfo.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <span style={{ opacity: 0.8 }}>📱</span>
                     <span style={{ fontWeight: 600 }}>{doctorInfo.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <span style={{ opacity: 0.8 }}>📍</span>
                     <span style={{ fontWeight: 600 }}>{doctorInfo.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <span style={{ opacity: 0.8 }}>🩺</span>
                     <span style={{ fontWeight: 600 }}>{doctorInfo.specialty}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* ── Sprint 3 P2: DoctorIdentityCard (full) ── */}
      <DoctorIdentityCard
        profile={profile}
        stats={null}
        variant="full"
        isRTL={isRTL}
        loading={loading}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 32 }}>
         {/* Main Content Area */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* ── 1. Management & Alerts (NEW Enterprise Section) ── */}
            <div style={{ 
               background: 'var(--bg-card)', borderRadius: 24, padding: 32, 
               boxShadow: MOD_SM, border: '1px solid var(--border-base)',
               display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24
            }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-hint)', fontWeight: 700, textTransform: 'uppercase' }}>
                     💳 {isRTL ? 'حالة الاشتراك' : 'Subscription'}
                  </h4>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: MOD_SUCCESS }}>
                     {isRTL ? 'نشط - باقة بريميوم' : 'Active - Premium'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                     {isRTL ? 'ينتهي في: 25 مايو 2026' : 'Expires: 25 May 2026'}
                  </p>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-hint)', fontWeight: 700, textTransform: 'uppercase' }}>
                     🧑‍⚕️ {isRTL ? 'فريق العمل' : 'Staff'}
                  </h4>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-h)' }}>
                     2 {isRTL ? 'مساعدين نشطين' : 'Active Assistants'}
                  </p>
                  <Link to="/doctor-assistants" style={{ margin: 0, fontSize: 12, color: MOD_P, textDecoration: 'none', fontWeight: 700 }}>
                     {isRTL ? 'إدارة المساعدين' : 'Manage Team'} →
                  </Link>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-hint)', fontWeight: 700, textTransform: 'uppercase' }}>
                     💰 {isRTL ? 'الدفعة القادمة' : 'Next Payout'}
                  </h4>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: MOD_P }}>
                     $1,240.00
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                     {isRTL ? 'التاريخ المتوقع: 20 أبريل' : 'Expected: 20 April'}
                  </p>
               </div>
            </div>

            {/* ── 2. Clinical Operations Flowchart (CSS Based) ── */}
            <div style={{ 
               background: 'var(--bg-card)', borderRadius: 24, padding: 32, 
               boxShadow: MOD_SM, border: '1px solid var(--border-base)'
            }}>
               <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>
                  🔄 {isRTL ? 'تدفق العمليات التشغيلية' : 'Clinical Operations Flowchart'}
               </h3>
               <div style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  flexWrap: 'wrap', gap: 16, position: 'relative' 
               }}>
                  <FlowStep icon="📝" label={isRTL ? 'حجز' : 'Booking'} color={MOD_P} active />
                  <FlowArrow />
                  <FlowStep icon="🧑‍⚕️" label={isRTL ? 'فحص' : 'Consult'} color="#8B5CF6" active />
                  <FlowArrow />
                  <FlowStep icon="💊" label={isRTL ? 'روشتة' : 'Prescribe'} color="#EC4899" active />
                  <FlowArrow />
                  <FlowStep icon="✅" label={isRTL ? 'متابعة' : 'Followup'} color={MOD_SUCCESS} />
               </div>
            </div>

            {/* Recent Appointments */}
            <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{isRTL ? 'آخر المواعيد' : 'Recent Appointments'}</h2>
                  <Link to="/doctor-appointments" style={{ color: MOD_P, fontWeight: 700, textDecoration: 'none' }}>
                     {t('common.viewAll')} →
                  </Link>
               </div>
               
               <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border-base)', overflow: 'hidden', boxShadow: MOD_SM }}>
                  {recentAppointments.map((apt, i) => (
                    <div key={apt.id} style={{ 
                       display: 'flex', alignItems: 'center', padding: '20px 24px', 
                       borderBottom: i !== recentAppointments.length - 1 ? '1px solid var(--border-base)' : 'none',
                       gap: 16
                    }}>
                      <Avatar name={apt.patient_name} size={48} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>{apt.patient_name}</h4>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>{apt.datetime}</p>
                      </div>
                      <AppointmentStatusBadge status={apt.status} />
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Sidebar Area */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Recent Prescriptions */}
            <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{isRTL ? 'آخر الوصفات' : 'Recent Prescriptions'}</h2>
                  <Link to="/doctor-prescriptions" style={{ color: MOD_P, fontWeight: 700, textDecoration: 'none' }}>
                     {t('common.viewAll')} →
                  </Link>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {recentPrescriptions.map(pres => (
                    <div key={pres.id} style={{ 
                       background: 'var(--bg-card)', borderRadius: 16, padding: '20px', 
                       border: '1px solid var(--border-base)', boxShadow: MOD_SM,
                       display: 'flex', alignItems: 'center', gap: 16,
                       cursor: 'pointer', transition: 'all 0.2s',
                     }}
                     onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                       <div style={{ width: 48, height: 48, borderRadius: 12, background: MOD_P + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                          📄
                       </div>
                       <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--text-h)' }}>
                             {isRTL ? 'وصفة' : 'Prescription'} #{pres.id}
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                             {pres.patient} • {pres.date}
                          </p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Pro Tip/Banner */}
            <div style={{
               background: `linear-gradient(135deg, ${MOD_PD} 0%, #1a1a1a 100%)`,
               borderRadius: 24, padding: 28, color: '#fff',
               boxShadow: MOD_LG, position: 'relative', overflow: 'hidden'
            }}>
               <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.1 }}>💡</div>
               <h4 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>{isRTL ? 'نصيحة اليوم' : 'Pro Tip'}</h4>
               <p style={{ margin: 0, fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
                  {isRTL 
                     ? 'استخدم نظام "الحجز المسبق" لتقليل وقت انتظار المرضى بنسبة تصل إلى ٤٠٪.'
                     : 'Use the "Pre-Booking" system to reduce patient wait times by up to 40%.'}
               </p>
               <button style={{ 
                  marginTop: 20, background: '#fff', color: '#000', border: 'none', 
                  padding: '10px 20px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer' 
               }}>
                  {isRTL ? 'تعرف على المزيد' : 'Learn More'}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FlowStep({ icon, label, color, active }) {
   return (
      <div style={{ 
         display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1,
         opacity: active ? 1 : 0.4 
      }}>
         <div style={{ 
            width: 60, height: 60, borderRadius: 20, background: active ? color : 'var(--bg-subtle)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            boxShadow: active ? `0 8px 16px ${color}40` : 'none',
            color: active ? '#fff' : 'var(--text-hint)'
         }}>
            {icon}
         </div>
         <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>{label}</span>
      </div>
   );
}

function FlowArrow() {
   return (
      <div style={{ fontSize: 20, color: 'var(--text-hint)', marginBottom: 24 }}>
         →
      </div>
   );
}
