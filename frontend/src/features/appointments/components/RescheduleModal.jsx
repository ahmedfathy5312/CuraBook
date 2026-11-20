/**
 * RescheduleModal.jsx
 * Modal لإعادة جدولة الموعد — يعرض الـ available slots للاختيار منها
 *
 * BUG-FIX #3:
 *  1. Textarea (سبب إعادة الجدولة) is now ALWAYS visible — not gated behind
 *     slot selection. Users can type a reason at any stage.
 *  2. Mutation now sends `new_slot_id` (correct backend key) instead of `slot_id`.
 *  3. Reason-only submit is supported: patient can send reschedule request with
 *     just a reason (no slot required), matching the backend's
 *     request_reschedule_reason_only() path.
 *  4. Added explicit background color to textarea for theme compatibility.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL = tokens?.colors?.primary?.lighter || '#E0F7FA';

function SlotButton({ slot, selected, onSelect }) {
  const time = slot.start_time || slot.start || '';
  const display = time.length >= 5 ? time.slice(0, 5) : time;
  const isActive = selected?.id === slot.id;
  return (
    <button
      onClick={() => onSelect(isActive ? null : slot)}
      style={{
        padding: '8px 16px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${isActive ? P : 'var(--border)'}`,
        background: isActive ? PL : 'var(--bg-card)', color: isActive ? P : 'var(--text-body)',
        fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
        transition: 'all .15s', fontFamily: 'inherit',
      }}
    >
      {display}
    </button>
  );
}

export default function RescheduleModal({ appointmentId, doctorId, clinicId, hospitalId, onClose, onSuccess }) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  // BUG-FIX #3: reason is always editable — not gated behind slot selection
  const [reason, setReason] = useState('');

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });

  const locationType = clinicId ? 'clinic' : 'hospital';
  const locationId   = clinicId || hospitalId;

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['reschedule-slots', doctorId, selectedDate, locationType, locationId],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.AVAILABLE_SLOTS(doctorId), {
        params: { date: selectedDate, location_type: locationType, location_id: locationId },
      });
      return Array.isArray(data) ? data : (data?.slots || data?.results || []);
    },
    enabled: !!doctorId && !!selectedDate,
  });

  const slots = slotsData || [];

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      // BUG-FIX #3:
      //  - Use `new_slot_id` (correct backend key, was previously `slot_id`)
      //  - Omit new_slot_id entirely when no slot selected → triggers reason-only
      //    backend path (request_reschedule_reason_only)
      //  - appointmentId accepted as int pk OR UUID (backend now handles both)
      const body = { reason };
      if (selectedSlot?.id) body.new_slot_id = selectedSlot.id;

      const { data } = await apiClient.post(
        API.APPOINTMENTS.RESCHEDULE
          ? API.APPOINTMENTS.RESCHEDULE(appointmentId)
          : `/appointments/${appointmentId}/reschedule/`,
        body
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['appointments']);
      onSuccess?.();
      onClose();
    },
  });

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // BUG-FIX #3: can submit with reason only (slot optional)
  const canSubmit = reason.trim().length > 0 || !!selectedSlot;

  return (
    <Modal open={true} onClose={onClose} title="إعادة جدولة الموعد">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Reason — BUG-FIX #3: ALWAYS visible, never gated behind slot selection */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', marginBottom: 8 }}>
            سبب إعادة الجدولة <span style={{ color: '#D93025' }}>*</span>
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اكتب سبب التغيير... مثال: تعارض في المواعيد، تحسنت الحالة"
            rows={3}
            style={{
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-base)',
              padding: '10px 14px',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              color: 'var(--text-body)',
              // BUG-FIX #3: explicit background so textarea is visible in all themes
              background: 'var(--bg-input, var(--bg-card, #fff))',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = P}
            onBlur={e => e.target.style.borderColor = 'var(--border-base)'}
          />
          <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: '4px 0 0' }}>
            يمكنك الإرسال بالسبب فقط بدون اختيار موعد جديد
          </p>
        </div>

        {/* Date picker */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', marginBottom: 10 }}>
            اختر التاريخ الجديد (اختياري)
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dates.map(d => (
              <button
                key={d}
                onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${selectedDate === d ? P : 'var(--border)'}`,
                  background: selectedDate === d ? PL : 'var(--bg-card)', color: selectedDate === d ? P : 'var(--text-body)',
                  fontSize: 12, fontWeight: selectedDate === d ? 700 : 500, cursor: 'pointer',
                  transition: 'all .15s', fontFamily: 'inherit',
                }}
              >
                {formatDate(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Slots */}
        {selectedDate && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', marginBottom: 10 }}>
              المواعيد المتاحة — {selectedDate}
            </p>
            {slotsLoading ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1,2,3,4].map(i => <Skeleton key={i} width={80} height={36} borderRadius={10} />)}
              </div>
            ) : slots.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-hint)', textAlign: 'center', padding: '16px 0' }}>
                لا توجد مواعيد متاحة في هذا اليوم
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {slots.map(slot => (
                  <SlotButton key={slot.id} slot={slot} selected={selectedSlot} onSelect={setSelectedSlot} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirm banner — only when slot selected */}
        {selectedSlot && (
          <div style={{
            background: PL, borderRadius: 'var(--radius-md)', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: P, fontSize: 13 }}>
                {formatDate(selectedDate)} — {(selectedSlot.start_time || selectedSlot.start || '').slice(0, 5)}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>موعدك الجديد المقترح</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} disabled={rescheduleMutation.isPending}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => rescheduleMutation.mutate()}
            disabled={!canSubmit || rescheduleMutation.isPending}
            loading={rescheduleMutation.isPending}
          >
            إرسال طلب إعادة الجدولة
          </Button>
        </div>

        {rescheduleMutation.isError && (
          <p style={{ color: '#E97D61', fontSize: 12, textAlign: 'center', margin: 0 }}>
            حدث خطأ. تأكد من صلاحية الموعد وحاول مرة أخرى.
          </p>
        )}
      </div>
    </Modal>
  );
}
