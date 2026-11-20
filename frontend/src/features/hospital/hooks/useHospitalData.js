/**
 * useHospitalData.js — Hospital React Query hooks.
 * Section-gated: queries only fire when their section is active.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import * as api from '../api/hospitalApi';
import { hospitalKeys } from '../api/hospitalApi';

export const useHospitalOverview  = ()             => useQuery({ queryKey: hospitalKeys.overview(),     queryFn: api.getHospitalOverview,            staleTime: 60_000 });
export const useHospitalAnalytics = (enabled=true) => useQuery({ queryKey: hospitalKeys.analytics(),    queryFn: api.getHospitalAnalytics,           staleTime: 60_000, enabled });
export const useHospitalDepartments=(enabled=true) => useQuery({ queryKey: hospitalKeys.departments(),  queryFn: api.getHospitalDepartments,         staleTime: 5*60_000, enabled });

// BUG-1 FIX: Backend HospitalDoctorSerializer returns `doctor_name` but frontend
// components read `full_name`. Normalize in the select transformer so all
// downstream code works regardless of which field the backend sends.
const normalizeDoctorFields = (doc) => ({
  ...doc,
  user_id:   doc.user_id || (typeof doc.user === 'object' ? doc.user?.id : doc.user) || doc.doctor_user_id || null,
  hospital_id: doc.hospital_id || (typeof doc.hospital === 'object' ? doc.hospital?.id : doc.hospital) || null,
  full_name: doc.full_name || doc.doctor_name || doc.name || '',
  name:      doc.name      || doc.doctor_name || doc.full_name || '',
  email:     doc.email     || doc.user?.email  || '',
  phone:     doc.phone     || doc.user?.phone  || '',
  specialty: doc.specialty || doc.specialization || doc.doctor_profile?.specialty || doc.user?.doctor_profile?.specialty || '',
  specialization: doc.specialization || doc.specialty || doc.doctor_profile?.specialty || doc.user?.doctor_profile?.specialty || '',
  status:    doc.status || (doc.is_active === false ? 'inactive' : 'active'),
});

const normalizeDoctorsResponse = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(normalizeDoctorFields);
  if (data.results) return { ...data, results: data.results.map(normalizeDoctorFields) };
  return data;
};

export const useHospitalDoctors      = (p={}, enabled=true) =>
  useQuery({ queryKey: hospitalKeys.doctors(p),      queryFn: () => api.getHospitalDoctors(p).then(normalizeDoctorsResponse),      staleTime: 60_000, enabled });

export const useHospitalAppointments = (p={}, enabled=true) =>
  useQuery({ queryKey: hospitalKeys.appointments(p), queryFn: () => api.getHospitalAppointments(p), staleTime: 30_000, enabled });

export const useHospitalPatients     = (p={}, enabled=true) =>
  useQuery({ queryKey: hospitalKeys.patients(p),     queryFn: () => api.getHospitalPatients(p),     staleTime: 60_000, enabled });

export const useHospitalAssistants   = (p={}, enabled=true) =>
  useQuery({ queryKey: hospitalKeys.assistants(p),   queryFn: () => api.getHospitalAssistants(p),   staleTime: 60_000, enabled });

// ── Add Doctor ────────────────────────────────────────────────────────────────
export function useAddDoctorToHospital() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.addDoctorToHospital,
    onSuccess: () => {
      // BUG-1 FIX: invalidate all doctors queries (with any params) so list refreshes immediately
      qc.invalidateQueries({ queryKey: ['hospital', 'doctors'], exact: false });
      toast.success('Doctor added to hospital!');
    },
    onError: (err) => toast.error(err?.response?.data?.detail || err?.errorDetail || 'Failed to add doctor.'),
  });
}

// ── Remove Doctor ─────────────────────────────────────────────────────────────
export function useRemoveDoctorFromHospital() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.removeDoctorFromHospital,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hospital', 'doctors'] }); toast.success('Doctor removed.'); },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to remove doctor.'),
  });
}

// ── Add/Remove Assistants ─────────────────────────────────────────────────────
export function useAddAssistantToHospital() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.addAssistantToHospital,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hospital', 'assistants'] }); toast.success('Assistant assigned!'); },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to assign assistant.'),
  });
}
export function useRemoveAssistantFromHospital() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.removeAssistantFromHospital,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hospital', 'assistants'] }); toast.success('Assistant removed.'); },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to remove assistant.'),
  });
}

// ── Departments ───────────────────────────────────────────────────────────────
export function useCreateDepartment() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.createHospitalDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: hospitalKeys.departments() }); toast.success('Department created!'); },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to create department.'),
  });
}
export function useDeleteDepartment() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.deleteHospitalDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: hospitalKeys.departments() }); toast.success('Department deleted.'); },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to delete department.'),
  });
}

// MISS-06 FIX: assign a HospitalDoctor record to a department
export function useAssignDoctorToDepartment() {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({
    mutationFn: api.assignDoctorToDepartment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalKeys.departments() });
      qc.invalidateQueries({ queryKey: ['hospital', 'doctors'] });
      toast.success('Doctor assigned to department!');
    },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to assign doctor.'),
  });
}

// ── Stats alias (used by legacy Cards.jsx component) ──────────────────────────
// Maps to useHospitalOverview since that's where stats come from.
export const useHospitalStats = () =>
  useQuery({ queryKey: hospitalKeys.overview(), queryFn: api.getHospitalOverview, staleTime: 60_000 });

export function useToggleDoctorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    // FIX: /hospital/doctors/{id}/toggle-status/ doesn't exist in backend
    // Use PATCH /hospital/doctors/{id}/ with { is_active } — HospitalDoctorViewSet supports PATCH
    mutationFn: ({ doctorId, isActive }) =>
      apiClient.patch(API.HOSPITAL.DOCTOR_TOGGLE(doctorId), { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hospitalKeys.doctors() });
    },
  });
}
