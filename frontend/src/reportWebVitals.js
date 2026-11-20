/**
 * reportWebVitals.js — Phase 4 Performance
 * ==========================================
 * Uses web-vitals v4 (INP replaces FID).
 * Sends metrics to GA4 + console in dev via perf.js helper.
 */
import { reportVitalsToGA } from './utils/perf';

const reportWebVitals = (onPerfEntry) => {
  const handler = onPerfEntry || reportVitalsToGA;
  if (typeof handler !== 'function') return;

  import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
    onCLS(handler);
    onINP(handler);   // v4: INP replaces FID
    onFCP(handler);
    onLCP(handler);
    onTTFB(handler);
  }).catch(() => {
    // web-vitals not installed — silent no-op
  });
};

export default reportWebVitals;
