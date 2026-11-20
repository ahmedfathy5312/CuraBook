import { API } from '../../../constants/apiRoutes';
import apiClient from '../../../services/apiClient';

export const getAdminStats        = async ()  => { const { data } = await apiClient.get(API.ADMIN.STATS);                        return data; };
export const getAdminHospitals    = async (p) => { const { data } = await apiClient.get(API.ADMIN.HOSPITALS,    { params: p }); return data; };
export const getAdminDoctors      = async (p) => { const { data } = await apiClient.get(API.ADMIN.DOCTORS,      { params: p }); return data; };
export const getAdminPatients     = async (p) => { const { data } = await apiClient.get(API.ADMIN.PATIENTS,     { params: p }); return data; };
export const getAdminAllUsers     = async (p) => { const { data } = await apiClient.get(API.ADMIN.ALL_USERS,    { params: p }); return data; }; // Fix NEW#1
export const getAdminAssistants   = async (p) => { const { data } = await apiClient.get(API.ADMIN.ASSISTANTS,  { params: p }); return data; }; // Fix NEW#2
export const getAdminAppointments = async (p) => { const { data } = await apiClient.get(API.ADMIN.APPOINTMENTS,{ params: p }); return data; };
export const getAuditLogs         = async (p) => { const { data } = await apiClient.get(API.ADMIN.AUDIT_LOGS,  { params: p }); return data; };
export const toggleHospital       = async (id) => { const { data } = await apiClient.post(API.ADMIN.TOGGLE_HOSPITAL(id));        return data; };
export const toggleDoctor         = async (id) => { const { data } = await apiClient.post(API.ADMIN.TOGGLE_DOCTOR(id));          return data; };
export const togglePatient        = async (id) => { const { data } = await apiClient.post(API.ADMIN.TOGGLE_PATIENT(id));         return data; };   // FIX: patient toggle
export const toggleAssistant      = async (id) => { const { data } = await apiClient.post(API.ADMIN.TOGGLE_ASSISTANT(id));       return data; };   // FIX: assistant toggle
export const toggleUser           = async ({ id, is_active }) => { const { data } = await apiClient.patch(API.ADMIN.USER_DETAIL(id), { is_active }); return data; }; // FIX: generic user PATCH
export const deleteUser           = async (id) => { const { data } = await apiClient.delete(API.ADMIN.USER_DETAIL(id));          return data; };
export const getSystemHealth      = async ()  => { const { data } = await apiClient.get(API.ADMIN.HEALTH);                       return data; };
export const getAdminTimeSeries   = async (days) => { const { data } = await apiClient.get(API.ADMIN.TIME_SERIES(days));         return data; };
// Profile detail endpoints (Gap #3B)
export const getAdminDoctorDetail    = async (id) => { const { data } = await apiClient.get(API.ADMIN.DOCTOR_DETAIL(id));    return data; };
export const getAdminPatientDetail   = async (id) => { const { data } = await apiClient.get(API.ADMIN.PATIENT_DETAIL(id));   return data; };
export const getAdminHospitalDetail  = async (id) => { const { data } = await apiClient.get(API.ADMIN.HOSPITAL_DETAIL(id));  return data; };
export const getAdminAssistantDetail = async (id) => { const { data } = await apiClient.get(API.ADMIN.ASSISTANT_DETAIL(id)); return data; };
