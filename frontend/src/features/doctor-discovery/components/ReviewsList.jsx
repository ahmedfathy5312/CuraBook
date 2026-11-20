/**
 * ReviewsList.jsx — List of doctor reviews (canonical implementation)
 * CRITICAL FIX: was circular re-export chain
 */
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import { formatDate } from '../../../utils/formatters';

function Stars({ value }) {
  const n = Math.round(Number(value || 0));
  return <span style={{ color: '#F59E0B', fontSize: 14 }}>{'★'.repeat(Math.min(n, 5))}{'☆'.repeat(Math.max(0, 5 - n))}</span>;
}

export default function ReviewsList({ reviews = [], loading }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 14, background: 'var(--border-base)', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-hint)', fontSize: 13 }}>
        {t('reviewsList.noReviews')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reviews.map(r => (
        <div key={r.id} style={{
          background: 'var(--bg-card)', borderRadius: 14, padding: '14px 18px',
          border: '1px solid var(--border-base)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={r.patient_name || r.reviewer_name} size={34} />
            <div>
              <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 600 }}>{r.patient_name || r.reviewer_name || t('reviewsList.anonymous')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stars value={r.rating} />
                <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{formatDate(r.created_at)}</span>
              </div>
            </div>
          </div>
          {r.comment && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>{r.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}
