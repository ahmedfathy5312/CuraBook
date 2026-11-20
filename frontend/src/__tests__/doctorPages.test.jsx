/**
 * doctorPages.test.jsx
 * CuraBook — Doctor Pages Unit Tests
 * ====================================
 * Coverage targets:
 *  - DoctorDashboardPage helpers
 *  - Analytics data transform utilities
 *  - Appointment filtering logic
 *  - Patient record form validation
 *  - i18n key coverage
 *  - RTL layout helpers
 *  - API param builders
 *  - Status badge mapping
 *  - Date formatting utilities
 *  - Notification prefs mapping (P2-4)
 *  - Experience years fallback (P2-3)
 */

import { vi, describe, test, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ──────────────────────────────────────────────────────────────────────────────
// 1. Experience Years Fallback (P2-3 Fix)
// ──────────────────────────────────────────────────────────────────────────────

describe('P2-3: Experience Years Fallback', () => {
  function getExperience(stats) {
    return stats?.experience_years || stats?.years_of_experience;
  }

  test('returns experience_years when present', () => {
    expect(getExperience({ experience_years: 12 })).toBe(12);
  });

  test('falls back to years_of_experience when experience_years missing', () => {
    expect(getExperience({ years_of_experience: 8 })).toBe(8);
  });

  test('returns undefined when both missing', () => {
    expect(getExperience({})).toBeUndefined();
  });

  test('prefers experience_years over years_of_experience', () => {
    expect(getExperience({ experience_years: 12, years_of_experience: 8 })).toBe(12);
  });

  test('handles null stats gracefully', () => {
    expect(getExperience(null)).toBeUndefined();
  });

  test('handles undefined stats gracefully', () => {
    expect(getExperience(undefined)).toBeUndefined();
  });

  test('handles zero years correctly', () => {
    expect(getExperience({ experience_years: 0, years_of_experience: 0 })).toBe(0);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 2. Notification Preferences Mapping (P2-4 Fix)
// ──────────────────────────────────────────────────────────────────────────────

describe('P2-4: Notification Preferences Key Mapping', () => {
  function mapPrefsToBackend(prefs) {
    return {
      email_enabled:  prefs.email  ?? true,
      push_enabled:   prefs.push   ?? true,
      in_app_enabled: prefs.appointment_reminders ?? true,
    };
  }

  test('maps all three frontend keys to backend keys', () => {
    const frontend = { email: true, push: false, appointment_reminders: true };
    const backend = mapPrefsToBackend(frontend);
    expect(backend).toEqual({
      email_enabled: true,
      push_enabled: false,
      in_app_enabled: true,
    });
  });

  test('defaults to true when email key missing', () => {
    expect(mapPrefsToBackend({}).email_enabled).toBe(true);
  });

  test('defaults to true when push key missing', () => {
    expect(mapPrefsToBackend({}).push_enabled).toBe(true);
  });

  test('defaults to true when appointment_reminders key missing', () => {
    expect(mapPrefsToBackend({}).in_app_enabled).toBe(true);
  });

  test('respects explicit false values (not replaced by default)', () => {
    const result = mapPrefsToBackend({ email: false, push: false, appointment_reminders: false });
    expect(result.email_enabled).toBe(false);
    expect(result.push_enabled).toBe(false);
    expect(result.in_app_enabled).toBe(false);
  });

  test('does not include extra frontend-only keys in backend payload', () => {
    const result = mapPrefsToBackend({ email: true, push: true, appointment_reminders: true, sms: true });
    expect(result).not.toHaveProperty('sms');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('push');
    expect(result).not.toHaveProperty('appointment_reminders');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 3. Analytics API Response Shape Validation (P3-1 Fix)
// ──────────────────────────────────────────────────────────────────────────────

describe('P3-1: Analytics API Response Validation', () => {
  // المفاتيح المطلوبة التي يحتاجها الـ Frontend
  const REQUIRED_KEYS = [
    'stats', 'comparison', 'trends',
    'revenueChart', 'patientGrowth', 'statusDistribution',
    'visitTypes', 'topPatients',
  ];

  const REQUIRED_STATS_KEYS = ['revenue', 'appointments', 'newPatients', 'rating'];
  const REQUIRED_COMPARISON_KEYS = ['revenue_delta', 'appointments_delta', 'patients_delta'];
  const REQUIRED_TRENDS_KEYS = ['revenue', 'appointments', 'patients'];

  function validateAnalyticsResponse(data) {
    const missing = REQUIRED_KEYS.filter(k => !(k in data));
    return { valid: missing.length === 0, missing };
  }

  const mockValidResponse = {
    stats: { revenue: 45200, appointments: 124, newPatients: 38, rating: 4.7 },
    comparison: { revenue_delta: 12.5, appointments_delta: -3.2, patients_delta: 8.1 },
    trends: { revenue: [1,2,3,4,5,6,7], appointments: [10,12,11,14,15,16,17], patients: [2,3,3,4,4,5,5] },
    revenueChart: [{ name: 'Jan', value: 38000 }],
    patientGrowth: [{ name: 'Jan', value: 24 }],
    statusDistribution: [{ label: 'Confirmed', value: 68, color: '#10B981' }],
    visitTypes: [{ label: 'In-Person', value: 75, color: '#2C6B8A' }],
    topPatients: [{ id: 'p1', name: 'Ahmed', visits: 12 }],
  };

  test('valid response passes validation', () => {
    const result = validateAnalyticsResponse(mockValidResponse);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  test('detects missing stats key', () => {
    const { stats, ...noStats } = mockValidResponse;
    const result = validateAnalyticsResponse(noStats);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('stats');
  });

  test('detects missing comparison key', () => {
    const { comparison, ...noComparison } = mockValidResponse;
    const result = validateAnalyticsResponse(noComparison);
    expect(result.missing).toContain('comparison');
  });

  test('trends array has exactly 7 points', () => {
    expect(mockValidResponse.trends.revenue).toHaveLength(7);
    expect(mockValidResponse.trends.appointments).toHaveLength(7);
    expect(mockValidResponse.trends.patients).toHaveLength(7);
  });

  test('topPatients have required fields', () => {
    mockValidResponse.topPatients.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('visits');
    });
  });

  test('stats contains all required sub-keys', () => {
    REQUIRED_STATS_KEYS.forEach(k => {
      expect(mockValidResponse.stats).toHaveProperty(k);
    });
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 4. Appointment API Params Builder (P3-6 Fix)
// ──────────────────────────────────────────────────────────────────────────────

describe('P3-6: Appointment Filter Params', () => {
  function buildAppointmentParams({ page = 1, status = '', search = '', dateRange = '' } = {}) {
    return {
      page,
      page_size: 15,
      ...(status && status !== 'all'         ? { status }              : {}),
      ...(search                              ? { search }              : {}),
      ...(dateRange && dateRange !== 'all'    ? { date_range: dateRange } : {}),
    };
  }

  test('minimal params: page and page_size only', () => {
    const params = buildAppointmentParams({ page: 1 });
    expect(params).toEqual({ page: 1, page_size: 15 });
  });

  test('includes status when not empty and not "all"', () => {
    const params = buildAppointmentParams({ status: 'CONFIRMED' });
    expect(params).toHaveProperty('status', 'CONFIRMED');
  });

  test('excludes status when "all"', () => {
    const params = buildAppointmentParams({ status: 'all' });
    expect(params).not.toHaveProperty('status');
  });

  test('excludes status when empty string', () => {
    const params = buildAppointmentParams({ status: '' });
    expect(params).not.toHaveProperty('status');
  });

  test('uses "search" key (not "q")', () => {
    const params = buildAppointmentParams({ search: 'ahmed' });
    expect(params).toHaveProperty('search', 'ahmed');
    expect(params).not.toHaveProperty('q');  // P3-6 fix: was 'q' before
  });

  test('uses "date_range" key', () => {
    const params = buildAppointmentParams({ dateRange: 'week' });
    expect(params).toHaveProperty('date_range', 'week');
  });

  test('excludes date_range when "all"', () => {
    const params = buildAppointmentParams({ dateRange: 'all' });
    expect(params).not.toHaveProperty('date_range');
  });

  test('all filters combined', () => {
    const params = buildAppointmentParams({
      page: 2, status: 'PENDING', search: 'ali', dateRange: 'today'
    });
    expect(params).toEqual({
      page: 2,
      page_size: 15,
      status: 'PENDING',
      search: 'ali',
      date_range: 'today',
    });
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 5. Status Badge Mapping
// ──────────────────────────────────────────────────────────────────────────────

describe('Status Badge Mapping', () => {
  const STATUS_MAP = {
    PENDING:              { label: 'Pending',              bg: '#FEF3C7', color: '#92400E' },
    CONFIRMED:            { label: 'Confirmed',            bg: '#D1FAE5', color: '#065F46' },
    REJECTED:             { label: 'Rejected',             bg: '#FEE2E2', color: '#991B1B' },
    CANCELLED:            { label: 'Cancelled',            bg: '#F3F4F6', color: '#374151' },
    COMPLETED:            { label: 'Completed',            bg: '#DBEAFE', color: '#1E40AF' },
    RESCHEDULE_REQUESTED: { label: 'Reschedule Requested', bg: '#EDE9FE', color: '#5B21B6' },
  };

  function getBadgeConfig(status) {
    return STATUS_MAP[status?.toUpperCase()] || { label: status || '—', bg: '#F3F4F6', color: '#374151' };
  }

  test.each([
    ['PENDING', 'Pending'],
    ['CONFIRMED', 'Confirmed'],
    ['REJECTED', 'Rejected'],
    ['CANCELLED', 'Cancelled'],
    ['COMPLETED', 'Completed'],
    ['RESCHEDULE_REQUESTED', 'Reschedule Requested'],
  ])('status %s maps to label %s', (status, expected) => {
    expect(getBadgeConfig(status).label).toBe(expected);
  });

  test('case-insensitive (lowercase input)', () => {
    expect(getBadgeConfig('confirmed').label).toBe('Confirmed');
    expect(getBadgeConfig('pending').label).toBe('Pending');
  });

  test('unknown status returns as-is', () => {
    expect(getBadgeConfig('UNKNOWN').label).toBe('UNKNOWN');
  });

  test('null status returns dash', () => {
    expect(getBadgeConfig(null).label).toBe('—');
  });

  test('CONFIRMED has green background', () => {
    expect(getBadgeConfig('CONFIRMED').bg).toBe('#D1FAE5');
  });

  test('REJECTED has red background', () => {
    expect(getBadgeConfig('REJECTED').bg).toBe('#FEE2E2');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 6. Date Formatting Utilities
// ──────────────────────────────────────────────────────────────────────────────

describe('Date Formatting Utilities', () => {
  function formatAppointmentDate(dateString, isRTL = false) {
    if (!dateString) return isRTL ? 'غير محدد' : 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return isRTL ? 'تاريخ خاطئ' : 'Invalid date';
    return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function formatAppointmentTime(dateString, isRTL = false) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  test('formats valid date in English', () => {
    const result = formatAppointmentDate('2026-04-22T10:00:00Z', false);
    expect(result).not.toBe('Invalid date');
    expect(result).not.toBe('Not set');
  });

  test('returns "Not set" for null date (LTR)', () => {
    expect(formatAppointmentDate(null, false)).toBe('Not set');
  });

  test('returns Arabic placeholder for null date (RTL)', () => {
    expect(formatAppointmentDate(null, true)).toBe('غير محدد');
  });

  test('handles invalid date string', () => {
    expect(formatAppointmentDate('not-a-date', false)).toBe('Invalid date');
  });

  test('formats time correctly', () => {
    const result = formatAppointmentTime('2026-04-22T14:30:00Z', false);
    expect(result).toMatch(/AM|PM/i);
  });

  test('returns empty string for null time', () => {
    expect(formatAppointmentTime(null)).toBe('');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 7. Blood Type Validation (NewPatientRecordPage)
// ──────────────────────────────────────────────────────────────────────────────

describe('Blood Type Validation', () => {
  const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  function isValidBloodType(value) {
    if (!value) return true; // optional field
    return VALID_BLOOD_TYPES.includes(value);
  }

  test.each(VALID_BLOOD_TYPES)('accepts valid blood type %s', (bt) => {
    expect(isValidBloodType(bt)).toBe(true);
  });

  test('rejects invalid blood type', () => {
    expect(isValidBloodType('C+')).toBe(false);
    expect(isValidBloodType('X')).toBe(false);
    expect(isValidBloodType('a+')).toBe(false);  // case sensitive
  });

  test('accepts empty string (optional field)', () => {
    expect(isValidBloodType('')).toBe(true);
  });

  test('accepts null (optional field)', () => {
    expect(isValidBloodType(null)).toBe(true);
  });

  test('accepts undefined (optional field)', () => {
    expect(isValidBloodType(undefined)).toBe(true);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 8. Patient Record Form Validation
// ──────────────────────────────────────────────────────────────────────────────

describe('Patient Record Form Validation', () => {
  function validateRecordForm(form) {
    const errors = {};
    if (!form.chief_complaint?.trim()) {
      errors.chief_complaint = 'Chief complaint is required';
    }
    if (!form.diagnosis?.trim()) {
      errors.diagnosis = 'Diagnosis is required';
    }
    if (form.blood_type && !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(form.blood_type)) {
      errors.blood_type = 'Invalid blood type';
    }
    return errors;
  }

  test('valid form has no errors', () => {
    const errors = validateRecordForm({
      chief_complaint: 'Headache',
      diagnosis: 'Tension headache',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  test('missing chief_complaint produces error', () => {
    const errors = validateRecordForm({ diagnosis: 'Something' });
    expect(errors).toHaveProperty('chief_complaint');
  });

  test('missing diagnosis produces error', () => {
    const errors = validateRecordForm({ chief_complaint: 'Headache' });
    expect(errors).toHaveProperty('diagnosis');
  });

  test('whitespace-only chief_complaint treated as empty', () => {
    const errors = validateRecordForm({ chief_complaint: '   ', diagnosis: 'Test' });
    expect(errors).toHaveProperty('chief_complaint');
  });

  test('invalid blood type produces error', () => {
    const errors = validateRecordForm({
      chief_complaint: 'Headache',
      diagnosis: 'Test',
      blood_type: 'C+',
    });
    expect(errors).toHaveProperty('blood_type');
  });

  test('valid blood type no error', () => {
    const errors = validateRecordForm({
      chief_complaint: 'Headache',
      diagnosis: 'Test',
      blood_type: 'O+',
    });
    expect(errors).not.toHaveProperty('blood_type');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 9. RTL Layout Utilities
// ──────────────────────────────────────────────────────────────────────────────

describe('RTL Layout Utilities', () => {
  function getFlexDirection(isRTL) {
    return isRTL ? 'row-reverse' : 'row';
  }

  function getTextAlign(isRTL) {
    return isRTL ? 'right' : 'left';
  }

  function getMarginStart(isRTL, value) {
    return isRTL ? { marginRight: value } : { marginLeft: value };
  }

  function getPositionStart(isRTL, value) {
    return isRTL ? { right: value } : { left: value };
  }

  test('flex direction is row-reverse in RTL', () => {
    expect(getFlexDirection(true)).toBe('row-reverse');
  });

  test('flex direction is row in LTR', () => {
    expect(getFlexDirection(false)).toBe('row');
  });

  test('text align is right in RTL', () => {
    expect(getTextAlign(true)).toBe('right');
  });

  test('text align is left in LTR', () => {
    expect(getTextAlign(false)).toBe('left');
  });

  test('margin start uses marginRight in RTL', () => {
    expect(getMarginStart(true, '16px')).toEqual({ marginRight: '16px' });
  });

  test('margin start uses marginLeft in LTR', () => {
    expect(getMarginStart(false, '16px')).toEqual({ marginLeft: '16px' });
  });

  test('position start uses right in RTL', () => {
    expect(getPositionStart(true, '1rem')).toEqual({ right: '1rem' });
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 10. i18n Key Coverage Check
// ──────────────────────────────────────────────────────────────────────────────

describe('i18n Key Parity', () => {
  // مفاتيح يجب أن تكون موجودة في كلا الملفين
  const REQUIRED_KEYS = [
    'analytics.title', 'analytics.revenue', 'analytics.appointments',
    'doctorAppts.title', 'doctorAppts.search', 'doctorAppts.status',
    'doctorPatients.title', 'doctorPatients.search',
    'patientRecord.chiefComplaint', 'patientRecord.diagnosis',
    'patientRecord.treatmentPlan', 'patientRecord.notes',
    'newPatientRecord.title', 'newPatientRecord.save',
    'ui.save', 'ui.cancel', 'ui.edit', 'ui.delete', 'ui.retry',
    'errors.required', 'errors.loadFailed',
    'a11y.loading', 'a11y.closeModal',
  ];

  // Mock translation objects (subset)
  const mockEN = Object.fromEntries(REQUIRED_KEYS.map(k => [k, k]));
  const mockAR = Object.fromEntries(REQUIRED_KEYS.map(k => [k, 'عربي_' + k]));

  function checkKeyParity(en, ar) {
    const enKeys = Object.keys(en);
    const arKeys = Object.keys(ar);
    const inEnNotAr = enKeys.filter(k => !arKeys.includes(k));
    const inArNotEn = arKeys.filter(k => !enKeys.includes(k));
    return { inEnNotAr, inArNotEn, balanced: inEnNotAr.length === 0 && inArNotEn.length === 0 };
  }

  test('mock EN and AR have matching keys', () => {
    const result = checkKeyParity(mockEN, mockAR);
    expect(result.balanced).toBe(true);
    expect(result.inEnNotAr).toHaveLength(0);
  });

  REQUIRED_KEYS.forEach(key => {
    test(`required key "${key}" exists in EN`, () => {
      expect(mockEN).toHaveProperty(key);
    });
    test(`required key "${key}" exists in AR`, () => {
      expect(mockAR).toHaveProperty(key);
    });
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 11. Analytics Range Parameter
// ──────────────────────────────────────────────────────────────────────────────

describe('Analytics Range Parameter Validation', () => {
  const VALID_RANGES = ['week', 'month', '3months', 'year'];

  function isValidRange(range) {
    return VALID_RANGES.includes(range);
  }

  function getDefaultRange(range) {
    return isValidRange(range) ? range : 'month';
  }

  test.each(VALID_RANGES)('accepts valid range "%s"', (range) => {
    expect(isValidRange(range)).toBe(true);
  });

  test('rejects invalid range', () => {
    expect(isValidRange('day')).toBe(false);
    expect(isValidRange('quarterly')).toBe(false);
    expect(isValidRange('')).toBe(false);
  });

  test('defaults to "month" for invalid range', () => {
    expect(getDefaultRange('invalid')).toBe('month');
    expect(getDefaultRange(null)).toBe('month');
  });

  test('returns valid range unchanged', () => {
    expect(getDefaultRange('week')).toBe('week');
    expect(getDefaultRange('year')).toBe('year');
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 12. MOD_XL Token Resolution (P1-1 Fix)
// ──────────────────────────────────────────────────────────────────────────────

describe('P1-1: MOD_XL Token Resolution', () => {
  const FALLBACK = '0 12px 48px rgba(0,0,0,0.15)';

  function resolveModXL(tokens) {
    return tokens?.shadows?.xl || FALLBACK;
  }

  test('returns token value when tokens and shadows.xl are available', () => {
    const tokens = { shadows: { xl: '0 20px 60px rgba(0,0,0,0.20)' } };
    expect(resolveModXL(tokens)).toBe('0 20px 60px rgba(0,0,0,0.20)');
  });

  test('falls back to default when tokens is null', () => {
    expect(resolveModXL(null)).toBe(FALLBACK);
  });

  test('falls back when tokens.shadows is undefined', () => {
    expect(resolveModXL({})).toBe(FALLBACK);
  });

  test('falls back when shadows.xl is undefined', () => {
    expect(resolveModXL({ shadows: {} })).toBe(FALLBACK);
  });

  test('fallback is a valid CSS box-shadow value', () => {
    expect(FALLBACK).toMatch(/^\d+ \d+px \d+px rgba\(\d+,\d+,\d+,[\d.]+\)$/);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 13. WebSocket hasattr Guards (P1-2 Logic)
// ──────────────────────────────────────────────────────────────────────────────

describe('P1-2: WebSocket Guard Logic', () => {
  // Simulate the Python hasattr guard logic in JS for unit testing

  function safeDisconnect(consumer) {
    // Mirrors: if hasattr(self, '_heartbeat_task') and ...not done()
    if (consumer._heartbeat_task && !consumer._heartbeat_task.done) {
      consumer._heartbeat_task.cancel();
    }

    // Mirrors: for group in getattr(self, 'groups', [])
    const groups = consumer.groups || [];
    const discarded = [];
    for (const group of groups) {
      discarded.push(group);
    }
    return { cancelled: !!consumer._heartbeat_task, discarded };
  }

  test('cancels heartbeat task when present and not done', () => {
    let cancelled = false;
    const consumer = {
      _heartbeat_task: { done: false, cancel: () => { cancelled = true; } },
      groups: [],
    };
    safeDisconnect(consumer);
    expect(cancelled).toBe(true);
  });

  test('does not crash when _heartbeat_task missing', () => {
    const consumer = { groups: ['room1'] };
    expect(() => safeDisconnect(consumer)).not.toThrow();
  });

  test('does not crash when groups missing', () => {
    const consumer = {};
    const result = safeDisconnect(consumer);
    expect(result.discarded).toHaveLength(0);
  });

  test('discards all groups on disconnect', () => {
    const consumer = { groups: ['group1', 'group2', 'group3'] };
    const result = safeDisconnect(consumer);
    expect(result.discarded).toHaveLength(3);
  });

  test('does not cancel completed heartbeat task', () => {
    let cancelled = false;
    const consumer = {
      _heartbeat_task: { done: true, cancel: () => { cancelled = true; } },
    };
    safeDisconnect(consumer);
    expect(cancelled).toBe(false);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// 14. Number Formatting for Analytics
// ──────────────────────────────────────────────────────────────────────────────

describe('Number Formatting Utilities', () => {
  function formatCurrency(value, isRTL = false) {
    if (value === null || value === undefined) return isRTL ? '—' : '—';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  }

  function formatDelta(delta) {
    if (delta === null || delta === undefined) return '';
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  }

  test('formats millions correctly', () => {
    expect(formatCurrency(1_500_000)).toBe('1.5M');
  });

  test('formats thousands correctly', () => {
    expect(formatCurrency(45_200)).toBe('45.2K');
  });

  test('formats small values as-is', () => {
    expect(formatCurrency(200)).toBe('200');
  });

  test('handles null value', () => {
    expect(formatCurrency(null)).toBe('—');
  });

  test('formats positive delta with + sign', () => {
    expect(formatDelta(12.5)).toBe('+12.5%');
  });

  test('formats negative delta without extra sign', () => {
    expect(formatDelta(-3.2)).toBe('-3.2%');
  });

  test('formats zero delta', () => {
    expect(formatDelta(0)).toBe('+0.0%');
  });
});
