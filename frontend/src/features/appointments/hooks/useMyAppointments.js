import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyAppointments, cancelAppointment, rescheduleAppointment } from '../api/appointmentsApi';
import { useToast } from '../../../context/ToastContext';

export function useMyAppointments(params = {}) {
  return useQuery({
    queryKey: ['appointments', 'patient', params],
    queryFn:  () => getMyAppointments(params),
    staleTime: 30_000,
  });
}

export function useCancelAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: cancelAppointment,
    // Optimistic: immediately mark as cancelled in UI
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['appointments', 'patient'] });
      qc.setQueriesData({ queryKey: ['appointments', 'patient'] }, (old) => {
        if (!old) return old;
        const update = (arr) => arr.map(a => a.id === id ? { ...a, status: 'cancelled' } : a);
        return Array.isArray(old)
          ? update(old)
          : { ...old, results: update(old.results || []) };
      });
    },
    onError: (err) => {
      qc.invalidateQueries({ queryKey: ['appointments', 'patient'] });
      toast.error(err?.errorDetail || 'Failed to cancel appointment.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('تم إلغاء الموعد');
    },
  });
}

export function useRescheduleAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, slot_id, reason }) => rescheduleAppointment({ id, slot_id, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('تم إرسال طلب إعادة الجدولة. بانتظار موافقة الطبيب.');
    },
    onError: (err) => {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.errorDetail ||
        null;
      if (err?.response?.status === 404) {
        toast.error('عذراً، لا يمكن إتمام طلب إعادة الجدولة في الوقت الحالي. تواصل مع الدعم.');
      } else {
        toast.error(detail || 'فشل في إرسال طلب إعادة الجدولة. يرجى المحاولة لاحقاً.');
      }
    },
  });
}

export function useApproveReschedule() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id) =>
      import('../../../services/api/appointmentApi').then(m => m.approveReschedule(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Reschedule approved successfully.');
    },
    onError: (err) => {
      toast.error(err?.errorDetail || 'Failed to approve reschedule.');
    },
  });
}

export function useRejectReschedule() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, reason }) =>
      import('../../../services/api/appointmentApi').then(m => m.rejectReschedule({ id, reason })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Reschedule request rejected.');
    },
    onError: (err) => {
      toast.error(err?.errorDetail || 'Failed to reject reschedule.');
    },
  });
}
