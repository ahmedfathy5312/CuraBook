/**
 * DoctorSchedulePage.jsx — FIX S1-9 + P1-FEAT-2
 * Doctor Schedule Management page — was unreachable, now accessible from doctor nav.
 * P1-FEAT-2: locations now include both clinic AND hospital affiliations.
 */
import { useNavigate } from 'react-router-dom';
import useTranslation from '../../../i18n/useTranslation';
import DoctorScheduleManager from '../components/DoctorScheduleManager';
import tokens from '../../../theme/tokens';

const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_LG      = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';

import { useDoctorOwnProfile } from '../../doctor-dashboard/hooks/useDoctorDashboard';
import { useDoctorScheduleGrouped } from '../hooks/useSchedule';

export default function DoctorSchedulePage() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useDoctorOwnProfile();

  // ── Grouped schedule (as fallback / supplement for location discovery) ────
  const { data: grouped } = useDoctorScheduleGrouped();

  // P1-FEAT-2: Build locations from BOTH clinic AND hospital affiliations.
  // Backend returns: profile.clinics (array) and profile.hospital_affiliations (array)
  // Also supports legacy flat fields: profile.clinic_id / profile.clinic_name

  const clinicLocations = [];

  // Primary: use clinics array (from get_clinics serializer method)
  if (Array.isArray(profile?.clinics) && profile.clinics.length > 0) {
    profile.clinics.forEach(c => {
      if (c?.id) {
        clinicLocations.push({
          type: 'clinic',
          id:   c.id,
          name: c.name || (isRTL ? 'عيادتي' : 'My Clinic'),
          city: c.city || '',
        });
      }
    });
  }
  // Fallback: nested clinic object (profile.clinic.id)
  else if (profile?.clinic?.id) {
    clinicLocations.push({
      type: 'clinic',
      id:   profile.clinic.id,
      name: profile.clinic.name || (isRTL ? 'عيادتي' : 'My Clinic'),
      city: profile.clinic.city || '',
    });
  }
  // Fallback: flat clinic_id field
  else if (profile?.clinic_id) {
    clinicLocations.push({
      type: 'clinic',
      id:   profile.clinic_id,
      name: profile.clinic_name || (isRTL ? 'عيادتي' : 'My Clinic'),
    });
  }

  // Hospital affiliations — array from serializer get_hospital_affiliations()
  const hospitalLocations = (profile?.hospital_affiliations || [])
    .filter(h => h?.hospital_id)
    .map(h => ({
      type: 'hospital',
      id:   h.hospital_id,
      name: h.hospital_name || (isRTL ? 'مستشفاي' : 'My Hospital'),
      department: h.department?.name || null,
    }));

  let allLocations = [...clinicLocations, ...hospitalLocations];

  // If profile returned no locations but the schedule API found some, use those
  if (!allLocations.length && grouped?.groups?.length) {
    allLocations = grouped.groups
      .filter(g => g.location_id != null)
      .map(g => ({
        type: g.location_type,
        id:   g.location_id,
        name: g.location_name,
      }));
  }

  // Last resort: if flat schedules exist but have no grouped location,
  // extract clinic/hospital directly from the first flat schedule
  if (!allLocations.length && grouped?.flat?.length) {
    const first = grouped.flat[0];
    if (first?.clinic) {
      allLocations = [{ type: 'clinic', id: first.clinic, name: isRTL ? 'عيادتي' : 'My Clinic' }];
    } else if (first?.hospital) {
      allLocations = [{ type: 'hospital', id: first.hospital, name: isRTL ? 'مستشفاي' : 'My Hospital' }];
    }
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* ── Premium Hero Header ── */}
      <div style={{
         background: `linear-gradient(135deg, ${MOD_P} 0%, ${MOD_PD} 100%)`, 
         borderRadius: 24, padding: '36px 40px', color: '#fff', 
         position: 'relative', overflow: 'hidden', marginBottom: 32,
         boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
         flexWrap: 'wrap', gap: 24
      }}>
         <div style={{ position: 'absolute', top: -50, right: isRTL ? 'auto' : -20, left: isRTL ? -20 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
         <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
         
         <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px' }}>🗓️ {t('doctorSchedule.title', isRTL ? 'إدارة جدول المواعيد' : 'Schedule Management')}</h1>
            <p style={{ margin: 0, fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6 }}>
               {t('doctorSchedule.subtitle', isRTL ? 'نظم أوقات عملك لكل عيادة أو مستشفى، وتحكم بجلسات مرضاك بكل سهولة.' : 'Organize your working hours per clinic or hospital, and manage patient sessions with ease.')}
            </p>
            {/* Location count badge */}
            {!profileLoading && allLocations.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allLocations.map(loc => (
                  <span key={`${loc.type}-${loc.id}`} style={{
                    background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                    padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  }}>
                    {loc.type === 'clinic' ? '🏥' : '🏦'} {loc.name}
                  </span>
                ))}
              </div>
            )}
         </div>
      </div>

      {profileLoading ? (
         <div style={{ padding: 40, background: 'var(--bg-card)', borderRadius: 28, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: `4px solid ${MOD_P}20`, borderTopColor: MOD_P, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-hint)' }}>{isRTL ? 'جاري تحميل بيانات العيادة...' : 'Loading clinic data...'}</p>
         </div>
      ) : allLocations.length === 0 ? (
        <div style={{ padding: 48, background: 'var(--bg-card)', borderRadius: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>🏥</p>
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>
            {isRTL ? 'لم تضف عيادة أو مستشفى بعد' : 'No clinic or hospital added yet'}
          </h3>
          <p style={{ margin: '0 0 20px', color: 'var(--text-hint)' }}>
            {isRTL ? 'أضف عيادتك من الإعدادات أولاً لتتمكن من إعداد جدولك' : 'Add your clinic in Settings first to set up your schedule'}
          </p>
          <button
            onClick={() => navigate('/profile-settings?tab=clinic')}
            style={{ background: MOD_P, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {isRTL ? '🏥 أضف عيادتك الآن' : '🏥 Add Your Clinic Now'}
          </button>
        </div>
      ) : (
         <DoctorScheduleManager locations={allLocations} />
      )}
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
