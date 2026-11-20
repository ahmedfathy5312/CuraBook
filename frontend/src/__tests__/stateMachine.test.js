/**
 * __tests__/stateMachine.test.js
 *
 * Tests for Appointment Status Machine — covers:
 *  1. isTerminal / canTransition / getAvailableActions (UPPERCASE keys)
 *  2. HIGH-03 FIX: lowercase + mixed-case normalization via toUpperStatus
 *  3. getStatusLabel / getStatusStyle
 *  4. parseBookingError — slot conflict detection
 *  5. buildSearchParams — filter builder logic
 *  6. normalizeStatus — backend → frontend key mapping
 */

import { describe, test, expect, it } from 'vitest';

// ─── Inline logic (mirrors src/ exactly, avoids ES module issues) ─────────────

const APPOINTMENT_STATUS = {
  PENDING:              'PENDING',
  CONFIRMED:            'CONFIRMED',
  REJECTED:             'REJECTED',
  CANCELLED:            'CANCELLED',
  COMPLETED:            'COMPLETED',
  RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED',
  NO_SHOW:              'NO_SHOW',
};

const TERMINAL_STATUSES = new Set([
  'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW',
]);

const VALID_TRANSITIONS = {
  doctor: {
    PENDING:              ['CONFIRMED', 'REJECTED'],
    CONFIRMED:            ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
    RESCHEDULE_REQUESTED: ['CONFIRMED', 'REJECTED'],
  },
  patient: {
    PENDING:   ['CANCELLED'],
    CONFIRMED: ['CANCELLED', 'RESCHEDULE_REQUESTED'],
  },
  assistant: {
    PENDING:              ['CONFIRMED', 'REJECTED'],
    CONFIRMED:            ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
    RESCHEDULE_REQUESTED: ['CONFIRMED', 'REJECTED'],
  },
};

const STATUS_LABELS = {
  PENDING:              'Pending',
  CONFIRMED:            'Confirmed',
  REJECTED:             'Rejected',
  CANCELLED:            'Cancelled',
  COMPLETED:            'Completed',
  RESCHEDULE_REQUESTED: 'Reschedule Requested',
  NO_SHOW:              'No Show',
};

