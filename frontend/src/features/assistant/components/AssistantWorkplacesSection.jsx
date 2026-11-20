import { memo } from 'react';
/**
 * AssistantWorkplacesSection.jsx
 * Extracted from AssistantDashboardPage (853 lines → split)
 */
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import { getDoctorPrefix } from '../../../utils/formatters';
import Skeleton from '../../../components/ui/Skeleton';

const C = {
  teal:   tokens?.colors?.primary?.DEFAULT || '#0E7490',
  blue:   tokens?.colors?.info?.DEFAULT || '#3B82F6',
  text:   tokens.colors.gray[800],
  muted:  tokens.colors.gray[500],
  light:  tokens.colors.gray[400],
};

const Shimmer = ({ h = 44, r = 12 }) => (
  <Skeleton style={{ height: h, borderRadius: r }} />
);

function WorkplaceCard({ type, item }) {
  const { t, language } = useTranslation();
  const isHosp = type === 'hospital';
  const accent = isHosp ? C.blue : C.teal;
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${accent}`,
      transition: 'all .25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, background: accent + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          🏥
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
            color: accent, background: accent + '18', padding: '2px 8px', borderRadius: 'var(--radius-full)',
          }}>
            {isHosp ? t('assistantWorkplaces.hospital') : t('assistantWorkplaces.clinic')} · {item.role || t('assistantWorkplaces.assistant')}
          </span>
        </div>
      </div>
      {item.address && (
        <p style={{ margin: '0 0 4px', fontSize: 12, color: C.muted, display: 'flex', gap: 5 }}>
          <span>📍</span><span>{item.address}</span>
        </p>
      )}
      {item.doctor && (
        <p style={{ margin: 0, fontSize: 12, color: C.muted, display: 'flex', gap: 5 }}>
          <span>👨‍⚕️</span><span>{getDoctorPrefix(language)} {item.doctor}</span>
        </p>
      )}
    </div>
  );
}

export default memo(function AssistantWorkplacesSection({ clinics, hospitals, wpLoading }) {
  const { t } = useTranslation();
  if (wpLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 }}>
        {[1, 2, 3, 4].map(i => <Shimmer key={i} h={130} r={18} />)}
      </div>
    );
  }

  const isEmpty = clinics.length === 0 && hospitals.length === 0;

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      {isEmpty && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.muted }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏢</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>{t('assistantWorkplaces.noWorkplaces')}</p>
          <p style={{ fontSize: 14, color: C.light, maxWidth: 360, margin: '0 auto' }}>
            {t('assistantWorkplaces.noWorkplacesHint')}
          </p>
        </div>
      )}

      {clinics.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏥 {t('assistantWorkplaces.clinics')}
            <span style={{ fontSize: 12, background: C.teal + '18', color: C.teal, padding: '2px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>{clinics.length}</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 }}>
            {clinics.map(c => <WorkplaceCard key={`clinic_${c.id}`} type="clinic" item={c} />)}
          </div>
        </div>
      )}

      {hospitals.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏥 {t('assistantWorkplaces.hospitals')}
            <span style={{ fontSize: 12, background: C.blue + '18', color: C.blue, padding: '2px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>{hospitals.length}</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 }}>
            {hospitals.map(h => <WorkplaceCard key={`hospital_${h.id}`} type="hospital" item={h} />)}
          </div>
        </div>
      )}
    </div>
  );
});
