/**
 * features/prescriptions/index.js
 * MISSING #6 FIX: Prescriptions feature — single entry point.
 *
 * Before this fix, prescription logic was scattered across:
 *   features/doctor/pages/DoctorPrescriptionsPage.jsx
 *   features/patient/pages/PrescriptionsPage.jsx
 *   services/api/doctorApi.js  (createPrescription, sendPrescription)
 *   services/api/usersApi.js   (getPatientPrescriptions)
 *
 * This feature module provides:
 *   - api/prescriptionsApi.js   — all prescription API calls (centralized)
 *   - hooks/usePrescriptions.js — React Query hooks for both roles
 *   - pages/index.js            — re-exports role-specific page components
 */
export * from './api/prescriptionsApi';
export * from './hooks/usePrescriptions';
export { DoctorPrescriptionsPage, PatientPrescriptionsPage } from './pages/index';
