/**
 * perf.js — Phase 4 Performance Monitoring
 * ==========================================
 * Lightweight performance helpers used across the app:
 *
 *  - measureApiCall()    — wrapper to log slow API calls
 *  - measureRender()     — React profiler callback factory
 *  - reportVitalsToGA()  — send Core Web Vitals to analytics
 *  - prefetchRoute()     — warm the dynamic import cache on hover
 *  - longTaskObserver()  — detect main-thread jank
 *
 * All helpers no-op silently in production if monitoring is disabled.
 */

// ── Config ────────────────────────────────────────────────────────────────────
const IS_DEV  = import.meta.env.DEV;
const ENABLED = IS_DEV || import.meta.env.VITE_PERF_MONITORING === 'true';

// ── API call timing wrapper ───────────────────────────────────────────────────
/**
 * Wrap an async API call and warn if it exceeds the budget.
 *
 * @param {string}   name    — descriptive label for the log
 * @param {Function} fn      — async function to measure
 * @param {number}   budget  — warn threshold in ms (default 800)
 */
export async function measureApiCall(name, fn, budget = 800) {
  if (!ENABLED) return fn();

  const t0     = performance.now();
  const result = await fn();
  const ms     = Math.round(performance.now() - t0);

  if (ms > budget) {
    console.warn(`[Perf] 🐢 ${name} took ${ms}ms (budget: ${budget}ms)`);
  } else if (IS_DEV) {
    console.debug(`[Perf] ✅ ${name}: ${ms}ms`);
  }
  return result;
}

// ── React Profiler callback ───────────────────────────────────────────────────
/**
 * Returns a Profiler onRender callback that logs slow renders.
 * Usage: <Profiler id="DoctorDashboard" onRender={makeProfilerCb('Dashboard')}>
 */
export function makeProfilerCb(label, budget = 16) {
  if (!ENABLED) return () => {};
  return (id, phase, actualDuration) => {
    if (actualDuration > budget) {
      console.warn(`[Profiler] 🎨 <${label}> ${phase} render took ${actualDuration.toFixed(1)}ms`);
    }
  };
}

// ── Core Web Vitals → analytics ───────────────────────────────────────────────
/**
 * Suitable callback to pass to reportWebVitals().
 * Sends to Google Analytics (gtag) if available, or just logs.
 */
export function reportVitalsToGA({ name, value, id, delta }) {
  if (!ENABLED) return;

  const rounded = Math.round(name === 'CLS' ? value * 1000 : value);

  // Google Analytics 4
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      event_label:    id,
      value:          rounded,
      non_interaction: true,
    });
  }

  // Sentry breadcrumb
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.addBreadcrumb({ category: 'web-vitals', message: `${name}: ${rounded}`, level: 'info' });
  }

  // Dev console
  if (IS_DEV) {
    const good = { LCP: 2500, FID: 100, CLS: 0.1, INP: 200, FCP: 1800, TTFB: 800 };
    const thresh = good[name];
    const emoji  = thresh ? (rounded <= thresh ? '✅' : rounded <= thresh * 1.5 ? '🟡' : '🔴') : 'ℹ️';
    console.log(`[WebVitals] ${emoji} ${name}: ${rounded}${name === 'CLS' ? '/1000' : 'ms'}`);
  }
}

// ── Prefetch route on hover ───────────────────────────────────────────────────
/**
 * Given a lazy() import factory, kick off the import on first hover.
 * Usage:
 *   const prefetchAnalytics = prefetchRoute(() => import('../features/doctor-dashboard/pages/DoctorAnalyticsPage'));
 *   <Link to="/doctor-analytics" onMouseEnter={prefetchAnalytics}>Analytics</Link>
 */
export function prefetchRoute(importFn) {
  let fired = false;
  return () => {
    if (fired) return;
    fired = true;
    importFn().catch(() => { fired = false; }); // reset on error so it can retry
  };
}

// ── Long-task observer ────────────────────────────────────────────────────────
/**
 * Start watching for long tasks (>50ms) on the main thread.
 * Returns a stop function. Only active in dev.
 */
export function startLongTaskObserver() {
  if (!IS_DEV || typeof PerformanceObserver === 'undefined') return () => {};
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const ms = Math.round(entry.duration);
        if (ms > 50) {
          console.warn(`[Perf] 🧱 Long task: ${ms}ms — may cause jank`);
        }
      }
    });
    obs.observe({ type: 'longtask', buffered: true });
    return () => obs.disconnect();
  } catch {
    return () => {};
  }
}

// ── Bundle size hint (dev only) ───────────────────────────────────────────────
/**
 * Call once at app startup to log estimated bundle size hints in the console.
 */
export function logBundleHints() {
  if (!IS_DEV) return;
  const resources = performance.getEntriesByType('resource');
  const jsKb = resources
    .filter(r => r.name.endsWith('.js'))
    .reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const cssKb = resources
    .filter(r => r.name.endsWith('.css'))
    .reduce((sum, r) => sum + (r.transferSize || 0), 0);
  console.debug(
    `[Bundle] JS: ${(jsKb / 1024).toFixed(0)}KB | CSS: ${(cssKb / 1024).toFixed(0)}KB`,
  );
}
