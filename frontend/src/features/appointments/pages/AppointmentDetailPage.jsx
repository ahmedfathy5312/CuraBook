/**
 * AppointmentDetailPage.jsx — تفاصيل الموعد (إعادة بناء كاملة v17-fix)
 * - استخدام tokens بدل Tailwind hardcoded classes
 * - Reschedule flow كامل
 * - Add to Calendar (Google)
 * - Share / Copy
 * - Status badge من tokens.status
 * - Video call CTA
 * - Review form للمواعيد المكتملة
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCancelAppointment } from '../hooks/useMyAppointments';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import ReviewForm from '../../doctor-discovery/components/ReviewForm';
import RescheduleModal from '../components/RescheduleModal';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { useTranslation } from '../../../i18n/useTranslation';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PD = tokens?.colors?.primary?.dark || '#0C6478';
const UI = {
  surface: 'var(--bg-card)',
  surfaceSoft: 'var(--bg-elevated, var(--bg-card))',
  textStrong: 'var(--text-h, #F8FAFC)',
  textBody: 'var(--text-body, #E2E8F0)',
  textMuted: 'var(--text-muted, #CBD5E1)',
  border: 'var(--border-base, #334155)',
};

function buildGoogleCalUrl(appt, t) {
  const dateStr = appt?.date || appt?.scheduled_date || '';
  if (!dateStr) return null;
  const timeStr = (appt?.time || appt?.slot?.start_time || '09:00').replace(':', '');
  const dateF = dateStr.replace(/-/g, '');
  const start = `${dateF}T${timeStr}00`;
  const startD = new Date(`${dateStr}T${(appt?.time || '09:00')}:00`);
  const endD = new Date(startD.getTime() + 30 * 60000);
  const end = endD.toISOString().replace(/[-:]/g, '').split('.')[0];
  const title = encodeURIComponent((t ? t('bookingSuccess.calendarTitle') : 'Doctor Appointment') + ' - ' + (appt?.doctor_name || ''));
  const loc   = encodeURIComponent(appt?.clinic_name || appt?.hospital_name || '');
  const det   = encodeURIComponent('#' + (appt?.public_id || appt?.id || ''));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${det}&location=${loc}`;
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'14px 0', borderBottom:`1px solid ${UI.border}` }}>
      <span style={{ fontSize:18, width:24, flexShrink:0, marginTop:1 }}>{icon}</span>
      <div>
        <p style={{ margin:'0 0 4px', fontSize:12, color:UI.textMuted, fontWeight:700 }}>{label}</p>
        <p style={{ margin:0, fontSize:15, color:UI.textStrong, fontWeight:700, lineHeight:1.7 }}>{value}</p>
      </div>
    </div>
  );
}

export default function AppointmentDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const cancelMut = useCancelAppointment();
  const { t, isRTL } = useTranslation();
  const locale = isRTL ? 'ar-EG' : 'en-US';

  const [showReschedule, setShowReschedule] = useState(false);
  const [cancelConfirm,  setCancelConfirm]  = useState(false);
  const [copied, setCopied]                 = useState(false);

  const { data: appointment, isLoading, isError } = useQuery({
    queryKey: ['appointments', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API.APPOINTMENTS.DETAIL(id));
      return data;
    },
    enabled: !!id,
  });

  const handleCancel = () => {
    cancelMut.mutate(id, { onSuccess: () => navigate('/appointments') });
  };

  const handleShare = async () => {
    const text = `موعدي مع د. ${appointment?.doctor_name || 'الطبيب'}\nالتاريخ: ${appointment?.date}\nالوقت: ${appointment?.time || ''}\nرقم الحجز: #${appointment?.public_id || appointment?.id}`;
    if (navigator.share) {
      navigator.share({ title: 'موعدي الطبي', text }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return (
    <div style={{ maxWidth:720, margin:'32px auto', padding:'0 20px', display:'flex', flexDirection:'column', gap:16 }}>
      <Skeleton height={32} width="40%" borderRadius={8} />
      <Skeleton height={180} borderRadius={20} />
      <Skeleton height={280} borderRadius={20} />
    </div>
  );

  if (isError || !appointment) return (
    <div style={{ maxWidth:720, margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:UI.textStrong, marginBottom:8 }}>{t('appointmentDetail.notFoundTitle')}</h2>
      <p style={{ color:UI.textMuted, marginBottom:24 }}>{t('appointmentDetail.notFoundMsg')}</p>
      <Button variant="primary" onClick={() => navigate('/appointments')}>{t('appointmentDetail.myAppointments')}</Button>
    </div>
  );

  const status    = (appointment.status || 'pending').toLowerCase();
  const sc        = tokens.colors?.status?.[status] || tokens.colors?.status?.pending || { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B', dot: '#F59E0B', label: 'قيد الانتظار' };
  const doctorName = appointment.doctor_name || appointment.doctor?.full_name || 'الطبيب';
  const date      = appointment.date || appointment.scheduled_date || '';
  const time      = appointment.time || appointment.slot?.start_time || '';
  const location  = appointment.clinic_name || appointment.hospital_name || '';
  const fee       = appointment.consultation_fee || appointment.fee;
  const doctorId  = appointment.doctor?.id || appointment.doctor_id;
  const calUrl    = buildGoogleCalUrl(appointment);
  const canCancel    = !['cancelled','completed','rejected'].includes(status);
  const canReschedule = ['pending','confirmed'].includes(status) && !!doctorId;
  const isOnline    = appointment.visit_type === 'ONLINE';
  const isCompleted = status === 'completed';

  const formatDate = d => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString(locale, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  };

  const feeLabel = isRTL
    ? `${Number(fee).toLocaleString('ar-EG')} ج.م`
    : `EGP ${Number(fee).toLocaleString('en-US')}`;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ maxWidth:720, margin:'0 auto', padding:'32px 20px 32px' }}>

      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:P, fontSize:14, fontWeight:600, marginBottom:20, fontFamily:'inherit', padding:0 }}>
        {t('appointmentDetail.back')}
      </button>

      {/* Header Card */}
      <div style={{ background:UI.surface, borderRadius: 'var(--radius-lg)', boxShadow:tokens.shadows.card, border:`1px solid ${UI.border}`, overflow:'hidden', marginBottom:16 }}>

        {/* Status bar */}
        <div style={{ background:sc.bg, borderBottom:`2px solid ${sc.border}`, padding:'10px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:sc.dot }} />
            <span style={{ fontSize:13, fontWeight:700, color:sc.text }}>{sc.label}</span>
          </div>
          <span style={{ fontSize:12, color:'#475569', fontFamily:'monospace', fontWeight:700 }}>
            #{appointment.public_id || appointment.id}
          </span>
        </div>

        {/* Doctor info */}
        <div style={{ padding:'24px', display:'flex', gap:16, alignItems:'center', borderBottom:`1px solid ${UI.border}`, flexWrap:'wrap' }}>
          <Avatar name={doctorName} src={appointment.doctor?.avatar} size="xl" />
          <div style={{ flex:1, minWidth:160 }}>
            <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:UI.textStrong }}>
              {isRTL ? `د. ${doctorName}` : `Dr. ${doctorName}`}
            </h2>
            <p style={{ margin:'0 0 8px', fontSize:13, color:P, fontWeight:600 }}>
              {appointment.doctor?.specialty || appointment.specialty || ''}
            </p>
            {fee && <span style={{ fontSize:13, fontWeight:700, color:tokens?.colors?.warning?.DEFAULT || '#F59E0B' }}>{feeLabel}</span>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {calUrl && (
              <a href={calUrl} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius: 'var(--radius-md)', border:`1px solid ${UI.textMuted}`, background:UI.surfaceSoft, textDecoration:'none', fontSize:12, fontWeight:700, color:UI.textStrong }}>
                {t('appointmentDetail.addToCalendar')}
              </a>
            )}
            <button onClick={handleShare} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius: 'var(--radius-md)', border:`1px solid ${UI.textMuted}`, background:UI.surfaceSoft, fontSize:12, fontWeight:700, color:UI.textStrong, cursor:'pointer', fontFamily:'inherit' }}>
              {copied ? t('appointmentDetail.copied') : t('appointmentDetail.share')}
            </button>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding:'8px 24px 16px' }}>
          <InfoRow icon="📅" label={t('appointmentDetail.date')}      value={formatDate(date)} />
          <InfoRow icon="🕐" label={t('appointmentDetail.time')}      value={time} />
          <InfoRow icon="📍" label={t('appointmentDetail.location')}  value={location} />
          <InfoRow icon="💊" label={t('appointmentDetail.visitType')} value={isOnline ? t('appointmentDetail.visitOnline') : t('appointmentDetail.visitInPerson')} />
          {appointment.reason && <InfoRow icon="📝" label={t('appointmentDetail.reason')} value={appointment.reason} />}
          {appointment.notes  && <InfoRow icon="🗒" label={t('appointmentDetail.notes')}  value={appointment.notes}  />}
        </div>
      </div>

      {/* Video CTA */}
      {isOnline && status === 'confirmed' && appointment.video_session_id && (
        <div style={{ background:`linear-gradient(135deg,${P},${PD})`, borderRadius: 'var(--radius-lg)', padding:'20px 24px', marginBottom:16, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:36 }}>🎥</div>
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 4px', fontWeight:800, color:'#fff', fontSize:15 }}>{t('appointmentDetail.onlineAppt')}</p>
            <p style={{ margin:0, color:'rgba(255,255,255,0.8)', fontSize:13 }}>{t('appointmentDetail.onlineApptReady')}</p>
          </div>
          <button onClick={() => navigate(`/video/${appointment.video_session_id}`)} style={{ background:'var(--bg-card)', color:P, border:'none', borderRadius: 'var(--radius-md)', padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            {t('appointmentDetail.joinCall')}
          </button>
        </div>
      )}

      {/* Actions */}
      {(canCancel || canReschedule || doctorId) && (
        <div style={{ background:UI.surface, borderRadius: 'var(--radius-lg)', boxShadow:tokens.shadows.card, border:`1px solid ${UI.border}`, padding:'20px 24px', marginBottom:16 }}>
          <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 14px', color:UI.textStrong }}>{t('appointmentDetail.actions')}</h3>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {doctorId && (
              <Button variant="primary" onClick={() => navigate(`/book/${doctorId}`)}>
                {t('appointmentDetail.newBooking')}
              </Button>
            )}
            {canReschedule && (
              <Button variant="outline" onClick={() => setShowReschedule(true)}>
                {t('appointmentDetail.reschedule')}
              </Button>
            )}
            {canCancel && !cancelConfirm && (
              <button
                onClick={() => setCancelConfirm(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius: 'var(--radius-md)', border:`1.5px solid ${tokens?.colors?.danger?.DEFAULT || '#E97D61'}`, background:UI.surfaceSoft, color:tokens?.colors?.danger?.DEFAULT || '#E97D61', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
              >
                {t('appointmentDetail.cancelAppt')}
              </button>
            )}
            {cancelConfirm && (
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <p style={{ fontSize:13, color:tokens?.colors?.danger?.DEFAULT || '#E97D61', fontWeight:600, margin:0 }}>{t('appointmentDetail.confirmCancel')}</p>
                <Button variant="danger" onClick={handleCancel} loading={cancelMut.isPending}>{t('appointmentDetail.yesCancel')}</Button>
                <Button variant="ghost" onClick={() => setCancelConfirm(false)}>{t('appointmentDetail.no')}</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review form */}
      {isCompleted && !appointment.has_review && appointment.doctor?.public_id && (
        <div style={{ background:UI.surface, borderRadius: 'var(--radius-lg)', boxShadow:tokens.shadows.card, border:`1px solid ${UI.border}`, padding:'24px', marginBottom:16 }}>
          <h3 style={{ fontSize:14, fontWeight:800, margin:'0 0 6px', color:UI.textStrong }}>{t('appointmentDetail.rateTitle')}</h3>
          <p style={{ fontSize:13, color:UI.textMuted, margin:'0 0 16px' }}>{t('appointmentDetail.rateSubtitle')}</p>
          <ReviewForm
            doctorPublicId={appointment.doctor.public_id}
            appointmentId={appointment.id}
            onSuccess={() => {}}
          />
        </div>
      )}

      {isCompleted && appointment.has_review && (
        <div style={{ background:tokens.colors.success.bg, borderRadius: 'var(--radius-lg)', padding:'16px 20px', marginBottom:16 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:tokens.colors.success.text }}>{t('appointmentDetail.reviewDone')}</p>
        </div>
      )}

      {/* Reschedule Modal */}
      {showReschedule && (
        <RescheduleModal
          appointmentId={id}
          doctorId={doctorId}
          clinicId={appointment.clinic_id || appointment.clinic?.id}
          hospitalId={appointment.hospital_id || appointment.hospital?.id}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
