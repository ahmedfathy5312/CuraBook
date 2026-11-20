/**
 * validators/appointmentValidators.js
 * Validation rules for appointment booking form.
 *
 * FIX MED-02: visit_type field now validates "IN_PERSON" | "ONLINE" (what the
 *             API expects) instead of the old "clinic or hospital" phrasing
 *             which confused location-type with visit-type.
 */

export const VISIT_TYPES = {
  IN_PERSON: 'IN_PERSON',
  ONLINE:    'ONLINE',
};

export const bookingRules = {
  doctor: {
    required: 'Please select a doctor',
  },
  date: {
    required: 'Please select a date',
    validate: (val) => {
      const selected = new Date(val);
      const today    = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today || 'Date cannot be in the past';
    },
  },
  slot_id: {
    required: 'Please select a time slot',
  },
  // FIX MED-02: was "clinic or hospital" — backend expects visit_type: IN_PERSON | ONLINE
  visit_type: {
    required: 'Please select a visit type (In Person or Online)',
    validate: (val) =>
      Object.values(VISIT_TYPES).includes(val) ||
      'Visit type must be "IN_PERSON" or "ONLINE"',
  },
  notes: {
    maxLength: { value: 500, message: 'Notes cannot exceed 500 characters' },
  },
};

export const rescheduleRules = {
  date:    bookingRules.date,
  slot_id: bookingRules.slot_id,
};

