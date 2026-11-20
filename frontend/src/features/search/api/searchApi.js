/**
 * features/search/api/searchApi.js
 * AUDIT FIX ISSUE #1 (FINAL): Canonical search API implementation.
 * Moved from services/api/searchApi.js.
 */
import apiClient from '../../../services/apiClient';
import publicApiClient from '../../../services/publicApiClient';
import { API } from '../../../constants/apiRoutes';

/**
 * searchDoctors — used from BOTH public pages (Home, DoctorSearch) and protected pages.
 * Uses publicApiClient so unauthenticated visitors on the Home page never trigger
 * the 401→logout interceptor in apiClient.
 */
export const searchDoctors = async (params = {}, signal = undefined) => {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const { data } = await publicApiClient.get(API.SEARCH.DOCTORS, { params: cleaned, signal });
  return data;
};

export const searchHospitals = async (params = {}) => {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const { data } = await apiClient.get(API.HOSPITALS.SEARCH, { params: cleaned });
  return data;
};

export const getSpecializations = async () => {
  const { data } = await publicApiClient.get(API.DOCTORS.SPECIALIZATIONS);
  return data;
};

export const getCities = async () => {
  const { data } = await apiClient.get(API.LOCATIONS.CITIES);
  return data;
};

export const searchKeys = {
  doctors:         (params) => ['search', 'doctors', params],
  hospitals:       (params) => ['search', 'hospitals', params],
  specializations: ()       => ['search', 'specializations'],
  cities:          ()       => ['search', 'cities'],
};

export default { searchDoctors, searchHospitals, getSpecializations, getCities };
