/**
 * HealthSummarySection.jsx — i18n FIXED (Sprint 3)
 * All strings via useTranslation — bilingual AR/EN
 */
import React from 'react';
import { tokens } from '../../../theme/tokens';
import apiClient from '../../../services/apiClient';
import { useTranslation } from '../../../i18n/useTranslation';
import { getCurrentLang } from '../../../i18n/index';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';

export default function HealthSummarySection({ navigate }) {
  const { t } = useTranslation();
  const lang  = getCurrentLang();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      apiClient.get('/prescriptions/?page_size=1&ordering=-created_at').then(r => r.data).catch(() => null),
      apiClient.get('/appointments/?status=completed&page_size=1&ordering=-date').then(r => r.data).catch(() => null),
      apiClient.get('/appointments/?status=confirmed&page_size=3&ordering=date').then(r => r.data).catch(() => null),
    ]).then(([rx, lastAppt, followups]) => {
      setData({
        lastDoctorName: lastAppt?.results?.[0]?.doctor?.full_name || null,
        lastVisitDate:  lastAppt?.results?.[0]?.date || null,
        medications:    rx?.results?.[0]?.medications || rx?.results?.[0]?.items || [],
        rxDate:         rx?.results?.[0]?.created_at || null,
        followupCount:  followups?.count || 0,
        nextFollowup:   followups?.results?.[0] || null,
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ marginTop: '28px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ height: 16, width: 160, background: '#F0F0F0', borderRadius: 'var(--radius-sm)', marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 90, background: '#F4F8FB', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  if (!data?.lastDoctorName && !data?.rxDate && !data?.nextFollowup) return null;

  const fmtDate = (d) => {
    if (!d) return null;
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'long', day: 'numeric', month: 'long',
      }).format(new Date(d));
    } catch { return d; }
  };

  const prefix = t('common.doctorPrefix');

  // BUG-FIX Issue#19: strip any existing Dr./د. prefix from the backend name
  // to prevent doubling like "د. د. هاني" or "Dr. د. هاني"
  const cleanDoctorName = data.lastDoctorName
    ? data.lastDoctorName.replace(/^(د\.\s*|Dr\.\s*)/i, '').trim()
    : null;

  const cards = [
    {
      icon: '🩺', label: t('healthSummary.lastVisit'),
      value: cleanDoctorName ? `${prefix} ${cleanDoctorName}` : t('healthSummary.noVisits'),
      sub: data.lastVisitDate ? fmtDate(data.lastVisitDate) : null,
      color: PRIMARY, paleBg: '#EAF4FB',
      action: cleanDoctorName ? () => navigate('/appointments') : null,
    },
    {
      icon: '💊', label: t('healthSummary.currentMeds'),
      value: data.medications?.length > 0
        ? t('healthSummary.medsCount', { count: data.medications.length })
        : t('healthSummary.noRx'),
      sub: data.rxDate ? t('healthSummary.rxDate', { date: fmtDate(data.rxDate) }) : null,
      color: '#1A8A5A', paleBg: '#E8F5EF',
      action: data.rxDate ? () => navigate('/prescriptions') : null,
    },
    {
      icon: '📅', label: t('healthSummary.followUps'),
      value: data.followupCount > 0
        ? t('healthSummary.apptCount', { count: data.followupCount })
        : t('healthSummary.noAppts'),
      sub: data.nextFollowup ? fmtDate(data.nextFollowup.date) : null,
      color: '#7C3AED', paleBg: '#EDE9FE',
      action: data.nextFollowup ? () => navigate('/appointments') : null,
    },
  ];

  return (
    <div style={{ marginTop: '28px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
        {t('healthSummary.title')}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px' }}>
        {cards.map((card, i) => (
          <div key={i}
            onClick={card.action || undefined}
            style={{
              background: card.paleBg, borderRadius: 'var(--radius-md)', padding: '16px',
              cursor: card.action ? 'pointer' : 'default',
              transition: 'transform 0.15s',
              borderLeft: `4px solid ${card.color}`,
            }}
            onMouseOver={e => card.action && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'none')}
          >
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{card.icon}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '4px' }}>{card.label}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: card.color }}>{card.value}</div>
            {card.sub && <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '4px' }}>{card.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
