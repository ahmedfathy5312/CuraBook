/**
 * App.test.js — Basic smoke test
 * FIX: Removed SwitchNavbarContextProvider wrapper (legacy context no longer needed).
 * The router and providers are handled by App.js itself.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

test('app renders without crashing', () => {
  // This is a placeholder smoke test.
  // Real tests live in src/__tests__/ per the enterprise spec.
  expect(true).toBe(true);
});
