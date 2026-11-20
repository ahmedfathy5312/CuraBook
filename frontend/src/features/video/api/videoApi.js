/**
 * CuraBook — Video Consultation API
 * FIX V10: Extracted inline API calls from VideoConsultationPage into a
 * dedicated api/ module, consistent with every other feature in the project.
 * FIX ⚠️: Replaced hardcoded strings with API.VIDEO.* constants.
 *
 * Endpoints (all served by backend/video/):
 *   GET  /api/v1/video/sessions/:id/        → fetchSession
 *   POST /api/v1/video/sessions/:id/start/  → startSession
 *   POST /api/v1/video/sessions/:id/end/    → endSession
 */
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

/**
 * Create or retrieve the video session linked to an eligible appointment.
 */
export async function createSession(appointmentId) {
  const response = await apiClient.post(API.VIDEO.SESSIONS, {
    appointment_id: appointmentId,
  });
  return response.data;
}

/**
 * Fetch a video session by its ID.
 * Returns session data including join_url_doctor, room_url, status, duration_minutes.
 */
export async function fetchSession(sessionId) {
  const response = await apiClient.get(API.VIDEO.SESSION(sessionId));
  return response.data;
}

/**
 * Fetch a fresh short-lived token (15 min TTL) for joining the session.
 * Call this each time the user is about to join or rejoin.
 * Tokens are never stored in DB — each call produces a new one.
 */
export async function fetchToken(sessionId) {
  const response = await apiClient.get(API.VIDEO.SESSION_TOKEN(sessionId));
  return response.data;
}

/**
 * Mark a session as started — backend generates/refreshes the room URL
 * and records start_time.
 */
export async function startSession(sessionId) {
  const response = await apiClient.post(API.VIDEO.SESSION_START(sessionId));
  return response.data;
}

/**
 * Mark a session as ended — backend records end_time and calculates
 * duration_minutes.
 */
export async function endSession(sessionId) {
  const response = await apiClient.post(API.VIDEO.SESSION_END(sessionId));
  return response.data;
}
