/**
 * reviewApi.js — Reviews & Ratings Service
 * Handles doctor reviews, patient feedback, and rating management.
 *
 * FIX HIGH-04: addDoctorReview now posts to /doctors/{id}/reviews/ — same
 *              endpoint as getDoctorReviews (REST standard). The old
 *              /reviews/create/ endpoint is not documented in apiRoutes.
 * FIX HIGH-07: updateReview / deleteReview now use API.REVIEWS constants
 *              instead of hardcoded /reviews/{id}/update/ and /reviews/{id}/delete/.
 *              Standard REST uses PATCH /reviews/{id}/ and DELETE /reviews/{id}/.
 */
import apiClient from '../apiClient';
import { API } from '../../constants/apiRoutes';

// ── Doctor Reviews ────────────────────────────────────────────────────────────
export const getDoctorReviews = async (doctorId, params = {}) => {
  const { data } = await apiClient.get(API.DOCTORS.REVIEWS(doctorId), { params });
  return data;
};

// FIX HIGH-04: unified with doctorApi.submitDoctorReview — both now POST to same endpoint
export const addDoctorReview = async (doctorId, payload) => {
  // payload: { rating: 1-5, comment: string, appointment: id }
  const { data } = await apiClient.post(API.DOCTORS.REVIEWS(doctorId), payload);
  return data;
};

// FIX HIGH-07: use API.REVIEWS.UPDATE constant (PATCH /reviews/{id}/)
export const updateReview = async (reviewId, payload) => {
  const { data } = await apiClient.patch(API.REVIEWS.UPDATE(reviewId), payload);
  return data;
};

// FIX HIGH-07: use API.REVIEWS.DELETE constant (DELETE /reviews/{id}/)
export const deleteReview = async (reviewId) => {
  const { data } = await apiClient.delete(API.REVIEWS.DELETE(reviewId));
  return data;
};

// ── Patient's Reviews (my reviews) ───────────────────────────────────────────
export const getMyReviews = async () => {
  const { data } = await apiClient.get(API.REVIEWS.MY);
  return data;
};

// ── Check if patient can review (has completed appointment) ──────────────────
export const canReviewDoctor = async (doctorId) => {
  const { data } = await apiClient.get(API.DOCTORS.CAN_REVIEW(doctorId));
  return data;
};

// ── Query Key Factory ─────────────────────────────────────────────────────────
export const reviewKeys = {
  doctorReviews: (doctorId) => ['reviews', 'doctor', doctorId],
  myReviews:     () => ['reviews', 'my'],
  canReview:     (doctorId) => ['reviews', 'can-review', doctorId],
};

export default {
  getDoctorReviews, addDoctorReview, updateReview, deleteReview,
  getMyReviews, canReviewDoctor,
};
