/**
 * features/prescriptions/hooks/usePrescriptions.js
 * MISSING #6 FIX: Centralized prescription React Query hooks.
 * Previously each page defined its own inline useQuery — this centralizes them.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDoctorPrescriptions,
  createPrescription,
  sendPrescription,
  getPatientPrescriptions,
  prescriptionKeys,
} from '../api/prescriptionsApi';

/** Doctor: list all prescriptions they created */
export function useDoctorPrescriptions(params = {}) {
  return useQuery({
    queryKey: prescriptionKeys.doctor(params),
    queryFn:  () => getDoctorPrescriptions(params),
    staleTime: 5 * 60_000,
  });
}

/** Patient: list own received prescriptions */
export function usePatientPrescriptions(params = {}) {
  return useQuery({
    queryKey: prescriptionKeys.patient(params),
    queryFn:  () => getPatientPrescriptions(params),
    staleTime: 5 * 60_000,
  });
}

/** Doctor: create a new prescription */
export function useCreatePrescription({ onSuccess } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPrescription,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all() });
      onSuccess?.(data);
    },
  });
}

/** Doctor: send prescription to patient (notify + email) */
export function useSendPrescription({ onSuccess } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => sendPrescription(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all() });
      onSuccess?.(data);
    },
  });
}
