/**
 * __tests__/apiLayer.test.js
 *
 * Tests for the API layer fixes applied in the audit:
 *  - HIGH-01: completeAppointment removed from appointmentApi
 *  - HIGH-02: uploadProfileImage uses /auth/me/avatar/
 *  - HIGH-04: reviewApi unified endpoint
 *  - HIGH-05/06: no hardcoded URLs in scheduleApi / doctorApi
 *  - HIGH-07: REVIEWS.CREATE/UPDATE/DELETE in apiRoutes
 *  - HIGH-08: getAllAppointments uses hospital endpoint
 *  - HIGH-09: PERMISSIONS.canApproveAppointment includes doctor
 *  - MED-02:  visit_type validator uses IN_PERSON | ONLINE
 *  - MED-04:  getAssistantWorkplaces in usersApi (not appointmentApi)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock apiClient so no real HTTP calls are made ────────────────────────────
vi.mock('../services/apiClient', () => ({
  default: {
    get:    vi.fn().mockResolvedValue({ data: {} }),
    post:   vi.fn().mockResolvedValue({ data: {} }),
    patch:  vi.fn().mockResolvedValue({ data: {} }),
    put:    vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// ═══════════════════════════════════════════════════════════════════
// apiRoutes — constants completeness
// ═══════════════════════════════════════════════════════════════════

describe('apiRoutes constants', () => {
  const { API } = require('../constants/apiRoutes');

  it('HIGH-07: REVIEWS.CREATE is defined', () => {
    expect(API.REVIEWS.CREATE).toBeDefined();
    expect(typeof API.REVIEWS.CREATE).toBe('string');
  });

  it('HIGH-07: REVIEWS.UPDATE is a function returning the correct path', () => {
    expect(typeof API.REVIEWS.UPDATE).toBe('function');
    expect(API.REVIEWS.UPDATE(5)).toBe('/reviews/5/');
  });

  it('HIGH-07: REVIEWS.DELETE is a function returning the correct path', () => {
    expect(typeof API.REVIEWS.DELETE).toBe('function');
    expect(API.REVIEWS.DELETE(7)).toBe('/reviews/7/');
  });

  it('HIGH-06: DOCTORS.APPOINTMENT_DETAIL is a function', () => {
    expect(typeof API.DOCTORS.APPOINTMENT_DETAIL).toBe('function');
    expect(API.DOCTORS.APPOINTMENT_DETAIL(3)).toBe('/doctor/appointments/3/');
  });

  it('HIGH-06: DOCTORS.APPOINTMENT_COMPLETE is a function', () => {
    expect(typeof API.DOCTORS.APPOINTMENT_COMPLETE).toBe('function');
    expect(API.DOCTORS.APPOINTMENT_COMPLETE(3)).toBe('/doctor/appointments/3/complete/');
  });

  it('HIGH-06: DOCTORS.PATIENT_DETAIL is a function', () => {
    expect(typeof API.DOCTORS.PATIENT_DETAIL).toBe('function');
    expect(API.DOCTORS.PATIENT_DETAIL(9)).toBe('/doctor/patients/9/');
  });

  it('SEC-01: AUTH.WS_TICKET is defined', () => {
    expect(API.AUTH.WS_TICKET).toBe('/auth/ws-ticket/');
  });
});


// ═══════════════════════════════════════════════════════════════════
// appointmentApi — HIGH-01 / HIGH-08
// ═══════════════════════════════════════════════════════════════════

describe('appointmentApi', () => {
  const apptApi = require('../services/api/appointmentApi');

  it('HIGH-01: does NOT export completeAppointment (belongs in doctorApi)', () => {
    // completeAppointment should not be a named export from this module
    expect(apptApi.completeAppointment).toBeUndefined();
  });

  it('HIGH-08: getAllAppointments calls HOSPITAL.APPOINTMENTS endpoint', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API } = require('../constants/apiRoutes');
    await apptApi.getAllAppointments();
    expect(apiClient.get).toHaveBeenCalledWith(API.HOSPITAL.APPOINTMENTS, expect.anything());
  });

  it('HIGH-08: getAllAppointments and getMyAppointments call different endpoints', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API } = require('../constants/apiRoutes');
    apiClient.get.mockClear();
    await apptApi.getMyAppointments();
    const myEndpoint = apiClient.get.mock.calls[0][0];
    apiClient.get.mockClear();
    await apptApi.getAllAppointments();
    const allEndpoint = apiClient.get.mock.calls[0][0];
    expect(myEndpoint).not.toBe(allEndpoint);
  });

  it('exports getMyAppointments, getAppointmentById, bookAppointment', () => {
    expect(typeof apptApi.getMyAppointments).toBe('function');
    expect(typeof apptApi.getAppointmentById).toBe('function');
    expect(typeof apptApi.bookAppointment).toBe('function');
  });

  it('exports approveReschedule and rejectReschedule', () => {
    expect(typeof apptApi.approveReschedule).toBe('function');
    expect(typeof apptApi.rejectReschedule).toBe('function');
  });
});


// ═══════════════════════════════════════════════════════════════════
// doctorApi — HIGH-01 / HIGH-06
// ═══════════════════════════════════════════════════════════════════

describe('doctorApi', () => {
  beforeEach(() => { vi.resetModules(); });

  it('HIGH-01: exports completeAppointment (canonical location)', () => {
    const { completeAppointment } = require('../services/api/doctorApi');
    expect(typeof completeAppointment).toBe('function');
  });

  it('HIGH-01: completeAppointment accepts a notes parameter', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API } = require('../constants/apiRoutes');
    const { completeAppointment } = require('../services/api/doctorApi');
    await completeAppointment(42, 'Patient recovered well');
    expect(apiClient.post).toHaveBeenCalledWith(
      API.DOCTORS.APPOINTMENT_COMPLETE(42),
      { notes: 'Patient recovered well' }
    );
  });

  it('HIGH-06: getDoctorAppointmentById uses API constant (no hardcoded URL)', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API } = require('../constants/apiRoutes');
    const { getDoctorAppointmentById } = require('../services/api/doctorApi');
    await getDoctorAppointmentById(7);
    expect(apiClient.get).toHaveBeenCalledWith(API.DOCTORS.APPOINTMENT_DETAIL(7));
  });

  it('HIGH-06: getDoctorPatientById uses API constant (no hardcoded URL)', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API } = require('../constants/apiRoutes');
    const { getDoctorPatientById } = require('../services/api/doctorApi');
    await getDoctorPatientById(12);
    expect(apiClient.get).toHaveBeenCalledWith(API.DOCTORS.PATIENT_DETAIL(12));
  });
});


// ═══════════════════════════════════════════════════════════════════
// reviewApi — HIGH-04 / HIGH-07
// ═══════════════════════════════════════════════════════════════════

describe('reviewApi', () => {
  beforeEach(() => { vi.resetModules(); });

  it('HIGH-04: addDoctorReview posts to DOCTORS.REVIEWS endpoint', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { addDoctorReview } = require('../services/api/reviewApi');
    await addDoctorReview(5, { rating: 4, comment: 'Great doctor' });
    expect(apiClient.post).toHaveBeenCalledWith(
      API.DOCTORS.REVIEWS(5),
      { rating: 4, comment: 'Great doctor' }
    );
  });

  it('HIGH-04: addDoctorReview and submitDoctorReview use same endpoint', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { addDoctorReview } = require('../services/api/reviewApi');
    const { submitDoctorReview } = require('../services/api/doctorApi');
    apiClient.post.mockClear();
    await addDoctorReview(3, { rating: 5 });
    const reviewEndpoint = apiClient.post.mock.calls[0][0];
    apiClient.post.mockClear();
    await submitDoctorReview(3, { rating: 5 });
    const submitEndpoint = apiClient.post.mock.calls[0][0];
    expect(reviewEndpoint).toBe(submitEndpoint);
  });

  it('HIGH-07: updateReview uses API.REVIEWS.UPDATE constant', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { updateReview } = require('../services/api/reviewApi');
    await updateReview(8, { comment: 'Updated comment' });
    expect(apiClient.patch).toHaveBeenCalledWith(
      API.REVIEWS.UPDATE(8),
      { comment: 'Updated comment' }
    );
  });

  it('HIGH-07: deleteReview uses API.REVIEWS.DELETE constant', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { deleteReview } = require('../services/api/reviewApi');
    await deleteReview(10);
    expect(apiClient.delete).toHaveBeenCalledWith(API.REVIEWS.DELETE(10));
  });

  it('HIGH-07: no hardcoded /update/ or /delete/ paths in reviewApi calls', async () => {
    const apiClient = require('../services/apiClient').default;
    const { updateReview, deleteReview } = require('../services/api/reviewApi');
    apiClient.patch.mockClear();
    apiClient.delete.mockClear();
    await updateReview(1, {});
    await deleteReview(1);
    const patchUrl  = apiClient.patch.mock.calls[0][0];
    const deleteUrl = apiClient.delete.mock.calls[0][0];
    expect(patchUrl).not.toContain('/update/');
    expect(deleteUrl).not.toContain('/delete/');
  });
});


// ═══════════════════════════════════════════════════════════════════
// scheduleApi — HIGH-05 (no hardcoded URLs)
// ═══════════════════════════════════════════════════════════════════

describe('scheduleApi — HIGH-05: uses API constants', () => {
  beforeEach(() => { vi.resetModules(); });

  it('getDoctorSchedules uses API.DOCTORS.SCHEDULE_LIST', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { getDoctorSchedules } = require('../services/api/scheduleApi');
    await getDoctorSchedules();
    expect(apiClient.get).toHaveBeenCalledWith(API.DOCTORS.SCHEDULE_LIST, expect.anything());
  });

  it('createSchedule uses API.DOCTORS.SCHEDULE_LIST', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { createSchedule } = require('../services/api/scheduleApi');
    await createSchedule({ day_of_week: 1 });
    expect(apiClient.post).toHaveBeenCalledWith(API.DOCTORS.SCHEDULE_LIST, { day_of_week: 1 });
  });

  it('getAvailableSlots uses API.SLOTS.LIST', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { getAvailableSlots } = require('../services/api/scheduleApi');
    await getAvailableSlots(5);
    expect(apiClient.get).toHaveBeenCalledWith(API.SLOTS.LIST, expect.anything());
  });

  it('generateDoctorSlots uses API.DOCTORS.GENERATE_SLOTS', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { generateDoctorSlots } = require('../services/api/scheduleApi');
    await generateDoctorSlots({ start_date: '2026-04-01', end_date: '2026-04-30' });
    expect(apiClient.post).toHaveBeenCalledWith(API.DOCTORS.GENERATE_SLOTS, expect.anything());
  });
});


// ═══════════════════════════════════════════════════════════════════
// usersApi — HIGH-02 / MED-04
// ═══════════════════════════════════════════════════════════════════

describe('usersApi', () => {
  beforeEach(() => { vi.resetModules(); });

  it('HIGH-02: uploadProfileImage uses API.USERS.AVATAR endpoint', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { uploadProfileImage } = require('../services/api/usersApi');
    const fakeFile = new Blob(['img'], { type: 'image/png' });
    await uploadProfileImage(fakeFile);
    expect(apiClient.patch).toHaveBeenCalledWith(
      API.USERS.AVATAR,
      expect.any(FormData),
      expect.anything()
    );
  });

  it('HIGH-02: uploadProfileImage uses "avatar" field name (not "profile_image")', async () => {
    const apiClient = require('../services/apiClient').default;
    const { uploadProfileImage } = require('../services/api/usersApi');
    const fakeFile = new Blob(['img'], { type: 'image/png' });
    await uploadProfileImage(fakeFile);
    const formData = apiClient.patch.mock.calls[0][1];
    expect(formData.get('avatar')).toBeTruthy();
    expect(formData.get('profile_image')).toBeNull();
  });

  it('MED-04: getAssistantWorkplaces is exported from usersApi', () => {
    const { getAssistantWorkplaces } = require('../services/api/usersApi');
    expect(typeof getAssistantWorkplaces).toBe('function');
  });

  it('MED-04: getAssistantWorkplaces calls API.ASSISTANT.WORKPLACES', async () => {
    const apiClient = require('../services/apiClient').default;
    const { API }   = require('../constants/apiRoutes');
    const { getAssistantWorkplaces } = require('../services/api/usersApi');
    await getAssistantWorkplaces();
    expect(apiClient.get).toHaveBeenCalledWith(API.ASSISTANT.WORKPLACES);
  });
});


// ═══════════════════════════════════════════════════════════════════
// roles.js — HIGH-09
// ═══════════════════════════════════════════════════════════════════

describe('roles.js — HIGH-09: PERMISSIONS sync with VALID_TRANSITIONS', () => {
  const { PERMISSIONS, ROLES } = require('../config/roles');

  it('canApproveAppointment includes ROLES.ASSISTANT', () => {
    expect(PERMISSIONS.canApproveAppointment).toContain(ROLES.ASSISTANT);
  });

  it('canApproveAppointment includes ROLES.DOCTOR (matches VALID_TRANSITIONS)', () => {
    expect(PERMISSIONS.canApproveAppointment).toContain(ROLES.DOCTOR);
  });

  it('canApproveAppointment does NOT include ROLES.PATIENT', () => {
    expect(PERMISSIONS.canApproveAppointment).not.toContain(ROLES.PATIENT);
  });
});


// ═══════════════════════════════════════════════════════════════════
// appointmentValidators — MED-02
// ═══════════════════════════════════════════════════════════════════

describe('appointmentValidators — MED-02: visit_type field', () => {
  const { bookingRules, VISIT_TYPES } = require('../validators/appointmentValidators');

  it('has visit_type field (not "type")', () => {
    expect(bookingRules.visit_type).toBeDefined();
    expect(bookingRules.type).toBeUndefined();
  });

  it('VISIT_TYPES has IN_PERSON and ONLINE', () => {
    expect(VISIT_TYPES.IN_PERSON).toBe('IN_PERSON');
    expect(VISIT_TYPES.ONLINE).toBe('ONLINE');
  });

  it('visit_type validate accepts IN_PERSON', () => {
    const result = bookingRules.visit_type.validate('IN_PERSON');
    expect(result).toBe(true);
  });

  it('visit_type validate accepts ONLINE', () => {
    const result = bookingRules.visit_type.validate('ONLINE');
    expect(result).toBe(true);
  });

  it('visit_type validate rejects "clinic"', () => {
    const result = bookingRules.visit_type.validate('clinic');
    expect(result).not.toBe(true);
    expect(typeof result).toBe('string');
  });

  it('visit_type validate rejects "hospital"', () => {
    const result = bookingRules.visit_type.validate('hospital');
    expect(result).not.toBe(true);
  });

  it('visit_type required message is set', () => {
    expect(bookingRules.visit_type.required).toBeTruthy();
  });
});
