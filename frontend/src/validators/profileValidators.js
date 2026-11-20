/**
 * validators/profileValidators.js
 * Validation rules for profile edit forms.
 */

export const profileRules = {
  full_name: {
    required: 'Full name is required',
    minLength: { value: 2, message: 'Name is too short' },
    maxLength: { value: 100, message: 'Name is too long' },
  },
  phone: {
    pattern: {
      value: /^(\+20|0)?1[0-2,5]{1}[0-9]{8}$/,
      message: 'Enter a valid Egyptian phone number',
    },
  },
  bio: {
    maxLength: { value: 1000, message: 'Bio cannot exceed 1000 characters' },
  },
  city: {
    required: 'City is required',
  },
};

export const doctorProfileRules = {
  ...profileRules,
  specialty: {
    required: 'Specialty is required',
  },
  consultation_fee: {
    required: 'Consultation fee is required',
    min: { value: 0, message: 'Fee must be positive' },
    max: { value: 100000, message: 'Fee seems too high' },
  },
  experience_years: {
    required: 'Years of experience is required',
    min: { value: 0, message: 'Cannot be negative' },
    max: { value: 70, message: 'Value seems unrealistic' },
  },
};
