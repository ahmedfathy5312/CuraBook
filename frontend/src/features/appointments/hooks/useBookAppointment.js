/**
 * useBookAppointment.js — Complete Booking Workflow with robust error handling.
 *
 * Flow:
 *   1. Patient picks slot
 *   2. bookAppointment() → POST /api/v1/appointments/
 *   3. Server creates with status=PENDING (enforced server-side)
 *   4. Optimistic update: show immediately in UI
 *   5. On error: rollback + show specific message (slot taken, etc.)
 *   6. On success: navigate to /appointments
 *   7. WS event fires when assistant approves/rejects
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookAppointment } from '../api/appointmentsApi';
import { useToast } from '../../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

// ── Parse Django error responses into user-friendly messages ─────────────────
function parseBookingError(err) {
  const data = err?.response?.data;

  if (!data) return 'Booking failed. Please check your connection and try again.';

  // Slot already booked (double booking)
  if (data.slot || data.slot_id) {
    const msg = Array.isArray(data.slot) ? data.slot[0] : data.slot;
    if (msg?.toLowerCase().includes('booked') || msg?.toLowerCase().includes('taken') || msg?.toLowerCase().includes('unavailable')) {
      return '⚠️ This slot was just booked by someone else. Please select another time.';
    }
    return msg || 'Slot error. Please select another time.';
  }

  // Non-field errors (e.g., business rule violations)
  if (data.non_field_errors) {
    const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
    return msg;
  }

  // Generic detail message
  if (data.detail) return data.detail;
  if (data.message) return data.message;

  // Field errors — collect all
  const fieldErrors = Object.entries(data)
    .filter(([, v]) => v && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  if (fieldErrors) return fieldErrors;

  return err?.errorDetail || 'Booking failed. The slot may no longer be available.';
}

export function useBookAppointment({ onSuccessCallback } = {}) {
  const queryClient = useQueryClient();
  const toast       = useToast();
  const navigate    = useNavigate();

  return useMutation({
    mutationFn: bookAppointment,

    // ── Optimistic update ─────────────────────────────────────────────────
    onMutate: async (newAppt) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const prev = queryClient.getQueryData(['appointments', 'patient', {}]);

      const optimisticAppt = {
        ...newAppt,
        id:           `temp-${Date.now()}`,
        status:       'pending',
        created_at:   new Date().toISOString(),
        _optimistic:  true,
        status_label: 'Pending Approval',
        patient_name: 'You',
      };

      queryClient.setQueriesData({ queryKey: ['appointments'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return [optimisticAppt, ...old];
        return {
          ...old,
          results: [optimisticAppt, ...(old.results || [])],
          count:   (old.count || 0) + 1,
        };
      });

      return { prev };
    },

    // ── Error: rollback + specific message ────────────────────────────────
    onError: (err, _, context) => {
      // Rollback optimistic update
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['appointments', 'patient', {}], context.prev);
      }
      // Always invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });

      const message = parseBookingError(err);
      toast.error(message, { duration: 7000 });
    },

    // ── Success ───────────────────────────────────────────────────────────
    onSuccess: (data) => {
      // Replace optimistic with real data
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      // Invalidate slots so the booked slot disappears
      queryClient.invalidateQueries({ queryKey: ['slots'] });

      toast.success(
        '✅ Appointment requested! Awaiting assistant confirmation.',
        { duration: 6000 }
      );

      if (onSuccessCallback) {
        onSuccessCallback(data);
      } else {
        const appointmentId = data?.id || data?.public_id || data?.data?.id;
        if (appointmentId) {
          navigate(`/booking-success/${appointmentId}`);
        } else {
          navigate('/appointments');
        }
      }
    },
  });
}

export default useBookAppointment;
