/**
 * useDoctorDashboard.js — Doctor dashboard data hooks
 *
 * CRITICAL FIX: was re-exporting from ../../doctor/hooks/useDoctorDashboard
 * which didn't exist → crash on load.
 *
 * F-01 FIX: Optimistic updates implemented for approve/reject actions.
 * F-02 FIX: Provides stats and analytics data for charts.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../features/auth/context/AuthContext';
import {
  getDoctorStats,
  getDoctorAppointments,
  getDoctorAppointmentById,
  completeAppointment,
  approveAppointment,
  rejectAppointment,
  getDoctorProfile,
} from '../../../services/api/doctorApi';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

// ── Stats ─────────────────────────────────────────────────────────────────────
// FIX: Token race condition — wait for authInitialized before firing requests.
// Previously, useDoctorStats fired immediately on mount before the silent token
// refresh completed, causing "Given token not valid for any token type" errors.
export function useDoctorStats() {
  const { authInitialized } = useAuth();
  return useQuery({
    queryKey: ['doctor', 'stats'],
    queryFn: getDoctorStats,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    enabled: !!authInitialized,
  });
}

// ── Appointments list ─────────────────────────────────────────────────────────
// FIX: Same race condition guard — don't fetch until auth is settled.
export function useDoctorAppointments(params = {}) {
  const { authInitialized } = useAuth();
  return useQuery({
    queryKey: ['doctor', 'appointments', params],
    queryFn: () => getDoctorAppointments(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
    keepPreviousData: true,
    enabled: !!authInitialized,
  });
}

// ── Appointment detail ─────────────────────────────────────────────────────────
export function useDoctorAppointmentDetail(id) {
  return useQuery({
    queryKey: ['doctor', 'appointment', id],
    queryFn: () => getDoctorAppointmentById(id),
    enabled: !!id,
  });
}

// ── Complete appointment (optimistic) ─────────────────────────────────────────
export function useCompleteAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, notes }) => completeAppointment(id, notes),

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['doctor', 'appointments'] });
      const snapshots = qc.getQueriesData({ queryKey: ['doctor', 'appointments'] });
      qc.setQueriesData({ queryKey: ['doctor', 'appointments'] }, (old) => {
        if (!old) return old;
        const update = (arr) => arr.map(a => a.id === id ? { ...a, status: 'completed' } : a);
        return Array.isArray(old) ? update(old) : { ...old, results: update(old.results || []) };
      });
      return { snapshots };
    },

    onError: (err, _, ctx) => {
      ctx?.snapshots?.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error(err?.errorDetail || 'Failed to complete appointment.');
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'stats'] });
      toast.success('Appointment marked as completed.');
    },
  });
}

// ── Approve appointment (optimistic) ─────────────────────────────────────────
export function useApproveAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id) => approveAppointment(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['doctor', 'appointments'] });
      const snap = qc.getQueriesData({ queryKey: ['doctor', 'appointments'] });
      qc.setQueriesData({ queryKey: ['doctor', 'appointments'] }, (old) => {
        if (!old) return old;
        const update = (arr) => arr.map(a => a.id === id ? { ...a, status: 'confirmed' } : a);
        return Array.isArray(old) ? update(old) : { ...old, results: update(old.results || []) };
      });
      return { snap };
    },
    onError: (err, _, ctx) => {
      ctx?.snap?.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(err?.errorDetail || 'Failed to approve appointment.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'stats'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'today-schedule'] });
      toast.success('Appointment confirmed.');
    },
  });
}

// ── Reject appointment (optimistic) ──────────────────────────────────────────
export function useRejectAppointment() {
  const qc    = useQueryClient();
  const toast = useToast();

  return useMutation({
    // FIX Bug #1: mutationFn receives {id, reason} object — destructure correctly
    mutationFn: ({ id, reason = '' }) => rejectAppointment(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['doctor', 'appointments'] });
      const snap = qc.getQueriesData({ queryKey: ['doctor', 'appointments'] });
      qc.setQueriesData({ queryKey: ['doctor', 'appointments'] }, (old) => {
        if (!old) return old;
        const update = (arr) => arr.map(a => a.id === id ? { ...a, status: 'rejected' } : a);
        return Array.isArray(old) ? update(old) : { ...old, results: update(old.results || []) };
      });
      return { snap };
    },
    onError: (err, _, ctx) => {
      ctx?.snap?.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(err?.errorDetail || 'Failed to reject appointment.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'stats'] });
      toast.success('Appointment rejected.');
    },
  });
}

// ── Doctor profile ─────────────────────────────────────────────────────────────
export function useDoctorOwnProfile() {
  return useQuery({
    queryKey: ['doctor', 'own-profile'],
    queryFn: getDoctorProfile,
    staleTime: 5 * 60_000,
  });
}

// ── Today's schedule ──────────────────────────────────────────────────────────
export function useTodaySchedule() {
  const { authInitialized } = useAuth();
  return useQuery({
    queryKey: ['doctor', 'today-schedule'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.TODAY_SCHEDULE);
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: !!authInitialized,
  });
}

// ── Patients list ─────────────────────────────────────────────────────────────
export function useDoctorPatients(params = {}) {
  return useQuery({
    queryKey: ['doctor', 'patients', params],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.PATIENTS, { params });
      return data;
    },
    staleTime: 2 * 60_000,
    keepPreviousData: true,
  });
}
