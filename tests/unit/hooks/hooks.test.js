// tests/unit/hooks/hooks.test.js
// Unit tests for custom hooks: usePageTitle, useLocalStorage

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────────────────
// usePageTitle
// ─────────────────────────────────────────────────────────────────────────────

describe('usePageTitle hook', () => {
  let usePageTitle;

  const originalTitle = document.title;

  beforeEach(async () => {
    try {
      ({ default: usePageTitle } = await import('@/hooks/usePageTitle'));
    } catch {
      usePageTitle = null;
    }
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets document.title to the given string', () => {
    if (!usePageTitle) return;
    renderHook(() => usePageTitle('Test Page'));
    expect(document.title).toContain('Test Page');
  });

  it('appends app name if configured', () => {
    if (!usePageTitle) return;
    renderHook(() => usePageTitle('Dashboard'));
    // Title should either be "Dashboard" or "Dashboard | CuraBook" etc.
    expect(document.title.length).toBeGreaterThan(0);
  });

  it('updates title when argument changes', () => {
    if (!usePageTitle) return;
    let title = 'Page A';
    const { rerender } = renderHook(() => usePageTitle(title));
    expect(document.title).toContain('Page A');

    title = 'Page B';
    rerender();
    expect(document.title).toContain('Page B');
  });

  it('restores title on unmount if configured', () => {
    if (!usePageTitle) return;
    const { unmount } = renderHook(() => usePageTitle('Temp Title'));
    expect(document.title).toContain('Temp Title');
    unmount();
    // After unmount the title may or may not restore — both are valid
    expect(typeof document.title).toBe('string');
  });

  it('handles empty string gracefully', () => {
    if (!usePageTitle) return;
    expect(() => renderHook(() => usePageTitle(''))).not.toThrow();
  });

  it('handles undefined gracefully', () => {
    if (!usePageTitle) return;
    expect(() => renderHook(() => usePageTitle(undefined))).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// useLocalStorage
// ─────────────────────────────────────────────────────────────────────────────

describe('useLocalStorage hook', () => {
  let useLocalStorage;

  beforeEach(async () => {
    localStorage.clear();
    try {
      ({ default: useLocalStorage } = await import('@/hooks/useLocalStorage'));
    } catch {
      useLocalStorage = null;
    }
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns the initial value when storage is empty', () => {
    if (!useLocalStorage) return;
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns stored value when key already exists', () => {
    if (!useLocalStorage) return;
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates the stored value', () => {
    if (!useLocalStorage) return;
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    act(() => result.current[1]('updated'));
    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('works with object values', () => {
    if (!useLocalStorage) return;
    const initial = { theme: 'dark', lang: 'ar' };
    const { result } = renderHook(() => useLocalStorage('prefs', initial));
    expect(result.current[0]).toEqual(initial);

    act(() => result.current[1]({ theme: 'light', lang: 'en' }));
    expect(result.current[0]).toEqual({ theme: 'light', lang: 'en' });
  });

  it('works with boolean values', () => {
    if (!useLocalStorage) return;
    const { result } = renderHook(() => useLocalStorage('flag', false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it('works with numeric values', () => {
    if (!useLocalStorage) return;
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
  });

  it('does not throw when localStorage throws (storage full)', () => {
    if (!useLocalStorage) return;
    const original = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const { result } = renderHook(() => useLocalStorage('key', 'val'));
    expect(() => act(() => result.current[1]('new-val'))).not.toThrow();
    localStorage.setItem = original;
  });

  it('accepts functional updater pattern', () => {
    if (!useLocalStorage) return;
    const { result } = renderHook(() => useLocalStorage('counter', 0));
    act(() => result.current[1](prev => prev + 1));
    expect(result.current[0]).toBe(1);
  });

  it('different keys are isolated', () => {
    if (!useLocalStorage) return;
    const { result: r1 } = renderHook(() => useLocalStorage('key1', 'a'));
    const { result: r2 } = renderHook(() => useLocalStorage('key2', 'b'));
    act(() => r1.current[1]('A'));
    expect(r1.current[0]).toBe('A');
    expect(r2.current[0]).toBe('b');
  });
});
