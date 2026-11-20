/**
 * PostAppointmentReviewPage.jsx
 * شاشة تقييم الطبيب بعد انتهاء الموعد — Sprint 3 i18n fix
 * Route: /review/:appointmentId
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL = tokens?.colors?.primary?.lighter || '#E0F7FA';

const QUICK_TAG_KEYS = [
  'professional', 'clearExplain', 'punctual', 'cleanClinic',
  'fairPrice', 'cooperative', 'experienced', 'recommend',
];

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 40, lineHeight: 1, transition: 'transform .1s', transform: (hovered || value) >= s ? 'scale(1.15)' : 'scale(1)' }}
        >
          <span style={{ color: (hovered || value) >= s ? '#F59E0B' : 'var(--border)', transition: 'color .15s' }}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function PostAppointmentReviewPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, isRTL } = useTranslation();

  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState('');
  const [tags,      setTags]      = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointments', 'detail', appointmentId],
    queryFn: async () => {
      const { data } = await apiClient.get(API.APPOINTMENTS.DETAIL(appointmentId));
      return data;
    },
    enabled: !!appointmentId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const doctorId = appointment?.doctor?.public_id || appointment?.doctor?.id || appointment?.doctor_id;
      await apiClient.post(API.REVIEWS.CREATE(doctorId), {
        appointment: appointmentId,
        rating,
        comment: [comment, tags.map(key => t(`postReview.tags.${key}`)).join(' · ')].filter(Boolean).join('\n'),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['appointments']);
      setSubmitted(true);
    },
  });

  const toggleTag = (key) => {
    setTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  if (isLoading) return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px' }}>
      <Skeleton height={200} borderRadius={20} />
    </div>
  );

  const doctorName = appointment?.doctor_name || appointment?.doctor?.full_name || t('common.doctor');

  if (submitted) return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.colors.background, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: tokens.colors.success.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 40 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: tokens.colors.gray[800], margin: '0 0 10px' }}>
          {t('postReview.thankYou')}
        </h2>
        <p style={{ fontSize: 14, color: tokens.colors.gray[500], margin: '0 0 28px', lineHeight: 1.7 }}>
          {t('postReview.thankYouDesc')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button variant="primary" onClick={() => navigate('/appointments')}>{t('postReview.myAppointments')}</Button>
          <Button variant="ghost" onClick={() => navigate('/doctors')}>{t('postReview.findDoctor')}</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: tokens.colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Doctor Card */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: tokens.shadows.card, padding: '24px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar name={doctorName} src={appointment?.doctor?.avatar} size="lg" />
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 16, color: tokens.colors.gray[800] }}>
              {t('common.doctorPrefix')} {doctorName}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: P, fontWeight: 600 }}>
              {appointment?.doctor?.specialty || appointment?.specialty || ''}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: tokens.colors.gray[400] }}>
              {appointment?.date ? new Date(appointment.date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </p>
          </div>
        </div>

        {/* Review Card */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: tokens.shadows.card, padding: '28px 24px' }}>

          {/* Stars */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: tokens.colors.gray[800], margin: '0 0 6px' }}>
              {t('postReview.title')}
            </h2>
            <p style={{ fontSize: 13, color: tokens.colors.gray[400], margin: '0 0 20px' }}>
              {t('postReview.subtitle')}
            </p>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p style={{ fontSize: 15, fontWeight: 700, color: P, marginTop: 10 }}>
                {t(`postReview.ratings.${rating}`)}
              </p>
            )}
          </div>

          {/* Quick tags */}
          {rating > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: tokens.colors.gray[700], marginBottom: 10 }}>
                {t('postReview.tagsLabel')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_TAG_KEYS.map(key => (
                  <button
                    key={key}
                    onClick={() => toggleTag(key)}
                    style={{
                      padding: '7px 14px', borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${tags.includes(key) ? P : tokens.colors.gray[200]}`,
                      background: tags.includes(key) ? PL : 'var(--surface)',
                      color: tags.includes(key) ? P : tokens.colors.gray[600],
                      fontSize: 12, fontWeight: tags.includes(key) ? 700 : 500,
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                    }}
                  >
                    {tags.includes(key) ? '✓ ' : ''}{t(`postReview.tags.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          {rating > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: tokens.colors.gray[700], marginBottom: 8 }}>
                {t('postReview.commentLabel')}
              </p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t('postReview.commentPlaceholder')}
                dir={isRTL ? 'rtl' : 'ltr'}
                rows={4}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: `1.5px solid ${tokens.colors.gray[200]}`, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: tokens.colors.gray[800], boxSizing: 'border-box', lineHeight: 1.6, background: 'var(--bg)' }}
                onFocus={e => e.target.style.borderColor = P}
                onBlur={e => e.target.style.borderColor = tokens.colors.gray[200]}
                maxLength={500}
              />
              <div style={{ textAlign: 'end', fontSize: 11, color: tokens.colors.gray[400], marginTop: 4 }}>
                {comment.length}/500
              </div>
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="primary"
              onClick={() => mutation.mutate()}
              disabled={rating === 0 || mutation.isPending}
              loading={mutation.isPending}
              style={{ flex: 1 }}
            >
              {t('postReview.submit')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/appointments')}>
              {t('postReview.skip')}
            </Button>
          </div>

          {mutation.isError && (
            <p style={{ color: tokens?.colors?.danger?.DEFAULT || '#E97D61', fontSize: 12, textAlign: 'center', marginTop: 12, margin: '12px 0 0' }}>
              {t('postReview.error')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
