// tests/setup.js
// Global setup for Vitest unit/integration tests

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ── Browser APIs not available in jsdom ────────────────────────────────────

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media:   query,
    onchange: null,
    addListener:    vi.fn(),
    removeListener: vi.fn(),
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe:   vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe:    vi.fn(),
    unobserve:  vi.fn(),
    disconnect: vi.fn(),
  })),
});

// ── WebSocket mock ─────────────────────────────────────────────────────────
global.WebSocket = class MockWebSocket {
  constructor() {
    this.readyState = 0;
    this.send       = vi.fn();
    this.close      = vi.fn();
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
};

// ── localStorage mock ──────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:   vi.fn(k => store[k] ?? null),
    setItem:   vi.fn((k, v) => { store[k] = String(v); }),
    removeItem: vi.fn(k => { delete store[k]; }),
    clear:     vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn(i => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── Suppress specific React noise ──────────────────────────────────────────
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('act(...)'))
  ) return;
  originalConsoleError(...args);
};

// ── Reset mocks between tests ──────────────────────────────────────────────
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
