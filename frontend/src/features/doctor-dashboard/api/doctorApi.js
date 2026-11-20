/**
 * features/doctor-dashboard/api/doctorApi.js
 * Re-export shim for doctor dashboard API calls.
 *
 * FIX: was importing from '../../doctor/api/doctorApi' — that folder does NOT
 * exist. Corrected to use the canonical services/api/doctorApi.js.
 */
export * from '../../../services/api/doctorApi';
export { default } from '../../../services/api/doctorApi';
