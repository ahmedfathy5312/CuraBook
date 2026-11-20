/**
 * features/doctor-discovery/api/doctorsApi.js
 * CANONICAL implementation — all doctor discovery API calls live here.
 *
 * FIX: was re-exporting from features/doctors/api/doctorsApi which re-exported
 * back here → circular import loop → runtime crash (undefined exports).
 *
 * features/doctors/api/doctorsApi.js is the shim that points HERE — not the
 * other way around.
 */
export {
  searchDoctors,
  searchHospitals,
  getSpecializations,
  getCities,
  searchKeys,
} from '../../search/api/searchApi';

export {
  getDoctorById,
  getDoctorReviews,
  submitDoctorReview,
  getDoctorAvailability,
} from '../../../services/api/doctorApi';

export { default } from '../../../services/api/doctorApi';
