/**
 * hooks/useFormValidation.js — Lightweight form state + validation
 *
 * A minimal React Hook Form-compatible implementation.
 * Use this until React Hook Form is installed as a dependency.
 *
 * Usage:
 *   const { values, errors, handleChange, handleBlur, validate, reset } =
 *     useFormValidation(initialValues, rules);
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} initialValues — { fieldName: initialValue }
 * @param {Object} rules         — { fieldName: { required, minLength, pattern, validate, ... } }
 */
export function useFormValidation(initialValues = {}, rules = {}) {
  const [values,  setValues]  = useState(initialValues);
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value) => {
    const fieldRules = rules[name];
    if (!fieldRules) return '';

    if (fieldRules.required && !value) {
      return typeof fieldRules.required === 'string'
        ? fieldRules.required
        : `${name} is required`;
    }

    if (fieldRules.minLength && value?.length < fieldRules.minLength.value) {
      return fieldRules.minLength.message || `Minimum ${fieldRules.minLength.value} characters`;
    }

    if (fieldRules.maxLength && value?.length > fieldRules.maxLength.value) {
      return fieldRules.maxLength.message || `Maximum ${fieldRules.maxLength.value} characters`;
    }

    if (fieldRules.pattern && !fieldRules.pattern.value.test(value)) {
      return fieldRules.pattern.message || `Invalid format`;
    }

    if (fieldRules.min && Number(value) < fieldRules.min.value) {
      return fieldRules.min.message || `Minimum value is ${fieldRules.min.value}`;
    }

    if (fieldRules.max && Number(value) > fieldRules.max.value) {
      return fieldRules.max.message || `Maximum value is ${fieldRules.max.value}`;
    }

    if (fieldRules.validate) {
      const result = fieldRules.validate(value);
      if (result !== true) return result || 'Invalid value';
    }

    return '';
  }, [rules]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues(prev => ({ ...prev, [name]: newValue }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, newValue) }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  }, [validateField]);

  const validate = useCallback(() => {
    const newErrors = {};
    let isValid = true;
    Object.keys(rules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) { newErrors[name] = error; isValid = false; }
    });
    setErrors(newErrors);
    setTouched(Object.keys(rules).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return isValid;
  }, [rules, values, validateField]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldError = useCallback((name, message) => {
    setErrors(prev => ({ ...prev, [name]: message }));
  }, []);

  return {
    values, errors, touched,
    handleChange, handleBlur,
    validate, setValue, reset, setFieldError,
    isFieldValid: (name) => touched[name] && !errors[name],
    isFieldInvalid: (name) => touched[name] && !!errors[name],
  };
}

export default useFormValidation;
