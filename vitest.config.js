// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./tests/setup.js'],
    include: [
      'tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'tests/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: ['node_modules', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'test-results/coverage',
      thresholds: {
        lines:     30,
        functions: 30,
        branches:  25,
        statements: 30,
      },
      include: ['frontend/src/**'],
      exclude: [
        'frontend/src/**/*.test.*',
        'frontend/src/assets/**',
        'frontend/src/theme/build-tokens.js',
      ],
    },
    reporters: ['verbose', 'html'],
    outputFile: {
      html: 'test-results/unit-report/index.html',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './frontend/src'),
    },
  },
});
