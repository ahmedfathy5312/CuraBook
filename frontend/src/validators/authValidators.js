/**
 * validators/authValidators.js
 * Form validation rules for auth forms (Login, Register, etc.)
 * Compatible with React Hook Form's "register" API.
 * No external dependency — pure JS validation rules.
 */

export const loginRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address',
    },
  },
  password: {
    required: 'Password is required',
    minLength: { value: 6, message: 'Password must be at least 6 characters' },
  },
};

export const registerRules = {
  full_name: {
    required: 'Full name is required',
    minLength: { value: 2, message: 'Name must be at least 2 characters' },
    maxLength: { value: 100, message: 'Name is too long' },
  },
  email: loginRules.email,
  phone: {
    required: 'Phone number is required',
    pattern: {
      value: /^(\+20|0)?1[0-2,5]{1}[0-9]{8}$/,
      message: 'Enter a valid Egyptian phone number',
    },
  },
  password: {
    required: 'Password is required',
    minLength: { value: 8, message: 'Password must be at least 8 characters' },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      message: 'Must include uppercase, lowercase, and a number',
    },
  },
  confirmPassword: (watchPassword) => ({
    required: 'Please confirm your password',
    validate: (val) => val === watchPassword || 'Passwords do not match',
  }),
};

export const forgotPasswordRules = {
  email: loginRules.email,
};

export const resetPasswordRules = {
  new_password: registerRules.password,
  confirm_password: (watchPassword) => registerRules.confirmPassword(watchPassword),
};

export const changePasswordRules = {
  old_password: {
    required: 'Current password is required',
  },
  new_password: registerRules.password,
  confirm_password: (watchPassword) => registerRules.confirmPassword(watchPassword),
};
