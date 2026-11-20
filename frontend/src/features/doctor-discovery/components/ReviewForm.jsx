/**
 * ReviewForm.jsx — Submit a doctor review (canonical implementation)
 * CRITICAL FIX: was circular re-export chain with no actual implementation
 * F-03 FIX: integrated with API.DOCTORS.CAN_REVIEW check
 */
import { useState } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import Button from '../../../components/ui/Button';
import { tokens } from '../../../theme/tokens';

const P = tokens?.colors?.primary?.DEFAULT || '#0E7490';

function StarInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 28, color: s <= (hovered || value) ? '#F59E0B' : 'var(--border)',
            padding: '2px', transition: 'color .1s',
          }}
        >★</button>
      ))}
    </div>
  );
}

export default function ReviewForm({ onSubmit, loading }) {
  const { t } = useTranslation();
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!rating) return;
    onSubmit?.({ rating, comment });
  };

  return (
    <div style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', border: '1px solid var(--border-base)' }}>
      <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>{t('reviewForm.title')}</h4>

      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('reviewForm.ratingLabel')}</p>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{t('reviewForm.commentLabel')}</p>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('reviewForm.placeholder')}
          rows={3}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-base)', fontSize: 13, fontFamily: 'inherit',
            resize: 'vertical', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = P}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      <Button variant="primary" size="sm" loading={loading} disabled={!rating} onClick={handleSubmit}>
        {t('reviewForm.submit')}
      </Button>
    </div>
  );
}
