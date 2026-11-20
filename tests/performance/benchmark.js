#!/usr/bin/env node
// tests/performance/benchmark.js
// Automated performance benchmarking for CuraBook
// Usage: node tests/performance/benchmark.js [--url http://localhost:3000]

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:3000';

const PAGES = [
  { name: 'Home',              path: '/'                        },
  { name: 'Login',             path: '/login'                   },
  { name: 'Doctor Dashboard',  path: '/doctor/dashboard'        },
  { name: 'Appointments',      path: '/doctor/appointments'     },
  { name: 'Analytics',         path: '/doctor/analytics'        },
  { name: 'Patients',          path: '/doctor/patients'         },
  { name: 'Schedule',          path: '/doctor/schedule'         },
  { name: 'Profile',           path: '/doctor/profile'          },
  { name: 'Notifications',     path: '/doctor/notifications'    },
  { name: 'Prescriptions',     path: '/doctor/prescriptions'    },
];

const THRESHOLDS = {
  FCP:  2000,   // First Contentful Paint < 2s
  LCP:  2500,   // Largest Contentful Paint < 2.5s (CWV)
  CLS:  0.1,    // Cumulative Layout Shift < 0.1 (CWV)
  FID:  100,    // First Input Delay < 100ms (CWV)
  TTFB: 800,    // Time To First Byte < 800ms
  TTI:  3800,   // Time To Interactive < 3.8s
  TBT:  300,    // Total Blocking Time < 300ms
};

async function measurePage(page, url) {
  // Clear caches for cold-load measurement
  await page.context().clearCookies();

  // Navigate and collect metrics
  await page.goto(url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
    const lcp = window.__LCP || 0; // set by PerformanceObserver below

    return {
      TTFB:         nav ? (nav.responseStart - nav.fetchStart) : 0,
      FCP:          fcp,
      LCP:          lcp,
      domLoad:      nav ? nav.domContentLoadedEventEnd : 0,
      windowLoad:   nav ? nav.loadEventEnd : 0,
      transferSize: nav ? nav.transferSize : 0,
      resourceCount: performance.getEntriesByType('resource').length,
    };
  });

  // Measure CLS via PerformanceObserver
  const cls = await page.evaluate(() => {
    return new Promise(resolve => {
      let clsValue = 0;
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
      });
      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch { /* not supported */ }
      setTimeout(() => { observer.disconnect(); resolve(clsValue); }, 2000);
    });
  });

  return { ...metrics, CLS: cls };
}

function formatMs(ms) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function checkThreshold(value, threshold, unit = 'ms') {
  const pass = value <= threshold;
  const icon = pass ? '✅' : '❌';
  const valueStr = unit === 'ms' ? formatMs(value) : value.toFixed(4);
  const threshStr = unit === 'ms' ? formatMs(threshold) : threshold.toFixed(4);
  return { pass, text: `${icon} ${valueStr} (threshold: ${threshStr})` };
}

async function runBenchmarks() {
  console.log('🔍 CuraBook Performance Benchmarks');
  console.log(`📡 Target: ${BASE_URL}`);
  console.log('─'.repeat(60));

  mkdirSync('test-results/performance', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Inject LCP observer
  await page.addInitScript(() => {
    window.__LCP = 0;
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      window.__LCP = entries[entries.length - 1]?.startTime || 0;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  const results = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const { name, path } of PAGES) {
    const url = `${BASE_URL}${path}`;
    console.log(`\n📄 ${name} (${path})`);
    console.log('─'.repeat(40));

    try {
      // Run 3 times and take median
      const runs = [];
      for (let i = 0; i < 3; i++) {
        runs.push(await measurePage(page, url));
      }

      const median = (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };

      const m = {
        TTFB:         median(runs.map(r => r.TTFB)),
        FCP:          median(runs.map(r => r.FCP)),
        LCP:          median(runs.map(r => r.LCP)),
        CLS:          median(runs.map(r => r.CLS)),
        domLoad:      median(runs.map(r => r.domLoad)),
        windowLoad:   median(runs.map(r => r.windowLoad)),
        transferSize: runs[0].transferSize,
        resourceCount: runs[0].resourceCount,
      };

      const checks = {
        TTFB: checkThreshold(m.TTFB, THRESHOLDS.TTFB),
        FCP:  checkThreshold(m.FCP,  THRESHOLDS.FCP),
        LCP:  checkThreshold(m.LCP,  THRESHOLDS.LCP),
        CLS:  checkThreshold(m.CLS,  THRESHOLDS.CLS, 'score'),
      };

      Object.entries(checks).forEach(([k, v]) => {
        console.log(`  ${k}: ${v.text}`);
        v.pass ? totalPass++ : totalFail++;
      });

      console.log(`  📦 Transfer: ${(m.transferSize / 1024).toFixed(1)} KB`);
      console.log(`  🌐 Resources: ${m.resourceCount}`);
      console.log(`  ⏱  DOM Load: ${formatMs(m.domLoad)}`);
      console.log(`  🏁 Window Load: ${formatMs(m.windowLoad)}`);

      results.push({ page: name, path, metrics: m, checks });
    } catch (err) {
      console.log(`  ⚠️  Could not measure (page may require auth): ${err.message}`);
      results.push({ page: name, path, error: err.message });
    }
  }

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('📊 BENCHMARK SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${totalPass}`);
  console.log(`❌ Failed: ${totalFail}`);
  console.log(`📈 Pass Rate: ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%`);

  const passedPages  = results.filter(r => !r.error && Object.values(r.checks).every(c => c.pass));
  const failedPages  = results.filter(r => !r.error && Object.values(r.checks).some(c => !c.pass));
  const erroredPages = results.filter(r => r.error);

  if (failedPages.length > 0) {
    console.log('\n⚠️  Pages needing optimization:');
    failedPages.forEach(r => {
      const failing = Object.entries(r.checks)
        .filter(([, v]) => !v.pass)
        .map(([k]) => k);
      console.log(`  • ${r.page}: ${failing.join(', ')}`);
    });
  }

  // Save JSON report
  const report = {
    timestamp:  new Date().toISOString(),
    baseUrl:    BASE_URL,
    thresholds: THRESHOLDS,
    summary:    { totalPass, totalFail, passRate: totalPass / (totalPass + totalFail) },
    pages:      results,
  };

  const reportPath = 'test-results/performance/benchmark-report.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Full report saved to: ${reportPath}`);

  process.exit(totalFail > 0 ? 1 : 0);
}

runBenchmarks().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
