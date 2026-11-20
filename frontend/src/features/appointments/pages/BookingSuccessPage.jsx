/**
 * BookingSuccessPage.jsx — Sprint 1 i18n fix
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Skeleton from '../../../components/ui/Skeleton';
import { getDoctorPrefix } from '../../../utils/formatters';
import { useTranslation } from '../../../i18n/useTranslation';

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    left: `${(i / 24) * 100 + (Math.sin(i) * 3)}%`,
    color: ['var(--primary)','var(--accent)','#C9923A','#1A8A5A','var(--primary)'][i % 5],
    delay: `${(i * 0.04).toFixed(2)}s`,
    duration: `${(0.8 + (i % 4) * 0.15).toFixed(2)}s`,
    size: i % 3 === 0 ? '10px' : '7px',
    shape: i % 4 === 0 ? '50%' : '2px',
  }));
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '220px', overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{`@keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg) scale(1);opacity:1} 80%{opacity:1} 100%{transform:translateY(220px) rotate(420deg) scale(0.8);opacity:0} }`}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.left, top: 0, width: p.size, height: p.size, borderRadius: p.shape, background: p.color, animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards` }} />
      ))}
    </div>
  );
}

const P = 'var(--primary)', PL = '#E6F1FB', PD = 'var(--primary-dark)';

function formatDate(dateStr, lang, fallback) {
  if (!dateStr) return fallback;
  const date = parseAppointmentDate(dateStr);
  if (!date) return fallback;
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function hashReference(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function getBookingReference(appointment, routeId) {
  const publicRef = appointment?.public_id || appointment?.booking_reference || appointment?.reference || appointment?.code || appointment?.short_id;
  if (publicRef && !isUuid(publicRef) && String(publicRef).length <= 24) return String(publicRef).toUpperCase();
  if (/^\d+$/.test(String(routeId || ''))) return `CB-${routeId}`;
  if (/^\d+$/.test(String(appointment?.id || ''))) return `CB-${appointment.id}`;
  return `CB-${hashReference(publicRef || appointment?.id || routeId)}`;
}

function getAppointmentDate(appointment) {
  return (
    appointment?.date ||
    appointment?.appointment_date ||
    appointment?.scheduled_date ||
    appointment?.slot_date ||
    appointment?.slot?.date ||
    appointment?.slot?.slot_date ||
    getDatePartFromDateTime(appointment?.start_time) ||
    getDatePartFromDateTime(appointment?.start) ||
    getDatePartFromDateTime(appointment?.starts_at) ||
    getDatePartFromDateTime(appointment?.slot?.start_time) ||
    getDatePartFromDateTime(appointment?.slot?.start) ||
    ''
  );
}

function getAppointmentTime(appointment) {
  return (
    normalizeTimeDisplay(appointment?.time) ||
    normalizeTimeDisplay(appointment?.appointment_time) ||
    normalizeTimeDisplay(appointment?.scheduled_time) ||
    normalizeTimeDisplay(appointment?.time_slot) ||
    normalizeTimeDisplay(appointment?.slot_time) ||
    normalizeTimeDisplay(appointment?.start_time) ||
    normalizeTimeDisplay(appointment?.start) ||
    normalizeTimeDisplay(appointment?.starts_at) ||
    normalizeTimeDisplay(appointment?.slot?.start_time) ||
    normalizeTimeDisplay(appointment?.slot?.start) ||
    normalizeTimeDisplay(appointment?.slot?.time) ||
    ''
  );
}

function parseAppointmentDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDatePartFromDateTime(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!/[T\s]\d{1,2}:\d{2}/.test(text)) return '';
  const date = parseAppointmentDate(text);
  if (!date) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function normalizeTimeDisplay(value) {
  if (!value) return '';
  const text = String(value).trim();
  const timeMatch = text.match(/(?:T|\s)?(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!timeMatch) return '';
  return `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
}

function formatCalendarDateTime(date, time) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    'T',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    '00',
  ].join('');
}

function getDoctorName(appointment) {
  const doctor = appointment?.doctor || {};
  return (
    doctor.full_name ||
    doctor.name ||
    doctor.display_name ||
    appointment?.doctor_full_name ||
    appointment?.doctor_display_name ||
    appointment?.doctor_name ||
    ''
  );
}

function isMissingSuccessDetails(appointment) {
  return !getDoctorName(appointment) || !getAppointmentDate(appointment) || !getAppointmentTime(appointment);
}

function getStatusLabel(status, t) {
  const normalized = String(status || 'pending').toLowerCase();
  const key = `bookingSuccess.status.${normalized}`;
  const label = t(key);
  return label === key ? normalized : label;
}

function getStatusTone(status) {
  const normalized = String(status || 'pending').toLowerCase();
  if (['confirmed', 'completed'].includes(normalized)) return { bg: '#dcfce7', color: '#16a34a' };
  if (['cancelled', 'rejected', 'no_show'].includes(normalized)) return { bg: '#fee2e2', color: '#dc2626' };
  if (normalized === 'reschedule_requested') return { bg: '#ede9fe', color: '#7c3aed' };
  return { bg: '#fef3c7', color: '#d97706' };
}

function buildGoogleCalendarUrl(appointment, calendarTitle, bookingReference, t) {
  const doctorName = getDoctorName(appointment) || t('bookingSuccess.defaultDoctor');
  const title = encodeURIComponent(`${calendarTitle} - ${doctorName}`);
  const date = parseAppointmentDate(getAppointmentDate(appointment));
  const time = getAppointmentTime(appointment) || '09:00';
  const timeParts = normalizeTimeDisplay(time).match(/^(\d{2}):(\d{2})$/);
  if (!date || !timeParts) return null;
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(timeParts[1]), Number(timeParts[2]), 0);
  if (Number.isNaN(startDate.getTime())) return null;
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  const start = formatCalendarDateTime(startDate);
  const end = formatCalendarDateTime(endDate);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${encodeURIComponent(`${t('bookingSuccess.bookingReference')}: #${bookingReference}`)}&location=${encodeURIComponent(appointment?.clinic_name || appointment?.hospital_name || '')}`;
}

function AddToCalendarButton({ appointment, bookingReference, t }) {
  const googleUrl = buildGoogleCalendarUrl(appointment, t('bookingSuccess.calendarTitle'), bookingReference, t);
  if (!googleUrl) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>{t('bookingSuccess.addToCalendar')}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-card)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-body)', transition: 'border-color .2s' }} onMouseOver={e => e.currentTarget.style.borderColor='var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
          📅 Google Calendar
        </a>
        <button onClick={() => { const text = `${t('bookingSuccess.calendarTitle')}\n${getDoctorName(appointment) || t('bookingSuccess.defaultDoctor')}\n${getAppointmentDate(appointment) || ''} ${t('bookingSuccess.at')} ${getAppointmentTime(appointment) || ''}\n${t('bookingSuccess.bookingReference')}: #${bookingReference}`; if (navigator.share) navigator.share({ title: t('bookingSuccess.calendarTitle'), text }).catch(()=>{}); else navigator.clipboard?.writeText(text); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-card)', fontSize: 13, fontWeight: 600, color: 'var(--text-body)', cursor: 'pointer', fontFamily: 'inherit' }}>
          🔗 {t('bookingSuccess.share')}
        </button>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, isRTL } = useTranslation();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', 'success', id],
    queryFn: async () => {
      const { data: detail } = await apiClient.get(API.APPOINTMENTS.DETAIL(id));
      if (!isMissingSuccessDetails(detail)) return detail;

      try {
        const { data: listData } = await apiClient.get(API.APPOINTMENTS.LIST, { params: { page_size: 100 } });
        const items = Array.isArray(listData?.results) ? listData.results : Array.isArray(listData) ? listData : [];
        const match = items.find(item =>
          String(item.id) === String(id) ||
          String(item.public_id) === String(id) ||
          String(item.booking_reference) === String(id)
        );
        return match ? { ...(detail || {}), ...match, id: detail?.id ?? match.id } : detail;
      } catch {
        return detail;
      }
    },
    enabled: !!id,
    staleTime: 10 * 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px' }}>
        <Skeleton.Card />
        <div style={{ marginTop: 20 }}><Skeleton.Card /></div>
      </div>
    );
  }

  const doctor = appointment?.doctor || {};
  const status = appointment?.status || 'pending';
  const nextSteps = t('bookingSuccess.steps');
  const bookingReference = getBookingReference(appointment, id);
  const statusTone = getStatusTone(status);
  const unavailable = t('bookingSuccess.unavailable');
  const doctorName = getDoctorName(appointment);
  const appointmentDate = getAppointmentDate(appointment);
  const appointmentTime = getAppointmentTime(appointment);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px', position: 'relative', fontFamily: "'Cairo', sans-serif" }} dir={isRTL ? 'rtl' : 'ltr'}>
      <Confetti />

      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ width: '120px', height: '120px', margin: '0 auto 20px', position: 'relative' }}>
          <style>{`
            @keyframes sb-bg-pop  { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15);opacity:1} 80%{transform:scale(0.95)} 100%{transform:scale(1);opacity:1} }
            @keyframes sb-ring    { 0%{stroke-dashoffset:320;opacity:0} 10%{opacity:1} 100%{stroke-dashoffset:0} }
            @keyframes sb-check   { 0%{stroke-dashoffset:80;opacity:0}  20%{opacity:1} 100%{stroke-dashoffset:0} }
            @keyframes sb-burst-1 { 0%{transform:translate(60px,60px) scale(0);opacity:1} 100%{transform:translate(60px,-8px)  scale(1);opacity:0} }
            @keyframes sb-burst-2 { 0%{transform:translate(60px,60px) scale(0);opacity:1} 100%{transform:translate(112px,28px) scale(1);opacity:0} }
            @keyframes sb-burst-3 { 0%{transform:translate(60px,60px) scale(0);opacity:1} 100%{transform:translate(112px,92px) scale(1);opacity:0} }
            @keyframes sb-burst-4 { 0%{transform:translate(60px,60px) scale(0);opacity:1} 100%{transform:translate(60px,128px) scale(1);opacity:0} }
            @keyframes sb-burst-5 { 0%{transform:translate(60px,60px) scale(0);opacity:1} 100%{transform:translate(8px,92px)  scale(1);opacity:0} }
            @keyframes sb-burst-6 { 0%{transform:translate(60px,60px) scale(0);opacity:1} 100%{transform:translate(8px,28px)  scale(1);opacity:0} }
            @keyframes sb-title-in { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
            @keyframes sb-sub-in   { 0%{opacity:0;transform:translateY(8px)}  100%{opacity:1;transform:translateY(0)} }
            .sb-bg  { transform-origin:60px 60px; animation:sb-bg-pop  0.55s cubic-bezier(0.34,1.56,0.64,1) 0s    forwards; opacity:0; }
            .sb-ring{ stroke-dasharray:320; stroke-dashoffset:320; animation:sb-ring  0.65s cubic-bezier(0.65,0,0.45,1) 0.3s  forwards; }
            .sb-chk { stroke-dasharray:80;  stroke-dashoffset:80;  animation:sb-check 0.4s  cubic-bezier(0.65,0,0.45,1) 0.9s  forwards; }
            .sb-b1  { animation:sb-burst-1 0.5s cubic-bezier(0,0,0.2,1) 1.05s forwards; opacity:0; }
            .sb-b2  { animation:sb-burst-2 0.5s cubic-bezier(0,0,0.2,1) 1.12s forwards; opacity:0; }
            .sb-b3  { animation:sb-burst-3 0.5s cubic-bezier(0,0,0.2,1) 1.08s forwards; opacity:0; }
            .sb-b4  { animation:sb-burst-4 0.5s cubic-bezier(0,0,0.2,1) 1.15s forwards; opacity:0; }
            .sb-b5  { animation:sb-burst-5 0.5s cubic-bezier(0,0,0.2,1) 1.10s forwards; opacity:0; }
            .sb-b6  { animation:sb-burst-6 0.5s cubic-bezier(0,0,0.2,1) 1.06s forwards; opacity:0; }
            .sb-title-anim { animation:sb-title-in 0.4s ease 1.2s both; }
            .sb-sub-anim   { animation:sb-sub-in   0.4s ease 1.4s both; }
          `}</style>
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '120px', height: '120px', overflow: 'visible' }}>
            <circle className="sb-b1" r="5" fill='var(--accent)' />
            <circle className="sb-b2" r="4" fill="#C9923A" />
            <circle className="sb-b3" r="5" fill="#1A8A5A" />
            <circle className="sb-b4" r="4" fill='var(--accent)' />
            <circle className="sb-b5" r="5" fill="#C9923A" />
            <circle className="sb-b6" r="4" fill="#1A8A5A" />
            <circle className="sb-bg" cx="60" cy="60" r="56" fill={PL} />
            <circle className="sb-ring" cx="60" cy="60" r="46" stroke={P} strokeWidth="4" fill="none" strokeLinecap="round" transform="rotate(-90 60 60)" />
            <polyline className="sb-chk" points="34,62 50,78 86,44" stroke={P} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
        <h1 className="sb-title-anim" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 8px' }}>
          {t('bookingSuccess.title')}
        </h1>
        <p className="sb-sub-anim" style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
          {t('bookingSuccess.subtitle')}
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: `2px solid ${P}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ background: P, padding: '20px 24px', color: '#fff' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, margin: '0 0 4px', letterSpacing: isRTL ? 0 : '0.05em' }}>{t('bookingSuccess.bookingReference')}</p>
          <p style={{ fontSize: '20px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>#{bookingReference}</p>
        </div>
        <div style={{ padding: '12px 24px', background: 'var(--bg-page)', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{t('bookingSuccess.statusLabel')}</span>
          <span style={{ background: statusTone.bg, color: statusTone.color, fontSize: '13px', fontWeight: 700, padding: '4px 14px', borderRadius: 'var(--radius-lg)' }}>
            {getStatusLabel(status, t)}
          </span>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: PL, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>👨‍⚕️</div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-hint)', margin: '0 0 2px' }}>{t('bookingSuccess.doctor')}</p>
                <p style={{ fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{getDoctorPrefix(lang)} {doctorName || unavailable}</p>
                {doctor.specialty && <p style={{ fontSize: '13px', color: P, margin: '2px 0 0', fontWeight: 500 }}>{doctor.specialty}</p>}
              </div>
            </div>
            <div style={{ height: '1px', background: 'var(--border-base)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-hint)', margin: '0 0 4px' }}>{t('bookingSuccess.date')}</p>
                <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: 0, fontSize: '14px' }}>{formatDate(appointmentDate, lang, unavailable)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-hint)', margin: '0 0 4px' }}>{t('bookingSuccess.time')}</p>
                <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: 0, fontSize: '14px' }}>{appointmentTime || unavailable}</p>
              </div>
            </div>
            {(appointment?.clinic_name || appointment?.hospital_name) && (
              <>
                <div style={{ height: '1px', background: 'var(--border-base)' }} />
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-hint)', margin: '0 0 4px' }}>{t('bookingSuccess.location')}</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: 0, fontSize: '14px' }}>{appointment?.clinic_name || appointment?.hospital_name}</p>
                  {appointment?.clinic_address && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{appointment.clinic_address}</p>}
                </div>
              </>
            )}
            {appointment?.consultation_fee && (
              <>
                <div style={{ height: '1px', background: 'var(--border-base)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>{t('bookingSuccess.consultationFee')}</p>
                  <p style={{ fontWeight: 700, color: P, fontSize: '16px', margin: 0 }}>{Number(appointment.consultation_fee).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('bookingSuccess.currency')}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: PL, border: `1px solid #B8D9EF`, borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: PD, margin: '0 0 12px' }}>{t('bookingSuccess.nextSteps')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(Array.isArray(nextSteps) ? nextSteps : []).map((step, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-body)', margin: 0, lineHeight: 1.6 }}>{step}</p>
          ))}
        </div>
      </div>

      <AddToCalendarButton appointment={appointment} bookingReference={bookingReference} t={t} />

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/appointments/${id}`)} style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-md)', background: P, color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
          {t('bookingSuccess.viewDetails')}
        </button>
        <button onClick={() => navigate('/appointments')} style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', color: 'var(--text-body)', border: '1px solid var(--border-base)', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
          {t('bookingSuccess.myAppointments')}
        </button>
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/doctors" style={{ color: P, fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>{t('bookingSuccess.findDoctor')}</Link>
      </div>
    </div>
  );
}
