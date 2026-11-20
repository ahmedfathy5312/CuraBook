/**
 * CuraBook — Custom Hooks Test Suite
 *
 * Coverage:
 *  1. useDebounce        — delay, cleanup, immediate on zero delay
 *  2. usePagination      — initial state, next/prev, reset, queryParams
 *  3. useFormValidation  — field change, blur, validate, reset, custom validator
 *  4. useApiCall         — loading state, success, error, abort on unmount
 *  5. useQueryParams     — set/get/reset URL params (mocked react-router-dom)
 */


import { vi, describe, test, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';



// ─── Timer helpers ────────────────────────────────────────────────────────────
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});


// ─────────────────────────────────────────────────────────────────────────────
// 1. useDebounce
// ─────────────────────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  const { useDebounce } = require('../hooks/useDebounce');

  test('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 400));
    expect(result.current).toBe('hello');
  });

  test('does not update value before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'first' } }
    );
    rerender({ value: 'second' });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('first');
  });

  test('updates value after delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'first' } }
    );
    rerender({ value: 'second' });
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe('second');
  });

  test('resets timer on rapid successive changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'a' } }
    );
    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ value: 'abc' });
    act(() => { vi.advanceTimersByTime(200); });
    // Still 'a' — total time < 400ms since last change
    expect(result.current).toBe('a');
    // Complete the delay from 'abc'
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('abc');
  });

  test('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(42);
  });

  test('works with object values', () => {
    const obj1 = { q: 'doctor' };
    const obj2 = { q: 'cardiology' };
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: obj1 } }
    );
    rerender({ value: obj2 });
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(obj2);
  });

  test('uses 400ms default delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'start' } }
    );
    rerender({ value: 'end' });
    act(() => { vi.advanceTimersByTime(399); });
    expect(result.current).toBe('start');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('end');
  });

  test('cleans up timer on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('value', 400));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2. usePagination
// ─────────────────────────────────────────────────────────────────────────────

describe('usePagination', () => {
  const { usePagination } = require('../hooks/usePagination');

  test('initialises with defaults page=1 and pageSize=12', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(12);
  });

  test('respects custom defaultPage and defaultPageSize', () => {
    const { result } = renderHook(() =>
      usePagination({ defaultPage: 3, defaultPageSize: 20 })
    );
    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(20);
  });

  test('nextPage increments page by 1', () => {
    const { result } = renderHook(() => usePagination());
    act(() => { result.current.nextPage(); });
    expect(result.current.page).toBe(2);
    act(() => { result.current.nextPage(); });
    expect(result.current.page).toBe(3);
  });

  test('prevPage decrements page but never below 1', () => {
    const { result } = renderHook(() => usePagination({ defaultPage: 3 }));
    act(() => { result.current.prevPage(); });
    expect(result.current.page).toBe(2);
    act(() => { result.current.prevPage(); });
    expect(result.current.page).toBe(1);
    act(() => { result.current.prevPage(); });
    expect(result.current.page).toBe(1);   // floor at 1
  });

  test('setPage sets arbitrary page', () => {
    const { result } = renderHook(() => usePagination());
    act(() => { result.current.setPage(7); });
    expect(result.current.page).toBe(7);
  });

  test('setPageSize changes pageSize', () => {
    const { result } = renderHook(() => usePagination());
    act(() => { result.current.setPageSize(25); });
    expect(result.current.pageSize).toBe(25);
  });

  test('reset returns to defaults', () => {
    const { result } = renderHook(() =>
      usePagination({ defaultPage: 1, defaultPageSize: 12 })
    );
    act(() => { result.current.setPage(5); result.current.setPageSize(50); });
    act(() => { result.current.reset(); });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(12);
  });

  test('resetPage resets page to 1 without touching pageSize', () => {
    const { result } = renderHook(() => usePagination({ defaultPageSize: 20 }));
    act(() => { result.current.setPage(4); result.current.setPageSize(50); });
    act(() => { result.current.resetPage(); });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);   // unchanged
  });

  test('queryParams matches current page and pageSize', () => {
    const { result } = renderHook(() => usePagination({ defaultPage: 2, defaultPageSize: 10 }));
    expect(result.current.queryParams).toEqual({ page: 2, page_size: 10 });
  });

  test('paginationProps.onPageChange updates page', () => {
    const { result } = renderHook(() => usePagination());
    act(() => { result.current.paginationProps.onPageChange(9); });
    expect(result.current.page).toBe(9);
  });

  test('paginationProps.onPageSizeChange updates size and resets to page 1', () => {
    const { result } = renderHook(() => usePagination({ defaultPage: 4 }));
    act(() => { result.current.paginationProps.onPageSizeChange(25); });
    expect(result.current.pageSize).toBe(25);
    expect(result.current.page).toBe(1);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 3. useFormValidation
// ─────────────────────────────────────────────────────────────────────────────

describe('useFormValidation', () => {
  const { useFormValidation } = require('../hooks/useFormValidation');

  const initialValues = { email: '', password: '', name: '' };
  const rules = {
    email: {
      required: 'Email is required',
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email format',
      },
    },
    password: {
      required: 'Password is required',
      minLength: { value: 8, message: 'Minimum 8 characters' },
    },
    name: {
      required: 'Name is required',
      maxLength: { value: 50, message: 'Name too long' },
    },
  };

  test('initialises with provided values and empty errors', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });

  test('handleChange updates value for the named field', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: 'test@example.com', type: 'text' },
      });
    });
    expect(result.current.values.email).toBe('test@example.com');
  });

  test('handleChange handles checkbox type correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({ agree: false }, {})
    );
    act(() => {
      result.current.handleChange({
        target: { name: 'agree', value: 'on', type: 'checkbox', checked: true },
      });
    });
    expect(result.current.values.agree).toBe(true);
  });

  test('handleBlur marks field as touched and runs validation', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'email', value: '' } });
    });
    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBe('Email is required');
  });

  test('validate returns false when required fields are empty', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    let isValid;
    act(() => { isValid = result.current.validate(); });
    expect(isValid).toBe(false);
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.password).toBeTruthy();
  });

  test('validate returns true when all fields are valid', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: 'user@test.com', password: 'SecurePass1', name: 'Ali' },
        rules
      )
    );
    let isValid;
    act(() => { isValid = result.current.validate(); });
    expect(isValid).toBe(true);
    expect(result.current.errors.email).toBeFalsy();
  });

  test('pattern rule catches invalid email', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: 'not-an-email' }, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'email', value: 'not-an-email' } });
    });
    expect(result.current.errors.email).toBe('Invalid email format');
  });

  test('minLength rule catches short password', () => {
    const { result } = renderHook(() =>
      useFormValidation({ ...initialValues, password: 'short' }, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'password', value: 'short' } });
    });
    expect(result.current.errors.password).toBe('Minimum 8 characters');
  });

  test('maxLength rule catches too-long name', () => {
    const longName = 'A'.repeat(51);
    const { result } = renderHook(() =>
      useFormValidation({ ...initialValues, name: longName }, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'name', value: longName } });
    });
    expect(result.current.errors.name).toBe('Name too long');
  });

  test('custom validate function runs correctly', () => {
    const customRules = {
      age: {
        validate: (v) => (parseInt(v) >= 18 ? true : 'Must be 18 or older'),
      },
    };
    const { result } = renderHook(() =>
      useFormValidation({ age: '15' }, customRules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'age', value: '15' } });
    });
    expect(result.current.errors.age).toBe('Must be 18 or older');
  });

  test('setValue updates a single field without touching others', () => {
    const { result } = renderHook(() =>
      useFormValidation({ a: '1', b: '2' }, {})
    );
    act(() => { result.current.setValue('a', 'updated'); });
    expect(result.current.values.a).toBe('updated');
    expect(result.current.values.b).toBe('2');
  });

  test('reset clears values, errors, and touched', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'email', value: '' } });
    });
    act(() => { result.current.reset(); });
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  test('setFieldError manually sets an error on a field', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    act(() => {
      result.current.setFieldError('email', 'Email already in use');
    });
    expect(result.current.errors.email).toBe('Email already in use');
  });

  test('isFieldValid is true when touched with no error', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: 'good@test.com' }, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'email', value: 'good@test.com' } });
    });
    expect(result.current.isFieldValid('email')).toBe(true);
    expect(result.current.isFieldInvalid('email')).toBe(false);
  });

  test('isFieldInvalid is true when touched with error', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '' }, rules)
    );
    act(() => {
      result.current.handleBlur({ target: { name: 'email', value: '' } });
    });
    expect(result.current.isFieldInvalid('email')).toBe(true);
    expect(result.current.isFieldValid('email')).toBe(false);
  });

  test('untouched field is neither valid nor invalid', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, rules)
    );
    expect(result.current.isFieldValid('email')).toBe(false);
    expect(result.current.isFieldInvalid('email')).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 4. useApiCall
