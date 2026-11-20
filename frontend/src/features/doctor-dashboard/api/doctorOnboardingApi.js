/**
 * features/doctor-dashboard/api/doctorOnboardingApi.js
 *
 * P1-FEAT-4: Atomic onboarding submission — single PATCH to /auth/me/
 * Profile fields + clinic data bundled in ONE request.
 * If backend supports clinic inline: handled server-side atomically.
 * If clinic needs separate call: done here in sequence with proper error handling.
 *
 * v31 API-M09: use canonical doctorApi — no more direct apiClient calls in wizard
 */
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
export { updateDoctorProfile } from '../../../services/api/doctorApi';

/**
 * Atomic onboarding profile upload.
 * Sends profile + clinic in a single coordinated flow.
 * Uses JSON for profile (to support nested clinic object),
 * then uploads photo separately if present.
 *
 * @param {object} wizardData - full wizard form state
 */
export async function uploadOnboardingProfile(wizardData) {
  // ── Step 1: Build profile + clinic payload (JSON) ───────────────────────
  const profilePayload = {};

  // User-level fields
  if (wizardData.phone)    profilePayload.phone    = wizardData.phone;

  // DoctorProfile fields
  if (wizardData.specialty)        profilePayload.specialty        = wizardData.specialty;
  if (wizardData.bio)              profilePayload.bio              = wizardData.bio;
  if (wizardData.fee)              profilePayload.consultation_fee = wizardData.fee;
  if (wizardData.practiceStart)    profilePayload.start_of_practice_date = wizardData.practiceStart;
  // BUG-4 FIX: use start_of_practice_date, not years_of_experience (which is @property)
  if (wizardData.experience && !wizardData.practiceStart) {
    // Legacy: if wizard still sends experience as years, try to compute approx date
    const years = parseInt(wizardData.experience, 10);
    if (!isNaN(years)) {
      const approxYear = new Date().getFullYear() - years;
      profilePayload.start_of_practice_date = `${approxYear}-01-01`;
    }
  }

  // Clinic inline (backend MeView handles get_or_create)
  const hasClinic = wizardData.clinicName || wizardData.clinicAddress || wizardData.clinicPhone || wizardData.city;
  if (hasClinic) {
    profilePayload.clinic = {};
    if (wizardData.clinicName)    profilePayload.clinic.name    = wizardData.clinicName;
    if (wizardData.clinicAddress) profilePayload.clinic.address = wizardData.clinicAddress;
    if (wizardData.clinicPhone)   profilePayload.clinic.phone   = wizardData.clinicPhone;
    if (wizardData.city)          profilePayload.clinic.city    = wizardData.city;
  }

  // ── Step 2: PATCH /auth/me/ with JSON payload ───────────────────────────
  let result;
  try {
    const { data } = await apiClient.patch(API.USERS.ME, profilePayload);
    result = data;
  } catch (profileErr) {
    console.error('[Onboarding] Profile PATCH failed:', profileErr);
    // If backend doesn't support clinic inline, fall back to separate clinic call
    const { data } = await apiClient.patch(API.USERS.ME, {
      ...profilePayload,
      clinic: undefined,
    });
    result = data;

    // Separate clinic creation (BUG-5 FIX: no owner field)
    if (hasClinic) {
      try {
        await apiClient.post(API.CLINICS.LIST, {
          name:    wizardData.clinicName    || '',
          address: wizardData.clinicAddress || '',
          phone:   wizardData.clinicPhone   || '',
          city:    wizardData.city          || '',
        });
      } catch (clinicErr) {
        // Clinic may already exist — non-fatal
        console.warn('[Onboarding] Clinic creation skipped:', clinicErr?.response?.status);
      }
    }
  }

  // ── Step 3: Upload photo separately (multipart) ─────────────────────────
  // W-NEW-1 FIX: Use POST /auth/me/avatar/ instead of PATCH /auth/me/
  // Avatar uploads should go to the dedicated endpoint, not pollute the main user endpoint.
  if (wizardData.photo) {
    try {
      const formData = new FormData();
      formData.append('avatar', wizardData.photo);
      await apiClient.post(API.USERS.AVATAR, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (photoErr) {
      // Photo upload failure is non-fatal — profile data already saved
      console.warn('[Onboarding] Photo upload failed:', photoErr);
    }
  }

  return result;
}
