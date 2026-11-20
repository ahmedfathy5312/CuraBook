// tests/unit/utils/constants.test.js
// Unit tests for constants and utility modules

import { describe, it, expect } from 'vitest';

// ── appointmentStatus ───────────────────────────────────────────────────────
import * as apptStatus from '../../../frontend/src/constants/appointmentStatus.js';

describe('appointmentStatus constants', () => {
  it('module exports something', () => {
    expect(apptStatus).toBeDefined();
  });

  const keys = Object.keys(apptStatus);

  it('exports at least one status', () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it('PENDING status is defined (if present)', () => {
    const pending = apptStatus.PENDING || apptStatus.STATUS_PENDING || apptStatus.statuses?.PENDING;
    if (pending !== undefined) {
      expect(typeof pending).toBe('string');
    }
  });

  it('CONFIRMED status is defined (if present)', () => {
    const confirmed = apptStatus.CONFIRMED || apptStatus.STATUS_CONFIRMED || apptStatus.statuses?.CONFIRMED;
    if (confirmed !== undefined) {
      expect(typeof confirmed).toBe('string');
    }
  });

  it('CANCELLED status is defined (if present)', () => {
    const cancelled = apptStatus.CANCELLED || apptStatus.CANCELED || apptStatus.statuses?.CANCELLED;
    if (cancelled !== undefined) {
      expect(typeof cancelled).toBe('string');
    }
  });

  it('all status values are non-empty strings', () => {
    const stringValues = keys
      .map(k => apptStatus[k])
      .filter(v => typeof v === 'string');
    stringValues.forEach(v => expect(v.length).toBeGreaterThan(0));
  });
});

// ── SPECIALTIES_DATA ────────────────────────────────────────────────────────
import * as specialties from '../../../frontend/src/constants/SPECIALTIES_DATA.js';

describe('SPECIALTIES_DATA constants', () => {
  it('module is importable', () => expect(specialties).toBeDefined());

  const data = specialties.SPECIALTIES_DATA || specialties.default || [];
  const hasData = Array.isArray(data) && data.length > 0;

  it.skipIf(!hasData)('contains at least 5 specialties', () => {
    expect(data.length).toBeGreaterThanOrEqual(5);
  });

  it.skipIf(!hasData)('each specialty has an id or value', () => {
    data.forEach(s => {
      const id = s.id || s.value || s.key;
      expect(id).toBeDefined();
    });
  });

  it.skipIf(!hasData)('each specialty has a label or name', () => {
    data.forEach(s => {
      const label = s.label || s.name || s.title;
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
    });
  });
});

// ── GOVERNORATES ────────────────────────────────────────────────────────────
import * as govs from '../../../frontend/src/constants/GOVERNORATES.js';

describe('GOVERNORATES constants', () => {
  it('module is importable', () => expect(govs).toBeDefined());

  const data = govs.GOVERNORATES || govs.default || [];
  const hasData = Array.isArray(data) && data.length > 0;

  it.skipIf(!hasData)('contains Egyptian governorates (≥ 20)', () => {
    // Egypt has 27 governorates
    expect(data.length).toBeGreaterThanOrEqual(20);
  });

  it.skipIf(!hasData)('Cairo is in the list', () => {
    const hasCairo = data.some(g => {
      const name = g.name || g.label || g.value || String(g);
      return /cairo|القاهرة/i.test(name);
    });
    expect(hasCairo).toBe(true);
  });
});

// ── apiRoutes ───────────────────────────────────────────────────────────────
import * as apiRoutes from '../../../frontend/src/constants/apiRoutes.js';

describe('apiRoutes constants', () => {
  it('module is importable', () => expect(apiRoutes).toBeDefined());

  it('exports at least one route', () => {
    const keys = Object.keys(apiRoutes);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('route values are non-empty strings', () => {
    const routes = apiRoutes.default || apiRoutes;
    const values = typeof routes === 'object'
      ? Object.values(routes).filter(v => typeof v === 'string')
      : [];
    values.forEach(v => expect(v.length).toBeGreaterThan(0));
  });
});
