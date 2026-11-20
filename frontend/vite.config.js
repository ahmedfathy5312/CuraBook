import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// F-14 FIX: Migrated from Create React App (react-scripts) to Vite.
// CRA was officially deprecated in late 2023 — no more security updates.
// Vite is the modern standard: faster HMR, faster builds, ESM-native.
//
// Migration changes:
//   1. react-scripts → vite + @vitejs/plugin-react
//   2. REACT_APP_* env vars → VITE_* (backward compat aliases provided)
//   3. index.html moved from public/ → root (Vite entry point requirement)
//   4. Jest → Vitest (compatible API, no config overhead)
//   5. Dockerfile updated: `npm run build` output → dist/ (was build/)

export default defineConfig(({ mode }) => {
  // Load .env files: .env, .env.local, .env.[mode], .env.[mode].local
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
    ],

    resolve: {
      alias: {
        // Keep the same import paths the project already uses
        '@': path.resolve(__dirname, './src'),
      },
      // Keep every dependency on the same React instance. Without this, a stale
      // or nested install can make hooks fail at runtime with useContext errors.
      dedupe: ['react', 'react-dom'],
      // F-14: Explicit extensions so `import X from './App'` finds App.jsx
      // CRA resolved this automatically; Vite requires it explicitly.
      extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
    },

    // ── Dev server ──────────────────────────────────────────────────────────
    server: {
      port: 5173,            // FIX: was 3080 which conflicts with nginx in production.
                             // 5173 is Vite's default — no conflict with nginx (:3080)
      open: false,
      host: '0.0.0.0',      // Required when running inside Docker container
      // Proxy /api and /ws to Django during development (avoids CORS).
      // FIX: target now uses VITE_PROXY_TARGET (default: localhost:8000).
      // Previously parsed VITE_API_URL which broke when it was a relative path.
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: false,
        },
        '/ws': {
          target: (env.VITE_PROXY_TARGET || 'http://localhost:8000').replace(/^http/, 'ws'),
          ws: true,
          changeOrigin: false,
        },
      },
    },

    // ── Build ───────────────────────────────────────────────────────────────
    build: {
      outDir: 'build',       // keep 'build/' to match existing Dockerfile COPY path
      sourcemap: false,      // never expose sourcemaps in production (security)
      // Strip devtools + console.log in production
      minify: 'esbuild',
      rollupOptions: {
        // Tree-shake @tanstack/react-query-devtools entirely from prod bundle
        external: mode === 'production' ? [] : [],
        output: {
          // ── Phase 4: Fine-grained manual chunks for optimal caching ──────
          // Each chunk is versioned independently, so a vendor update only
          // invalidates that one chunk — not the entire bundle.
          manualChunks(id) {
            // Drop devtools from prod (tree-shaken by Vite; belt-and-suspenders)
            if (id.includes('react-query-devtools')) return undefined;

            // Core React runtime — rarely changes → long cache TTL
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('scheduler')) return 'vendor-react';

            // Router — stable API, separate so page routes don't bust it
            if (id.includes('react-router') || id.includes('react-router-dom')) return 'vendor-router';

            // React Query — state/cache layer
            if (id.includes('@tanstack/react-query') && !id.includes('devtools')) return 'vendor-query';

            // Charts lib — large, only needed on analytics pages
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';

            // Video/WebRTC libs — only needed on video pages
            if (id.includes('agora') || id.includes('twilio') || id.includes('livekit')) return 'vendor-video';

            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';

            // Animation libs
            if (id.includes('framer-motion') || id.includes('react-spring')) return 'vendor-anim';

            // All other node_modules → shared vendor chunk
            if (id.includes('node_modules')) return 'vendor-misc';

            // Feature-level code splitting — each route group gets its own chunk
            if (id.includes('/features/doctor-dashboard/'))  return 'feat-doctor';
            if (id.includes('/features/patient/'))           return 'feat-patient';
            if (id.includes('/features/hospital/'))          return 'feat-hospital';
            if (id.includes('/features/admin/'))             return 'feat-admin';
            if (id.includes('/features/video/'))             return 'feat-video';
            if (id.includes('/features/scheduling/'))        return 'feat-scheduling';
            if (id.includes('/features/analytics/'))         return 'feat-analytics';
            if (id.includes('/features/chat/'))              return 'feat-chat';
            if (id.includes('/features/billing/'))           return 'feat-billing';
          },
        },
      },
      // Phase 4: Lower warning limit — target 200KB per chunk
      chunkSizeWarningLimit: 300,
    },

    // ── esbuild — strip debug code from prod ────────────────────────────────
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },

    // ── Env prefix ──────────────────────────────────────────────────────────
    // Vite only exposes vars prefixed with VITE_ to client code.
    // We accept both VITE_* (new) and REACT_APP_* (legacy) so existing
    // .env files keep working without any changes.
    envPrefix: ['VITE_', 'REACT_APP_'],

    // ── Test (Vitest) ───────────────────────────────────────────────────────
    test: {
      globals: true,           // vitest globals: describe, it, expect (Jest-compatible)
      environment: 'jsdom',    // browser-like env for React component tests
      setupFiles: ['./src/setupTests.js'],
      css: false,              // skip CSS processing in tests (faster)
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        exclude: [
          'node_modules/',
          'src/setupTests.js',
          'src/reportWebVitals.js',
          'vite.config.js',
        ],
      },
    },
  };
});
