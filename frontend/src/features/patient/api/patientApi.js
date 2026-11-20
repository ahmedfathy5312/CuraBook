/**
 * features/patient/api/patientApi.js
 * AUDIT FIX ISSUE #1 (FINAL): Canonical implementation for user/patient API calls.
 * Moved from services/api/usersApi.js — the actual Axios calls live here.
 * services/api/usersApi.js is now a re-export barrel pointing back here.
 */
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

// ── Profile ───────────────────────────────────────────────────────────────────
export const getMyProfile      = async ()  => { const { data } = await apiClient.get(API.USERS.ME);               return data; };
export const updateMyProfile   = async (p) => { const { data } = await apiClient.patch(API.USERS.ME, p);          return data; };

export const uploadProfileImage = async (file) => {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await apiClient.patch(API.USERS.AVATAR, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
// Alias — works for all user types
export const uploadProfileImageUniversal = uploadProfileImage;

export const getAssistantWorkplaces = async () => { const { data } = await apiClient.get(API.ASSISTANT.WORKPLACES); return data; };

export const getPatientProfile      = async ()  => { const { data } = await apiClient.get(API.USERS.PATIENT_PROFILE_ME || '/patients/me/');  return data; };  // FIX Bug#2: use /patients/me/ not /patients/ (list)
export const updatePatientProfile   = async (p) => { const { data } = await apiClient.patch(API.USERS.PATIENT_PROFILE_ME || '/patients/me/', p); return data; };  // FIX: use /me/ endpoint for PATCH
export const getDoctorSelfProfile   = async ()  => { const { data } = await apiClient.get(API.USERS.DOCTOR_PROFILE);                       return data; };
export const updateDoctorSelfProfile= async (p) => { const { data } = await apiClient.patch(API.USERS.DOCTOR_PROFILE, p);                  return data; };
export const getPatientPrescriptions= async (p) => { const { data } = await apiClient.get(API.PRESCRIPTIONS.LIST, { params: p });          return data; };
export const getMedicalHistory      = async ()  => { const { data } = await apiClient.get(API.USERS.MEDICAL_HISTORY);                      return data; };

export const userKeys = {
  profile:       () => ['user', 'profile'],
  patientProfile:() => ['user', 'patient', 'profile'],
  doctorProfile: () => ['user', 'doctor', 'profile'],
  prescriptions: (p) => ['user', 'prescriptions', p],
  history:       () => ['user', 'medical-history'],
  workplaces:    () => ['user', 'workplaces'],
};

export default {
  getMyProfile, updateMyProfile, uploadProfileImage, uploadProfileImageUniversal,
  getPatientProfile, updatePatientProfile,
  getDoctorSelfProfile, updateDoctorSelfProfile,
  getPatientPrescriptions, getMedicalHistory,
  getAssistantWorkplaces,
};
