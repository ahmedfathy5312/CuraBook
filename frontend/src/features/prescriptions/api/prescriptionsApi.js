/**
 * features/prescriptions/api/prescriptionsApi.js
 * Centralized prescriptions API.
 *
 * FIX: was importing from '../../doctor/api/doctorApi' — that folder does NOT
 * exist. Corrected to use the canonical services/api/doctorApi.js directly.
 */
export {
  getDoctorPrescriptions,
  createPrescription,
  sendPrescription,
} from '../../../services/api/doctorApi';

export {
  getPatientPrescriptions,
} from '../../patient/api/patientApi';

export const prescriptionKeys = {
  all:     ()       => ['prescriptions'],
  doctor:  (params) => ['prescriptions', 'doctor', params],
  patient: (params) => ['prescriptions', 'patient', params],
  detail:  (id)     => ['prescriptions', 'detail', id],
};
