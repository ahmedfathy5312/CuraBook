/**
 * types/index.js — Centralized JSDoc type definitions for CuraBook
 * Use these in JSDoc @param/@returns annotations throughout the codebase.
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} full_name
 * @property {string} email
 * @property {string} phone
 * @property {string} role - 'patient'|'doctor'|'hospital'|'admin'|'assistant'
 * @property {string} [avatar]
 */

/**
 * @typedef {Object} Appointment
 * @property {number}  id
 * @property {string}  patient_name
 * @property {string}  doctor
 * @property {string}  clinic
 * @property {string}  date         - ISO date 'YYYY-MM-DD'
 * @property {string}  time         - 'HH:MM'
 * @property {string}  status       - 'pending'|'confirmed'|'cancelled'|'completed'|'rejected'
 * @property {string}  [notes]
 * @property {string}  [phone]
 */

/**
 * @typedef {Object} Doctor
 * @property {number} id
 * @property {string} full_name
 * @property {string} specialty
 * @property {string} city
 * @property {number} rating
 * @property {number} experience_years
 * @property {number} consultation_fee
 * @property {string} [avatar]
 * @property {boolean} available_today
 */

/**
 * @typedef {Object} Hospital
 * @property {number} id
 * @property {string} name
 * @property {string} city
 * @property {string} [address]
 * @property {number} doctors_count
 * @property {boolean} is_active
 */

/**
 * @typedef {Object} Slot
 * @property {number} id
 * @property {string} date
 * @property {string} time
 * @property {boolean} is_available
 * @property {boolean} is_blocked
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {number} count
 * @property {string|null} next
 * @property {string|null} previous
 * @property {Array}  results
 */

/**
 * @typedef {Object} ApiError
 * @property {number} statusCode
 * @property {string} errorDetail
 * @property {Object} [response]
 */

export default {};
