import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import tokens from '../../../theme/tokens';

/**
 * DiagnosticBanner.jsx
 * Professional error/warning banner for the Dashboard.
 * Displays critical diagnostic info when multiple subsystems fail.
 *
 * FIX: Auth errors (401/token errors) on first page load are transient —
 * the auth gate resolves them within seconds via token refresh.
 * We delay showing the banner by 3s so normal reload token refresh
 * doesn't flash a false alarm to the user.
 */
export default function DiagnosticBanner({ statsError, apptError, schedError }) {
  const qc = useQueryClient();
  const [showBanner, setShowBanner] = useState(false);

  const hasError = statsError || apptError || schedError;

  // Helper: is this error a transient auth error (token expired / not yet refreshed)?
  const isAuthError = (err) => {
    if (!err) return false;
    const status = err?.statusCode || err?.response?.status;
    const msg    = (err?.errorDetail || err?.message || '').toLowerCase();
    return status === 401 || msg.includes('token') || msg.includes('not valid');
  };

  const allAuthErrors = [statsError, apptError, schedError]
    .filter(Boolean)
    .every(isAuthError);

  useEffect(() => {
    if (!hasError) {
      setShowBanner(false);
      return;
    }
    // If all errors look like transient auth errors, wait 3s before showing
    // to give the token refresh cycle time to complete.
    const delay = allAuthErrors ? 3000 : 500;
    const t = setTimeout(() => setShowBanner(true), delay);
    return () => clearTimeout(t);
  }, [hasError, allAuthErrors]);

  if (!hasError || !showBanner) return null;

  const errors = [
    { label: 'Appointment System', error: apptError },
    { label: 'Stats System', error: statsError },
    { label: 'Schedule System', error: schedError },
  ].filter(x => x.error);

  // B-2 FIX: Allow the user to manually retry all failed queries instead of
  // waiting for the automatic refetch interval or doing a hard page reload.
  const handleRetry = () => {
    setShowBanner(false);
    qc.invalidateQueries({ queryKey: ['doctor', 'stats'] });
    qc.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
    qc.invalidateQueries({ queryKey: ['doctor', 'today-schedule'] });
  };

  return (
    <div style={{
      background: tokens?.colors?.danger?.bg,
      border: `1px solid ${tokens?.colors?.danger?.DEFAULT}`,
      borderRadius: tokens?.radius?.md,
      padding: '16px 20px',
      marginBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: tokens?.colors?.danger?.text, fontSize: 16, fontWeight: 800 }}>
            System Connectivity Notice
          </h4>
          <p style={{ margin: '2px 0 0', color: tokens?.colors?.danger?.text, fontSize: 13, opacity: 0.8 }}>
            Some dashboard modules are currently unavailable. We're attempting to reconnect.
          </p>
        </div>
        <button
          onClick={handleRetry}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            background: 'rgba(153, 27, 27, 0.15)',
            border: '1px solid rgba(153, 27, 27, 0.3)',
            color: tokens?.colors?.danger?.text,
            fontWeight: 600,
            fontSize: 13,
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          ↻ أعد المحاولة
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {errors.map((e, i) => (
          <div key={i} style={{ 
            background: 'rgba(153, 27, 27, 0.1)', 
            padding: '4px 10px', 
            borderRadius: 8, 
            fontSize: 12, 
            color: tokens?.colors?.danger?.text,
            fontWeight: 600,
            border: '1px solid rgba(153, 27, 27, 0.2)'
          }}>
            {e.label}: {e.error?.errorDetail || e.error?.message || 'Offline'}
          </div>
        ))}
      </div>
    </div>
  );
}

