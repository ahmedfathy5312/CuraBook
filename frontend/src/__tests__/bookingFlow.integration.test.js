/**
 * __tests__/bookingFlow.integration.test.js
 *
 * E2E-style integration tests for the 4-step booking wizard flow.
 * Tests the full journey:
 *   Step 1: Doctor selection / discovery
 *   Step 2: Date & time slot selection
 *   Step 3: Patient details & reason
 *   Step 4: Confirmation & API submission
 *
 * Uses mock API responses — no real network calls.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DOCTOR = {
  id: 42,
  name: 'Dr. Sarah Hassan',
  specialty: 'Cardiology',
  hospital_name: 'Assiut University Hospital',
  rating: 4.8,
  consultation_fee: 200,
  available_days: ['Sunday', 'Monday', 'Wednesday'],
};

const MOCK_SLOTS = [
  { id: 1, time: '09:00', available: true },
  { id: 2, time: '10:00', available: true },
  { id: 3, time: '11:00', available: false },
  { id: 4, time: '14:00', available: true },
];

const MOCK_APPOINTMENT = {
  id: 101,
  doctor: 42,
  patient: 7,
  date: '2026-04-15',
  time: '10:00',
  reason: 'Routine checkup',
  status: 'pending',
};

// ─── Setup ────────────────────────────────────────────────────────────────────

function mockBookingAPI() {
  global.fetch = vi.fn().mockImplementation((url, options) => {
    // Doctor slots
    if (url.includes('/scheduling/slots/') || url.includes('/availability/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ results: MOCK_SLOTS }),
      });
    }
    // Create appointment
    if (url.includes('/appointments/') && options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => MOCK_APPOINTMENT,
      });
    }
    // Doctor profile
    if (url.includes(`/doctors/${MOCK_DOCTOR.id}/`)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => MOCK_DOCTOR,
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

// ─── Booking State Machine ────────────────────────────────────────────────────

class BookingWizard {
  constructor() {
    this.step        = 1;
    this.doctor      = null;
    this.selectedDate = null;
    this.selectedSlot = null;
    this.reason      = '';
    this.submitted   = false;
    this.appointmentId = null;
    this.error       = null;
  }

  // Step 1 → select doctor
  selectDoctor(doctor) {
    if (!doctor?.id) throw new Error('Invalid doctor');
    this.doctor = doctor;
    this.step   = 2;
  }

  // Step 2 → select date + slot
  selectDateTime(date, slot) {
    if (!date) throw new Error('Date required');
    if (!slot?.available) throw new Error('Slot not available');
    this.selectedDate = date;
    this.selectedSlot = slot;
    this.step = 3;
  }

  // Step 3 → fill reason
  fillDetails(reason) {
    if (!reason?.trim()) throw new Error('Reason required');
    this.reason = reason;
    this.step   = 4;
  }

  // Step 4 → submit
  async submit() {
    if (this.step !== 4) throw new Error('Not at confirmation step');

    const res = await fetch('/api/v1/appointments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor:  this.doctor.id,
        date:    this.selectedDate,
        time:    this.selectedSlot.time,
        reason:  this.reason,
      }),
    });

    if (!res.ok) {
      this.error = 'Booking failed';
      throw new Error('Booking failed');
    }

    const data = await res.json();
    this.appointmentId = data.id;
    this.submitted     = true;
    return data;
  }

  back() {
    if (this.step > 1) this.step--;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Booking Wizard — Full Flow', () => {
  let wizard;

  beforeEach(() => {
    wizard = new BookingWizard();
    vi.resetModules();
    mockBookingAPI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Step 1 ────────────────────────────────────────────────────────────────

  it('Step 1: starts at step 1', () => {
    expect(wizard.step).toBe(1);
    expect(wizard.doctor).toBeNull();
  });

  it('Step 1: selecting a valid doctor advances to step 2', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    expect(wizard.step).toBe(2);
    expect(wizard.doctor.id).toBe(42);
  });

  it('Step 1: selecting null doctor throws', () => {
    expect(() => wizard.selectDoctor(null)).toThrow('Invalid doctor');
  });

  it('Step 1: selecting doctor without id throws', () => {
    expect(() => wizard.selectDoctor({ name: 'No ID' })).toThrow('Invalid doctor');
  });

  // ── Step 2 ────────────────────────────────────────────────────────────────

  it('Step 2: selecting date + available slot advances to step 3', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]); // 10:00 available
    expect(wizard.step).toBe(3);
    expect(wizard.selectedSlot.time).toBe('10:00');
  });

  it('Step 2: unavailable slot throws', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    const unavailableSlot = MOCK_SLOTS.find(s => !s.available);
    expect(() => wizard.selectDateTime('2026-04-15', unavailableSlot)).toThrow('Slot not available');
  });

  it('Step 2: missing date throws', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    expect(() => wizard.selectDateTime(null, MOCK_SLOTS[0])).toThrow('Date required');
  });

  it('Step 2: API returns available slots list', async () => {
    const res = await fetch(`/api/v1/scheduling/slots/?doctor=42&date=2026-04-15`);
    const data = await res.json();
    expect(data.results).toHaveLength(4);
    const available = data.results.filter(s => s.available);
    expect(available).toHaveLength(3);
  });

  // ── Step 3 ────────────────────────────────────────────────────────────────

  it('Step 3: filling reason advances to step 4', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    wizard.fillDetails('Routine checkup');
    expect(wizard.step).toBe(4);
    expect(wizard.reason).toBe('Routine checkup');
  });

  it('Step 3: empty reason throws', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    expect(() => wizard.fillDetails('')).toThrow('Reason required');
  });

  it('Step 3: whitespace-only reason throws', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    expect(() => wizard.fillDetails('   ')).toThrow('Reason required');
  });

  // ── Step 4 / Submit ───────────────────────────────────────────────────────

  it('Step 4: full booking flow submits successfully', async () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    wizard.fillDetails('Routine checkup');

    const result = await wizard.submit();

    expect(result.id).toBe(101);
    expect(result.status).toBe('pending');
    expect(wizard.submitted).toBe(true);
    expect(wizard.appointmentId).toBe(101);
  });

  it('Step 4: submit calls POST /appointments/ with correct payload', async () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    wizard.fillDetails('Chest pain follow-up');
    await wizard.submit();

    const [url, opts] = global.fetch.mock.calls.find(([u]) => u.includes('/appointments/'));
    expect(url).toContain('/appointments/');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.doctor).toBe(42);
    expect(body.date).toBe('2026-04-15');
    expect(body.time).toBe('10:00');
    expect(body.reason).toBe('Chest pain follow-up');
  });

  it('Step 4: submit before step 4 throws', async () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    // skipping fillDetails — still on step 3
    await expect(wizard.submit()).rejects.toThrow('Not at confirmation step');
  });

  it('Step 4: sets error on failed API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ detail: 'Slot taken' }) });

    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[1]);
    wizard.fillDetails('Test booking');

    await expect(wizard.submit()).rejects.toThrow('Booking failed');
    expect(wizard.error).toBe('Booking failed');
    expect(wizard.submitted).toBe(false);
  });

  // ── Back Navigation ───────────────────────────────────────────────────────

  it('back() decrements step', () => {
    wizard.selectDoctor(MOCK_DOCTOR);
    wizard.selectDateTime('2026-04-15', MOCK_SLOTS[0]);
    wizard.fillDetails('Follow-up');
    expect(wizard.step).toBe(4);
    wizard.back();
    expect(wizard.step).toBe(3);
    wizard.back();
    expect(wizard.step).toBe(2);
    wizard.back();
    expect(wizard.step).toBe(1);
  });

  it('back() does not go below step 1', () => {
    wizard.back();
    expect(wizard.step).toBe(1);
  });
});
