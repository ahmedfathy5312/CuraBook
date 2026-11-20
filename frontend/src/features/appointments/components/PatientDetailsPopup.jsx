/**
 * PatientDetailsPopup — Appointment patient details modal
 * FIX ISSUE #6: Moved from global src/context/PopapProvider.jsx
 *               to its owning feature: src/features/appointments/components/
 *
 * Usage:
 *   import PatientDetailsPopup, { usePopupContext }
 *     from 'features/appointments/components/PatientDetailsPopup';
 *
 *   // Wrap the section that needs it:
 *   <PatientDetailsPopup>...</PatientDetailsPopup>
 *
 *   // Inside any child, trigger it:
 *   const { setPopState, setPatientDetails } = usePopupContext();
 */
import { useState, useContext, createContext } from 'react';

export const PopupContext = createContext(null);
export const usePopupContext = () => useContext(PopupContext);

const FIELD = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '6px', fontSize: '14px', color: 'var(--text-body)' }}>
    <span style={{ fontWeight: 600, minWidth: '110px', color: 'var(--text-muted)' }}>{label}:</span>
    <span style={{ fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

export default function PatientDetailsPopup({ children }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState({
    patientName: '', date: '', time: '', age: '', contact: '', phone: '', email: '',
  });

  return (
    <PopupContext.Provider value={{ setPopState: setOpen, setPatientDetails: setDetails }}>
      {/* ── Overlay ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px 32px',
              minWidth: '340px', maxWidth: '440px', width: '100%',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              🧑‍⚕️ Patient Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FIELD label="Name"   value={details.patientName} />
              <FIELD label="Date"   value={details.date} />
              <FIELD label="Time"   value={details.time} />
              <FIELD label="Age"    value={details.age} />
              <FIELD label="Contact" value={details.contact || details.contacr} />
              <FIELD label="Phone"  value={details.phone} />
              <FIELD label="Email"  value={details.email || details.Email} />
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '8px 24px', borderRadius: 'var(--radius-full)',
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </PopupContext.Provider>
  );
}
