/**
 * AssistantPatientsPage.jsx — Patient Management
 * Assistants can VIEW patients who have appointments in their workplaces.
 * They CANNOT edit patient medical data.
 *
 * Features:
 *  - Search by name / phone / booking number
 *  - Patient cards with appointment summary
 *  - Patient detail drawer (appointment history, upcoming, prescriptions read-only)
 *  - Permission guards: no edit, no medical data
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import useTranslation from '../../../i18n/useTranslation';
import apiClient from '../../../services/apiClient';
import { API }   from '../../../constants/apiRoutes';
import { tokens }  from '../../../theme/tokens';

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  primary:  tokens?.colors?.primary?.DEFAULT  || '#0E7490',
  primaryL: tokens?.colors?.primary?.pale     || '#E0F7FA',
  success:  tokens?.colors?.success?.DEFAULT  || '#31A870',
  warning:  tokens?.colors?.warning?.DEFAULT  || '#F59E0B',
  danger:   tokens?.colors?.danger?.DEFAULT   || '#E97D61',
  accent:   tokens?.colors?.accent?.DEFAULT   || '#8B5CF6',
  border:   tokens?.colors?.border            || '#E5E7EB',
  muted:    tokens?.colors?.gray?.[500]       || '#6B7280',
  light:    tokens?.colors?.gray?.[100]       || '#F3F4F6',
  text:     tokens?.colors?.gray?.[800]       || '#1F2937',
};

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:             { bg: '#FEF3C7', color: '#92400E', label: 'انتظار' },
  confirmed:           { bg: '#D1FAE5', color: '#065F46', label: 'مؤكد'   },
  completed:           { bg: '#DBEAFE', color: '#1E3A5F', label: 'مكتمل'  },
  cancelled:           { bg: '#FEE2E2', color: '#991B1B', label: 'ملغي'   },
  rejected:            { bg: '#FEE2E2', color: '#991B1B', label: 'مرفوض'  },
  reschedule_requested:{ bg: '#F5F3FF', color: '#5B21B6', label: 'إعادة جدولة' },
};

function StatusBadge({ status, t }) {
  const s = STATUS_STYLE[status] || { bg: C.light, color: C.muted, labelKey: status };
  const label = STATUS_STYLE[status] ? t(`appointments.status.${status}`) : status;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 42 }) {
  const letters = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hue     = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,75%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: `hsl(${hue},55%,30%)`,
      flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}

// ── Format date ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

// ── Patient card ──────────────────────────────────────────────────────────────
function PatientCard({ patient, onClick, t }) {
  const [hover, setHover] = useState(false);
  const name = patient.patient_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || t('common.roles.patient');
  const phone = patient.phone || patient.phone_number || '—';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
        background: hover ? C.primaryL : 'var(--bg-card)',
        borderBottom: `1px solid ${C.border}`,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      <Avatar name={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>📞 {phone}</p>
      </div>
      <div style={{ textAlign: 'start', flexShrink: 0 }}>
        {patient.last_appointment_status && (
          <StatusBadge status={patient.last_appointment_status} t={t} />
        )}
        {patient.appointments_count != null && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted, textAlign: 'center' }}>
            {t('assistantPatients.patientCount', { count: patient.appointments_count }).replace('{{count}}', patient.appointments_count)}
          </p>
        )}
      </div>
      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
    </div>
  );
}

// ── Patient detail drawer ─────────────────────────────────────────────────────
function PatientDrawer({ patient, onClose, t }) {
  if (!patient) return null;

  const name  = patient.patient_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || t('common.roles.patient');
  const phone = patient.phone || patient.phone_number || '—';
  const email = patient.email || '—';

  const appts = patient.appointments || [];
  const upcoming = appts.filter(a => {
    const d = new Date(a.date || a.appointment_date || '');
    return d >= new Date() && ['pending','confirmed'].includes(a.status?.toLowerCase());
  });
  const past = appts.filter(a => {
    const d = new Date(a.date || a.appointment_date || '');
    return d < new Date() || ['completed','cancelled','rejected'].includes(a.status?.toLowerCase());
  });

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(10,25,47,.45)', zIndex: 100,
      }} />

      {/* drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '100%', maxWidth: 480,
        background: 'var(--bg-card)', zIndex: 101, overflowY: 'auto',
        boxShadow: '4px 0 24px rgba(0,0,0,.18)',
        animation: 'slideInLeft .22s ease',
      }}>
        {/* header */}
        <div style={{
          padding: '20px 22px', background: `linear-gradient(135deg,${C.primary},#0C6478)`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <Avatar name={name} size={50} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>{name}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,.75)' }}>📞 {phone}</p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'rgba(255,255,255,.2)',
            color: '#fff', borderRadius: '50%', width: 32, height: 32,
            fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* permission notice */}
        <div style={{
          margin: '16px 22px 0',
          background: '#FEF3C7', border: '1px solid #F59E0B',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', fontWeight: 600 }}>
            ⚠️ {t('assistantPatients.patientDrawer.readOnlyNotice')}
          </p>
        </div>

        {/* contact info */}
        <div style={{ padding: '16px 22px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: C.text }}>{t('assistantPatients.patientDrawer.contactInfo')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '📞', label: t('assistantPatients.patientDrawer.phone'), value: phone },
              { icon: '📧', label: t('assistantPatients.patientDrawer.email'), value: email },
            ].map(r => (
              <div key={r.label} style={{
                background: C.light, borderRadius: 'var(--radius-md)', padding: '10px 12px',
              }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: C.muted }}>{r.icon} {r.label}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, wordBreak: 'break-all' }}>{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* upcoming */}
        {upcoming.length > 0 && (
          <div style={{ padding: '0 22px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: C.text }}>📅 {t('assistantPatients.patientDrawer.upcomingAppts')} ({upcoming.length})</p>
            {upcoming.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: '#D1FAE5', borderRadius: 'var(--radius-md)',
                marginBottom: 8, gap: 10,
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>
                    {fmtDate(a.date || a.appointment_date)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#065F46', opacity: 0.8 }}>
                    {a.doctor_name || a.doctor || ''}
                    {a.time_slot && ` — ${a.time_slot}`}
                  </p>
                </div>
                <StatusBadge status={a.status} t={t} />
              </div>
            ))}
          </div>
        )}

        {/* history */}
        <div style={{ padding: '0 22px 22px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: C.text }}>
            🗓️ {t('assistantPatients.patientDrawer.pastAppts')} ({past.length})
          </p>
          {past.length === 0 && (
            <p style={{ fontSize: 12, color: C.muted }}>{t('assistantPatients.patientDrawer.noPastAppts')}</p>
          )}
          {past.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: `1px solid ${C.border}`, gap: 10,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>
                  {fmtDate(a.date || a.appointment_date)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>
                  {a.doctor_name || a.doctor || ''}
                  {a.workplace_name && ` — ${a.workplace_name}`}
                </p>
              </div>
              <StatusBadge status={a.status} t={t} />
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ searching, t }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{searching ? '🔍' : '👥'}</div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>
        {searching ? t('assistantPatients.noResults') : t('assistantPatients.noPatients')}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13 }}>
        {searching
          ? t('assistantPatients.noResultsSub')
          : t('assistantPatients.noPatientsSub')}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AssistantPatientsPage() {
  const { t, language } = useTranslation();
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [searchFocus, setSearchFocus] = useState(false);

  // Fetch patients from assistant's appointments endpoint
  // We derive unique patients from appointment list
  const { data: apptData, isLoading, isError } = useQuery({
    queryKey: ['assistant', 'appointments', { page_size: 200 }],
    queryFn: async () => {
      const { data } = await apiClient.get(API.ASSISTANT.APPOINTMENTS, { params: { page_size: 200 } });
      return data?.results || data || [];
    },
    staleTime: 60_000,
  });

  // Build unique patients map from appointments
  const patients = useMemo(() => {
    const appts = Array.isArray(apptData) ? apptData : [];
    const map   = new Map();
    appts.forEach(a => {
      const pid = a.patient_id || a.patient || a.user_id;
      if (!pid) return;
      if (!map.has(pid)) {
        map.set(pid, {
          id:                   pid,
          patient_name:         a.patient_name || a.patient_full_name || `مريض #${pid}`,
          phone:                a.patient_phone || a.phone || '',
          email:                a.patient_email || '',
          appointments:         [],
          appointments_count:   0,
          last_appointment_status: null,
          last_appointment_date:   null,
        });
      }
      const p = map.get(pid);
      p.appointments.push(a);
      p.appointments_count++;
      // track latest
      const d = a.date || a.appointment_date || '';
      if (!p.last_appointment_date || d > p.last_appointment_date) {
        p.last_appointment_date   = d;
        p.last_appointment_status = a.status?.toLowerCase();
      }
    });
    return [...map.values()].sort((a, b) =>
      (b.last_appointment_date || '').localeCompare(a.last_appointment_date || '')
    );
  }, [apptData]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.trim().toLowerCase();
    return patients.filter(p =>
      (p.patient_name || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      String(p.id).includes(q)
    );
  }, [patients, search]);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{t('assistantPatients.title')}</h1>
        </div>
        {patients.length > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: C.muted,
            background: C.light, borderRadius: 99, padding: '4px 12px',
          }}>
            {t('assistantPatients.patientCount', { count: patients.length }).replace('{{count}}', patients.length)}
          </span>
        )}
      </div>

      {/* Permission notice */}
      <div style={{
        background: C.primaryL, border: `1px solid ${C.primary}`,
        borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: 12, color: '#0C6478', fontWeight: 600 }}>
          {t('assistantPatients.permissionNotice')}
        </p>
      </div>

      {/* Search bar */}
      <div style={{
        position: 'relative', marginBottom: 16,
      }}>
        <span style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: C.muted, pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)}
          placeholder={t('assistantPatients.searchPlaceholder')}
          style={{
            width: '100%', padding: language === 'ar' ? '11px 44px 11px 14px' : '11px 14px 11px 44px', boxSizing: 'border-box',
            borderRadius: 'var(--radius-lg)', border: `1.5px solid ${searchFocus ? C.primary : C.border}`,
            fontSize: 13, outline: 'none', fontFamily: 'inherit',
            background: 'var(--bg-card)', color: C.text,
            boxShadow: searchFocus ? `0 0 0 3px ${C.primaryL}` : 'none',
            transition: 'all 0.15s',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', [language === 'ar' ? 'left' : 'right']: 14, top: '50%', transform: 'translateY(-50%)',
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 16, color: C.muted, padding: 0,
          }}>✕</button>
        )}
      </div>

      {/* Patient list */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${C.border}`,
        boxShadow: tokens.shadows?.sm || '0 1px 4px rgba(0,0,0,.06)',
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            {t('assistantPatients.loading')}
          </div>
        )}
        {isError && !isLoading && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.danger }}>
            ⚠️ {t('assistantPatients.loadError')}
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <Empty searching={!!search.trim()} t={t} />
        )}
        {!isLoading && !isError && filtered.map(p => (
          <PatientCard key={p.id} patient={p} onClick={() => setSelected(p)} t={t} />
        ))}
      </div>

      {/* Detail drawer */}
      <PatientDrawer patient={selected} onClose={() => setSelected(null)} t={t} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
