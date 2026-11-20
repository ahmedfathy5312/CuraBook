/**
 * useDoctorProfile.js — Canonical implementation (doctor-discovery feature)
 *
 * CIRCULAR FIX: was re-exporting from ../../doctors/hooks/useDoctorProfile
 * which re-exported back here → infinite loop.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

export function useDoctorProfile(doctorId) {
  return useQuery({
    queryKey: ['doctor', 'profile', doctorId],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.DETAIL(doctorId));
      return data;
    },
    enabled: !!doctorId,
    staleTime: 5 * 60_000,
  });
}

export function useDoctorReviews(doctorId) {
  return useQuery({
    queryKey: ['doctor', 'reviews', doctorId],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.REVIEWS(doctorId));
      return data;
    },
    enabled: !!doctorId,
    staleTime: 2 * 60_000,
  });
}

export function useCanReview(doctorId) {
  return useQuery({
    queryKey: ['doctor', 'can-review', doctorId],
    queryFn: async () => {
      const { data } = await apiClient.get(API.DOCTORS.CAN_REVIEW(doctorId));
      return data;
    },
    enabled: !!doctorId,
  });
}

export function useSubmitReview(doctorId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rating, comment }) => {
      const { data } = await apiClient.post(API.DOCTORS.REVIEWS(doctorId), { rating, comment });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'reviews', doctorId] });
      qc.invalidateQueries({ queryKey: ['doctor', 'can-review', doctorId] });
      qc.invalidateQueries({ queryKey: ['doctor', 'profile', doctorId] });
    },
  });
}

export function useDoctorSlots(doctorId, date) {
  return useQuery({
    queryKey: ['doctor', 'slots', doctorId, date],
    queryFn: async () => {
      const { data } = await apiClient.get(API.SLOTS.LIST, {
        params: { doctor_id: doctorId, from: date },
      });
      return data?.results ?? data ?? [];
    },
    enabled: !!doctorId && !!date,
    staleTime: 60_000,
  });
}
