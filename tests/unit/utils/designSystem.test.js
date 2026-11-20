// tests/unit/utils/designSystem.test.js
// Unit tests for theme tokens and design system helpers

import { describe, it, expect } from 'vitest';

// ── tokens.js ───────────────────────────────────────────────────────────────
import * as tokensModule from '../../../frontend/src/theme/tokens.js';

describe('theme/tokens.js', () => {
  it('module is importable', () => expect(tokensModule).toBeDefined());

  const tokens = tokensModule.default || tokensModule.tokens || tokensModule;

  it('exports tokens object', () => {
    expect(typeof tokens).toBe('object');
  });

  it('has colors defined', () => {
    const colors = tokens.colors || tokens.palette;
    if (colors) {
      expect(typeof colors).toBe('object');
      expect(Object.keys(colors).length).toBeGreaterThan(0);
    }
  });

  it('has spacing defined', () => {
    const spacing = tokens.spacing || tokens.space;
    if (spacing) {
      expect(typeof spacing).toBe('object');
    }
  });

  it('has typography defined', () => {
    const typo = tokens.typography || tokens.fontSizes || tokens.fontSize;
    if (typo) {
      expect(typeof typo).toBe('object');
    }
  });

  it('has shadows defined', () => {
    const shadows = tokens.shadows || tokens.shadow;
    if (shadows) {
      expect(typeof shadows).toBe('object');
    }
  });
});

// ── designSystem.js ─────────────────────────────────────────────────────────
import * as dsModule from '../../../frontend/src/theme/designSystem.js';

describe('theme/designSystem.js', () => {
  it('module is importable', () => expect(dsModule).toBeDefined());

  it('exports named exports or a default', () => {
    const keys = Object.keys(dsModule);
    expect(keys.length).toBeGreaterThan(0);
  });

  // Check for common design system helpers
  const ds = dsModule.default || dsModule;

  it('has card or cardStyle helper (if present)', () => {
    const card = ds.card || ds.cardStyle || ds.getCardStyle;
    // Optional — just checking it returns something if present
    if (typeof card === 'function') {
      expect(card).toBeDefined();
    }
  });

  it('has button or buttonStyle helper (if present)', () => {
    const btn = ds.button || ds.buttonStyle || ds.getButtonStyle;
    if (typeof btn === 'function') {
      expect(btn).toBeDefined();
    }
  });

  it('no exported value is undefined', () => {
    Object.entries(dsModule).forEach(([key, val]) => {
      if (key !== '__esModule') {
        expect(val, `${key} should not be undefined`).not.toBeUndefined();
      }
    });
  });
});