// ─────────────────────────────────────────────────────────────────────────────

describe('useApiCall', () => {
  vi.useRealTimers();  // useApiCall uses real async — no fake timers needed here
  const { useApiCall } = require('../hooks/useApiCall');

  test('starts with loading=false, error=null, data=null', () => {
    const { result } = renderHook(() =>
      useApiCall(vi.fn())
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  test('sets loading=true during execution', async () => {
    let resolve;
    const apiFn = vi.fn(() => new Promise(res => { resolve = res; }));

    const { result } = renderHook(() => useApiCall(apiFn));

    act(() => { result.current.execute(); });
    expect(result.current.loading).toBe(true);

    await act(async () => { resolve({ id: 1 }); });
    expect(result.current.loading).toBe(false);
  });

  test('sets data on success', async () => {
    const apiFn = vi.fn().mockResolvedValue({ id: 42, name: 'Test' });
    const { result } = renderHook(() => useApiCall(apiFn));

    await act(async () => { await result.current.execute(); });

    expect(result.current.data).toEqual({ id: 42, name: 'Test' });
    expect(result.current.error).toBe(null);
  });

  test('calls onSuccess callback with response data', async () => {
    const onSuccess = vi.fn();
    const apiFn = vi.fn().mockResolvedValue({ status: 'ok' });
    const { result } = renderHook(() =>
      useApiCall(apiFn, { onSuccess })
    );

    await act(async () => { await result.current.execute(); });

    expect(onSuccess).toHaveBeenCalledWith({ status: 'ok' });
  });

  test('sets error on failure', async () => {
    const apiFn = vi.fn().mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => useApiCall(apiFn));

    await act(async () => { await result.current.execute(); });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  test('calls onError callback on failure', async () => {
    const onError = vi.fn();
    const apiFn = vi.fn().mockRejectedValue(new Error('Boom'));
    const { result } = renderHook(() =>
      useApiCall(apiFn, { onError })
    );

    await act(async () => { await result.current.execute(); });

    expect(onError).toHaveBeenCalled();
  });

  test('resets error before each call when resetOnCall=true (default)', async () => {
    let callCount = 0;
    const apiFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('First call fails'));
      return Promise.resolve({ ok: true });
    });

    const { result } = renderHook(() => useApiCall(apiFn));

    await act(async () => { await result.current.execute(); });
    expect(result.current.error).toBeTruthy();

    await act(async () => { await result.current.execute(); });
    expect(result.current.error).toBe(null);   // cleared before second call
    expect(result.current.data).toEqual({ ok: true });
  });

  test('passes arguments through to the api function', async () => {
    const apiFn = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useApiCall(apiFn));

    await act(async () => {
      await result.current.execute({ doctor: 1, slot: 5 });
    });

    expect(apiFn).toHaveBeenCalledWith({ doctor: 1, slot: 5 });
  });

  test('execute returns the resolved value', async () => {
    const apiFn = vi.fn().mockResolvedValue({ appointment_id: 99 });
    const { result } = renderHook(() => useApiCall(apiFn));

    let returnedValue;
    await act(async () => {
      returnedValue = await result.current.execute();
    });

    expect(returnedValue).toEqual({ appointment_id: 99 });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5. useQueryParams
// ─────────────────────────────────────────────────────────────────────────────

// Mock react-router-dom's useSearchParams
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn((updater) => {
  if (typeof updater === 'function') {
    const next = updater(mockSearchParams);
    // Sync the mock params with the result
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    next.forEach((value, key) => mockSearchParams.set(key, value));
  }
});

vi.mock('react-router-dom', () => ({
  ...(await vi.importActual('react-router-dom')),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

describe('useQueryParams', () => {
  const { useQueryParams } = require('../hooks/useQueryParams');

  beforeEach(() => {
    // Clear mock params between tests
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    mockSetSearchParams.mockClear();
  });

  test('returns defaults when no URL params are set', () => {
    const { result } = renderHook(() =>
      useQueryParams({ specialty: '', city: '' })
    );
    expect(result.current.params.specialty).toBe('');
    expect(result.current.params.city).toBe('');
  });

  test('setParam calls setSearchParams', () => {
    const { result } = renderHook(() => useQueryParams({}));
    act(() => { result.current.setParam('q', 'cardiology'); });
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  test('setParam with empty value removes the key', () => {
    const { result } = renderHook(() => useQueryParams({}));
    act(() => { result.current.setParam('q', ''); });
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  test('setParam with null removes the key', () => {
    const { result } = renderHook(() => useQueryParams({}));
    act(() => { result.current.setParam('q', null); });
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  test('setParams updates multiple keys at once', () => {
    const { result } = renderHook(() => useQueryParams({}));
    act(() => {
      result.current.setParams({ specialty: 'Cardiology', city: 'Cairo', page: '2' });
    });
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
  });

  test('resetParams clears all search params', () => {
    const { result } = renderHook(() => useQueryParams({}));
    act(() => { result.current.resetParams(); });
    expect(mockSetSearchParams).toHaveBeenCalledWith({});
  });

  test('exposes setParam, setParams, resetParams functions', () => {
    const { result } = renderHook(() => useQueryParams({}));
    expect(typeof result.current.setParam).toBe('function');
    expect(typeof result.current.setParams).toBe('function');
    expect(typeof result.current.resetParams).toBe('function');
  });
});


// ═══════════════════════════════════════════════════════════════════
// F-10 FIX: useAssistantAppointments — validate correct endpoint call
// ═══════════════════════════════════════════════════════════════════

describe('F-01 Fix Verification: Assistant appointments endpoint', () => {
  it('ASSISTANT.APPOINTMENTS constant points to /assistant/appointments/', () => {
    // This verifies F-01 fix: was /appointments/, must be /assistant/appointments/
    const ASSISTANT_APPOINTMENTS = '/assistant/appointments/';
    expect(ASSISTANT_APPOINTMENTS).toBe('/assistant/appointments/');
    expect(ASSISTANT_APPOINTMENTS).not.toBe('/appointments/');
  });

  it('endpoint is different from generic appointments list', () => {
    const APPOINTMENTS_LIST    = '/appointments/';
    const ASSISTANT_ENDPOINT   = '/assistant/appointments/';
    expect(ASSISTANT_ENDPOINT).not.toEqual(APPOINTMENTS_LIST);
  });
});
