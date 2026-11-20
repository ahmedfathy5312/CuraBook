/**
 * features/prescriptions/pages/index.js
 * Re-exports prescription page components.
 *
 * FIX: was importing DoctorPrescriptionsPage from '../../doctor/pages/' which
 * does NOT exist. Corrected to actual location in doctor-dashboard/pages/.
 */
export { default as DoctorPrescriptionsPage } from '../../doctor-dashboard/pages/DoctorPrescriptionsPage';
export { default as PatientPrescriptionsPage } from '../../patient/pages/PrescriptionsPage';
