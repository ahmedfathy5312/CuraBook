/**
 * PatientProfilePage — Impressive unified dashboard
 * Sprint 3 i18n: all strings via useTranslation()
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatientProfile, useUpdatePatientProfile } from '../hooks/usePatientProfile';
import { useMyAppointments } from '../../appointments/hooks/useMyAppointments';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import { formatDate, formatTime } from '../../../utils/formatters';

const TEAL       = 'var(--primary)';
const TEAL_DARK  = 'var(--primary-dark)';
const TEAL_LIGHT = 'var(--primary-pale)';

function StatCard({ icon, label, value, color, gradient }) {
  return (
    <div style={{
      background: gradient || 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '22px 20px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      boxShadow: 'var(--shadow-md)', flex: 1, minWidth: '120px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: gradient ? 'white' : color, lineHeight: 1 }}>{value ?? '—'}</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: gradient ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
      </div>
      <div style={{ position: 'absolute', right: -10, bottom: -10, width: 60, height: 60, borderRadius: '50%', background: color + '15' }} />
    </div>
  );
}

function AppointmentCard({ appt }) {
  const { t } = useTranslation();
  const statusColors = { pending: 'var(--gold)', confirmed: 'var(--primary)', completed: 'var(--success)', cancelled: 'var(--danger)', rejected: 'var(--danger)' };
  const statusBg     = { pending: 'var(--gold-light)', confirmed: TEAL_LIGHT, completed: 'var(--success-light)', cancelled: 'var(--danger-light)', rejected: 'var(--danger-light)' };
  const s = (appt.status || '').toLowerCase();
  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
      onMouseOver={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = 'var(--primary-light)'; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-base)'; }}>
      <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-lg)', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🩺</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--text-h)', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('common.doctorPrefix')} {appt.doctor_name || appt.doctor?.name || '—'}</p>
        <p style={{ margin: '0 0 4px', color: TEAL, fontSize: '12px', fontWeight: 600 }}>{appt.specialty || appt.doctor?.specialty || 'General'}</p>
        <p style={{ margin: 0, color: 'var(--text-hint)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span>{formatDate(appt.date)}<span>🕐</span>{formatTime(appt.time)}
        </p>
      </div>
      <div style={{ background: statusBg[s] || 'var(--bg-page)', color: statusColors[s] || 'var(--text-muted)', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--radius-lg)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
        {appt.status || '—'}
      </div>
    </div>
  );
}

function QuickLink({ to, icon, label, color, bg }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{ background: bg, borderRadius: 'var(--radius-lg)', padding: '16px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', transition: 'all 0.2s', border: '1px solid transparent', boxShadow: 'var(--shadow-sm)' }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 24px ${color}25`; e.currentTarget.style.borderColor = color + '40'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'transparent'; }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-body)' }}>{label}</span>
      </div>
    </Link>
  );
}

function InfoRow({ icon, label, value, editKey, editMode, formVal, onChange, notProvidedLabel }) {
  if (editMode && editKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <input value={formVal} onChange={e => onChange(editKey, e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-base)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-card)' }}
            onFocus={e => e.target.style.borderColor = TEAL}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border-base)' }}>
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '14px', color: value ? 'var(--text-h)' : '#D1D5DB', fontWeight: 600, fontStyle: value ? 'normal' : 'italic' }}>{value || notProvidedLabel}</p>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-body)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '12px', color, fontWeight: 800 }}>{value}</span>
      </div>
      <div style={{ height: 8, background: 'var(--border-base)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--radius-xs)', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function PatientProfilePage() {
  const { user: authUser } = useAuth();
  const { t, isRTL }       = useTranslation();
  const { data: profile, isLoading: profileLoading, refetch } = usePatientProfile();
  const updateMutation = useUpdatePatientProfile();

  const { data: allApptData } = useMyAppointments({ page_size: 100 });
  const { data: upcomingData, isLoading: apptLoading } = useMyAppointments({ status: 'pending,confirmed', page_size: 5 });

  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);

  const userData    = profile || authUser || {};
  const displayName = userData?.full_name || userData?.username || '';
  const allAppts    = allApptData?.results || allApptData || [];
  const upcoming    = upcomingData?.results || upcomingData || [];

  const stats = {
    total:     allApptData?.count || allAppts.length,
    upcoming:  upcomingData?.count || upcoming.length,
    completed: allAppts.filter(a => a.status?.toLowerCase() === 'completed').length,
    cancelled: allAppts.filter(a => ['cancelled','rejected'].includes(a.status?.toLowerCase())).length,
  };

  useEffect(() => {
    if (userData) {
      setEditForm({ full_name: userData.full_name || '', phone: userData.phone || '', city: userData.city || '', age: userData.age || '', address: userData.address || '' });
    }
  }, [profile]);

  const handleEditChange = (key, val) => setEditForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try { await updateMutation.mutateAsync(editForm); await refetch(); setEditMode(false); }
    catch {}
    finally { setSaving(false); }
  };

  const tabStyle = (id) => ({
    padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
    background: activeTab === id ? TEAL : 'transparent',
    color: activeTab === id ? 'white' : 'var(--text-muted)',
    boxShadow: activeTab === id ? 'var(--shadow-md)' : 'none',
  });

  const hour = new Date().getHours();
  const greetingKey  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const notProvided  = t('patientProfile.fields.notProvided');

  const editFieldDefs = [
    { key: 'full_name', icon: '👤', tKey: 'patientProfile.editFields.fullName' },
    { key: 'phone',     icon: '📞', tKey: 'patientProfile.editFields.phone' },
    { key: 'city',      icon: '📍', tKey: 'patientProfile.editFields.city' },
    { key: 'age',       icon: '🎂', tKey: 'patientProfile.editFields.age' },
    { key: 'address',   icon: '🏠', tKey: 'patientProfile.editFields.address' },
  ];

  return (
    <>
      <div style={{ fontFamily: "'Cairo', sans-serif", maxWidth: '1060px', margin: '0 auto', padding: '28px 20px 48px' }} dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ── HERO ── */}
        <div style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 60%, var(--primary-darker) 100%)`, borderRadius: 'var(--radius-3xl)', padding: '36px 36px 32px', marginBottom: '24px', boxShadow: 'var(--shadow-hover)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -60, right: 80, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {profileLoading && !authUser
                ? <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                : <Avatar name={displayName} size="2xl" src={userData?.profile_image} style={{ border: '4px solid rgba(255,255,255,0.35)', boxShadow: 'var(--shadow-md)' }} />}
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--success)', border: '2px solid white' }} />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: '0 0 4px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t(`patientProfile.greeting.${greetingKey}`)} 👋
              </p>
              <h1 style={{ color: 'white', fontSize: '26px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
                {profileLoading && !authUser ? t('patientProfile.loading') : (displayName || t('patientProfile.defaultName'))}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  { icon: '📧', val: userData?.email },
                  { icon: '📞', val: userData?.phone || t('patientProfile.noPhone') },
                  { icon: '📍', val: userData?.city || userData?.address || t('patientProfile.noLocation') },
                ].map(({ icon, val }) => (
                  <span key={icon} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', padding: '4px 12px', backdropFilter: 'blur(4px)' }}>
                    {icon} {val}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              <Link to="/doctors" style={{ background: 'var(--bg-card)', color: TEAL, padding: '10px 22px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '13px', textDecoration: 'none', boxShadow: 'var(--shadow-md)', display: 'block', textAlign: 'center' }}>
                {t('patientProfile.findDoctor')}
              </Link>
              <Link to="/appointments" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '10px 22px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px', textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.3)', display: 'block', textAlign: 'center' }}>
                {t('patientProfile.myAppointments')}
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '28px' }}>
            {[
              { key: 'total',     value: stats.total,     emoji: '📋' },
              { key: 'upcoming',  value: stats.upcoming,  emoji: '⏰' },
              { key: 'completed', value: stats.completed, emoji: '✅' },
              { key: 'cancelled', value: stats.cancelled, emoji: '❌' },
            ].map(({ key, value, emoji }) => (
              <div key={key} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>
                <span style={{ fontSize: '20px' }}>{emoji}</span>
                <p style={{ color: 'white', fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }}>{value ?? 0}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0, fontWeight: 600 }}>{t(`patientProfile.stats.${key}`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
          {[
            { id: 'overview', icon: '🏠' }, { id: 'profile', icon: '👤' }, { id: 'analytics', icon: '📊' },
          ].map(({ id, icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={tabStyle(id)}>
              {icon} {t(`patientProfile.tabs.${id}`)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <h2 style={{ margin: '0 0 18px', fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientProfile.quickActions')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
                <QuickLink to="/doctors"       icon="🔍" label={t('patientProfile.quickLinks.findDoctors')}   color='var(--primary)' bg="var(--primary-pale)" />
                <QuickLink to="/appointments"  icon="📅" label={t('patientProfile.quickLinks.appointments')}  color="var(--gold)"    bg="var(--gold-light)" />
                <QuickLink to="/hospitals"     icon="🏥" label={t('patientProfile.quickLinks.hospitals')}     color="var(--primary-light)" bg="var(--primary-pale)" />
                <QuickLink to="/prescriptions" icon="💊" label={t('patientProfile.quickLinks.prescriptions')} color="var(--success)"  bg="var(--success-light)" />
                <QuickLink to="/notifications" icon="🔔" label={t('patientProfile.quickLinks.notifications')} color="var(--primary-dark)" bg="var(--primary-pale)" />
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientProfile.upcomingSection')}</h2>
                <Link to="/appointments" style={{ fontSize: '13px', color: TEAL, fontWeight: 600, textDecoration: 'none' }}>{t('patientProfile.viewAll')}</Link>
              </div>
              {apptLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 72, background: 'var(--bg-page)', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
                </div>
              ) : upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px', fontWeight: 600 }}>{t('patientProfile.noUpcoming')}</p>
                  <p style={{ color: 'var(--text-hint)', fontSize: '13px', margin: '0 0 20px' }}>{t('patientProfile.noUpcomingHint')}</p>
                  <Link to="/doctors" style={{ background: TEAL, color: 'white', padding: '10px 28px', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '13px', fontWeight: 700, boxShadow: 'var(--shadow-md)' }}>
                    {t('patientProfile.findADoctor')}
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcoming.map(appt => <AppointmentCard key={appt.id} appt={appt} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {activeTab === 'profile' && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientProfile.personalInfo')}</h2>
              {!editMode ? (
                <button onClick={() => setEditMode(true)}
                  style={{ background: TEAL_LIGHT, color: TEAL, border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--primary-light)'}
                  onMouseOut={e => e.currentTarget.style.background = TEAL_LIGHT}>
                  {t('patientProfile.editProfileBtn')}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditMode(false); setEditForm({ full_name: userData.full_name || '', phone: userData.phone || '', city: userData.city || '', age: userData.age || '', address: userData.address || '' }); }}
                    style={{ background: 'var(--bg-page)', color: 'var(--text-muted)', border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t('patientProfile.cancelEdit')}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ background: saving ? 'var(--text-hint)' : TEAL, color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: 'var(--shadow-md)' }}>
                    {saving ? t('patientProfile.saving') : t('patientProfile.saveChanges')}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
              {editMode ? (
                <>
                  {editFieldDefs.map(({ key, icon, tKey }) => (
                    <InfoRow key={key} icon={icon} label={t(tKey)} editKey={key} editMode value={userData?.[key]} formVal={editForm[key] || ''} onChange={handleEditChange} notProvidedLabel={notProvided} />
                  ))}
                  <InfoRow icon="📧" label={t('patientProfile.fields.email')}    value={userData?.email}    notProvidedLabel={notProvided} />
                  <InfoRow icon="👤" label={t('patientProfile.fields.username')} value={userData?.username} notProvidedLabel={notProvided} />
                </>
              ) : (
                <>
                  <InfoRow icon="👤" label={t('patientProfile.fields.fullName')} value={userData?.full_name} notProvidedLabel={notProvided} />
                  <InfoRow icon="📧" label={t('patientProfile.fields.email')}    value={userData?.email}     notProvidedLabel={notProvided} />
                  <InfoRow icon="📞" label={t('patientProfile.fields.phone')}    value={userData?.phone}     notProvidedLabel={notProvided} />
                  <InfoRow icon="📍" label={t('patientProfile.fields.city')}     value={userData?.city}      notProvidedLabel={notProvided} />
                  <InfoRow icon="🎂" label={t('patientProfile.fields.age')}      value={userData?.age}       notProvidedLabel={notProvided} />
                  <InfoRow icon="🏠" label={t('patientProfile.fields.address')}  value={userData?.address}   notProvidedLabel={notProvided} />
                  <InfoRow icon="👤" label={t('patientProfile.fields.username')} value={userData?.username}  notProvidedLabel={notProvided} />
                </>
              )}
            </div>

            {!editMode && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-base)' }}>
                <Link to="/edit-profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: TEAL, fontSize: '13px', fontWeight: 700, textDecoration: 'none', background: TEAL_LIGHT, padding: '10px 20px', borderRadius: 'var(--radius-md)' }}>
                  {t('patientProfile.advancedSettings')}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <StatCard icon="📋" label={t('patientProfile.analytics.total')}     value={stats.total}     color={TEAL} />
              <StatCard icon="⏰" label={t('patientProfile.analytics.upcoming')}  value={stats.upcoming}  color="var(--gold)" />
              <StatCard icon="✅" label={t('patientProfile.analytics.completed')} value={stats.completed} color="var(--success)" />
              <StatCard icon="❌" label={t('patientProfile.analytics.cancelled')} value={stats.cancelled} color="var(--danger)" />
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientProfile.analytics.breakdown')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <MiniBar label={t('patientProfile.analytics.upcoming')}  value={stats.upcoming}  max={stats.total || 1} color="var(--gold)" />
                <MiniBar label={t('patientProfile.analytics.completed')} value={stats.completed} max={stats.total || 1} color="var(--success)" />
                <MiniBar label={t('patientProfile.analytics.cancelled')} value={stats.cancelled} max={stats.total || 1} color="var(--danger)" />
              </div>
              {stats.total > 0 ? (
                <div style={{ marginTop: '28px', padding: '20px', background: TEAL_LIGHT, borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-light)' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: TEAL_DARK, fontWeight: 600 }}>
                    {t('patientProfile.analytics.completionRate')}{' '}
                    <strong style={{ fontSize: '18px' }}>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {t('patientProfile.analytics.completionDetail').replace('{{completed}}', stats.completed).replace('{{total}}', stats.total)}
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: '24px', textAlign: 'center', padding: '20px', color: 'var(--text-hint)' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>{t('patientProfile.analytics.noData')}</p>
                </div>
              )}
            </div>

            {allAppts.length > 0 && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-h)' }}>{t('patientProfile.analytics.history')}</h2>
                  <Link to="/appointments" style={{ fontSize: '13px', color: TEAL, fontWeight: 600, textDecoration: 'none' }}>{t('patientProfile.viewAll')}</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {allAppts.slice(0, 5).map(appt => <AppointmentCard key={appt.id} appt={appt} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 640px) {
          div[style*="repeat(4, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
          div[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
