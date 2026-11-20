// tests/integration/reportWebVitals.test.js
// Integration tests for the reportWebVitals module and App bootstrap

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── reportWebVitals ─────────────────────────────────────────────────────────
describe('reportWebVitals', () => {
  it('module is importable', async () => {
    const mod = await import('../../frontend/src/reportWebVitals.js');
    expect(mod).toBeDefined();
  });

  it('default export is a function', async () => {
    const mod = await import('../../frontend/src/reportWebVitals.js');
    const fn = mod.default || mod.reportWebVitals;
    expect(typeof fn).toBe('function');
  });

  it('calling with no callback does not throw', async () => {
    const mod = await import('../../frontend/src/reportWebVitals.js');
    const fn = mod.default || mod.reportWebVitals;
    expect(() => fn()).not.toThrow();
  });

  it('calling with a callback function does not throw', async () => {
    const mod = await import('../../frontend/src/reportWebVitals.js');
    const fn = mod.default || mod.reportWebVitals;
    const cb = vi.fn();
    expect(() => fn(cb)).not.toThrow();
  });
});

// ── App.jsx bootstrap ───────────────────────────────────────────────────────
describe('App.jsx structure', () => {
  it('App module is importable', async () => {
    // We mock heavy dependencies before import
    vi.mock('react-router-dom', () => ({
      BrowserRouter:  ({ children }) => children,
      Routes:         ({ children }) => children,
      Route:          () => null,
      useNavigate:    () => vi.fn(),
      useLocation:    () => ({ pathname: '/', search: '', hash: '', state: null }),
      useParams:      () => ({}),
      Link:           ({ children }) => children,
      NavLink:        ({ children }) => children,
      Outlet:         () => null,
      Navigate:       () => null,
    }));

    vi.mock('@tanstack/react-query', () => ({
      QueryClientProvider: ({ children }) => children,
      QueryClient:         class { },
      useQuery:            () => ({ data: undefined, isLoading: false, error: null }),
      useMutation:         () => ({ mutate: vi.fn(), isLoading: false }),
    }));

    vi.mock('@tanstack/react-query-devtools', () => ({
      ReactQueryDevtools: () => null,
    }));

    // Mock all internal modules to avoid deep import chains
    vi.mock('../../frontend/src/app/queryClient.js', () => ({ default: {} }));
    vi.mock('../../frontend/src/app/ErrorBoundary.jsx', () => ({ default: ({ children }) => children }));
    vi.mock('../../frontend/src/app/router.jsx', () => ({ default: () => null }));
    vi.mock('../../frontend/src/context/AuthContext.jsx', () => ({ default: ({ children }) => children }));
    vi.mock('../../frontend/src/app/providers/ToastProvider.jsx', () => ({ ToastProvider: ({ children }) => children }));
    vi.mock('../../frontend/src/AllProvider.jsx', () => ({ default: ({ children }) => children }));
    vi.mock('../../frontend/src/components/ScrollToTop.jsx', () => ({ default: () => null }));
    vi.mock('../../frontend/src/App.css', () => ({}));

    const mod = await import('../../frontend/src/App.jsx');
    expect(mod.default).toBeDefined();
  });
});
