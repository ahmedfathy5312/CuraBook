/**
 * AuthGuard — Redirects unauthenticated users to /login
 * Shows spinner while auth state is being verified.
 */
import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { tokens } from '../../theme/tokens';

function AuthSpinner() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: tokens.colors.background, fontFamily: tokens.typography.fontFamily,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `4px solid ${tokens.colors.primary.light}`,
          borderTop: `4px solid ${tokens?.colors?.primary?.DEFAULT || '#0E7490'}`,
          margin: '0 auto 16px',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: tokens.colors.gray[500], fontSize: '14px', fontWeight: 500 }}>
          Verifying session...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export function AuthGuard({ children }) {
  const { isAuthenticated, authLoading, authInitialized } = useContext(AuthContext);
  const location = useLocation();

  // Show spinner while auth is loading OR while session restore is in flight
  if (authLoading || !authInitialized) return <AuthSpinner />;

  if (!isAuthenticated) {
    // Save intended destination for redirect after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default AuthGuard;
