/**
 * features/appointments/pages/BookingPage.jsx
 * ============================================
 * F-05 FIX: Dedicated booking page per prototype design (slide 37).
 *
 * Flow: Doctor Summary → Date Picker → Slot Picker → Booking Form → Confirm
 *
 * Route: /book/:doctorId
 * Query params: ?clinic=<id> | ?hospital=<id>
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import Avatar    from '../../../components/ui/Avatar';
import Button    from '../../../components/ui/Button';
import Skeleton  from '../../../components/ui/Skeleton';
import { useDoctorProfile } from '../../doctor-discovery/hooks/useDoctorProfile';
import { useBookAppointment } from '../hooks/useBookAppointment';
import AvailabilityCalendar from '../../doctor-discovery/components/AvailabilityCalendar';
import SlotPicker           from '../../doctor-discovery/components/SlotPicker';
import useTranslation from '../../../i18n/useTranslation';
import { getDoctorPrefix } from '../../../utils/formatters';
import { useAuth } from '../../auth/context/AuthContext';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PD = tokens?.colors?.primary?.dark || '#0C6478';
const PL = tokens?.colors?.primary?.lighter || '#E0F7FA';
const G  = '#F59E0B';

// ── Design token aliases (eliminates all hardcoded hex values) ──────────────
const C = {
  surface:   'var(--bg-card)',          // var(--bg-card)
  textH:     'var(--txt-heading)',            // var(--txt-heading)
  textBody:  'var(--txt-body)',         // var(--txt-body)
  textMuted: 'var(--text-muted)',
  textHint:  'var(--text-hint)',
  border:    'var(--border-base)',
  bg50:      'var(--bg-elevated)',
  bg100:     'var(--bg-card)',
  inactive:  'var(--border-base)',
  success:   tokens?.colors?.success?.DEFAULT || '#31A870',  // #1A8A5A
  primaryDk: tokens.colors.primary[700],     // #154E73
};

function normalizeSlotsPayload(rawData) {
  if (Array.isArray(rawData)) return rawData;
  if (Array.isArray(rawData?.results)) return rawData.results;
  if (Array.isArray(rawData?.slots)) return rawData.slots;
  if (Array.isArray(rawData?.data)) return rawData.data;
  if (Array.isArray(rawData?.data?.results)) return rawData.data.results;
  if (Array.isArray(rawData?.data?.slots)) return rawData.data.slots;
  return [];
}

function getSlotDate(slot) {
  const value = slot?.start || slot?.start_time || slot?.date || '';
  if (!value) return '';
  if (!String(value).includes('T')) return String(value).slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ step }) {
  // API-C05 FIX: Steps were hardcoded in Arabic — breaking i18n for English users.
  // Now uses useTranslation() so the UI respects the active language.
  const { t } = useTranslation();
  const steps = [
    t('booking.step_date'),
    t('booking.step_time'),
    t('booking.step_info'),
    t('booking.step_confirm'),
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '28px' }}>
      {steps.map((label, i) => {
        const num    = i + 1;
        const active = num === step;
        const done   = num < step;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: 13,
                background: done ? P : active ? P : C.inactive,
                color:      done || active ? '#fff' : C.textHint,
                transition: 'all .2s',
              }}>
                {done ? '✓' : num}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: active ? P : done ? P : C.textHint, marginTop: 4, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? P : C.inactive, margin: '0 4px', marginBottom: 16, transition: 'background .2s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Doctor summary card ────────────────────────────────────────────────────────
function DoctorSummary({ doctor, activeTab }) {
  const { language } = useTranslation();
  const location = activeTab === 'clinic'
    ? doctor?.clinic_name
    : activeTab === 'hospital'
      ? doctor?.hospital_name
      : null;
  return (
    <div style={{
      background: C.surface, borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      boxShadow: tokens.shadows.card, display: 'flex', alignItems: 'center',
      gap: 16, marginBottom: 24,
    }}>
      <Avatar name={doctor?.name || doctor?.full_name} src={doctor?.image} size="xl" />
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: C.textH }}>
          {getDoctorPrefix(language)} {doctor?.name || doctor?.full_name}
        </h2>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: P, fontWeight: 600 }}>
          {doctor?.specialty || doctor?.specialization}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {location && <span style={{ fontSize: 12, color: C.textMuted }}>🏥 {location}</span>}
          {doctor?.city   && <span style={{ fontSize: 12, color: C.textMuted }}>📍 {doctor.city}</span>}
          {doctor?.consultation_fee && (
            <span style={{ fontSize: 12, fontWeight: 700, color: G }}>
              {language === 'ar' ? `${doctor.consultation_fee} ج.م` : `EGP ${doctor.consultation_fee}`}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.textH }}>
          {(doctor?.rating || 0).toFixed(1)}
        </div>
        <div style={{ color: G, fontSize: 14 }}>
          {'★'.repeat(Math.round(doctor?.rating || 0))}{'☆'.repeat(5 - Math.round(doctor?.rating || 0))}
        </div>
        {doctor?.reviews_count != null && (
          <div style={{ fontSize: 11, color: C.textHint }}>({doctor.reviews_count} reviews)</div>
        )}
      </div>
    </div>
  );
}


// ── Price Summary Card ─────────────────────────────────────────────────────────
function PriceSummaryCard({ doctor, visitType }) {
  const { t } = useTranslation();
  const fee = doctor?.consultation_fee || 0;
  const total = fee;

  return (
    <div style={{
      background: C.bg50, borderRadius: 'var(--radius-lg)',
      border: `1px solid ${C.border}`, padding: '16px 20px',
      marginBottom: '20px', direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.textH, marginBottom: '12px' }}>
        {t('booking.cost_summary')}
      </h3>
      {[
        { label: t('booking.consultation_fee'), value: `${fee} ج.م`, color: C.textBody },
        { label: t('booking.booking_fee'),      value: t('booking.free'), color: C.success },
        ...(visitType === 'VIDEO' ? [{ label: t('booking.online_discount'), value: t('booking.zero_egp'), color: C.success }] : []),
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: C.textMuted }}>{label}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{value}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: C.textH }}>{t('booking.total')}</span>
        <span style={{ fontSize: '16px', fontWeight: 800, color: P, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {total} ج.م
        </span>
      </div>
    </div>
  );
}

// ── Back Button ────────────────────────────────────────────────────────────────
function BackButton({ step, setStep }) {
  const { t } = useTranslation();
  if (step <= 1) return null;
  return (
    <button
      onClick={() => setStep(s => s - 1)}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px',
        color: C.textMuted, fontSize: '13px', fontFamily: 'Cairo, sans-serif',
        marginBottom: '16px', padding: 0, direction: 'rtl',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      {t('common.back')}
    </button>
  );
}

export default function BookingPage() {
  const { doctorId } = useParams();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const clinicId   = searchParams.get('clinic');
  const hospitalId = searchParams.get('hospital');
  const activeTab = clinicId ? 'clinic' : hospitalId ? 'hospital' : null;
  const { language, t } = useTranslation();
  // FIX (القسم 3): استخدام useAuth للتأكد من أن patient_id متوفر قبل إرسال الحجز
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]             = useState(1);
  const [selectedDate, setDate]     = useState('');
  const [selectedSlot, setSlot]     = useState(null);
  const [visitType, setVisitType]   = useState('IN_PERSON');
  const [reason, setReason]         = useState('');
  const [showConfirm, setConfirm]   = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: doctor, isLoading: docLoading } = useDoctorProfile(doctorId);
  const doctorUserId = doctor?.user?.id ?? doctor?.user_id ?? doctor?.user ?? doctorId;
  const locationId = clinicId || hospitalId || null;
  const buildLocationParams = () => {
    if (clinicId) return { location_type: 'clinic', location_id: clinicId };
    if (hospitalId) return { location_type: 'hospital', location_id: hospitalId };
    return {};
  };
  const buildPublicSlotParams = () => {
    if (clinicId) return { clinic: clinicId, clinic_id: clinicId };
    if (hospitalId) return { hospital: hospitalId, hospital_id: hospitalId };
    return {};
  };

  // Available dates for calendar highlights
  // FIX Bug#1: removed !!(clinicId || hospitalId) from enabled — booking must work without location params
  const { data: availableDatesData } = useQuery({
    queryKey: ['booking-available-dates', doctorId, doctorUserId, activeTab, locationId],
    queryFn: async () => {
      const params = buildLocationParams();
      let rawData = null;
      try {
        const { data } = await apiClient.get(API.DOCTORS.AVAILABLE_SLOTS(doctorId), { params });
        rawData = data;
      } catch {}
      let slots = normalizeSlotsPayload(rawData);
      if (!slots.length) {
        const { data } = await apiClient.get(API.SLOTS.LIST, {
          params: {
            doctor: doctorUserId,
            doctor_id: doctorUserId,
            ...buildPublicSlotParams(),
          },
        });
        rawData = data;
        slots = normalizeSlotsPayload(rawData);
      }
      return [...new Set(slots.map(getSlotDate).filter(Boolean))];
    },
    enabled: !!doctorId && !docLoading,
    staleTime: 5 * 60_000,
  });
  const availableDates = availableDatesData || [];

  useEffect(() => {
    if (selectedDate || !availableDates.length) return;
    setDate(availableDates[0]);
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (!selectedDate || !availableDates.length || availableDates.includes(selectedDate)) return;
    setDate(availableDates[0]);
    setSlot(null);
  }, [availableDates, selectedDate]);

  // Slots for selected date
  // FIX Bug#1: removed !!(clinicId || hospitalId) from enabled — allow booking without location params
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['booking-slots', doctorId, doctorUserId, selectedDate, activeTab, locationId],
    queryFn: async () => {
      const locationParams = buildLocationParams();
      const params = { date: selectedDate, from: selectedDate, to: selectedDate, ...locationParams };
      let primaryData = null;
      try {
        const { data } = await apiClient.get(API.DOCTORS.AVAILABLE_SLOTS(doctorId), { params });
        primaryData = data;
      } catch {}

      if (normalizeSlotsPayload(primaryData).length > 0) return primaryData;

      const { data: publicData } = await apiClient.get(API.SLOTS.LIST, {
        params: {
          doctor: doctorUserId,
          doctor_id: doctorUserId,
          from: selectedDate,
          to: selectedDate,
          ...buildPublicSlotParams(),
        },
      });
      if (normalizeSlotsPayload(publicData).length > 0) return publicData;

      if (Object.keys(locationParams).length > 0) {
        const { data: anyLocationData } = await apiClient.get(API.SLOTS.LIST, {
          params: {
            doctor: doctorUserId,
            doctor_id: doctorUserId,
            from: selectedDate,
            to: selectedDate,
          },
        });
        if (normalizeSlotsPayload(anyLocationData).length > 0) return anyLocationData;
      }

      return primaryData || publicData;
    },
    enabled: !!doctorId && !docLoading && !!selectedDate,
    staleTime: 60_000,
  });
  const rawSlots = normalizeSlotsPayload(slotsData);
  const dateMatchedSlots = selectedDate
    ? rawSlots.filter(s => getSlotDate(s) === selectedDate)
    : rawSlots;
  const slots = selectedDate && rawSlots.length > 0 && dateMatchedSlots.length === 0
    ? rawSlots
    : dateMatchedSlots;

  const bookMutation = useBookAppointment();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDateSelect = (date) => { setDate(date); setSlot(null); setStep(2); };
  const handleSlotSelect = (slot) => { setSlot(slot); setStep(3); };
  const handleConfirm    = () => {
    // FIX (القسم 3): التحقق من توفر patient_id قبل إرسال الحجز
    // الـ Backend يستخرج patient_id من الـ Token تلقائياً،
    // لكن نتحقق هنا أن المستخدم مسجل دخوله قبل الإرسال
    if (!user) {
      navigate('/login');
      return;
    }
    setConfirm(false);
    const doctorUserId = doctor?.user?.id ?? doctor?.user_id ?? doctor?.user ?? doctorId;
    bookMutation.mutate({
      doctor:    Number(doctorUserId),
      slot_id:   selectedSlot.id,
      visit_type: visitType,
      reason:    reason.trim(),
      ...(clinicId   && { clinic:   Number(clinicId)   }),
      ...(hospitalId && { hospital: Number(hospitalId) }),
    });
  };

  if (docLoading) return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px' }}>
      <Skeleton.Card height={120} />
      <div style={{ marginTop: 24 }}><Skeleton.Card height={400} /></div>
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      {/* Back to previous step */}
      <BackButton step={step} setStep={setStep} />

      {/* Back to doctor profile */}
      <button
        onClick={() => navigate(`/doctors/${doctorId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: P, fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}
      >
        {t('booking.back_to_profile')}
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.textH, margin: '0 0 24px' }}>
        {t('booking.page_title')}
      </h1>

      {/* Doctor summary */}
      {doctor && <DoctorSummary doctor={doctor} activeTab={activeTab} />}

      {/* Price summary */}
      {doctor && step >= 3 && <PriceSummaryCard doctor={doctor} visitType={visitType} />}

      {/* Step bar */}
      <StepBar step={step} />

      {/* ── Step 1: Date ── */}
      <div style={{ background: C.surface, borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: tokens.shadows.card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.textH }}>
          {step === 1 ? `📅 ${t('booking.choose_date')}` : `📅 ${t('booking.date_label')}: ${selectedDate}`}
        </h3>
        {step === 1 && (
          <>
            <AvailabilityCalendar
              selectedDate={selectedDate}
              availableDates={availableDates}
              onSelectDate={handleDateSelect}
            />
            {/* Bug #9 FIX: show hint when no available dates found */}
            {availableDates !== undefined && availableDates.length === 0 && (
              <div style={{
                marginTop: 12, padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated, #F0F9FF)',
                border: '1.5px solid var(--border-base)',
                fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', lineHeight: 1.6,
              }}>
                ℹ️{' '}
                {document.documentElement.dir === 'rtl'
                  ? 'لم يُحدَّد الدكتور مواعيد متاحة بعد. يمكنك اختيار أي يوم للتحقق من الإتاحة.'
                  : 'No available dates found yet. You can still pick a date to check availability.'}
              </div>
            )}
          </>
        )}
        {step > 1 && (
          <button onClick={() => setStep(1)} style={{ fontSize: 12, color: P, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {t('booking.change_date')}
          </button>
        )}
      </div>

      {/* ── Step 2: Time slot ── */}
      {step >= 2 && (
        <div style={{ background: C.surface, borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: tokens.shadows.card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.textH }}>
            {step === 2 ? `⏰ ${t('booking.choose_time')}` : `⏰ ${t('booking.time_label')}: ${selectedSlot ? new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}`}
          </h3>
          {step === 2 && (
            <SlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={handleSlotSelect}
              loading={slotsLoading}
              onPickAnotherDate={() => setStep(1)}
            />
          )}
          {step > 2 && (
            <button onClick={() => setStep(2)} style={{ fontSize: 12, color: P, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {t('booking.change_time')}
            </button>
          )}
        </div>
      )}

      {/* ── Step 3: Visit details ── */}
      {step >= 3 && (
        <div style={{ background: C.surface, borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: tokens.shadows.card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: C.textH }}>
            📝 {t('booking.visit_details')}
          </h3>

          {/* Visit type */}
          <p style={{ fontSize: 13, fontWeight: 600, color: C.textBody, margin: '0 0 10px' }}>{t('booking.visit_type')}</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[{ value: 'IN_PERSON', label: `🏥 ${t('booking.in_person')}` }, { value: 'ONLINE', label: `💻 ${t('booking.online')}` }].map(opt => (
              <label key={opt.value} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: `2px solid ${visitType === opt.value ? P : C.inactive}`,
                background: visitType === opt.value ? PL : C.surface,
                fontSize: 13, fontWeight: 600,
                color: visitType === opt.value ? P : C.textMuted, transition: 'all .15s',
              }}>
                <input type="radio" name="visit_type" value={opt.value} checked={visitType === opt.value}
                  onChange={() => setVisitType(opt.value)} style={{ display: 'none' }} />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Reason */}
          <p style={{ fontSize: 13, fontWeight: 600, color: C.textBody, margin: '0 0 8px' }}>
            {t('booking.reason_label')} <span style={{ color: tokens?.colors?.danger?.DEFAULT || '#E97D61' }}>*</span>
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('booking.reason_placeholder')}
            maxLength={500} rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${reason.trim() === '' && step >= 3 ? tokens?.colors?.danger?.DEFAULT || '#E97D61' : C.inactive}`,
              fontSize: 13,
              color: C.textH, resize: 'vertical', fontFamily: 'inherit',
              outline: 'none', transition: 'border-color .15s', background: C.bg50,
            }}
            onFocus={e => { e.target.style.borderColor = P; e.target.style.background = C.surface; }}
            onBlur={e => {
              e.target.style.borderColor = reason.trim() === '' ? tokens?.colors?.danger?.DEFAULT || '#E97D61' : C.inactive;
              e.target.style.background = C.bg50;
            }}
          />
          {reason.trim() === '' && step >= 3 && (
            <p style={{ fontSize: 12, color: tokens?.colors?.danger?.DEFAULT || '#E97D61', margin: '4px 0 0', fontWeight: 600 }}>
              ⚠ {t('booking.reason_required')}
            </p>
          )}
          {reason.length > 0 && (
            <p style={{ fontSize: 11, color: C.textHint, margin: '4px 0 0', textAlign: 'right' }}>
              {reason.length}/500
            </p>
          )}

          <Button
            variant="primary" size="lg" fullWidth
            style={{ marginTop: 20 }}
            disabled={!reason.trim()}
            onClick={() => { if (reason.trim()) { setStep(4); setConfirm(true); } }}
          >
            {reason.trim() ? t('booking.review_confirm') : t('booking.write_reason_first')}
          </Button>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div
          onClick={() => setConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.surface, borderRadius: 'var(--radius-lg)', padding: '32px',
              maxWidth: 440, width: '100%',
              boxShadow: 'var(--shadow-modal)',
              animation: 'cbModal .22s ease',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: PL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 12px',
              }}>📅</div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textH }}>
                {t('booking.step_confirm')}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textMuted }}>
                {t('booking.review_details')}
              </p>
            </div>

            <div style={{
              background: C.bg50, borderRadius: 'var(--radius-lg)', padding: 18,
              display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24,
            }}>
              {[
                { icon: '👨‍⚕️', label: t('booking.doctor_label'),   value: `${getDoctorPrefix(language)} ${doctor?.name || doctor?.full_name || '—'}` },
                ...(activeTab ? [{
                  icon: '🏥',
                  label: activeTab === 'clinic' ? t('booking.clinic_label') : t('booking.hospital_label'),
                  value: activeTab === 'clinic' ? (doctor?.clinic_name || '—') : (doctor?.hospital_name || '—'),
                }] : []),
                { icon: '📆', label: t('booking.date_label'),     value: selectedDate || '—' },
                { icon: '⏰', label: t('booking.time_label'),     value: selectedSlot?.start
                    ? new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '—' },
                { icon: '🩺', label: t('booking.type_label'),     value: visitType === 'ONLINE' ? t('booking.online') : t('booking.in_person') },
                ...(reason.trim() ? [{ icon: '📝', label: t('booking.reason_short'), value: reason.trim().slice(0, 60) + (reason.length > 60 ? '…' : '') }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>{row.icon}</span>
                  <span style={{ fontSize: 12, color: C.textHint, minWidth: 70, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: C.textH, fontWeight: 700, flex: 1, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* AUDIT FIX MISSING #2: Inline slot-error banner */}
            {bookMutation.isError && (
              <div style={{
                background: tokens.colors.danger.light, border: `1.5px solid ${tokens.colors.danger.dark}`,
                borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 14,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: tokens.colors.danger.text }}>
                    {t('booking.booking_failed')}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: tokens.colors.danger.text, lineHeight: 1.5 }}>
                    {bookMutation.error?.response?.data?.slot?.[0]
                      || bookMutation.error?.response?.data?.non_field_errors?.[0]
                      || bookMutation.error?.response?.data?.detail
                      || t('booking.slot_unavailable')}
                  </p>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirm(false)}
                style={{
                  flex: 1, padding: 13, borderRadius: 14,
                  border: `2px solid ${C.inactive}`, background: C.surface,
                  fontWeight: 700, fontSize: 14, color: C.textMuted, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={bookMutation.isPending}
                style={{
                  flex: 2, padding: 13, borderRadius: 14, border: 'none',
                  background: bookMutation.isPending ? C.textHint : P,
                  fontWeight: 700, fontSize: 14, color: '#fff',
                  cursor: bookMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'background .15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {bookMutation.isPending ? (
                  <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> {t('booking.booking_loading')}</>
                ) : `✓ ${t('booking.step_confirm')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cbModal { from { opacity:0; transform:scale(.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
