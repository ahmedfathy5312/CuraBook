/**
 * features/auth/pages/index.js
 *
 * AUDIT FIX (Issue #3): Auth pages canonical re-exports.
 *
 * The actual page components live in features/public/pages/ because they are
 * accessible without authentication. They are re-exported here so that
 * feature-based imports work from either location.
 */
export { default as LoginPage }           from '../../public/pages/Login';
export { default as UserSignupPage }      from '../../public/pages/UserSignup';
export { default as DoctorSignupPage }    from '../../public/pages/DoctorSignup';
export { default as HospitalSignupPage }  from '../../public/pages/HospitalSignup';
export { default as ForgotPasswordPage }  from '../../public/pages/ForgotPassword';
export { default as ResetPasswordPage }   from '../../public/pages/ResetPassword';
export { default as EmailVerificationPage } from '../../public/pages/EmailVerification';
