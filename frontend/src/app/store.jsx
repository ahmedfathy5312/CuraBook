/**
 * store/uiStore.js — Global UI State (React Context + useReducer)
 *
 * Manages UI state that doesn't belong in React Query (server state)
 * or AuthContext (auth state).
 *
 * State managed here:
 *  - sidebar collapsed/open per role
 *  - active modal
 *  - global search query
 */
import { createContext, useContext, useReducer, useCallback } from 'react';

const initialState = {
  sidebarOpen:   true,
  activeModal:   null,    // string: modal name
  globalSearch:  '',
};

function uiReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'OPEN_MODAL':
      return { ...state, activeModal: action.payload };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null };
    case 'SET_GLOBAL_SEARCH':
      return { ...state, globalSearch: action.payload };
    default:
      return state;
  }
}

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const toggleSidebar    = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);
  const setSidebar       = useCallback((v) => dispatch({ type: 'SET_SIDEBAR', payload: v }), []);
  const openModal        = useCallback((name) => dispatch({ type: 'OPEN_MODAL', payload: name }), []);
  const closeModal       = useCallback(() => dispatch({ type: 'CLOSE_MODAL' }), []);
  const setGlobalSearch  = useCallback((q) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: q }), []);

  return (
    <UIContext.Provider value={{
      ...state,
      toggleSidebar, setSidebar,
      openModal, closeModal,
      setGlobalSearch,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
};

export default UIProvider;
