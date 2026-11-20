/**
 * DoctorProfilePage.jsx — Public doctor profile for patients to view & book
 * SPRINT-2 FIX: Full i18n — TABS, all section headings, CTA labels via useTranslation
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoctorProfile, useDoctorReviews, useCanReview, useSubmitReview, useDoctorSlots } from '../hooks/useDoctorProfile';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { SlotPicker } from '../components/SlotPicker';
import RatingSummary from '../components/RatingSummary';
import ReviewForm from '../components/ReviewForm';
import ReviewsList from '../components/ReviewsList';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';
import { getLocalizedName } from '../../../utils/getLocalizedName';

const P   = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PLT = tokens?.colors?.primary?.lighter || '#E0F7FA';

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();
  const { t, isRTL } = useTranslation();

  const TABS = [
    { key: 'overview', label: t('doctor.tabs.overview') },
    { key: 'book',     label: t('doctor.tabs.book')     },
    { key: 'reviews',  label: t('doctor.tabs.reviews')  },
  ];

  const [activeTab,    setActiveTab]    = useState('overview');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data: doctor,  isLoading: docLoading }     = useDoctorProfile(id);
  const { data: reviews, isLoading: revLoading }     = useDoctorReviews(id);
  const { data: canReview }                          = useCanReview(id);
  const { data: slots,   isLoading: slotsLoading }   = useDoctorSlots(id, selectedDate);
  const submitReview = useSubmitReview(id);

  const handleReviewSubmit = async (payload) => {
    try {
      await submitReview.mutateAsync(payload);
      toast.success(t('reviews.submitSuccess') || 'تم إرسال التقييم بنجاح');
    } catch (err) {
      toast.error(err?.errorDetail || t('reviews.submitFail') || 'فشل في إرسال التقييم');
    }
  };

  const handleBook = () => {
    if (!selectedSlot) return;
    const params = new URLSearchParams();
    if (selectedSlot?.clinic)    params.set('clinic',   selectedSlot.clinic);
    if (selectedSlot?.hospital)  params.set('hospital', selectedSlot.hospital);
    params.set('slot', selectedSlot.id || '');
    navigate(`/book/${doctor?.id}?${params.toString()}`);
  };

  if (docLoading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <Skeleton height={200} borderRadius={20} style={{ marginBottom: 16 }} />
        <Skeleton height={400} borderRadius={20} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', textAlign: 'center' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <p style={{ color: 'var(--text-hint)', fontSize: 16 }}>{t('doctor.notFound')}</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>{t('doctor.back')}</Button>
      </div>
    );
  }

  const name       = getLocalizedName(doctor, isRTL ? 'ar' : 'en', 'doctor') || `د. ${doctor.first_name || ''}`;
  const specialty  = doctor.specialty || doctor.specialization || '—';
  const reviewList = reviews?.results ?? reviews ?? [];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${P} 0%, ${tokens?.colors?.primary?.dark || '#0C6478'} 100%)`,
        borderRadius: 'var(--radius-lg)', padding: '28px 28px', color: '#fff', marginBottom: 20,
        display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {doctor.avatar ? (
          <img src={doctor.avatar} alt={name} style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.5)', flexShrink: 0 }} />
        ) : (
          <Avatar name={name} size={80} style={{ borderRadius: 'var(--radius-lg)', border: '3px solid rgba(255,255,255,0.5)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{name}</h1>
          <p style={{ margin: '0 0 10px', fontSize: 14, opacity: 0.9 }}>{specialty}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {doctor.rating && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-lg)', padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>⭐ {Number(doctor.rating).toFixed(1)}</span>}
            {doctor.years_of_experience && (
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-lg)', padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                🏆 {t('doctor.yearsExp').replace('{{n}}', doctor.years_of_experience)}
              </span>
            )}
            {doctor.consultation_fee && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-lg)', padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>💰 {doctor.consultation_fee} EGP</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border-base)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
            color: activeTab === tab.key ? P : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === tab.key ? P : 'transparent'}`,
            marginBottom: -2, transition: 'all .15s', fontFamily: 'inherit',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {doctor.bio && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>{t('doctor.aboutSection')}</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7 }} dir={isRTL ? 'rtl' : 'ltr'}>{doctor.bio}</p>
            </div>
          )}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>{t('doctor.ratingSummary')}</h3>
            <RatingSummary rating={doctor.rating} reviews_count={doctor.reviews_count} rating_breakdown={doctor.rating_breakdown} />
          </div>
        </div>
      )}

      {/* Book Appointment Tab */}
      {activeTab === 'book' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>{t('doctor.selectDate')}</h3>
          <AvailabilityCalendar selectedDate={selectedDate} onDateChange={(d) => { setSelectedDate(d); setSelectedSlot(null); }} />
          {selectedDate && (
            <>
              <div style={{ margin: '20px 0 12px', borderTop: '1px solid var(--border-base)', paddingTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>{t('doctor.availableSlots')} — {selectedDate}</h3>
                <SlotPicker slots={slots ?? []} selectedSlot={selectedSlot} onSelect={setSelectedSlot} loading={slotsLoading} />
              </div>
              {selectedSlot && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" onClick={handleBook}>{t('doctor.confirmBooking')}</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {user?.role === 'patient' && canReview?.can_review && (
            <ReviewForm onSubmit={handleReviewSubmit} loading={submitReview.isPending} />
          )}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>
              {t('doctor.reviewsCount').replace('{{count}}', doctor.reviews_count ?? reviewList.length)}
            </h3>
            <ReviewsList reviews={reviewList} loading={revLoading} />
          </div>
        </div>
      )}

      {/* ── Sticky Booking CTA ── */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg-card)', borderTop: '1px solid var(--border-base)',
        padding: '12px 20px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Cairo, sans-serif', margin: '0 0 2px' }}>
            {t('doctor.stickyNextAvail')}
          </p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h)', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
            {doctor?.next_available_date
              ? new Intl.DateTimeFormat(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(doctor.next_available_date))
              : t('doctor.stickyToday')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {doctor?.consultation_fee && (
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {doctor.consultation_fee} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          )}
          <button
            onClick={() => {
              // FIX: Build location params from doctor data — same as handleBook()
              // so the sticky CTA passes clinic/hospital context to BookingPage.
              const params = new URLSearchParams();
              if (doctor?.clinic_id)    params.set('clinic',   doctor.clinic_id);
              if (doctor?.hospital_id)  params.set('hospital', doctor.hospital_id);
              // If a slot is already selected from the Book tab, include it
              if (selectedSlot?.clinic)   params.set('clinic',   selectedSlot.clinic);
              if (selectedSlot?.hospital) params.set('hospital', selectedSlot.hospital);
              if (selectedSlot?.id)       params.set('slot',     selectedSlot.id);
              const qs = params.toString();
              navigate(`/book/${doctor?.id}${qs ? `?${qs}` : ''}`);
            }}
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)', padding: '12px 24px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
              boxShadow: 'var(--shadow-md)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('doctor.tabs.book')}
          </button>
        </div>
      </div>
    </div>
  );
}
