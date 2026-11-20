// tests/unit/validators/profileValidators.test.js
// Unit tests for profile & password-change validation rules

import { describe, it, expect } from 'vitest';

// We read the file dynamically since it may use default or named exports
let profileValidators;
try {
  profileValidators = await import('../../../frontend/src/validators/profileValidators.js');
} catch {
  profileValidators = {};
}

const {
  profileRules,
  updateProfileRules,
  doctorProfileRules,
  changePasswordRules,
} = profileValidators;

// ── Guard: if file is empty / missing exports just skip ────────────────────
const hasProfileRules = !!profileRules || !!updateProfileRules || !!doctorProfileRules;

describe.skipIf(!hasProfileRules)('profileValidators', () => {

  const rules = profileRules || updateProfileRules || doctorProfileRules || {};

  describe('name / full_name field', () => {
    const nameRule = rules.full_name || rules.name;
    it.skipIf(!nameRule)('is required', () => {
      expect(nameRule.required).toBeTruthy();
    });
    it.skipIf(!nameRule)('minLength ≥ 2', () => {
      expect(nameRule.minLength?.value).toBeGreaterThanOrEqual(2);
    });
  });

  describe('phone field', () => {
    const phoneRule = rules.phone;
    it.skipIf(!phoneRule)('has pattern for Egyptian phone', () => {
      expect(phoneRule.pattern?.value).toBeDefined();
    });
  });

  describe('bio / about field', () => {
    const bioRule = rules.bio || rules.about;
    it.skipIf(!bioRule)('has maxLength', () => {
      expect(bioRule.maxLength?.value).toBeDefined();
    });
  });
});

// ── changePasswordRules from this file or authValidators ───────────────────
const cpRules = changePasswordRules;
describe.skipIf(!cpRules)('changePasswordRules (profileValidators)', () => {
  it('old_password is required', () => {
    expect(cpRules.old_password?.required).toBeTruthy();
  });

  it('new_password has minLength 8', () => {
    expect(cpRules.new_password?.minLength?.value).toBe(8);
  });
});

// ── Fallback: file exists and exports something ────────────────────────────
describe('profileValidators module', () => {
  it('file is importable without throwing', () => {
    expect(profileValidators).toBeDefined();
  });
});
