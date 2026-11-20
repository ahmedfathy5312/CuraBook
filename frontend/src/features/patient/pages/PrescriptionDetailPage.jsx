/**
 * PrescriptionDetailPage.jsx — Sprint 3 i18n
 * Route: /prescriptions/:id
 * All strings via useTranslation() — bilingual AR/EN
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL = tokens?.colors?.primary?.lighter || '#E0F7FA';
const PD = tokens?.colors?.primary?.dark || '#0C6478';

function MedicineBadge({ medicine, t }) {
  const name     = medicine.name || medicine.drug_name || '';
  const dosage   = medicine.dosage || medicine.dose || '';
  const freq     = medicine.frequency || medicine.instructions || '';
  const duration = medicine.duration || '';

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', marginBottom: 10, borderLeft: `4px solid ${P}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>💊 {name}</p>
          {dosage   && <p style={{ margin: '0 0 3px', fontSize: 13, color: 'var(--text-muted)' }}>{t('prescriptionDetail.dosage')} <b>{dosage}</b></p>}
          {freq     && <p style={{ margin: '0 0 3px', fontSize: 13, color: 'var(--text-muted)' }}>{t('prescriptionDetail.frequency')} <b>{freq}</b></p>}
          {duration && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('prescriptionDetail.duration')} <b>{duration}</b></p>}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {medicine.quantity && (
            <span style={{ background: PL, color: P, borderRadius: 'var(--radius-md)', padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              × {medicine.quantity}
            </span>
          )}
        </div>
      </div>
      {medicine.notes && (
        <div style={{ marginTop: 10, background: tokens.colors.warning.bg, borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
          <p style={{ margin: 0, fontSize: 12, color: tokens.colors.warning.text }}>{t('prescriptionDetail.note')} {medicine.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { t, isRTL, lang } = useTranslation();

  const { data: prescription, isLoading, isError } = useQuery({
    queryKey: ['prescription', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API.PRESCRIPTIONS.DETAIL(id));
      return data;
    },
    enabled: !!id,
  });

  const handlePrint = () => window.print();

  const handleShare = async () => {
    const medicines = prescription?.medicines || prescription?.medications || prescription?.items || [];
    const text = `${t('prescriptionDetail.label')} — ${prescription?.doctor_name || ''}\n${prescription?.created_at?.slice(0, 10) || ''}\n${medicines.length} ${t('prescriptionDetail.medicineCount').replace('{{count}}', medicines.length)}`;
    if (navigator.share) {
      navigator.share({ title: t('prescriptionDetail.label'), text }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(text);
    }
  };

  if (isLoading) return (
    <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height={32} width="40%" borderRadius={8} />
      <Skeleton height={160} borderRadius={20} />
      <Skeleton height={240} borderRadius={20} />
    </div>
  );

  if (isError || !prescription) return (
    <div style={{ maxWidth: 680, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>{t('prescriptionDetail.notFound')}</h2>
      <Button variant="primary" onClick={() => navigate('/prescriptions')}>{t('prescriptionDetail.backToList')}</Button>
    </div>
  );

  const medicines  = prescription.medicines || prescription.medications || prescription.items || [];
  const doctorName = prescription.doctor_name || prescription.doctor?.full_name || '';
  const dateStr    = prescription.created_at || prescription.date || '';
  const locale     = lang === 'ar' ? 'ar-EG' : 'en-US';
  const formatted  = dateStr ? new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: P, fontSize: 14, fontWeight: 600, marginBottom: 20, fontFamily: 'inherit', padding: 0 }}>
        {t('prescriptionDetail.back')}
      </button>

      {/* Header card */}
      <div style={{ background: `linear-gradient(135deg, ${P}, ${PD})`, borderRadius: 'var(--radius-lg)', padding: '24px', color: '#fff', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {t('prescriptionDetail.label')}
          </p>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800 }}>
            {`${t('common.doctorPrefix')} ${doctorName}`}
          </h1>
          {formatted && <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>📅 {formatted}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('prescriptionDetail.print')}
          </button>
          <button onClick={handleShare}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('prescriptionDetail.share')}
          </button>
        </div>
      </div>

      {/* Patient info */}
      {prescription.patient_name && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: tokens.shadows.card, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 24 }}>👤</span>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: 'var(--text-h)' }}>{prescription.patient_name}</p>
            {prescription.patient_age && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                {t('prescriptionDetail.patientAge').replace('{{age}}', prescription.patient_age)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Diagnosis */}
      {(prescription.diagnosis || prescription.notes) && (
        <div style={{ background: tokens.colors.info.bg, borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16, border: `1px solid ${tokens?.colors?.info?.DEFAULT || '#3B82F6'}20` }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{t('prescriptionDetail.diagnosis')}</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {prescription.diagnosis || prescription.notes}
          </p>
        </div>
      )}

      {/* Medicines list */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: tokens.shadows.card, padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
            {t('prescriptionDetail.medicines').replace('{{count}}', medicines.length)}
          </h2>
          <span style={{ background: PL, color: P, borderRadius: 'var(--radius-lg)', padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            {t('prescriptionDetail.medicineCount').replace('{{count}}', medicines.length)}
          </span>
        </div>
        {medicines.length === 0 ? (
          <p style={{ color: tokens.colors.gray[400], fontSize: 14, textAlign: 'center', padding: '20px 0', margin: 0 }}>
            {t('prescriptionDetail.noMedicines')}
          </p>
        ) : (
          medicines.map((med, i) => <MedicineBadge key={i} medicine={med} t={t} />)
        )}
      </div>

      {/* Doctor note */}
      {prescription.doctor_note && (
        <div style={{ background: PL, borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: PD }}>{t('prescriptionDetail.doctorNote')}</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{prescription.doctor_note}</p>
        </div>
      )}

      {/* Follow-up */}
      {prescription.follow_up_date && (
        <div style={{ background: tokens.colors.warning.bg, borderRadius: 'var(--radius-lg)', padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 24 }}>📅</span>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: tokens.colors.warning.text }}>
              {t('prescriptionDetail.followUp')}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: tokens?.colors?.warning?.DEFAULT || '#F59E0B' }}>
              {new Date(prescription.follow_up_date).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          button, nav, header, footer { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