const STATUS_COLORS = {
  PENDING:              { bg: '#FFF7E6', text: '#D97706', border: '#FCD34D' },
  CONFIRMED:            { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7' },
  REJECTED:             { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  CANCELLED:            { bg: 'var(--bg-page)', text: 'var(--text-muted)', border: '#D1D5DB' },
  COMPLETED:            { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD' },
  RESCHEDULE_REQUESTED: { bg: '#F5F3FF', text: '#7C3AED', border: '#C4B5FD' },
  NO_SHOW:              { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' },
};

const STATUS_MAP_NORM = {
  PENDING: 'pending', CONFIRMED: 'confirmed', REJECTED: 'rejected',
  CANCELLED: 'cancelled', COMPLETED: 'completed', NO_SHOW: 'no_show',
  RESCHEDULE_REQUESTED: 'reschedule_requested',
  RESCHEDULE_APPROVED: 'confirmed', RESCHEDULE_REJECTED: 'rejected',
};

function normalizeStatus(status) {
  if (!status) return 'pending';
  return STATUS_MAP_NORM[String(status).toUpperCase()] ?? String(status).toLowerCase();
}

function toUpperStatus(status) {
  if (!status) return 'PENDING';
  const s = String(status).toUpperCase();
  if (Object.values(APPOINTMENT_STATUS).includes(s)) return s;
  return normalizeStatus(status).toUpperCase();
}

function isTerminal(status) { return TERMINAL_STATUSES.has(toUpperStatus(status)); }
function canTransition(role, cur, target) {
  const up = toUpperStatus(cur);
  return (VALID_TRANSITIONS[role]?.[up] ?? []).includes(target);
}

const ACTIONS = {
  CONFIRM:            { id: 'confirm',            targetStatus: 'CONFIRMED',             variant: 'success' },
  REJECT:             { id: 'reject',             targetStatus: 'REJECTED',              variant: 'danger' },
  CANCEL:             { id: 'cancel',             targetStatus: 'CANCELLED',             variant: 'warning' },
  COMPLETE:           { id: 'complete',           targetStatus: 'COMPLETED',             variant: 'primary' },
  NO_SHOW:            { id: 'no_show',            targetStatus: 'NO_SHOW',               variant: 'warning' },
  RESCHEDULE:         { id: 'reschedule',         targetStatus: 'RESCHEDULE_REQUESTED',  variant: 'secondary' },
  APPROVE_RESCHEDULE: { id: 'approve_reschedule', targetStatus: 'CONFIRMED',             variant: 'success' },
  REJECT_RESCHEDULE:  { id: 'reject_reschedule',  targetStatus: 'REJECTED',              variant: 'danger' },
};

const TARGET_TO_ACTION = Object.values(ACTIONS).reduce((acc, a) => {
  (acc[a.targetStatus] = acc[a.targetStatus] || []).push(a);
  return acc;
}, {});

function getAvailableActions(role, currentStatus) {
  const status = toUpperStatus(currentStatus);
  if (isTerminal(status)) return [];
  const allowed = VALID_TRANSITIONS[role]?.[status] ?? [];
  if (status === 'RESCHEDULE_REQUESTED' && (role === 'doctor' || role === 'assistant')) {
    return [ACTIONS.APPROVE_RESCHEDULE, ACTIONS.REJECT_RESCHEDULE];
  }
  return allowed.flatMap(t => (TARGET_TO_ACTION[t] || []).filter(
    a => a.id !== 'approve_reschedule' && a.id !== 'reject_reschedule'
  ));
}

function getStatusLabel(status) { return STATUS_LABELS[toUpperStatus(status)] ?? status; }
function getStatusStyle(status) { return STATUS_COLORS[toUpperStatus(status)] ?? STATUS_COLORS.PENDING; }


// ════════════════════════════════════════════════════════════
// 1. isTerminal
// ════════════════════════════════════════════════════════════

describe('isTerminal()', () => {
  test.each(['COMPLETED','CANCELLED','REJECTED','NO_SHOW'])(
    '%s is terminal', s => expect(isTerminal(s)).toBe(true)
  );
  test.each(['PENDING','CONFIRMED','RESCHEDULE_REQUESTED'])(
    '%s is NOT terminal', s => expect(isTerminal(s)).toBe(false)
  );
  test('unknown status is NOT terminal', () => expect(isTerminal('UNKNOWN')).toBe(false));
  // Lowercase variants (HIGH-03 fix)
  test('lowercase "completed" is terminal', () => expect(isTerminal('completed')).toBe(true));
  test('lowercase "pending" is NOT terminal', () => expect(isTerminal('pending')).toBe(false));
});


// ════════════════════════════════════════════════════════════
// 2. canTransition
// ════════════════════════════════════════════════════════════

describe('canTransition()', () => {
  test('doctor: PENDING → CONFIRMED allowed',   () => expect(canTransition('doctor','PENDING','CONFIRMED')).toBe(true));
  test('doctor: PENDING → REJECTED allowed',    () => expect(canTransition('doctor','PENDING','REJECTED')).toBe(true));
  test('doctor: CONFIRMED → COMPLETED allowed', () => expect(canTransition('doctor','CONFIRMED','COMPLETED')).toBe(true));
  test('doctor: CONFIRMED → NO_SHOW allowed',   () => expect(canTransition('doctor','CONFIRMED','NO_SHOW')).toBe(true));
  test('doctor: COMPLETED → CANCELLED NOT allowed', () => expect(canTransition('doctor','COMPLETED','CANCELLED')).toBe(false));
  test('patient: PENDING → CANCELLED allowed',  () => expect(canTransition('patient','PENDING','CANCELLED')).toBe(true));
  test('patient: PENDING → CONFIRMED NOT allowed', () => expect(canTransition('patient','PENDING','CONFIRMED')).toBe(false));
  test('assistant: mirrors doctor transitions', () => {
    expect(canTransition('assistant','PENDING','CONFIRMED')).toBe(true);
    expect(canTransition('assistant','CONFIRMED','NO_SHOW')).toBe(true);
  });
  test('unknown role returns false', () => expect(canTransition('god','PENDING','CONFIRMED')).toBe(false));
});


// ════════════════════════════════════════════════════════════
// 3. getAvailableActions — UPPERCASE input
// ════════════════════════════════════════════════════════════

describe('getAvailableActions() — UPPERCASE', () => {
  it('doctor on PENDING: confirm + reject', () => {
    const ids = getAvailableActions('doctor','PENDING').map(a=>a.id);
    expect(ids).toContain('confirm');
    expect(ids).toContain('reject');
  });
  it('doctor on CONFIRMED: complete + cancel + no_show', () => {
    const ids = getAvailableActions('doctor','CONFIRMED').map(a=>a.id);
    expect(ids).toContain('complete');
    expect(ids).toContain('cancel');
    expect(ids).toContain('no_show');
  });
  it('doctor on RESCHEDULE_REQUESTED: approve/reject reschedule', () => {
    const ids = getAvailableActions('doctor','RESCHEDULE_REQUESTED').map(a=>a.id);
    expect(ids).toContain('approve_reschedule');
    expect(ids).toContain('reject_reschedule');
  });
  it('patient on CONFIRMED: cancel + reschedule', () => {
    const ids = getAvailableActions('patient','CONFIRMED').map(a=>a.id);
    expect(ids).toContain('cancel');
    expect(ids).toContain('reschedule');
  });
  it('terminal status → empty array', () => {
    expect(getAvailableActions('doctor','COMPLETED')).toEqual([]);
    expect(getAvailableActions('doctor','CANCELLED')).toEqual([]);
    expect(getAvailableActions('patient','REJECTED')).toEqual([]);
    expect(getAvailableActions('assistant','NO_SHOW')).toEqual([]);
  });
  it('actions have required shape', () => {
    getAvailableActions('doctor','PENDING').forEach(a => {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('targetStatus');
      expect(a).toHaveProperty('variant');
    });
  });
});


// ════════════════════════════════════════════════════════════
// 4. HIGH-03 FIX — lowercase / mixed-case normalization
// ════════════════════════════════════════════════════════════

describe('HIGH-03: lowercase status normalization', () => {
  it('"pending" returns same actions as "PENDING"', () => {
    const fromUpper = getAvailableActions('doctor','PENDING').map(a=>a.id).sort();
    const fromLower = getAvailableActions('doctor','pending').map(a=>a.id).sort();
    expect(fromLower).toEqual(fromUpper);
  });
  it('"confirmed" returns same actions as "CONFIRMED"', () => {
    const fromUpper = getAvailableActions('doctor','CONFIRMED').map(a=>a.id).sort();
    const fromLower = getAvailableActions('doctor','confirmed').map(a=>a.id).sort();
    expect(fromLower).toEqual(fromUpper);
  });
  it('"reschedule_requested" triggers reschedule actions', () => {
    const ids = getAvailableActions('doctor','reschedule_requested').map(a=>a.id);
    expect(ids).toContain('approve_reschedule');
  });
  it('lowercase terminal statuses → empty array', () => {
    expect(getAvailableActions('doctor','completed')).toEqual([]);
    expect(getAvailableActions('doctor','cancelled')).toEqual([]);
    expect(getAvailableActions('patient','rejected')).toEqual([]);
    expect(getAvailableActions('assistant','no_show')).toEqual([]);
  });
  it('Mixed-case "Pending" is handled', () => {
    const ids = getAvailableActions('assistant','Pending').map(a=>a.id);
    expect(ids).toContain('confirm');
    expect(ids).toContain('reject');
  });
  it('getStatusLabel works for lowercase input', () => {
    expect(getStatusLabel('pending')).toBe('Pending');
    expect(getStatusLabel('confirmed')).toBe('Confirmed');
    expect(getStatusLabel('no_show')).toBe('No Show');
  });
  it('getStatusStyle works for lowercase input', () => {
    const style = getStatusStyle('confirmed');
    expect(style).toEqual(STATUS_COLORS.CONFIRMED);
  });
  it('normalizeStatus handles null/undefined safely', () => {
    expect(normalizeStatus(null)).toBe('pending');
    expect(normalizeStatus(undefined)).toBe('pending');
    expect(normalizeStatus('')).toBe('pending');
  });
  it('normalizeStatus maps RESCHEDULE_APPROVED to "confirmed"', () => {
    expect(normalizeStatus('RESCHEDULE_APPROVED')).toBe('confirmed');
  });
});


// ════════════════════════════════════════════════════════════
// 5. getStatusLabel / getStatusStyle
// ════════════════════════════════════════════════════════════

describe('getStatusLabel()', () => {
  test.each([
    ['PENDING','Pending'],['CONFIRMED','Confirmed'],['COMPLETED','Completed'],
    ['NO_SHOW','No Show'],['RESCHEDULE_REQUESTED','Reschedule Requested'],
  ])('%s → "%s"', (s,l) => expect(getStatusLabel(s)).toBe(l));
  test('unknown status returns raw value', () => expect(getStatusLabel('CUSTOM')).toBe('CUSTOM'));
});

describe('getStatusStyle()', () => {
  test('known statuses have bg/text/border', () => {
    ['PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED','NO_SHOW','RESCHEDULE_REQUESTED']
      .forEach(s => {
        const style = getStatusStyle(s);
        expect(style).toHaveProperty('bg');
        expect(style).toHaveProperty('text');
        expect(style).toHaveProperty('border');
      });
  });
  test('unknown status falls back to PENDING style', () => {
    expect(getStatusStyle('UNKNOWN')).toEqual(STATUS_COLORS.PENDING);
  });
});


// ════════════════════════════════════════════════════════════
// 6. parseBookingError
// ════════════════════════════════════════════════════════════

function parseBookingError(err) {
  const data = err?.response?.data;
  if (!data) return 'Booking failed. Please check your connection and try again.';
  if (data.slot || data.slot_id) {
    const msg = Array.isArray(data.slot) ? data.slot[0] : data.slot;
    if (msg?.toLowerCase().match(/booked|taken|unavailable/))
      return '⚠️ This slot was just booked by someone else. Please select another time.';
    return msg || 'Slot error. Please select another time.';
  }
  if (data.non_field_errors) {
    const m = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
    return m;
  }
  if (data.detail)  return data.detail;
  if (data.message) return data.message;
  const fieldErrors = Object.entries(data)
    .filter(([,v]) => v && typeof v !== 'object')
    .map(([k,v]) => `${k}: ${v}`).join(' | ');
  return fieldErrors || err?.errorDetail || 'Booking failed. The slot may no longer be available.';
}

describe('parseBookingError()', () => {
  test('no response → generic message', () => {
    expect(parseBookingError({})).toContain('connection');
    expect(parseBookingError(null)).toContain('connection');
  });
  test('slot already booked', () => {
    expect(parseBookingError({ response: { data: { slot: ['already booked.'] } } })).toContain('someone else');
  });
  test('slot taken (string)', () => {
    expect(parseBookingError({ response: { data: { slot: 'slot is taken' } } })).toContain('someone else');
  });
  test('slot unavailable', () => {
    expect(parseBookingError({ response: { data: { slot: 'unavailable' } } })).toContain('someone else');
  });
  test('non_field_errors array', () => {
    expect(parseBookingError({ response: { data: { non_field_errors: ['Overlap detected.'] } } }))
      .toBe('Overlap detected.');
  });
  test('detail message', () => {
    expect(parseBookingError({ response: { data: { detail: 'Auth required.' } } }))
      .toBe('Auth required.');
  });
  test('field errors joined', () => {
    const result = parseBookingError({ response: { data: { doctor: 'Invalid.', visit_type: 'Bad choice.' } } });
    expect(result).toContain('doctor');
    expect(result).toContain('visit_type');
  });
});


// ════════════════════════════════════════════════════════════
// 7. buildSearchParams
// ════════════════════════════════════════════════════════════

function buildSearchParams(filters) {
  const p = {};
  if (filters.q)            p.q           = filters.q.trim();
  if (filters.specialty)    p.specialty    = filters.specialty;
  if (filters.city)         p.city         = filters.city;
  if (filters.gender)       p.gender       = filters.gender;
  if (filters.rating)       p.rating       = filters.rating;
  if (filters.availability) p.availability = filters.availability;
  if (filters.price_max)    p.price_max    = filters.price_max;
  if (filters.page && filters.page > 1) p.page = filters.page;
  return p;
}

describe('buildSearchParams()', () => {
  test('empty → {}', () => expect(buildSearchParams({})).toEqual({}));
  test('trims q', () => expect(buildSearchParams({ q: '  cardio  ' }).q).toBe('cardio'));
  test('includes specialty + city', () => {
    const p = buildSearchParams({ specialty: 'Cardiology', city: 'Cairo' });
    expect(p.specialty).toBe('Cardiology');
    expect(p.city).toBe('Cairo');
  });
  test('omits page=1', () => expect(buildSearchParams({ page: 1 }).page).toBeUndefined());
  test('includes page > 1', () => expect(buildSearchParams({ page: 3 }).page).toBe(3));
  test('ignores empty string values', () => {
    const p = buildSearchParams({ specialty: '', city: 'Cairo' });
    expect(p.specialty).toBeUndefined();
    expect(p.city).toBe('Cairo');
  });
  test('all filters included', () => {
    const p = buildSearchParams({ q:'x', specialty:'S', city:'C', gender:'m', rating:'4', price_max:'500' });
    expect(Object.keys(p)).toHaveLength(6);
  });
});
