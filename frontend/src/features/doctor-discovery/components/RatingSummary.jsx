/**
 * RatingSummary.jsx — Aggregate rating display (canonical implementation)
 * CRITICAL FIX: was circular re-export chain
 */
import { useTranslation } from '../../../i18n/useTranslation';

const P = 'var(--primary)';

function Bar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: 'var(--border-base)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 'var(--radius-xs)', transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-hint)', width: 28, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  );
}

export default function RatingSummary({ rating = 0, reviews_count = 0, rating_breakdown }) {
  const { t } = useTranslation();
  const avg = Number(rating).toFixed(1);
  const stars = Math.round(Number(rating));

  const breakdown = rating_breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Big score */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 48, fontWeight: 900, color: P, lineHeight: 1 }}>{avg}</p>
        <div style={{ fontSize: 22, color: '#F59E0B', marginBottom: 4 }}>{'★'.repeat(Math.min(stars, 5))}</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-hint)' }}>
          {t('ratingSummary.reviews').replace('{{count}}', reviews_count)}
        </p>
      </div>

      {/* Bar chart */}
      <div style={{ flex: 1, minWidth: 180 }}>
        {[5, 4, 3, 2, 1].map(n => (
          <Bar key={n} label={`${n} ★`} count={breakdown[n] ?? 0} total={reviews_count}
            color={n >= 4 ? '#31A870' : n === 3 ? '#F59E0B' : '#E97D61'} />
        ))}
      </div>
    </div>
  );
}
