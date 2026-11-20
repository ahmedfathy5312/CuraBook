/**
 * useAdminData.js — Admin React Query hooks with lazy/section-aware fetching.
 *
 * All queries use `enabled` flag so they only fire when the section is active.
 * This prevents 5 simultaneous API calls on dashboard mount.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '../api/adminApi';
import { useToast } from '../../../context/ToastContext';

// Stats: always fetch (shown on every section as header)
export const useAdminStats = () =>
  useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.getAdminStats, staleTime: 15_000, refetchInterval: 30_000, retry: 1 });

// Section-gated queries — only fetch when `enabled` is true (section is active)
export const useAdminHospitals    = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'hospitals', p],    queryFn: () => adminApi.getAdminHospitals(p),    staleTime: 60_000, enabled, retry: 1 });

export const useAdminDoctors      = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'doctors', p],      queryFn: () => adminApi.getAdminDoctors(p),      staleTime: 60_000, enabled, retry: 1 });

export const useAdminPatients     = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'patients', p],     queryFn: () => adminApi.getAdminPatients(p),     staleTime: 60_000, enabled, retry: 1 });

// Fix NEW#1: dedicated "all users" hook — replaces wrongly using useAdminPatients for UsersSection
export const useAdminAllUsers     = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'all-users', p],    queryFn: () => adminApi.getAdminAllUsers(p),     staleTime: 60_000, enabled, retry: 1 });

// Fix NEW#2 / Gap#3A: dedicated assistants hook
export const useAdminAssistants   = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'assistants', p],   queryFn: () => adminApi.getAdminAssistants(p),   staleTime: 60_000, enabled, retry: 1 });

export const useAdminAppointments = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'appointments', p], queryFn: () => adminApi.getAdminAppointments(p), staleTime: 30_000, enabled, retry: 1 });

export const useAuditLogs         = (p, enabled = true) =>
  useQuery({ queryKey: ['admin', 'audit', p],        queryFn: () => adminApi.getAuditLogs(p),         staleTime: 30_000, enabled, retry: 1 });

export const useSystemHealth      = (enabled = false) =>
  useQuery({ queryKey: ['admin', 'health'],           queryFn: adminApi.getSystemHealth,               staleTime: 15_000, refetchInterval: enabled ? 30_000 : false, enabled, retry: 1 });

export const useAdminTimeSeries   = (days = 7, enabled = true) =>
  useQuery({
    queryKey: ['admin', 'time-series', days],
    queryFn: () => adminApi.getAdminTimeSeries(days).then(d => d?.series || d || []),
    staleTime: 60_000, enabled, retry: 1
  });

export function useToggleHospital() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: adminApi.toggleHospital,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hospitals'] });
      qc.invalidateQueries({ queryKey: ['admin', 'all-users'] });
      toast.success('تم تحديث حالة المستشفى بنجاح.');
    },
    onError: () => toast.error('فشل تحديث حالة المستشفى.'),
  });
}

export function useToggleDoctor() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: adminApi.toggleDoctor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'all-users'] });
      toast.success('تم تحديث حالة الطبيب بنجاح.');
    },
    onError: () => toast.error('فشل تحديث حالة الطبيب.'),
  });
}

export function useTogglePatient() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: adminApi.togglePatient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'patients'] });
      qc.invalidateQueries({ queryKey: ['admin', 'all-users'] });
      toast.success('تم تحديث حالة المريض بنجاح.');
    },
    onError: () => toast.error('فشل تحديث حالة المريض.'),
  });
}

export function useToggleAssistant() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: adminApi.toggleAssistant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'assistants'] });
      qc.invalidateQueries({ queryKey: ['admin', 'all-users'] });
      toast.success('تم تحديث حالة المساعد بنجاح.');
    },
    onError: () => toast.error('فشل تحديث حالة المساعد.'),
  });
}

export function useToggleUser() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: adminApi.toggleUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'all-users'] });
      toast.success('تم تحديث حالة المستخدم.');
    },
    onError: () => toast.error('فشل تحديث حالة المستخدم.'),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      // ISSUE-008 FIX: Invalidate ALL admin lists so table refreshes after delete
      qc.invalidateQueries({ queryKey: ['admin', 'patients'] });
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'assistants'] });
      qc.invalidateQueries({ queryKey: ['admin', 'hospitals'] });
      qc.invalidateQueries({ queryKey: ['admin', 'all-users'] });
      toast.success('تم حذف المستخدم بنجاح.');
    },
    onError: () => toast.error('فشل حذف المستخدم، حاول مرة أخرى.'),
  });
}
