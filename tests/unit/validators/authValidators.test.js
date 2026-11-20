// tests/unit/validators/authValidators.test.js
// Unit tests for authentication validation rules

import { describe, it, expect } from 'vitest';
import {
  loginRules,
  registerRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
} from '../../../frontend/src/validators/authValidators.js';

// ── Email validation ────────────────────────────────────────────────────────
describe('loginRules.email', () => {
  const pattern = loginRules.email.pattern.value;

  it('accepts a valid email', () => {
    expect(pattern.test('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(pattern.test('user@mail.example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(pattern.test('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(pattern.test('user@')).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(pattern.test('user name@example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(pattern.test('')).toBe(false);
  });

  it('has required rule', () => {
    expect(loginRules.email.required).toBeTruthy();
  });
});

// ── Password validation ─────────────────────────────────────────────────────
describe('loginRules.password', () => {
  it('has required rule', () => {
    expect(loginRules.password.required).toBeTruthy();
  });

  it('enforces minimum 6 characters', () => {
    expect(loginRules.password.minLength.value).toBe(6);
  });
});

// ── Registration validation ─────────────────────────────────────────────────
describe('registerRules', () => {
  // Full name
  describe('full_name', () => {
    it('is required', () => expect(registerRules.full_name.required).toBeTruthy());
    it('min 2 chars', () => expect(registerRules.full_name.minLength.value).toBe(2));
    it('max 100 chars', () => expect(registerRules.full_name.maxLength.value).toBe(100));
  });

  // Egyptian phone
  describe('phone', () => {
    const pattern = registerRules.phone.pattern.value;

    it('accepts valid 01x number', () => {
      expect(pattern.test('01012345678')).toBe(true);
    });

    it('accepts 01x with +20 prefix', () => {
      expect(pattern.test('+201012345678')).toBe(true);
    });

    it('accepts 01x with 20 prefix', () => {
      expect(pattern.test('201012345678')).toBe(true);
    });

    it('rejects 10-digit non-Egyptian number', () => {
      expect(pattern.test('1234567890')).toBe(false);
    });

    it('rejects landline number', () => {
      expect(pattern.test('0222345678')).toBe(false);
    });

    it('is required', () => expect(registerRules.phone.required).toBeTruthy());
  });

  // Password strength
  describe('password', () => {
    const pattern = registerRules.password.pattern.value;

    it('accepts password with upper, lower, digit', () => {
      expect(pattern.test('ValidPass1')).toBe(true);
    });

    it('rejects all lowercase', () => {
      expect(pattern.test('alllowercase1')).toBe(false);
    });

    it('rejects all uppercase', () => {
      expect(pattern.test('ALLUPPERCASE1')).toBe(false);
    });

    it('rejects no digits', () => {
      expect(pattern.test('NoDigitHere')).toBe(false);
    });

    it('enforces minimum 8 characters', () => {
      expect(registerRules.password.minLength.value).toBe(8);
    });
  });

  // Confirm password
  describe('confirmPassword', () => {
    it('returns required rule', () => {
      const rules = registerRules.confirmPassword('myPassword');
      expect(rules.required).toBeTruthy();
    });

    it('validate function returns true for matching passwords', () => {
      const rules = registerRules.confirmPassword('myPassword');
      expect(rules.validate('myPassword')).toBe(true);
    });

    it('validate function returns error string for mismatched passwords', () => {
      const rules = registerRules.confirmPassword('myPassword');
      const result = rules.validate('differentPassword');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ── Forgot password ─────────────────────────────────────────────────────────
describe('forgotPasswordRules', () => {
  it('uses the same email rules as login', () => {
    expect(forgotPasswordRules.email).toEqual(loginRules.email);
  });
});

// ── Reset password ──────────────────────────────────────────────────────────
describe('resetPasswordRules', () => {
  it('has new_password rules', () => {
    expect(resetPasswordRules.new_password).toBeDefined();
    expect(resetPasswordRules.new_password.minLength.value).toBe(8);
  });

  it('confirm_password validate works', () => {
    const rules = resetPasswordRules.confirm_password('NewPass@1');
    expect(rules.validate('NewPass@1')).toBe(true);
    expect(typeof rules.validate('other')).toBe('string');
  });
});

// ── Change password ─────────────────────────────────────────────────────────
describe('changePasswordRules', () => {
  it('requires old_password', () => {
    expect(changePasswordRules.old_password.required).toBeTruthy();
  });

  it('new_password has strength requirements', () => {
    expect(changePasswordRules.new_password.minLength.value).toBe(8);
    expect(changePasswordRules.new_password.pattern.value).toBeDefined();
  });
});
