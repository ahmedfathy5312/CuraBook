/**
 * PatientDetailModal.jsx
 * Extracted from ManagePatientsPage (559 lines → split)
 * Shows patient info + booking history in a modal.
 */
import React from 'react';
import { Mail, Phone, MapPin, Calendar, User, X } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import { formatDate } from '../../../utils/formatters';
import { tokens } from '../../../theme/tokens';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import useTranslation from '../../../i18n/useTranslation';

const getName = (p) => p?.full_name || p?.name || p?.patient_name || 'Unknown';

const APPT_STATUS_COLORS = {
  confirmed:  { bg: '#D1FAE5', color: '#065F46' },
  completed:  { bg: '#DBEAFE', color: '#1E40AF' },
  cancelled:  { bg: '#FEE2E2', color: '#991B1B' },
  pending:    { bg: '#FEF3C7', color: '#92400E' },
  no_show:    { bg: 'var(--border-base)', color: 'var(--text-body)' },
};
const apptStyle = (s) => APPT_STATUS_COLORS[s?.toLowerCase()] || { bg: 'var(--border-base)', color: 'var(--text-body)' };

export default function PatientDetailModal({ patient, onClose }) {
  const { t } = useTranslation();
  const [tab,            setTab]            = React.useState('info');
  const [history,        setHistory]        = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError,   setHistoryError]   = React.useState(null);

  React.useEffect(() => {
    if (tab === 'history' && patient) {
      setHistoryLoading(true);
      setHistoryError(null);
      apiClient
        .get(API.APPOINTMENTS.LIST, { params: { patient: patient.id } })
        .then(({ data }) => {
          const results = data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);
          setHistory(results);
        })
        .catch(() => {
          setHistory([]);
          setHistoryError('Could not load appointment history. Please try again.');
        })
        .finally(() => setHistoryLoading(false));
    }
  }, [tab, patient]);

  // Reset tab when patient changes
  React.useEffect(() => { setTab('info'); }, [patient?.id]);

  if (!patient) return null;
  const name = getName(patient);

  const P = tokens?.colors?.primary?.DEFAULT || '#0E7490';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-modal-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: tokens.zIndex.modal, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '520px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: tokens.shadows.modal, overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${P} 0%, ${tokens?.colors?.primary?.dark || '#0C6478'} 100%)`,
          padding: '24px 24px 0', position: 'relative', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            aria-label="Close patient details"
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--radius-md)',
              padding: '6px', cursor: 'pointer', color: '#fff', display: 'flex',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <Avatar name={name} size="2xl" src={patient.profile_image} style={{ border: '3px solid rgba(255,255,255,0.4)' }} />
            <div>
              <h2 id="patient-modal-title" style={{ margin: '0 0 4px', color: '#fff', fontSize: '20px', fontWeight: 800 }}>{name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {patient.gender && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '2px 12px', fontSize: '11px', fontWeight: 600 }}>
                    {patient.gender}
                  </span>
                )}
                {patient.total_appointments != null && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '2px 12px', fontSize: '11px', fontWeight: 600 }}>
                    {patient.total_appointments} visits
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div role="tablist" style={{ display: 'flex', gap: '4px' }}>
            {[{ key: 'info', label: 'Patient Info' }, { key: 'history', label: 'Booking History' }].map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                style={{
                  padding: '8px 18px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
                  /* intentional: tab shape — top rounded, bottom flat to connect with content panel */
                  borderRadius: '10px 10px 0 0', transition: 'all 0.2s',
                  background: tab === key ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: tab === key ? P : 'rgba(255,255,255,0.85)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* INFO TAB */}
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: <Mail size={14} aria-hidden="true" />,     label: 'Email',              value: patient.email },
                { icon: <Phone size={14} aria-hidden="true" />,    label: 'Phone',              value: patient.phone },
                { icon: <MapPin size={14} aria-hidden="true" />,   label: 'City',               value: patient.city },
                { icon: <User size={14} aria-hidden="true" />,     label: 'Age',                value: patient.age ? `${patient.age} years` : null },
                { icon: <Calendar size={14} aria-hidden="true" />, label: 'Last Visit',         value: patient.last_appointment ? formatDate(patient.last_appointment) : null },
                { icon: <Calendar size={14} aria-hidden="true" />, label: 'Total Appointments', value: patient.total_appointments },
              ].filter(r => r.value != null && r.value !== '').map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: P, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-hint)', fontWeight: 600, width: '130px', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-h)', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div>
              {historyError && (
                <div style={{ background: 'var(--warning-light,#FEF9C3)', border: '1px solid var(--warning,#FDE047)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '12px', color: 'var(--warning-dark,#854D0E)', marginBottom: '14px' }}>
                  ⚠️ {historyError}
                </div>
              )}
              {historyLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 72, borderRadius: 'var(--radius-md)', background: 'var(--border-base)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-hint)' }}>
                  <Calendar size={40} aria-hidden="true" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('patientDetailModal.noAppointments')}</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px' }}>{t('patientDetailModal.noBookingHistory')}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {history.map(appt => {
                    const st = apptStyle(appt.status);
                    return (
                      <div key={appt.id} style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-base)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-h)' }}>
                            {appt.doctor_name || `Appointment #${appt.id}`}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{appt.specialty || appt.department || '—'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-hint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={10} aria-hidden="true" />
                            {appt.date ? formatDate(appt.date) : appt.appointment_date ? formatDate(appt.appointment_date) : '—'}
                            {appt.fee && <span style={{ marginInlineStart: '8px' }}>· {appt.fee} EGP</span>}
                          </span>
                        </div>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 'var(--radius-lg)', padding: '3px 10px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                          {(appt.status || '').replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-base)', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
              background: P, color: '#fff', border: 'none',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = tokens?.colors?.primary?.dark || '#0C6478'}
            onMouseOut={e  => e.currentTarget.style.background = P}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
