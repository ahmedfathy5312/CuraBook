/**
 * services/api/scheduleApi.js — Schedule & Slot Management Service
 *
 * FIX HIGH-05: All URLs now use API constants from apiRoutes.js.
 *              Previously every URL was a hardcoded string literal.
 *
 * Backend endpoints (all under /api/v1/schedules/):
 *   GET    /schedules/                    → list doctor's schedules
 *   POST   /schedules/                    → create a schedule
 *   PUT    /schedules/{id}/               → update schedule
 *   DELETE /schedules/{id}/               → delete schedule
 *   POST   /schedules/{id}/generate-slots/ → generate slots from one schedule
 *   POST   /schedules/slots/generate/     → generate from all active schedules
 *   GET    /schedules/slots/              → list generated slots
 *   POST   /schedules/blocked/            → create a blocked date range
 *   GET    /schedules/public/slots/       → public slot search (patients)
 */
import apiClient from '../apiClient';
import { API } from '../../constants/apiRoutes';

// ── Doctor's own schedules ───────────────────────────────────────────────────

export const getDoctorSchedules = async (params = {}) => {
  const { data } = await apiClient.get(API.DOCTORS.SCHEDULE_LIST, { params });
  return data;
};

/**
 * Fetch doctor schedules grouped by location from /doctor/schedule/.
 *
 * Response shape:
 *   {
 *     schedules: [{ location_type, location_id, location_name, schedules: [...] }],
 *     flat:      [...],   // backward-compat flat list
 *     total:     <int>,
 *   }
 */
export const getDoctorScheduleGrouped = async () => {
  const { data } = await apiClient.get(API.DOCTORS.SCHEDULE);
  // Normalise: backend may return the grouped array directly or under data.schedules
  if (Array.isArray(data)) {
    return { schedules: data, flat: data, total: data.length };
  }
  return data; // already { schedules, flat, total }
};

export const createSchedule = async (payload) => {
  const { data } = await apiClient.post(API.DOCTORS.SCHEDULE_LIST, payload);
  return data;
};

export const updateSchedule = async (scheduleId, payload) => {
  const { data } = await apiClient.put(API.DOCTORS.SCHEDULE_DETAIL(scheduleId), payload);
  return data;
};

export const patchSchedule = async (scheduleId, payload) => {
  const { data } = await apiClient.patch(API.DOCTORS.SCHEDULE_DETAIL(scheduleId), payload);
  return data;
};

export const deleteSchedule = async (scheduleId) => {
  const { data } = await apiClient.delete(API.DOCTORS.SCHEDULE_DETAIL(scheduleId));
  return data;
};

/**
 * Generate slots from a SINGLE schedule for a date range.
 */
export const generateSlotsFromSchedule = async (scheduleId, {
  start_date,
  end_date,
  override_existing = false,
  doctor_id = null,
  clinic = null,
  hospital = null,
}) => {
  // MED-04 FIX: was building URL via string concat: `${API.DOCTORS.SCHEDULE_DETAIL(scheduleId)}generate-slots/`
  // Now uses dedicated constant API.DOCTORS.GENERATE_SLOTS_FROM_SCHEDULE
  // Bug #3 Fix: pass doctor_id when provided (required for hospital admin callers)
  const payload = { start_date, end_date, override_existing };
  if (doctor_id) payload.doctor_id = doctor_id;
  if (clinic) payload.clinic = clinic;
  if (hospital) payload.hospital = hospital;
  const { data } = await apiClient.post(API.DOCTORS.GENERATE_SLOTS_FROM_SCHEDULE(scheduleId), payload);
  return data;
};

/**
 * Generate slots from ALL active schedules for a doctor.
 * Bug #3 Fix: when called by a hospital admin, pass doctor_id so the backend
 * generates slots for the correct doctor (not the admin's own account).
 * Bug v25 Fix: also pass clinic/hospital so backend filters to correct location
 * when a doctor works in multiple places.
 */
export const generateDoctorSlots = async ({ start_date, end_date, override_existing = false, doctor_id = null, clinic = null, hospital = null }) => {
  const payload = { start_date, end_date, override_existing };
  // Include doctor_id for hospital admin calls (backend requires it)
  if (doctor_id) payload.doctor_id = doctor_id;
  // Include location filter so backend finds schedules for the correct location
  if (clinic)   payload.clinic   = clinic;
  if (hospital) payload.hospital = hospital;
  const { data } = await apiClient.post(API.DOCTORS.GENERATE_SLOTS, payload);
  return data;
};

// ── Hospital admin ────────────────────────────────────────────────────────────

export const getHospitalDoctorSchedule = async (hospitalId, doctorId) => {
  const { data } = await apiClient.get(API.DOCTORS.SCHEDULE_LIST, {
    params: { hospital: hospitalId, doctor: doctorId },
  });
  return data;
};

export const saveHospitalDoctorSchedule = async (hospitalId, doctorId, payload) => {
  const { data } = await apiClient.post(API.DOCTORS.SCHEDULE_LIST, {
    ...payload,
    doctor:   doctorId,
    hospital: hospitalId,
  });
  return data;
};

// ── Slots management ─────────────────────────────────────────────────────────

export const getAvailableSlots = async (doctorId, {
  from,
  to,
  location_type,
  location_id,
} = {}) => {
  const { data } = await apiClient.get(API.SLOTS.LIST, {
    params: {
      doctor_id: doctorId,
      ...(from          && { from }),
      ...(to            && { to }),
      ...(location_type && { location_type }),
      ...(location_id   && { location_id }),
    },
  });
  return data;
};

export const addManualSlot = async (payload) => {
  const { data } = await apiClient.post(API.SLOTS.MANAGE, payload);
  return data;
};

export const deleteSlot = async (slotId) => {
  const { data } = await apiClient.delete(API.SLOTS.DETAIL(slotId));
  return data;
};

export const deactivateSlot = async (slotId) => {
  const { data } = await apiClient.post(API.SLOTS.DEACTIVATE(slotId));
  return data;
};

export const toggleBlockSlot = async (slotId) => {
  const { data } = await apiClient.post(API.SLOTS.TOGGLE_BLOCK(slotId));
  return data;
};

export const createBlockedSlot = async (payload) => {
  const { data } = await apiClient.post(API.SLOTS.BLOCKED_LIST, payload);
  return data;
};

// Backward-compat aliases
export const saveDoctorSchedule   = createSchedule;
export const getDoctorSchedule    = getDoctorSchedules;
export const blockSlot            = createBlockedSlot;

export const scheduleKeys = {
  schedules:        ()                     => ['schedules'],
  doctorSchedule:   (type, id)             => ['schedule', 'doctor', type, id],
  hospitalSchedule: (hospitalId, doctorId) => ['schedule', 'hospital', hospitalId, doctorId],
  availability:     (doctorId, date)       => ['availability', doctorId, date],
  availableSlots:   (doctorId, params)     => ['slots', 'available', doctorId, params],
  slots:            (params)               => ['slots', params],
};

export default {
  getDoctorSchedules, getDoctorSchedule,
  createSchedule, updateSchedule, patchSchedule, deleteSchedule,
  saveDoctorSchedule,
  generateSlotsFromSchedule, generateDoctorSlots,
  getHospitalDoctorSchedule, saveHospitalDoctorSchedule,
  getAvailableSlots, addManualSlot, deleteSlot, deactivateSlot,
  createBlockedSlot, blockSlot, toggleBlockSlot,
};
