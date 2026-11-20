/**
 * services/api/doctorApi.js — Doctor Service (Canonical Source of Truth)
 *
 * BUG-04 FIX: This is the SINGLE source of truth for doctor API calls.
 * All features api files re-export from here — never duplicate logic.
 * Use API constants from constants/apiRoutes.js — never hardcode URLs.
 */
import apiClient from '../apiClient';
import { API } from '../../constants/apiRoutes';

export const getDoctorProfile = async () => {
  const { data } = await apiClient.get(API.DOCTORS.PROFILE);
  return data;
};

export const getDoctorStats = async () => {
  const { data } = await apiClient.get(API.DOCTORS.STATS);
  return data;
};

export const getDoctorAppointments = async (params = {}) => {
  const { data } = await apiClient.get(API.DOCTORS.APPOINTMENTS, { params });

  // BUG-3 FIX: Backend returns UPPERCASE status (PENDING, CONFIRMED…)
  // Frontend filters with lowercase — normalize at API boundary.
  const normalizeStatus = (appt) => ({
    ...appt,
    status: appt.status?.toLowerCase?.() ?? appt.status,
  });

  if (Array.isArray(data?.results)) {
    return { ...data, results: data.results.map(normalizeStatus) };
  }
  if (Array.isArray(data)) {
    return data.map(normalizeStatus);
  }
  return data;
};

export const getDoctorAppointmentById = async (id) => {
  const { data } = await apiClient.get(API.DOCTORS.APPOINTMENT_DETAIL(id));
  return data;
};

export const completeAppointment = async (id, notes = '') => {
  const { data } = await apiClient.post(API.DOCTORS.APPOINTMENT_COMPLETE(id), { notes });
  return data;
};

export const approveAppointment = async (id) => {
  const { data } = await apiClient.post(API.APPOINTMENTS.CONFIRM(id));
  return data;
};

export const rejectAppointment = async (id) => {
  const { data } = await apiClient.post(API.APPOINTMENTS.REJECT(id));
  return data;
};

/**
 * CRITICAL-02 FIX: updateDoctorAppointmentStatus was sending PATCH /appointments/{id}/
 * with { status } — but status is in read_only_fields in AppointmentSerializer.
 * The backend silently returns 200 OK but ignores the status change.
 *
 * Use dedicated action endpoints instead:
 *   - completeAppointment()  → POST /doctor/appointments/{id}/complete/
 *   - confirmAppointment()   → POST /appointments/{id}/confirm/
 *   - rejectAppointment()    → POST /appointments/{id}/reject/
 *   - cancelAppointment()    → POST /appointments/{id}/cancel/
 *
 * @deprecated — kept for backward compat but now routes to correct endpoints
 */
export const updateDoctorAppointmentStatus = async ({ id, status, notes }) => {
  // Route to correct action endpoint based on status
  const actionMap = {
    COMPLETED:  () => apiClient.post(API.DOCTORS.APPOINTMENT_COMPLETE(id), { notes }),
    CONFIRMED:  () => apiClient.post(API.APPOINTMENTS.CONFIRM(id), { notes }),
    REJECTED:   () => apiClient.post(API.APPOINTMENTS.REJECT(id), { notes }),
    CANCELLED:  () => apiClient.post(API.APPOINTMENTS.CANCEL(id), { notes }),
  };
  const action = actionMap[status];
  if (!action) {
    throw new Error(`updateDoctorAppointmentStatus: unsupported status "${status}". Use dedicated action functions.`);
  }
  const { data } = await action();
  return data;
};

export const getDoctorAssistants = async () => {
  const { data } = await apiClient.get(API.DOCTORS.ASSISTANTS);
  return data;
};

export const addDoctorAssistant = async (payload) => {
  const { data } = await apiClient.post(API.DOCTORS.ASSISTANTS, payload);
  return data;
};

export const removeDoctorAssistant = async (id) => {
  const { data } = await apiClient.delete(API.DOCTORS.ASSISTANT_DETAIL(id));
  return data;
};

export const getDoctorPatients = async (params = {}) => {
  const { data } = await apiClient.get(API.DOCTORS.PATIENTS, { params });
  return data;
};

export const getDoctorPatientById = async (id) => {
  const { data } = await apiClient.get(API.DOCTORS.PATIENT_DETAIL(id));
  return data;
};

export const updateDoctorProfile = async (payload) => {
  const { data } = await apiClient.patch(API.DOCTORS.PROFILE, payload);
  return data;
};

export const getDoctorPrescriptions = async (params = {}) => {
  const { data } = await apiClient.get(API.PRESCRIPTIONS.LIST, { params });
  return data;
};

export const createPrescription = async (payload) => {
  const { data } = await apiClient.post(API.PRESCRIPTIONS.LIST, payload);
  return data;
};

export const sendPrescription = async (id) => {
  const { data } = await apiClient.post(API.PRESCRIPTIONS.SEND(id));
  return data;
};

export const getDoctorById = async (id) => {
  const { data } = await apiClient.get(API.DOCTORS.DETAIL(id));
  return data;
};

// HIGH-02 FIX: was hardcoding '/search/slots/' — now uses API.SLOTS.LIST constant
export const getDoctorAvailability = async (id, date) => {
  const { data } = await apiClient.get(API.SLOTS.LIST, {
    params: { doctor_id: id, from: date },
  });
  return data;
};

export const getDoctorReviews = async (id, params = {}) => {
  const { data } = await apiClient.get(API.DOCTORS.REVIEWS(id), { params });
  return data;
};

// FIX HIGH-04: unified with reviewApi.addDoctorReview — both POST to /doctors/{id}/reviews/
export const submitDoctorReview = async (id, payload) => {
  const { data } = await apiClient.post(API.DOCTORS.REVIEWS(id), payload);
  return data;
};

export const getDoctorKeys = {
  profile:       () => ['doctor', 'profile'],
  stats:         () => ['doctor', 'stats'],
  appointments:  (params) => ['doctor', 'appointments', params],
  appointment:   (id) => ['doctor', 'appointments', id],
  assistants:    () => ['doctor', 'assistants'],
  patients:      (params) => ['doctor', 'patients', params],
  patient:       (id) => ['doctor', 'patients', id],
  detail:        (id) => ['doctors', id],
  reviews:       (id) => ['doctors', id, 'reviews'],
  prescriptions: (params) => ['doctor', 'prescriptions', params],
};

export default {
  getDoctorProfile, updateDoctorProfile, getDoctorStats,
  getDoctorAppointments, getDoctorAppointmentById, completeAppointment,
  approveAppointment, rejectAppointment,
  updateDoctorAppointmentStatus,
  getDoctorAssistants, addDoctorAssistant, removeDoctorAssistant,
  getDoctorPatients, getDoctorPatientById,
  getDoctorPrescriptions, createPrescription, sendPrescription,
  getDoctorById, getDoctorReviews, submitDoctorReview,
};
