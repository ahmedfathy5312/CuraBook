/**
 * features/assistant/api/assistantApi.js
 * Re-exports for backward compatibility.
 *
 * MED-02 FIX: getAssistantWorkplaces was imported from appointmentApi which
 * doesn't export it — caused a silent undefined import.
 * Canonical location is usersApi (re-exports from patient/api/patientApi.js).
 */
export {
  getAssistantAppointments,
  approveAppointment,
  rejectAppointment,
} from '../../../services/api/appointmentApi';

// MED-02 FIX: getAssistantWorkplaces → from usersApi (not appointmentApi)
export { getAssistantWorkplaces } from '../../../services/api/usersApi';

// Use scheduleApi for schedule data
export { getDoctorSchedules as getAssistantSchedule } from '../../../services/api/scheduleApi';
