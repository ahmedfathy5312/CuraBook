/**
 * config/env.js — Centralized environment config
 * All env vars read from here — never inline import.meta.env in components.
 *
 * FIX (ENV-01): VITE_API_URL is now a RELATIVE path (/api/v1) in development.
 * This means all axios requests go to the Vite dev server (localhost:5173)
 * which proxies them to Django — no direct cross-origin calls, no CORS issues.
 *
 * In production (VITE_API_URL is a full URL), behaviour is unchanged.
 *
 * WS_URL: when VITE_WS_URL is relative (/ws), socketManager must prefix the
 * current window.location.origin automatically (see socketManager.jsx).
 */

const _env = (viteKey, craKey, fallback) =>
  import.meta.env[viteKey] ||
  import.meta.env[craKey]  ||
  fallback;

const ENV = {
  // Relative in dev (/api/v1) → proxied by Vite → Django :8000
  // Absolute in prod (https://api.curabook.com/api/v1)
  API_BASE_URL: _env('VITE_API_URL', 'REACT_APP_API_URL', '/api/v1'),

  // Relative in dev (/ws) → socketManager converts to ws://localhost:5173/ws → proxied
  // Absolute in prod (wss://api.curabook.com/ws)
  WS_URL: _env('VITE_WS_URL', 'REACT_APP_WS_URL', '/ws'),

  APP_NAME:    _env('VITE_APP_NAME',    'REACT_APP_NAME',    'CuraBook'),
  APP_VERSION: _env('VITE_APP_VERSION', 'REACT_APP_VERSION', '1.0.0'),

  IS_DEV:  import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};

export default ENV;
