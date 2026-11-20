import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

export const getHospitalOverview      = async ()  => { const { data } = await apiClient.get(API.HOSPITAL.OVERVIEW);                   return data; };
export const getHospitalDoctors       = async (p) => { const { data } = await apiClient.get(API.HOSPITAL.DOCTORS,      { params: p }); return data; };
export const getHospitalAppointments  = async (p) => { const { data } = await apiClient.get(API.HOSPITAL.APPOINTMENTS, { params: p }); return data; };
export const getHospitalPatients      = async (p) => { const { data } = await apiClient.get(API.HOSPITAL.PATIENTS,     { params: p }); return data; };
export const getHospitalAssistants    = async (p) => { const { data } = await apiClient.get(API.HOSPITAL.ASSISTANTS,   { params: p }); return data; };
export const getHospitalAnalytics     = async ()  => { const { data } = await apiClient.get(API.HOSPITAL.ANALYTICS);                   return data; };
export const addDoctorToHospital      = async (payload) => { const { data } = await apiClient.post(API.HOSPITAL.DOCTORS, payload);               return data; };
export const removeDoctorFromHospital = async (id)      => { const { data } = await apiClient.delete(API.HOSPITAL.DOCTOR_DETAIL(id));            return data; };
export const updateHospitalProfile    = async (payload) => { const { data } = await apiClient.patch(API.HOSPITAL.PROFILE, payload);              return data; };

// ── Departments — MISSING #5 FIX: now uses API.HOSPITAL constants ─────────────
export const getHospitalDepartments   = async ()        => { const { data } = await apiClient.get(API.HOSPITAL.DEPARTMENTS);                  return data; };
export const createHospitalDepartment = async (payload) => { const { data } = await apiClient.post(API.HOSPITAL.DEPARTMENTS, payload);         return data; };
export const deleteHospitalDepartment = async (id)      => { const { data } = await apiClient.delete(API.HOSPITAL.DEPARTMENT_DETAIL(id));      return data; };
export const assignDoctorToDepartment = async ({ doctorId, departmentId }) => {
  const { data } = await apiClient.patch(API.HOSPITAL.DOCTOR_DETAIL(doctorId), { department: departmentId ?? null });
  return data;
};

// ── Assistants ────────────────────────────────────────────────────────────────
export const addAssistantToHospital      = async (payload) => { const { data } = await apiClient.post(API.HOSPITAL.ASSISTANTS, payload);               return data; };
export const removeAssistantFromHospital = async (id)      => { const { data } = await apiClient.delete(API.HOSPITAL.ASSISTANT_DETAIL(id));            return data; }; // HIGH-03 FIX: was hardcoded `/hospital/assistants/${id}/`

// ── Query Key Factory ─────────────────────────────────────────────────────────
export const hospitalKeys = {
  overview:     () => ['hospital', 'overview'],
  doctors:      (p) => ['hospital', 'doctors', p],
  appointments: (p) => ['hospital', 'appointments', p],
  patients:     (p) => ['hospital', 'patients', p],
  assistants:   (p) => ['hospital', 'assistants', p],
  analytics:    () => ['hospital', 'analytics'],
  departments:  () => ['hospital', 'departments'],
};
