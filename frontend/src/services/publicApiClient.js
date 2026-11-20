/**
 * publicApiClient.js — Axios instance for unauthenticated public endpoints
 *
 * WHY: apiClient has a 401 interceptor that calls handleLogout().
 * Even with the public-path guard, it's cleaner to have public-facing
 * calls (Home page, doctor discovery, etc.) use a plain axios instance
 * that NEVER triggers auth side-effects on failure.
 *
 * - No Authorization header attached
 * - No 401 → redirect logic
 * - Still uses the same base URL and timeout
 * - Still unwraps the CuraBook { success, data } envelope
 */
import axios from 'axios';
import ENV from '../config/env';

const publicApiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: false, // no cookies needed for public endpoints
});

// Unwrap CuraBookRenderer envelope { success: true, data: <payload> }
publicApiClient.interceptors.response.use(
  (response) => {
    const d = response.data;
    if (d && d.success === true && typeof d.data !== 'undefined') {
      response.data = d.data;
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default publicApiClient;
