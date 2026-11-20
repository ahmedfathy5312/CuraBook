// tests/unit/validators/appointmentValidators.test.js
// Unit tests for appointment booking validation rules

import { describe, it, expect } from 'vitest';
import {
  bookingRules,
  rescheduleRules,
  VISIT_TYPES,
} from '../../../frontend/src/validators/appointmentValidators.js';

// ── VISIT_TYPES constant ────────────────────────────────────────────────────
describe('VISIT_TYPES', () => {
  it('exports IN_PERSON', () => expect(VISIT_TYPES.IN_PERSON).toBe('IN_PERSON'));
  it('exports ONLINE',    () => expect(VISIT_TYPES.ONLINE).toBe('ONLINE'));
  it('has exactly 2 types', () => expect(Object.keys(VISIT_TYPES)).toHaveLength(2));
});

// ── bookingRules.doctor ─────────────────────────────────────────────────────
describe('bookingRules.doctor', () => {
  it('is required', () => expect(bookingRules.doctor.required).toBeTruthy());
});

// ── bookingRules.date ───────────────────────────────────────────────────────
describe('bookingRules.date', () => {
  it('is required', () => expect(bookingRules.date.required).toBeTruthy());

  describe('validate — future date check', () => {
    const validate = bookingRules.date.validate;

    it('accepts today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(validate(today)).toBe(true);
    });

    it('accepts a future date', () => {
      const future = new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0];
      expect(validate(future)).toBe(true);
    });

    it('rejects yesterday', () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
      const result = validate(yesterday);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('rejects a date 1 year ago', () => {
      const old = new Date(Date.now() - 365 * 86_400_000).toISOString().split('T')[0];
      const result = validate(old);
      expect(typeof result).toBe('string');
    });
  });
});

// ── bookingRules.slot_id ────────────────────────────────────────────────────
describe('bookingRules.slot_id', () => {
  it('is required', () => expect(bookingRules.slot_id.required).toBeTruthy());
});

// ── bookingRules.visit_type ─────────────────────────────────────────────────
describe('bookingRules.visit_type', () => {
  it('is required', () => expect(bookingRules.visit_type.required).toBeTruthy());

  describe('validate — allowed values', () => {
    const validate = bookingRules.visit_type.validate;

    it('accepts IN_PERSON', () => expect(validate('IN_PERSON')).toBe(true));
    it('accepts ONLINE',    () => expect(validate('ONLINE')).toBe(true));

    it('rejects "clinic"',  () => {
      const result = validate('clinic');
      expect(typeof result).toBe('string');
    });

    it('rejects "hospital"', () => {
      const result = validate('hospital');
      expect(typeof result).toBe('string');
    });

    it('rejects empty string', () => {
      const result = validate('');
      expect(typeof result).toBe('string');
    });

    it('rejects lowercase in_person', () => {
      // API expects uppercase — validate accordingly
      const result = validate('in_person');
      expect(typeof result).toBe('string');
    });
  });
});

// ── bookingRules.notes ──────────────────────────────────────────────────────
describe('bookingRules.notes', () => {
  it('has maxLength of 500', () => {
    expect(bookingRules.notes.maxLength.value).toBe(500);
  });

  it('is NOT required (optional field)', () => {
    expect(bookingRules.notes.required).toBeFalsy();
  });
});

// ── rescheduleRules ─────────────────────────────────────────────────────────
describe('rescheduleRules', () => {
  it('includes date rule', () => {
    expect(rescheduleRules.date).toBeDefined();
    expect(rescheduleRules.date.required).toBeTruthy();
  });

  it('includes slot_id rule', () => {
    expect(rescheduleRules.slot_id).toBeDefined();
    expect(rescheduleRules.slot_id.required).toBeTruthy();
  });

  it('does NOT include visit_type (cannot change on reschedule)', () => {
    expect(rescheduleRules.visit_type).toBeUndefined();
  });

  it('date validation rejects past dates', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const result = rescheduleRules.date.validate(yesterday);
    expect(typeof result).toBe('string');
  });
});
