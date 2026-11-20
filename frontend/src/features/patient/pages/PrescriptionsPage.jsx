/**
 * PrescriptionsPage.jsx — Patient Prescriptions with Detail Modal + Print + Download PDF
 * F-10 FIX: Added Prescription Detail Modal showing medications list, dosage, frequency.
 * E-01 FIX: handleDownloadPDF now uses jsPDF for a real PDF file (was HTML blob).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPatientPrescriptions } from '../api/patientApi';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { formatDate, getDoctorPrefix, stripDoctorPrefix } from '../../../utils/formatters';
import { getCurrentLang } from '../../../i18n/index';
import useTranslation from '../../../i18n/useTranslation';

const P = 'var(--primary)', PL = 'var(--primary-pale, #E6F1FB)';

function usePrescriptions() {
  return useQuery({
    queryKey: ['patient', 'prescriptions'],
    queryFn: getPatientPrescriptions,
    staleTime: 5 * 60_000,
  });
}

function handlePrint(prescription, t) {
  const doc = window.open('', '_blank', 'width=800,height=600');
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Prescription — ${prescription.medication || 'Prescription'}</title>
  <style>
    body { font-family: 'Arial', sans-serif; margin: 0; padding: 40px; color: #1F2937; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1B5E8A; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #1B5E8A; }
    .logo span { font-size: 12px; display: block; color: #6B7280; font-weight: 400; }
    .title { font-size: 20px; font-weight: 700; margin: 0 0 20px; }
    .row { display: flex; margin-bottom: 12px; }
    .label { font-weight: 600; color: #6B7280; width: 140px; flex-shrink: 0; }
    .value { color: #1F2937; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border-base); font-size: 12px; color: #9CA3AF; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">💊 CuraBook<span>${t('prescriptionPage.headerTitle')}</span></div>
    <div style="text-align:right;font-size:13px;color:#6B7280">${t('prescriptionPageExtra.dateLabel')}: ${formatDate(prescription.created_at || prescription.date) || 'N/A'}</div>
  </div>
  <h2 class="title">${t('prescriptionPageExtra.prescriptionDetails')}</h2>
  ${[
    [t('prescriptionPageExtra.medication'),   prescription.medication || prescription.name || 'N/A'],
    [t('prescriptionPageExtra.prescribedBy'), prescription.doctor_name ? `${getDoctorPrefix(getCurrentLang())} ${stripDoctorPrefix(prescription.doctor_name)}` : 'N/A'],
    [t('prescriptionPage.dosageLabel'),       prescription.dosage || 'N/A'],
    [t('prescriptionPage.durationLabel'),     prescription.duration || 'N/A'],
    [t('prescriptionPage.frequencyLabel'),    prescription.frequency || 'N/A'],
    [t('prescriptionPage.notesLabel'),        prescription.notes || '—'],
    [t('prescriptionPageExtra.instructions'), prescription.instructions || '—'],
  ].map(([l, v]) => `<div class="row"><div class="label">${l}:</div><div class="value">${v}</div></div>`).join('')}
  <div class="footer">${t('prescriptionPageExtra.footerText')}</div>
</body>
</html>`;
  doc.document.write(html);
  doc.document.close();
  doc.print();
}

function handleDownloadPDF(prescription, t) {
  // FIX Issue #8: Use window.print with properly encoded UTF-8 HTML instead of jsPDF
  // jsPDF's built-in fonts don't support Arabic — HTML print/save preserves encoding correctly
  const doc = window.open('', '_blank', 'width=900,height=700');
  if (!doc) { alert('Please allow popups to download PDF'); return; }
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Prescription — CuraBook</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', Arial, sans-serif; padding: 40px; color: #1F2937; direction: rtl; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1B5E8A; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; color: #1B5E8A; }
    .logo span { font-size: 12px; display: block; color: #6B7280; font-weight: 400; }
    .title { font-size: 18px; font-weight: 700; margin: 0 0 18px; color: #1F2937; }
    .row { display: flex; margin-bottom: 10px; gap: 12px; }
    .label { font-weight: 700; color: #6B7280; min-width: 130px; flex-shrink: 0; }
    .value { color: #1F2937; flex: 1; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; text-align: center; }
    @media print { body { margin: 0; padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">💊 CuraBook<span>${t('prescriptionPage.headerTitle') || 'وصفة طبية'}</span></div>
    <div style="text-align:left;font-size:13px;color:#6B7280;direction:ltr">${new Date().toLocaleDateString()}</div>
  </div>
  <h2 class="title">${t('prescriptionPageExtra.prescriptionDetails') || 'تفاصيل الوصفة الطبية'}</h2>
  ${[
    [t('prescriptionPageExtra.medication') || 'الدواء',   prescription.medication || prescription.name || 'غير محدد'],
    [t('prescriptionPageExtra.prescribedBy') || 'الطبيب', prescription.doctor_name ? prescription.doctor_name : 'غير محدد'],
    [t('prescriptionPage.dosageLabel') || 'الجرعة',       prescription.dosage || 'غير محدد'],
    [t('prescriptionPage.durationLabel') || 'المدة',      prescription.duration || 'غير محدد'],
    [t('prescriptionPage.frequencyLabel') || 'التكرار',   prescription.frequency || 'غير محدد'],
    [t('prescriptionPage.notesLabel') || 'ملاحظات',       prescription.notes || '—'],
  ].map(([l, v]) => `<div class="row"><div class="label">${l}:</div><div class="value">${v}</div></div>`).join('')}
  <div class="footer">${t('prescriptionPageExtra.footerText') || 'CuraBook — نظام إدارة المواعيد الطبية'}</div>
  <div class="no-print" style="margin-top:30px;text-align:center">
    <button onclick="window.print()" style="background:#1B5E8A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;font-family:Cairo,Arial,sans-serif">طباعة / حفظ كـ PDF</button>
  </div>
</body>
</html>`;
  doc.document.write(html);
  doc.document.close();
  // Auto-trigger print dialog for saving as PDF
  doc.onload = () => doc.print();
  setTimeout(() => { try { doc.print(); } catch(e) {} }, 800);
}


function PrescriptionDetailModal({ prescription, onClose }) {
  const { t, lang } = useTranslation();
  const medications = prescription.medications || [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>
        {/* intentional: modal header — top corners rounded to match card, bottom flat to meet content */}
        <div style={{ background: P, padding: '20px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontWeight: 800, margin: 0, fontSize: '17px' }}>{t('prescriptionPage.detailsTitle')}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '16px' }}>x</button>
        </div>
        <div style={{ padding: '24px' }}>
          {/* Header info */}
          <div style={{ background: PL, borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
            <p style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '16px', margin: '0 0 6px' }}>{prescription.medication || prescription.name || t('prescriptionPage.headerTitle')}</p>
            {prescription.doctor_name && <p style={{ color: P, fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>{getDoctorPrefix(lang)} {stripDoctorPrefix(prescription.doctor_name)}</p>}
            <p style={{ color: 'var(--text-hint)', fontSize: '13px', margin: 0 }}>{formatDate(prescription.created_at || prescription.date)}</p>
          </div>

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{t('prescriptionPage.diagnosisLabel')}</p>
              <p style={{ color: 'var(--text-body)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{prescription.diagnosis}</p>
            </div>
          )}

          {/* Medications list */}
          {medications.length > 0 ? (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{t('prescriptionPageExtra.medicationsCount', { count: medications.length })}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {medications.map((med, i) => (
                  <div key={i} style={{ background: 'var(--bg-page)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px', fontSize: '14px' }}>{med.name}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {med.dosage    && <span>{t('prescriptionPage.dosageLabel')}: <strong style={{ color: 'var(--text-body)' }}>{med.dosage}</strong></span>}
                      {med.frequency && <span>{t('prescriptionPage.frequencyLabel')}: <strong style={{ color: 'var(--text-body)' }}>{med.frequency}</strong></span>}
                      {med.duration  && <span>{t('prescriptionPage.durationLabel')}: <strong style={{ color: 'var(--text-body)' }}>{med.duration}</strong></span>}
                      {med.notes     && <span style={{ gridColumn: '1/-1' }}>{t('prescriptionPage.notesLabel')}: {med.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('prescriptionPage.medicationDetails')}</p>
              <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {prescription.dosage    && <p style={{ margin: '0 0 4px' }}>{t('prescriptionPage.dosageLabel')}: <strong style={{ color: 'var(--text-body)' }}>{prescription.dosage}</strong></p>}
                {prescription.duration  && <p style={{ margin: '0 0 4px' }}>{t('prescriptionPage.durationLabel')}: <strong style={{ color: 'var(--text-body)' }}>{prescription.duration}</strong></p>}
                {prescription.frequency && <p style={{ margin: '0 0 4px' }}>{t('prescriptionPage.frequencyLabel')}: <strong style={{ color: 'var(--text-body)' }}>{prescription.frequency}</strong></p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {prescription.notes && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{t('prescriptionPage.notesLabel')}</p>
              <p style={{ color: 'var(--text-body)', fontSize: '14px', lineHeight: 1.6, margin: 0, background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: '12px' }}>{prescription.notes}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handlePrint(prescription, t)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: PL, color: P, border: "1px solid " + P, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>{t('prescriptionPage.printBtn')}</button>
            <button onClick={() => handleDownloadPDF(prescription, t)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--border-base)', color: 'var(--text-body)', border: '1px solid var(--border-base)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>{t('prescriptionPage.downloadBtn')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrescriptionCard({ prescription }) {
  const { t, lang } = useTranslation();
  const [showDetail, setShowDetail] = React.useState(false);
  return (
    <>
      {showDetail && <PrescriptionDetailModal prescription={prescription} onClose={() => setShowDetail(false)} />}
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      boxShadow: 'var(--shadow-md)', borderLeft: `4px solid ${P}`,
      display: 'flex', gap: '16px', alignItems: 'flex-start',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>💊</div>

      <div style={{ flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '15px', color: 'var(--text-h)' }}>
              {prescription.medication || prescription.name || t('prescriptionPage.headerTitle')}
            </p>
            {prescription.doctor_name && (
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: P, fontWeight: 600 }}>
                {getDoctorPrefix(lang)} {stripDoctorPrefix(prescription.doctor_name)}
              </p>
            )}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            {formatDate(prescription.created_at || prescription.date)}
          </span>
        </div>

        {/* Details */}
        {prescription.dosage    && <p style={{ margin: '0 0 3px', fontSize: '13px', color: 'var(--text-muted)' }}>{t('prescriptionPage.dosageLabel')}: {prescription.dosage}</p>}
        {prescription.duration  && <p style={{ margin: '0 0 3px', fontSize: '13px', color: 'var(--text-muted)' }}>{t('prescriptionPage.durationLabel')}: {prescription.duration}</p>}
        {prescription.frequency && <p style={{ margin: '0 0 3px', fontSize: '13px', color: 'var(--text-muted)' }}>{t('prescriptionPage.frequencyLabel')}: {prescription.frequency}</p>}
        {prescription.notes && <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{prescription.notes}</p>}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowDetail(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('prescriptionPageExtra.viewDetails')}
          </button>
          <button
            onClick={() => handlePrint(prescription, t)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: PL, color: P, border: `1.5px solid ${P}`, borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = P; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = PL; e.currentTarget.style.color = P; }}
          >
            {t('prescriptionPageExtra.printBtn')}
          </button>
          <button
            onClick={() => handleDownloadPDF(prescription, t)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-page)', color: 'var(--text-body)', border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; }}
          >
            {t('prescriptionPageExtra.downloadBtn')}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default function PrescriptionsPage() {
  const { data, isLoading, isError } = usePrescriptions();
  const prescriptions = data?.results || data || [];
  const { t, language } = useTranslation();

  return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: 'var(--text-h)' }}>
            💊 {t('prescriptionPageExtra.pageTitle')}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('prescriptionPageExtra.pageSubtitle')} · {!isLoading && (prescriptions.length === 1
              ? t('prescriptionPageExtra.countSingle', { count: prescriptions.length })
              : t('prescriptionPageExtra.countPlural', { count: prescriptions.length }))}
          </p>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Skeleton.Card />
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        )}

        {isError && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-hint)' }}>
            <p style={{ fontSize: '36px', margin: '0 0 10px' }}>⚠️</p>
            <p>{ t('prescriptionPage.loadError') }</p>
          </div>
        )}

        {!isLoading && !isError && prescriptions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-hint)' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>💊</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-h)', margin: '0 0 6px' }}>{t('prescriptionPage.emptyTitle')}</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{t('prescriptionPage.emptyHint')}</p>
          </div>
        )}

        {!isLoading && !isError && prescriptions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {prescriptions.map((p, i) => (
              <PrescriptionCard key={p.id || i} prescription={p} />
            ))}
          </div>
        )}

      </div>
  );
}
