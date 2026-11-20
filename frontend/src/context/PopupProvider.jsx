/**
 * context/PopupProvider.jsx
 * Renamed from PopapProvider.jsx (typo fix — Improvement 5.1A).
 *
 * The canonical popup implementation lives at:
 *   src/features/appointments/components/PatientDetailsPopup.jsx
 *
 * This file is a re-export shim for backward compatibility.
 */
export {
  default,
  PopupContext,
  usePopupContext,
} from '../features/appointments/components/PatientDetailsPopup';
