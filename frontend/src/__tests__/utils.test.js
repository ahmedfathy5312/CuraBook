/**
 * CuraBook — Frontend Utility Tests
 * Tests for formatters, validators, and helper functions
 */

// ─── Formatters ───────────────────────────────────────────────────────────────
describe('formatDate', () => {
  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  test('formats valid date string', () => {
    const result = formatDate('2025-06-15');
    expect(result).toMatch(/15.*Jun.*2025|Jun.*15.*2025/);
  });

  test('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  test('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});


// ─── Validators ───────────────────────────────────────────────────────────────
describe('Email validation', () => {
  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  test('accepts valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  test('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  test('rejects email without @', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });

  test('rejects email without domain', () => {
    expect(isValidEmail('test@')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});


// ─── Phone validation ────────────────────────────────────────────────────────
describe('Phone validation', () => {
  const isValidPhone = (phone) =>
    /^\+?\d{7,15}$/.test(phone);

  test('accepts Egyptian number with country code', () => {
    expect(isValidPhone('+201234567890')).toBe(true);
  });

  test('accepts local number', () => {
    expect(isValidPhone('01234567890')).toBe(true);
  });

  test('rejects too short number', () => {
    expect(isValidPhone('123')).toBe(false);
  });

  test('rejects number with letters', () => {
    expect(isValidPhone('0123abc890')).toBe(false);
  });
});


// ─── Appointment Status helpers ───────────────────────────────────────────────
describe('Appointment status logic', () => {
  const STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED',
    RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED',
  };

  const canBeConfirmed = (status) => status === STATUS.PENDING;
  const canBeRejected = (status) => status === STATUS.PENDING;
  const canBeCancelled = (status) => [STATUS.PENDING, STATUS.CONFIRMED].includes(status);
  const canBeCompleted = (status) => status === STATUS.CONFIRMED;
  const canRequestReschedule = (status) => [STATUS.PENDING, STATUS.CONFIRMED].includes(status);

  test('PENDING can be confirmed', () => expect(canBeConfirmed(STATUS.PENDING)).toBe(true));
  test('CONFIRMED cannot be confirmed again', () => expect(canBeConfirmed(STATUS.CONFIRMED)).toBe(false));
  test('PENDING can be rejected', () => expect(canBeRejected(STATUS.PENDING)).toBe(true));
  test('CONFIRMED can be cancelled', () => expect(canBeCancelled(STATUS.CONFIRMED)).toBe(true));
  test('COMPLETED cannot be cancelled', () => expect(canBeCancelled(STATUS.COMPLETED)).toBe(false));
  test('CONFIRMED can be completed', () => expect(canBeCompleted(STATUS.CONFIRMED)).toBe(true));
  test('PENDING can request reschedule', () => expect(canRequestReschedule(STATUS.PENDING)).toBe(true));
  test('COMPLETED cannot request reschedule', () => expect(canRequestReschedule(STATUS.COMPLETED)).toBe(false));
});


// ─── Pagination helpers ───────────────────────────────────────────────────────
describe('Pagination logic', () => {
  const getTotalPages = (count, pageSize) => Math.ceil(count / pageSize);
  const getPageRange = (current, total) => {
    const range = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      range.push(i);
    }
    return range;
  };

  test('calculates total pages correctly', () => {
    expect(getTotalPages(10, 5)).toBe(2);
    expect(getTotalPages(11, 5)).toBe(3);
    expect(getTotalPages(0, 5)).toBe(0);
  });

  test('generates correct page range', () => {
    expect(getPageRange(1, 10)).toEqual([1, 2, 3]);
    expect(getPageRange(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(getPageRange(10, 10)).toEqual([8, 9, 10]);
  });
});


// ─── API Error parsing ────────────────────────────────────────────────────────
describe('API error message extraction', () => {
  const getErrorMessage = (error) => {
    if (!error) return 'حدث خطأ غير متوقع';
    const data = error?.response?.data;
    if (!data) return error?.message || 'حدث خطأ في الاتصال بالخادم';
    if (data.message) return data.message;
    if (data.detail) return data.detail;
    if (typeof data === 'string') return data;
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
    return 'حدث خطأ غير متوقع';
  };

  test('extracts message from response.data.message', () => {
    const error = { response: { data: { message: 'الموعد محجوز بالفعل' } } };
    expect(getErrorMessage(error)).toBe('الموعد محجوز بالفعل');
  });

  test('extracts detail from DRF validation error', () => {
    const error = { response: { data: { detail: 'Authentication credentials were not provided.' } } };
    expect(getErrorMessage(error)).toBe('Authentication credentials were not provided.');
  });

  test('handles null error', () => {
    expect(getErrorMessage(null)).toBe('حدث خطأ غير متوقع');
  });

  test('handles network error with no response', () => {
    const error = { message: 'Network Error' };
    expect(getErrorMessage(error)).toBe('Network Error');
  });
});
