/**
 * useSchedule.js — React Query hooks for all scheduling operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import * as api from '../../../services/api/scheduleApi';
import { scheduleKeys } from '../../../services/api/scheduleApi';

// ── Doctor's own schedules ────────────────────────────────────────────────────

export function useDoctorSchedules(params = {}) {
  return useQuery({
    queryKey: [...scheduleKeys.schedules(), params],
    queryFn:  () => api.getDoctorSchedules(params),
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetch all schedules for the logged-in doctor, grouped by location.
 * Uses GET /doctor/schedule/ which returns:
 *   { schedules: [{ location_type, location_id, location_name, schedules: [...] }], flat, total }
 *
 * Useful for the Schedule page header / location tabs when the profile
 * hasn't loaded yet or the doctor has no clinic/hospital linked.
 */
export function useDoctorScheduleGrouped() {
  return useQuery({
    queryKey: ['doctor', 'schedule', 'grouped'],
    queryFn:  () => api.getDoctorScheduleGrouped(),
    staleTime: 5 * 60_000,
    select: (res) => ({
      groups: res?.schedules ?? [],
      flat:   res?.flat      ?? [],
      total:  res?.total     ?? 0,
    }),
  });
}

// Legacy alias used by DoctorScheduleManager
export function useDoctorLocationSchedule(locationType, locationId) {
  const params = locationType === 'clinic'
    ? { clinic: locationId }
    : { hospital: locationId };
  return useQuery({
    queryKey: scheduleKeys.doctorSchedule(locationType, locationId),
    queryFn:  () => api.getDoctorSchedules(params),
    enabled:  !!locationType && !!locationId,
    staleTime: 5 * 60_000,
  });
}

export function useSaveDoctorSchedule() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.createSchedule,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.schedules() });
      toast.success('Schedule saved!');
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to save schedule.'),
  });
}

/**
 * Upsert hook: PUT if schedule has an existing ID, POST if new.
 * Fixes Problem 2: handleSave always did POST even for existing schedules.
 * BUG #2 FIX (v11): improved error messaging — backend now returns clear
 * Arabic/English messages instead of raw "This field is required." from
 * DRF's UniqueTogetherValidator.
 */
export function useUpsertSchedule() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, suppressToast, ...payload }) => {
      if (id) {
        return api.updateSchedule(id, payload);
      }
      return api.createSchedule(payload);
    },
    onSuccess: (_data, variables = {}) => {
      qc.invalidateQueries({ queryKey: scheduleKeys.schedules() });
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'schedule', 'grouped'] });
      if (variables?.suppressToast) return;
      toast.success('تم حفظ الجدول بنجاح ✓');
    },
    onError: (e) => {
      // errorDetail is now properly extracted by apiClient (field errors + non_field_errors)
      const msg = e?.errorDetail;
      if (msg) {
        toast.error(msg);
        return;
      }
      // Fallback: extract from raw response data
      const details = e?.errorFields || e?.response?.data;
      if (details && typeof details === 'object') {
        const fieldErrors = Object.entries(details)
          .filter(([k]) => k !== 'doctor')   // hide internal doctor-field validator leak
          .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
          .filter(m => typeof m === 'string' && m.trim())
          .join(' ');
        if (fieldErrors) { toast.error(fieldErrors); return; }
      }
      toast.error('فشل حفظ الجدول. تأكد من تحديد العيادة أو المستشفى وأوقات العمل. / Failed to save schedule.');
    },
  });
}

export function useUpdateSchedule() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.updateSchedule(id, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.schedules() });
      toast.success('Schedule updated!');
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to update schedule.'),
  });
}

export function useDeleteSchedule() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.deleteSchedule,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.schedules() });
      toast.success('Schedule deleted.');
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to delete schedule.'),
  });
}

// ── Slot generation ───────────────────────────────────────────────────────────

export function useGenerateSlots() {
  const toast = useToast();
  const qc    = useQueryClient();
  return useMutation({
    mutationFn: api.generateDoctorSlots,
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      const count = data?.created ?? data?.count ?? 'some';
      if (Number(count) === 0) {
        toast.error('لم يتم توليد أي موعد. تأكد أن نطاق التاريخ يحتوي أيام العمل المحفوظة.');
        return;
      }
      toast.success(`تم توليد ${count} موعد بنجاح ✓`);
    },
    onError: (e) => {
      // errorDetail now properly extracted by apiClient
      const msg =
        e?.errorDetail ||
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        'فشل توليد المواعيد. تأكد من حفظ الجدول أولاً. / Failed to generate slots. Make sure you have saved your schedule first.';
      toast.error(msg);
    },
  });
}

export function useGenerateSlotsFromSchedule() {
  const toast = useToast();
  const qc    = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, ...params }) =>
      api.generateSlotsFromSchedule(scheduleId, params),
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      if (Number(data?.created ?? 0) === 0) {
        toast.error('Generated 0 slots. Check that the date range includes this schedule day.');
        return;
      }
      toast.success(`Generated ${data?.created ?? 'some'} slots!`);
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to generate slots.'),
  });
}

// ── Slot management ───────────────────────────────────────────────────────────

export function useDeleteSlot() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.deleteSlot,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      toast.success('Slot deleted.');
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to delete slot.'),
  });
}

/**
 * Toggle a single slot's blocked/available status.
 * Uses POST /schedules/slots/{id}/toggle-block/ which correctly flips is_active
 * and returns the new status without losing the slot.
 */
export function useToggleBlockSlot() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (slotId) => api.toggleBlockSlot(slotId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      const msg = data?.status === 'blocked' ? 'Slot blocked.' : 'Slot unblocked.';
      toast.success(msg);
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to update slot status.'),
  });
}

export function useAddManualSlot() {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.addManualSlot,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      toast.success('Slot added!');
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to add slot.'),
  });
}

// ── Hospital admin ─────────────────────────────────────────────────────────────

export function useHospitalDoctorSchedule(hospitalId, doctorId) {
  return useQuery({
    queryKey: scheduleKeys.hospitalSchedule(hospitalId, doctorId),
    queryFn:  () => api.getHospitalDoctorSchedule(hospitalId, doctorId),
    enabled:  !!hospitalId && !!doctorId,
    staleTime: 5 * 60_000,
  });
}

export function useSaveHospitalDoctorSchedule(hospitalId) {
  const qc    = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, doctorId, ...payload }) => {
      if (id) return api.updateSchedule(id, payload);
      return api.saveHospitalDoctorSchedule(hospitalId, doctorId, payload);
    },
    onSuccess:  (_data, variables = {}) => {
      qc.invalidateQueries({ queryKey: ['schedule', 'hospital', hospitalId] });
      if (variables?.suppressToast) return;
      toast.success('Doctor schedule saved!');
    },
    onError: (e) => toast.error(e?.errorDetail || 'Failed to save schedule.'),
  });
}

export function useDeleteHospitalDoctorSchedule(hospitalId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', 'hospital', hospitalId] });
    },
  });
}
