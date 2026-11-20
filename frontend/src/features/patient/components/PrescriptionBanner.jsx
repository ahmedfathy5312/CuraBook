/**
 * PrescriptionBanner.jsx — i18n FIXED (Sprint 3)
 * All strings via useTranslation — bilingual AR/EN
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { tokens } from '../../../theme/tokens';
import apiClient from '../../../services/apiClient';
import { useTranslation } from '../../../i18n/useTranslation';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';

export default function PrescriptionBanner({ navigate }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = React.useState(false);
  const [hasPending, setHasPending] = React.useState(false);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    apiClient.get('/prescriptions/?status=SENT&page_size=1')
      .then(response => {
        const data = response.data;
        const n = data?.count ?? data?.results?.length ?? 0;
        setCount(n);
        setHasPending(n > 0);
      })
      .catch(() => {});
  }, []);

  if (!hasPending || dismissed) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #EAF4FB 0%, #D6EAF8 100%)',
      borderRadius: 'var(--radius-md)', padding: '14px 20px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      border: `1px solid ${PRIMARY}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>💊</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--text-h)' }}>
            {t('prescriptionBanner.newRx', { count })}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('prescriptionBanner.fromDoctor')}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Link to="/prescriptions">
          <button style={{
            background: PRIMARY, color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t('prescriptionBanner.viewBtn')}
          </button>
        </Link>
        <button onClick={() => setDismissed(true)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: '18px', color: 'var(--text-hint)', lineHeight: 1,
        }}>×</button>
      </div>
    </div>
  );
}
