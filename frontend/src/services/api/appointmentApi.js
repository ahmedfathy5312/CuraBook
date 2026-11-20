/**
 * services/api/appointmentApi.js — Unified Appointment Service
 *
 * Booking Flow (matched to backend):
 *   1. Patient selects slot   → bookAppointment({ doctor, slot_id, visit_type, reason })
 *   2. Server creates         → status: PENDING (backend enforces UPPERCASE)
 *   3. Assistant sees it      → getAssistantAppointments() via GET /assistant/appointments/
 *   4. Assistant confirms     → approveAppointment() → POST /appointments/{id}/confirm/
 *   5. Patient gets WS        → APPOINTMENT_CONFIRMED event
 *
 * FIX HIGH-01: completeAppointment removed from this file.
 *              Use doctorApi.completeAppointment() — supports notes param +
 *              posts to /doctor/appointments/{id}/complete/.
 * FIX HIGH-08: getAllAppointments now uses API.HOSPITAL.APPOINTMENTS (hospital-scoped)
 *              instead of duplicating /appointments/ like getMyAppointments.
 * FIX MED-04:  getAssistantWorkplaces canonical location is now usersApi.js.
 *              Re-exported here for backward compatibility only.
 */
import apiClient from '../apiClient';
import { API } from '../../constants/apiRoutes';

// ── Patient ───────────────────────────────────────────────────────────────────
export const getMyAppointments = async (params = {}) => {
  const { data } = await apiClient.get(API.APPOINTMENTS.LIST, { params });
  return data;
};

export const getAppointmentById = async (id) => {
  const { data } = await apiClient.get(API.APPOINTMENTS.DETAIL(id));
  return data;
};

/**
 * Book appointment — backend expects slot_id, NOT date+time
 * @param {object} payload
 * @param {number} payload.doctor      - Doctor's USER id
 * @param {number} payload.slot_id     - GeneratedSlot id (from /search/slots/)
 * @param {string} payload.visit_type  - "IN_PERSON" | "ONLINE" (UPPERCASE)
 * @param {string} [payload.reason]    - Optional reason for visit
 * @param {number} [payload.clinic]    - Clinic id (if clinic booking)
 * @param {number} [payload.hospital]  - Hospital id (if hospital booking)
 */
export const bookAppointment = async ({
  doctor,
  slot_id,
  visit_type = 'IN_PERSON',
  reason = '',
  clinic,
  hospital,
}) => {
  const { data } = await apiClient.post(API.APPOINTMENTS.LIST, {
    doctor,
    slot:       slot_id,
    visit_type,
    reason,
    ...(clinic   && { clinic }),
    ...(hospital && { hospital }),
  });
  return data;
};

export const cancelAppointment = async (id, reason = '') => {
  const { data } = await apiClient.post(API.APPOINTMENTS.CANCEL(id), { reason });
  return data;
};

export const rescheduleAppointment = async ({ id, slot_id, reason = '' }) => {
  // BUG-FIX #3: Use `new_slot_id` (correct backend key — was previously `slot_id`).
  // Omit the key entirely when no slot is chosen so the backend takes the
  // request_reschedule_reason_only() path instead of failing validation.
  const body = { reason };
  if (slot_id) body.new_slot_id = slot_id;

  const { data } = await apiClient.post(API.APPOINTMENTS.RESCHEDULE(id), body);
  return data;
};

export const approveReschedule = async (id) => {
  const { data } = await apiClient.post(API.APPOINTMENTS.APPROVE_RESCHEDULE(id));
  return data;
};

export const rejectReschedule = async ({ id, reason = '' }) => {
  const { data } = await apiClient.post(API.APPOINTMENTS.REJECT_RESCHEDULE(id), { reason });
  return data;
};

// ── Assistant ─────────────────────────────────────────────────────────────────
export const getAssistantAppointments = async (params = {}) => {
  // Dedicated /assistant/appointments/ returns aggregated bookings
  // across ALL workplaces (clinics + hospitals).
  const { data } = await apiClient.get(API.ASSISTANT.APPOINTMENTS, { params });
  return data;
};

export const approveAppointment = async (idOrObj) => {
  // Accepts either a plain id or { id, note } object
  const id   = typeof idOrObj === 'object' ? idOrObj.id   : idOrObj;
  const note = typeof idOrObj === 'object' ? idOrObj.note : undefined;
  const body = note ? { note } : undefined;
  const { data } = await apiClient.post(API.ASSISTANT.APPROVE(id), body);
  return data;
};

export const rejectAppointment = async (id, reason = '') => {
  const { data } = await apiClient.post(API.ASSISTANT.REJECT(id), { reason });
  return data;
};

// ── Hospital / Admin ──────────────────────────────────────────────────────────
// FIX HIGH-08: hospital-scoped — different endpoint from getMyAppointments
export const getAllAppointments = async (params = {}) => {
  const { data } = await apiClient.get(API.HOSPITAL.APPOINTMENTS, { params });
  return data;
};

// ── Query Keys ────────────────────────────────────────────────────────────────
export const appointmentKeys = {
  all:       () => ['appointments'],
  patient:   (params) => ['appointments', 'patient', params],
  detail:    (id) => ['appointments', 'detail', id],
  assistant: (params) => ['assistant', 'appointments', params],
  hospital:  (params) => ['hospital', 'appointments', params],
};

export default {
  getMyAppointments, getAppointmentById, bookAppointment, cancelAppointment,
  rescheduleAppointment, approveReschedule, rejectReschedule,
  getAssistantAppointments, approveAppointment, rejectAppointment,
  getAllAppointments,
  // completeAppointment → import from doctorApi.js (has notes param support)
};
