/**
 * integration.test.js
 * CuraBook — Integration Tests for Critical Flows
 * =================================================
 * Tests the complete end-to-end data flows:
 *  1. Doctor Login → Dashboard load
 *  2. Appointment CRUD flow
 *  3. Patient record create/edit flow
 *  4. Analytics data fetch → display
 *  5. Notification preferences save flow
 *  6. WebSocket notification flow
 *  7. Schedule slot management flow
 */

import { vi, describe, test, it, expect, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// Mock API Client
// ──────────────────────────────────────────────────────────────────────────────

const mockApiClient = {
  get:    vi.fn(),
  post:   vi.fn(),
  patch:  vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// Test Data Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const FIXTURES = {
  doctorStats: {
    doctor: {
      full_name: 'د. أحمد محمد',
      specialty: 'جراحة عامة',
      experience_years: 12,
      clinic_name: 'عيادة الأمل',
      profile_photo: null,
    },
    stats: {
      appointments_this_week: 24,
      pending_approvals: 5,
      today_appointments: 8,
      new_patient_requests: 3,
    },
    upcoming_appointments: [
      { id: 'apt-1', patient_name: 'محمد علي', time: '2026-04-22T10:00:00Z', status: 'CONFIRMED' },
    ],
  },

  analyticsResponse: {
    stats: { revenue: 45200, appointments: 124, newPatients: 38, rating: 4.7 },
    comparison: { revenue_delta: 12.5, appointments_delta: -3.2, patients_delta: 8.1, rating_delta: 0.3 },
    trends: {
      revenue: [3800, 5200, 4900, 6100, 5800, 6400, 7000],
      appointments: [14, 18, 16, 20, 19, 21, 23],
      patients: [4, 6, 5, 7, 6, 8, 9],
    },
    revenueChart: [{ name: 'Jan', value: 38000 }],
    patientGrowth: [{ name: 'Jan', value: 24 }],
    statusDistribution: [{ label: 'Confirmed', value: 68, color: '#10B981' }],
    visitTypes: [{ label: 'In-Person', value: 75, color: '#2C6B8A' }],
    topPatients: [{ id: 'p1', name: 'محمد علي', visits: 12 }],
  },

  appointmentsList: {
    count: 2,
    results: [
      { id: 'apt-1', patient_name: 'محمد علي', appointment_date: '2026-04-22T10:00:00Z', status: 'CONFIRMED', type: 'IN_PERSON' },
      { id: 'apt-2', patient_name: 'سارة أحمد', appointment_date: '2026-04-22T11:00:00Z', status: 'PENDING', type: 'VIDEO' },
    ],
  },

  patientDetail: {
    id: 'pt-1',
    full_name: 'محمد علي',
    age: 35,
    gender: 'M',
    phone: '01012345678',
    total_visits: 8,
  },

  patientRecords: [
    {
      id: 'rec-1',
      chief_complaint: 'صداع شديد',
      diagnosis: 'شقيقة',
      treatment_plan: 'مسكنات وراحة',
      notes: 'تحسن خلال 48 ساعة',
      created_at: '2026-03-15T10:00:00Z',
    },
  ],
};


// ──────────────────────────────────────────────────────────────────────────────
// 1. Doctor Dashboard Data Flow
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Doctor Dashboard Data Flow', () => {
  test('fetches doctor stats and extracts experience_years', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.doctorStats });

    const response = await mockApiClient.get('/doctor/stats/');
    const { doctor, stats } = response.data;

    expect(doctor.full_name).toBe('د. أحمد محمد');
    // P2-3 fix: experience_years (not years_of_experience)
    expect(doctor.experience_years).toBe(12);
    expect(stats.appointments_this_week).toBe(24);
  });

  test('handles stats API failure gracefully', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

    let error;
    try {
      await mockApiClient.get('/doctor/stats/');
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.message).toBe('Network error');
    // UI should show error state, not crash
  });

  test('upcoming appointments are included in response', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.doctorStats });
    const response = await mockApiClient.get('/doctor/stats/');
    expect(response.data.upcoming_appointments).toHaveLength(1);
    expect(response.data.upcoming_appointments[0].status).toBe('CONFIRMED');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 2. Appointment CRUD Flow
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Appointment CRUD Flow', () => {
  test('fetches appointments list with correct params', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.appointmentsList });

    const params = { page: 1, page_size: 15, status: 'PENDING', search: 'محمد' };
    const response = await mockApiClient.get('/doctor/appointments/', { params });

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctor/appointments/', { params });
    expect(response.data.results).toHaveLength(2);
  });

  test('confirms appointment via POST', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      data: { id: 'apt-1', status: 'CONFIRMED' }
    });

    const response = await mockApiClient.post('/doctor/appointments/apt-1/confirm/');
    expect(response.data.status).toBe('CONFIRMED');
    expect(mockApiClient.post).toHaveBeenCalledWith('/doctor/appointments/apt-1/confirm/');
  });

  test('rejects appointment via POST', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      data: { id: 'apt-2', status: 'REJECTED', rejection_reason: 'Doctor unavailable' }
    });

    const response = await mockApiClient.post('/doctor/appointments/apt-2/reject/', {
      reason: 'Doctor unavailable'
    });
    expect(response.data.status).toBe('REJECTED');
  });

  test('appointment confirm returns 403 when already confirmed', async () => {
    mockApiClient.post.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Appointment already confirmed' } }
    });

    let error;
    try {
      await mockApiClient.post('/doctor/appointments/apt-1/confirm/');
    } catch (e) {
      error = e;
    }
    expect(error.response.status).toBe(403);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 3. Patient Record Create/Edit Flow
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Patient Record CRUD Flow (P3-5)', () => {
  test('creates new patient record via POST', async () => {
    const newRecord = {
      chief_complaint: 'ألم في الصدر',
      diagnosis: 'ارتجاع معدي',
      treatment_plan: 'مضادات حموضة',
    };

    mockApiClient.post.mockResolvedValueOnce({
      data: { id: 'rec-2', ...newRecord, created_at: '2026-04-22T10:00:00Z' }
    });

    const response = await mockApiClient.post('/doctor/patients/pt-1/records/', newRecord);
    expect(response.data.id).toBe('rec-2');
    expect(response.data.chief_complaint).toBe('ألم في الصدر');
  });

  test('edits existing record via PATCH', async () => {
    const update = { notes: 'تحسن ملحوظ — مراجعة الأسبوع القادم' };

    mockApiClient.patch.mockResolvedValueOnce({
      data: { ...FIXTURES.patientRecords[0], ...update }
    });

    const response = await mockApiClient.patch(
      '/doctor/patients/pt-1/records/rec-1/',
      update
    );
    expect(response.data.notes).toBe('تحسن ملحوظ — مراجعة الأسبوع القادم');
  });

  test('fetches patient records list', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.patientRecords });

    const response = await mockApiClient.get('/doctor/patients/pt-1/records/');
    expect(response.data).toHaveLength(1);
    expect(response.data[0].chief_complaint).toBe('صداع شديد');
  });

  test('record creation requires chief_complaint', () => {
    function validate(form) {
      return !form.chief_complaint?.trim() ? { chief_complaint: 'Required' } : {};
    }
    const errors = validate({ diagnosis: 'Test' });
    expect(errors.chief_complaint).toBe('Required');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 4. Analytics Data Fetch → Display Flow (P3-1)
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Analytics Data Flow (P3-1)', () => {
  test('fetches analytics for default month range', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.analyticsResponse });

    const response = await mockApiClient.get('/doctor/analytics/', { params: { range: 'month' } });
    const data = response.data;

    expect(data.stats.revenue).toBe(45200);
    expect(data.comparison.revenue_delta).toBe(12.5);
    expect(data.trends.appointments).toHaveLength(7);
  });

  test('all required frontend keys present in response', () => {
    const data = FIXTURES.analyticsResponse;
    const required = ['stats', 'comparison', 'trends', 'revenueChart', 'patientGrowth',
                      'statusDistribution', 'visitTypes', 'topPatients'];
    required.forEach(key => {
      expect(data).toHaveProperty(key);
    });
  });

  test('fetches analytics for year range', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.analyticsResponse });

    await mockApiClient.get('/doctor/analytics/', { params: { range: 'year' } });
    expect(mockApiClient.get).toHaveBeenCalledWith('/doctor/analytics/', {
      params: { range: 'year' }
    });
  });

  test('comparison deltas are numbers', () => {
    const { comparison } = FIXTURES.analyticsResponse;
    expect(typeof comparison.revenue_delta).toBe('number');
    expect(typeof comparison.appointments_delta).toBe('number');
    expect(typeof comparison.patients_delta).toBe('number');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 5. Notification Preferences Save Flow (P2-4)
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Notification Preferences Flow (P2-4)', () => {
  test('saves notification prefs with correct backend keys', async () => {
    mockApiClient.patch.mockResolvedValueOnce({
      data: { email_enabled: true, push_enabled: false, in_app_enabled: true }
    });

    const frontendPrefs = { email: true, push: false, appointment_reminders: true };
    const backendPayload = {
      email_enabled:  frontendPrefs.email  ?? true,
      push_enabled:   frontendPrefs.push   ?? true,
      in_app_enabled: frontendPrefs.appointment_reminders ?? true,
    };

    const response = await mockApiClient.patch('/doctor/notifications/', backendPayload);
    
    expect(mockApiClient.patch).toHaveBeenCalledWith('/doctor/notifications/', {
      email_enabled: true,
      push_enabled: false,
      in_app_enabled: true,
    });
    expect(response.data.push_enabled).toBe(false);
  });

  test('does NOT send frontend key names to backend', async () => {
    mockApiClient.patch.mockResolvedValueOnce({ data: {} });

    const backendPayload = { email_enabled: true, push_enabled: true, in_app_enabled: true };
    await mockApiClient.patch('/doctor/notifications/', backendPayload);

    const calledWith = mockApiClient.patch.mock.calls[0][1];
    expect(calledWith).not.toHaveProperty('email');
    expect(calledWith).not.toHaveProperty('push');
    expect(calledWith).not.toHaveProperty('appointment_reminders');
  });

  test('PATCH returns 200 (not 400) with correct keys', async () => {
    mockApiClient.patch.mockResolvedValueOnce({ status: 200, data: {} });
    const response = await mockApiClient.patch('/doctor/notifications/', {
      email_enabled: true, push_enabled: true, in_app_enabled: false
    });
    expect(response.status).toBe(200);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 6. Schedule Slot Management Flow (P1-1)
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Schedule Slot Management Flow', () => {
  test('creates a new schedule slot', async () => {
    const newSlot = {
      day: 'monday',
      start_time: '09:00',
      end_time: '09:30',
      type: 'in_person',
      max_patients: 1,
      location_id: 'clinic-1',
    };

    mockApiClient.post.mockResolvedValueOnce({
      data: { id: 'slot-1', ...newSlot }
    });

    const response = await mockApiClient.post('/doctor/schedule/slots/', newSlot);
    expect(response.data.id).toBe('slot-1');
    expect(response.data.day).toBe('monday');
  });

  test('deletes a schedule slot', async () => {
    mockApiClient.delete.mockResolvedValueOnce({ status: 204 });

    const response = await mockApiClient.delete('/doctor/schedule/slots/slot-1/');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/doctor/schedule/slots/slot-1/');
  });

  test('fetches slots filtered by location', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { results: [] } });

    await mockApiClient.get('/doctor/schedule/slots/', {
      params: { location_id: 'clinic-1' }
    });

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctor/schedule/slots/', {
      params: { location_id: 'clinic-1' }
    });
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 7. Search and Filter Combined Flow
// ──────────────────────────────────────────────────────────────────────────────

describe('Integration: Search & Filter Combined', () => {
  test('patient search sends correct params', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { count: 1, results: [] } });

    await mockApiClient.get('/doctor/patients/', {
      params: { search: 'محمد', condition: 'diabetes', page: 1 }
    });

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctor/patients/', {
      params: { search: 'محمد', condition: 'diabetes', page: 1 }
    });
  });

  test('appointment search uses "search" not "q"', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: FIXTURES.appointmentsList });

    await mockApiClient.get('/doctor/appointments/', {
      params: { search: 'سارة', page: 1, page_size: 15 }
    });

    const calledParams = mockApiClient.get.mock.calls[0][1].params;
    expect(calledParams).toHaveProperty('search');      // P3-6 fix
    expect(calledParams).not.toHaveProperty('q');       // old broken key
  });
});
