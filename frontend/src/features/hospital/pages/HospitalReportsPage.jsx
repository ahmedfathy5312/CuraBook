/**
 * HospitalReportsPage.jsx
 * Bug Fix: Reports page removed from Navbar — redirect to Analytics tab in Dashboard.
 * Route: /hospital-reports → redirects to /hospital-dashboard
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HospitalReportsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Reports content has been merged into Analytics — redirect to dashboard
    navigate('/hospital-dashboard', { replace: true });
  }, [navigate]);
  return null;
}
