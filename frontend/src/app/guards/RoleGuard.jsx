/**
 * RoleGuard — Checks authentication + role permission
 *
 * Usage:
 *   <RoleGuard allowedRoles={['patient', 'admin']}>
 *     <SensitivePage />
 *   </RoleGuard>
 */
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { tokens } from '../../theme/tokens';
import { ROLE_HOME } from '../../config/roles';

function RoleSpinner() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: tokens.colors.background,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${tokens.colors.primary.light}`,
        borderTop: `3px solid ${tokens?.colors?.primary?.DEFAULT || '#0E7490'}`,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * @param {string[]} allowedRoles  - Roles that can access this route
 * @param {React.ReactNode} children
 */
export function RoleGuard({ allowedRoles = [], children }) {
  const { isAuthenticated, role, authLoading, authInitialized } = useContext(AuthContext);

  // Show spinner while auth is loading OR while session restore is in flight
  if (authLoading || !authInitialized) return <RoleSpinner />;

  // Not authenticated at all → login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Role not in allowed list → unauthorized page
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    // If they're logged in as a different role, redirect them home
    const homeRoute = ROLE_HOME[role] || '/';
    return <Navigate to={homeRoute} replace />;
  }

  return children;
}

export default RoleGuard;
