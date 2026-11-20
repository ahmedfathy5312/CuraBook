import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Legacy ProtectedRoute shim — prefer RoleGuard for new code.
 * Updated to wait for authInitialized so session restore completes
 * before any redirect decisions are made.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, authInitialized } = useAuth();
  const location = useLocation();

  // Wait for silent session restore before redirecting
  if (!authInitialized) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const dashMap = {
      patient: "/dashboard",
      doctor: "/doctor-dashboard",
      hospital: "/hospital-dashboard",
      admin: "/admin-dashboard",
      assistant: "/assistant-dashboard",
    };
    return <Navigate to={dashMap[role] || "/"} replace />;
  }

  return children;
}
