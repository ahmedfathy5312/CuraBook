/**
 * features/auth/api/authApi.js
 * AUDIT FIX ISSUE #1 (FINAL): This is now the CANONICAL implementation.
 * Moved from services/api/authApi.js — the actual Axios calls live here.
 * services/api/authApi.js is now a re-export barrel pointing back here.
 */
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

export const login             = async (c) => { const { data } = await apiClient.post(API.AUTH.LOGIN,              c);              return data; };
export const register          = async (p) => { const { data } = await apiClient.post(API.AUTH.REGISTER,           p);              return data; };
export const registerDoctor    = async (p) => { const { data } = await apiClient.post(API.AUTH.REGISTER_DOCTOR,    p);              return data; };
export const registerHospital  = async (p) => { const { data } = await apiClient.post(API.AUTH.REGISTER_HOSPITAL,  p);              return data; };
export const registerAssistant = async (p) => { const { data } = await apiClient.post(API.AUTH.REGISTER_ASSISTANT, p);              return data; };
export const refreshToken      = async (r) => { const { data } = await apiClient.post(API.AUTH.REFRESH,            { refresh: r }); return data; };
export const logoutApi         = async (r) => { const { data } = await apiClient.post(API.AUTH.LOGOUT,             { refresh: r }); return data; };
export const getMe             = async ()  => { const { data } = await apiClient.get(API.USERS.ME);                                 return data; };
export const updateMe          = async (p) => { const { data } = await apiClient.patch(API.USERS.ME,               p);              return data; };
export const changePassword    = async (p) => { const { data } = await apiClient.post(API.USERS.CHANGE_PASSWORD,   p);              return data; };
export const forgotPassword    = async (e) => { const { data } = await apiClient.post(API.AUTH.FORGOT_PASSWORD,    { email: e });   return data; };
export const resetPassword     = async (p) => { const { data } = await apiClient.post(API.AUTH.RESET_PASSWORD,     p);              return data; };
export const verifyToken       = async (t) => { const { data } = await apiClient.post(API.AUTH.VERIFY_TOKEN,       { token: t });   return data; };

export default {
  login, register, registerDoctor, registerHospital, registerAssistant,
  refreshToken, logoutApi, getMe, updateMe, changePassword,
  forgotPassword, resetPassword, verifyToken,
};
