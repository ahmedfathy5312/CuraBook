/**
 * features/doctor-dashboard/index.js
 * FIX: was pointing to '../doctor/api/doctorApi' and '../doctor/hooks/useDoctorDashboard'
 * which referred to a non-existent 'features/doctor/' folder.
 * Corrected to point to the actual canonical locations.
 */
export * from '../../services/api/doctorApi';
export * from './hooks/useDoctorDashboard';
