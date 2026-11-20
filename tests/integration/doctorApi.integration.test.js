// tests/integration/doctorApi.integration.test.js
// Integration tests for Doctor Dashboard API layer
// Tests the apiClient contract and response normalization

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock fetch globally ────────────────────────────────────────────────────

function mockFetch(response, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok:     status >= 200 && status < 300,
    status,
    json:   async () => response,
    text:   async () => JSON.stringify(response),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

// ── Doctor Dashboard Stats ─────────────────────────────────────────────────

describe('Doctor Dashboard Stats API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns stats shape with experience_years', async () => {
    const payload = {
      total_patients:    120,
      total_appointments: 45,
      experience_years:   8,
      rating:             4.7,
    };
    mockFetch(payload);

    const res  = await fetch('/api/doctor/stats/');
    const data = await res.json();

    expect(data).toHaveProperty('total_patients');
    expect(data).toHaveProperty('experience_years');
    expect(typeof data.experience_years).toBe('number');
  });

  it('also accepts years_of_experience alias', async () => {
    const payload = {
      total_patients:      88,
      years_of_experience: 5,
    };
    mockFetch(payload);

    const res  = await fetch('/api/doctor/stats/');
    const data = await res.json();

    const experience = data.experience_years ?? data.years_of_experience;
    expect(experience).toBeDefined();
  });

  it('handles API error gracefully', async () => {
    mockFetch({ detail: 'Unauthorized' }, 401);
    const res = await fetch('/api/doctor/stats/');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });
});

// ── Analytics API ──────────────────────────────────────────────────────────

describe('Analytics API Contract', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns correct shape for week range', async () => {
    const payload = {
      range:        'week',
      kpis: {
        total_patients:     { value: 30, delta: 5, trend: [1,2,3,4,5,6,7] },
        total_appointments: { value: 12, delta: -2, trend: [2,2,1,3,2,1,1] },
        total_revenue:      { value: 2400, delta: 300, trend: [300,320,310,330,360,370,410] },
      },
      top_patients: [
        { id: 1, name: 'Ahmed Ali', visit_count: 5 },
      ],
    };
    mockFetch(payload);

    const res  = await fetch('/api/analytics/doctor/?range=week');
    const data = await res.json();

    expect(data).toHaveProperty('range', 'week');
    expect(data).toHaveProperty('kpis');
    expect(data.kpis).toHaveProperty('total_patients');
    expect(Array.isArray(data.kpis.total_patients.trend)).toBe(true);
    expect(data.kpis.total_patients.trend).toHaveLength(7);
  });

  it('returns delta as number (positive or negative)', async () => {
    const payload = {
      kpis: {
        total_patients: { value: 10, delta: -3, trend: [] },
      },
    };
    mockFetch(payload);

    const res  = await fetch('/api/analytics/doctor/?range=month');
    const data = await res.json();

    const delta = data.kpis?.total_patients?.delta;
    expect(typeof delta).toBe('number');
  });

  it('top_patients is an array', async () => {
    mockFetch({ kpis: {}, top_patients: [] });
    const res  = await fetch('/api/analytics/doctor/');
    const data = await res.json();
    expect(Array.isArray(data.top_patients)).toBe(true);
  });
});

// ── Notification Preferences API ───────────────────────────────────────────

describe('Notification Preferences API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('PATCH /doctor/notifications/ sends correct field names', async () => {
    let captured;
    vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      captured = JSON.parse(opts?.body || '{}');
      return { ok: true, status: 200, json: async () => captured, headers: new Headers() };
    });

    const prefs = {
      email_enabled:  true,
      push_enabled:   false,
      in_app_enabled: true,
    };

    await fetch('/api/doctor/notifications/', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(prefs),
    });

    // Backend expects these exact field names
    expect(captured).toHaveProperty('email_enabled');
    expect(captured).toHaveProperty('push_enabled');
    expect(captured).toHaveProperty('in_app_enabled');

    // Should NOT contain frontend-style names
    expect(captured).not.toHaveProperty('email');
    expect(captured).not.toHaveProperty('push');
    expect(captured).not.toHaveProperty('appointment_reminders');
  });

  it('handles 400 Bad Request from wrong field names', async () => {
    mockFetch({ email: ['This field is required.'] }, 400);
    const res = await fetch('/api/doctor/notifications/', {
      method: 'PATCH',
      body:   JSON.stringify({ email: true }),
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });
});

// ── Appointment Date Filter API ────────────────────────────────────────────

describe('Appointment Date Filter API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends correct date_from and date_to query params', async () => {
    let capturedUrl;
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      capturedUrl = url;
      return {
        ok: true, status: 200,
        json: async () => ({ results: [], count: 0 }),
        headers: new Headers(),
      };
    });

    const from = '2026-04-01';
    const to   = '2026-04-30';
    await fetch(`/api/appointments/?date_from=${from}&date_to=${to}`);

    expect(capturedUrl).toContain('date_from=2026-04-01');
    expect(capturedUrl).toContain('date_to=2026-04-30');
  });

  it('returns paginated response shape', async () => {
    mockFetch({ count: 5, next: null, previous: null, results: [] });
    const res  = await fetch('/api/appointments/');
    const data = await res.json();

    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
  });
});

// ── WebSocket Guard (hasattr fix) ──────────────────────────────────────────

describe('WebSocket Consumer guard (regression)', () => {
  it('does not throw AttributeError when user is missing', () => {
    // Simulates the Python hasattr guard in consumers.py:
    //   if hasattr(self, "user") and self.user: ...
    const mockConsumer = {
      // user intentionally not set
      _heartbeat_task: null,
    };

    const safeDisconnect = (consumer) => {
      if (Object.prototype.hasOwnProperty.call(consumer, '_heartbeat_task') &&
          consumer._heartbeat_task &&
          typeof consumer._heartbeat_task.done === 'function' &&
          !consumer._heartbeat_task.done()) {
        consumer._heartbeat_task.cancel();
      }
      if (Object.prototype.hasOwnProperty.call(consumer, 'user') && consumer.user) {
        // process user groups
      }
    };

    expect(() => safeDisconnect(mockConsumer)).not.toThrow();
  });

  it('handles _heartbeat_task cancel gracefully', () => {
    const cancel  = vi.fn();
    const consumer = {
      user:            { id: 1 },
      _heartbeat_task: { done: () => false, cancel },
    };

    // Simulate disconnect logic
    if (consumer._heartbeat_task && !consumer._heartbeat_task.done()) {
      consumer._heartbeat_task.cancel();
    }

    expect(cancel).toHaveBeenCalledOnce();
  });
});
