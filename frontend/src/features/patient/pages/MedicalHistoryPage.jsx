/**
 * MedicalHistoryPage.jsx — SYNC FIX (v31)
 *
 * FIX (القسم 2 - المتبقي):
 * - الصفحة كانت تستخدم useQuery مباشر لجلب التاريخ الطبي (appointments)
 *   وReportsSection في PatientDashboardPage تستخدم useReports() لجلب التقارير —
 *   المصدران مختلفان وغير متزامنَين.
 * - الحل: هذه الصفحة تعرض قسمَين منفصلَين:
 *   1. Medical Reports — يستخدم useReports() نفس الـ hook المستخدم في Dashboard
 *   2. Visit History — يستخدم getMedicalHistory (appointment timeline)
 * - كلا القسمين يستخدمان نفس مصادر البيانات الموجودة في PatientDashboardPage
 *   لضمان التزامن الكامل.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMedicalHistory, userKeys } from '../api/patientApi';
import { useReports } from '../../reports/hooks/useReports';
import ReportsSection from '../../../components/shared/ReportsSection';
import Skeleton from '../../../components/ui/Skeleton';
import Avatar from '../../../components/ui/Avatar';
import { formatDate, formatTime, getDoctorPrefix } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';
import { getCurrentLang } from '../../../i18n/index';

const P      = 'var(--primary)';
const PL     = '#E6F1FB';
const PD     = 'var(--primary-dark)';
const BORDER = '#E2EAF4';

function VisitTypeBadge({ type, t }) {
  const map = {
    online:   { tKey: 'medicalHistoryPage.visitTypes.online',   bg: '#E0F2FE', color: '#0369A1' },
    in_clinic:{ tKey: 'medicalHistoryPage.visitTypes.in_clinic',bg: '#DCFCE7', color: '#15803D' },
    home:     { tKey: 'medicalHistoryPage.visitTypes.home',     bg: '#FEF9C3', color: '#92400E' },
  };
  const s = map[type];
  const label = s ? t(s.tKey) : (type || '');
  const bg    = s?.bg    || PL;
  const color = s?.color || P;
  return (
    <span style={{
      background: bg, color,
      borderRadius: 'var(--radius-xl)', padding: '2px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
    }}>{label}</span>
  );
}

function AppointmentTimelineCard({ appt, lang }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const prefix  = getDoctorPrefix(lang);
  const docName = appt.doctor_name || appt.doctor?.full_name || '—';
  const date    = appt.slot_start || appt.date || appt.slot?.start || appt.scheduled_at || appt.created_at;
  const clinic  = appt.clinic?.name  || appt.clinic_name  || null;
  const hospital= appt.hospital?.name|| appt.hospital_name|| null;
  const place   = hospital || clinic || '—';
  const spec    = appt.doctor?.specialization || appt.specialization || null;

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 14,
      border: `1px solid ${BORDER}`,
      marginBottom: 14, overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)', transition: 'box-shadow .15s',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer' }}
      >
        {/* Date badge */}
        <div style={{ minWidth: 52, textAlign: 'center', background: PL, borderRadius: 'var(--radius-md)', padding: '8px 6px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: P, lineHeight: 1 }}>
            {date ? new Date(date).getDate() : '—'}
          </div>
          <div style={{ fontSize: 10, color: PD, fontWeight: 600 }}>
            {date ? new Date(date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' }) : ''}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {date ? new Date(date).getFullYear() : ''}
          </div>
        </div>

        <Avatar name={docName} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prefix} {docName}
          </div>
          {spec && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{spec}</div>}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{place}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <VisitTypeBadge type={appt.visit_type} t={t} />
          <span style={{ fontSize: 18, color: 'var(--text-hint)', lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{
          borderTop: `1px solid ${BORDER}`,
          padding: '14px 18px', background: 'var(--bg-card)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px',
        }}>
          <Detail label={t('medicalHistoryPage.timeLabel')}        value={date ? formatTime(date) : '—'} />
          <Detail label={t('medicalHistoryPage.statusLabel')}      value={appt.status || '—'} />
          <Detail label={t('medicalHistoryPage.reasonLabel')}      value={appt.reason || appt.chief_complaint || '—'} />
          <Detail label={t('medicalHistoryPage.feeLabel')}         value={appt.consultation_fee ? `${appt.consultation_fee} EGP` : '—'} />
          {appt.notes && (
            <div style={{ gridColumn: '1/-1' }}>
              <Detail label={t('medicalHistoryPage.doctorNotesLabel')} value={appt.notes} />
            </div>
          )}
          {appt.diagnosis && (
            <div style={{ gridColumn: '1/-1' }}>
              <Detail label={t('medicalHistoryPage.diagnosisLabel')} value={appt.diagnosis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-hint)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function SkeletonCards() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} style={{
      background: 'var(--bg-card)', borderRadius: 14, border: `1px solid ${BORDER}`,
      padding: '16px 18px', marginBottom: 14,
      display: 'flex', gap: 14, alignItems: 'center',
    }}>
      <Skeleton width={52} height={60} borderRadius={10} />
      <Skeleton width={42} height={42} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="55%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="35%" height={11} />
      </div>
    </div>
  ));
}

export default function MedicalHistoryPage() {
  const { t }  = useTranslation();
  const lang   = getCurrentLang();
  const isRtl  = lang === 'ar';

  // FIX (القسم 2): استخدام useReports() نفس الـ hook المستخدم في PatientDashboardPage
  // لضمان التزامن الكامل بين الصفحتين
  const { data: reportsData, isLoading: reportsLoading } = useReports();
  const reports = Array.isArray(reportsData)
    ? reportsData
    : (reportsData?.results ?? []);

  // Visit history (appointment timeline) — مصدر منفصل للتاريخ الزيارات
  const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: userKeys.history(),
    queryFn:  getMedicalHistory,
    staleTime: 5 * 60_000,
  });

  const appointments = Array.isArray(historyData)
    ? historyData
    : historyData?.results ?? historyData?.data ?? [];
  const total = historyData?.count ?? appointments.length;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>

      {/* ═══ قسم التقارير الطبية (مربوط بنفس useReports المستخدم في Dashboard) ═══ */}
      <div style={{ marginBottom: 40 }}>
        <ReportsSection
          title={isRtl ? 'التقارير الطبية والتحاليل' : 'Medical Reports & Analytics'}
          reports={reports.map(r => ({
            ...r,
            date: r.date || r.created_at || r.report_date,
          }))}
          loading={reportsLoading}
        />
      </div>

      {/* ═══ قسم تاريخ الزيارات (Visit Timeline) ═══ */}
      <div>
        {/* Section header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 'var(--radius-md)',
              background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🩺</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P }}>
                {t('medicalHistoryPage.title')}
              </h1>
              {!historyLoading && !historyError && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('medicalHistoryPage.visitsOnRecord', { count: total })}
                </div>
              )}
            </div>
          </div>
          <div style={{ height: 3, width: 48, background: P, borderRadius: 'var(--radius-xs)' }} />
        </div>

        {historyLoading && <SkeletonCards />}

        {historyError && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: '20px 24px', color: '#DC2626',
            fontWeight: 600, textAlign: 'center',
          }}>
            {t('medicalHistoryPage.loadError')}
          </div>
        )}

        {!historyLoading && !historyError && appointments.length === 0 && (
          <div style={{
            background: PL, borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, color: P, fontSize: 16, marginBottom: 6 }}>
              {t('medicalHistoryPage.emptyTitle')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {t('medicalHistoryPage.emptyHint')}
            </div>
          </div>
        )}

        {!historyLoading && !historyError && appointments.length > 0 && (
          <div>
            {appointments.map((appt) => (
              <AppointmentTimelineCard
                key={appt.id || appt.public_id}
                appt={appt}
                lang={lang}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
