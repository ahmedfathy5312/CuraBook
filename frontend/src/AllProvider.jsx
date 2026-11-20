/**
 * AllProvider.jsx — Root provider composition
 * FIX ISSUE #6: PopapProvider moved from global context/ to its owning feature.
 *               Import path updated: features/appointments/components/PatientDetailsPopup
 * Add new global providers here (in correct nesting order).
 */
import PatientDetailsPopup from './features/appointments/components/PatientDetailsPopup';
import { LoadingProvider }  from './app/providers/LoadingProvider';
import UIProvider           from './app/store';    // BUG-02 FIX: mount global UI state

function AllProvider({ children }) {
  return (
    <UIProvider>
      <LoadingProvider>
        <PatientDetailsPopup>
          {children}
        </PatientDetailsPopup>
      </LoadingProvider>
    </UIProvider>
  );
}

export default AllProvider;
