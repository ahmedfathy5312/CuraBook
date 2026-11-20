/**
 * useAssistantAppointments.js
 *
 * Unified assistant data hooks:
 *  ✓ All workplaces merged in one query
 *  ✓ Optimistic approve/reject with rollback
 *  ✓ Polling every 60s as WebSocket fallback
 *  ✓ Proper queryKey structure for cache invalidation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import {
  getAssistantAppointments,
  approveAppointment,
  rejectAppointment,
} from '../../../services/api/appointmentApi';
import { getAssistantWorkplaces } from '../../../services/api/usersApi';

// ── Workplaces ────────────────────────────────────────────────────────────────
export function useAssistantWorkplaces() {
  // Backend returns { clinics:[], hospitals:[], total:N }
  return useQuery({
    queryKey: ['assistant', 'workplaces'],
    queryFn: async () => {
      const data = await getAssistantWorkplaces();
      return {
        clinics:   data?.clinics   || [],
        hospitals: data?.hospitals || [],
        total:     data?.total     || 0,
      };
    },
    staleTime: 5 * 60_000,
  });
}

// ── All Appointments (merged from all workplaces) ─────────────────────────────
export function useAssistantAppointments(params = {}) {
  return useQuery({
    queryKey: ['assistant', 'appointments', params],
    queryFn: () => getAssistantAppointments(params),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every minute as WS fallback
  });
}

// ── Approve ───────────────────────────────────────────────────────────────────
export function useApproveAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (idOrObj) => approveAppointment(idOrObj),

    onMutate: async (idOrObj) => {
      const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
      await qc.cancelQueries({ queryKey: ['assistant', 'appointments'] });
      const snapshots = qc.getQueriesData({ queryKey: ['assistant', 'appointments'] });

      qc.setQueriesData({ queryKey: ['assistant', 'appointments'] }, (old) => {
        if (!old) return old;
        const update = (arr) => arr.map(a =>
          a.id === id ? { ...a, status: 'confirmed' } : a
        );
        return Array.isArray(old)
          ? update(old)
          : { ...old, results: update(old.results || []) };
      });

      return { snapshots };
    },

    onError: (err, _, ctx) => {
      // Rollback all snapshots
      ctx?.snapshots?.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error(err?.errorDetail || 'Failed to approve appointment.');
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('✓ Appointment approved successfully.');
    },
  });
}

// ── Reject ────────────────────────────────────────────────────────────────────
export function useRejectAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, reason }) => rejectAppointment(id, reason),

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['assistant', 'appointments'] });
      const snapshots = qc.getQueriesData({ queryKey: ['assistant', 'appointments'] });

      qc.setQueriesData({ queryKey: ['assistant', 'appointments'] }, (old) => {
        if (!old) return old;
        const update = (arr) => arr.map(a =>
          a.id === id ? { ...a, status: 'rejected' } : a
        );
        return Array.isArray(old)
          ? update(old)
          : { ...old, results: update(old.results || []) };
      });

      return { snapshots };
    },

    onError: (err, _, ctx) => {
      ctx?.snapshots?.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error(err?.errorDetail || 'Failed to reject appointment.');
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment rejected.');
    },
  });
}

export function useApproveRescheduleAssistant() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id) => apiClient.post(API.APPOINTMENTS.APPROVE_RESCHEDULE(id)).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
      toast.success('Reschedule approved.');
    },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to approve reschedule.'),
  });
}

export function useRejectRescheduleAssistant() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, reason = '' }) =>
      apiClient.post(API.APPOINTMENTS.REJECT_RESCHEDULE(id), { reason }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
      toast.success('Reschedule rejected.');
    },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to reject reschedule.'),
  });
}
