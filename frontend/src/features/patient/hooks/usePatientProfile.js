import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatientProfile, updatePatientProfile } from '../api/patientApi';
import { useToast } from '../../../context/ToastContext';

export function usePatientProfile() {
  return useQuery({
    queryKey: ['patient', 'profile'],
    queryFn:  getPatientProfile,
    staleTime: 5 * 60_000,
    retry: 1,                  // FIX Bug#2: reduce retries so errors surface faster
    throwOnError: false,       // FIX Bug#2: prevent ErrorBoundary from catching API failures
  });
}

export function useUpdatePatientProfile() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: updatePatientProfile,
    onSuccess: (data) => {
      qc.setQueryData(['patient', 'profile'], data);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile updated successfully!');
    },
    onError: (err) => toast.error(err?.errorDetail || 'Failed to update profile.'),
  });
}
