/**
 * CuraBook — App Entry Point
 * ===========================
 * FIX ISSUE #2: App.js was a 209-line monolith with all routes inline.
 * It is now a lean provider wrapper (~30 lines). Routes live in src/app/router.jsx.
 * 
 * FIX ISSUE #15: Removed top-level await which caused ErrorBoundary to trigger.
 * React Query Devtools are disabled so the debug panel never appears in-app.
 */

import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import queryClient    from './app/queryClient';
import ErrorBoundary  from './app/ErrorBoundary';
import AppRouter      from './app/router';

import AuthProvider   from './context/AuthContext';
import { ToastProvider } from './app/providers/ToastProvider';
import AllProvider    from './AllProvider';
import { DarkModeProvider } from './context/DarkModeContext';

import './App.css';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <DarkModeProvider>
            <ToastProvider>
              <AllProvider>
                <AppRouter />
              </AllProvider>
            </ToastProvider>
            </DarkModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
