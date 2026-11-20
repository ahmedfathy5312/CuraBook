/**
 * performanceMeasurement.js
 * CuraBook — قياس الأداء الفعلي / Actual Performance Measurement
 * =================================================================
 * Run this in browser console on staging to get real metrics.
 * 
 * Usage:
 *   1. Open DevTools Console on staging
 *   2. Copy-paste this entire file
 *   3. Call: CuraBookPerf.runFullAudit()
 */

const CuraBookPerf = {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. وقت تحميل الصفحة / Page Load Time
  // ──────────────────────────────────────────────────────────────────────────
  measurePageLoad() {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return { error: 'Navigation timing not available' };

    return {
      dns:           Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp:           Math.round(nav.connectEnd - nav.connectStart),
      ttfb:          Math.round(nav.responseStart - nav.requestStart),
      download:      Math.round(nav.responseEnd - nav.responseStart),
      domParsing:    Math.round(nav.domInteractive - nav.responseEnd),
      resourceLoad:  Math.round(nav.loadEventStart - nav.domInteractive),
      totalLoad:     Math.round(nav.loadEventEnd - nav.startTime),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. حجم الحزم / Bundle Sizes
  // ──────────────────────────────────────────────────────────────────────────
  measureBundleSizes() {
    const resources = performance.getEntriesByType('resource');
    const jsFiles = resources
      .filter(r => r.initiatorType === 'script' || r.name.endsWith('.js'))
      .map(r => ({
        name: r.name.split('/').pop(),
        size: Math.round(r.transferSize / 1024),  // KB
        duration: Math.round(r.duration),
      }))
      .sort((a, b) => b.size - a.size);

    const cssFiles = resources
      .filter(r => r.name.endsWith('.css'))
      .map(r => ({
        name: r.name.split('/').pop(),
        size: Math.round(r.transferSize / 1024),
      }));

    const totalJS  = jsFiles.reduce((s, f) => s + f.size, 0);
    const totalCSS = cssFiles.reduce((s, f) => s + f.size, 0);
    const images   = resources
      .filter(r => /\.(png|jpg|jpeg|webp|svg|gif)/.test(r.name))
      .reduce((s, r) => s + r.transferSize, 0);

    return {
      jsFiles,
      cssFiles,
      summary: {
        totalJS_KB:    totalJS,
        totalCSS_KB:   totalCSS,
        totalImages_KB: Math.round(images / 1024),
        totalPage_KB:   totalJS + totalCSS + Math.round(images / 1024),
      }
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Core Web Vitals
  // ──────────────────────────────────────────────────────────────────────────
  async measureWebVitals() {
    return new Promise((resolve) => {
      const vitals = {};
      let collected = 0;
      const total = 5;

      const checkDone = () => {
        collected++;
        if (collected >= total) resolve(vitals);
      };

      // LCP — Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        vitals.LCP = { value: Math.round(last.startTime), rating: last.startTime < 2500 ? '✅ Good' : last.startTime < 4000 ? '⚠️ Needs Improvement' : '❌ Poor' };
        checkDone();
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // CLS — Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        vitals.CLS = { value: Math.round(clsValue * 1000) / 1000, rating: clsValue < 0.1 ? '✅ Good' : clsValue < 0.25 ? '⚠️ Needs Improvement' : '❌ Poor' };
        checkDone();
      }).observe({ type: 'layout-shift', buffered: true });

      // FCP — First Contentful Paint
      new PerformanceObserver((list) => {
        const fcp = list.getEntries()[0];
        vitals.FCP = { value: Math.round(fcp.startTime), rating: fcp.startTime < 1800 ? '✅ Good' : fcp.startTime < 3000 ? '⚠️ Needs Improvement' : '❌ Poor' };
        checkDone();
      }).observe({ type: 'paint', buffered: true });

      // TTFB — from navigation timing
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        const ttfb = Math.round(nav.responseStart - nav.requestStart);
        vitals.TTFB = { value: ttfb, rating: ttfb < 800 ? '✅ Good' : ttfb < 1800 ? '⚠️ Needs Improvement' : '❌ Poor' };
        checkDone();
      } else {
        checkDone();
      }

      // INP — Interaction to Next Paint (approximation)
      let maxINP = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          maxINP = Math.max(maxINP, entry.processingEnd - entry.startTime);
        }
        vitals.INP = { value: Math.round(maxINP), rating: maxINP < 200 ? '✅ Good' : maxINP < 500 ? '⚠️ Needs Improvement' : '❌ Poor' };
        checkDone();
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });

      // Timeout fallback after 5s
      setTimeout(() => resolve(vitals), 5000);
    });
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. قياس استجابة API / API Response Time Measurement
  // ──────────────────────────────────────────────────────────────────────────
  async measureAPIEndpoints() {
    const endpoints = [
      '/api/v1/doctor/stats/',
      '/api/v1/doctor/analytics/?range=month',
      '/api/v1/doctor/appointments/?page=1',
      '/api/v1/doctor/patients/?page=1',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const start = performance.now();
      try {
        const res = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` }
        });
        const duration = Math.round(performance.now() - start);
        results.push({
          endpoint,
          status:   res.status,
          duration: duration,
          rating:   duration < 300 ? '✅ Fast' : duration < 1000 ? '⚠️ OK' : '❌ Slow',
        });
      } catch (err) {
        results.push({ endpoint, error: err.message });
      }
    }

    return results;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. قياس الذاكرة / Memory Usage
  // ──────────────────────────────────────────────────────────────────────────
  measureMemory() {
    if (!performance.memory) {
      return { error: 'Memory API only available in Chrome' };
    }
    return {
      usedJS_MB:  Math.round(performance.memory.usedJSHeapSize / 1048576),
      totalJS_MB: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit_MB:   Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      usage_pct:  Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100),
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. التدقيق الكامل / Full Audit
  // ──────────────────────────────────────────────────────────────────────────
  async runFullAudit() {
    console.log('🏥 CuraBook Performance Audit — Starting...\n');
    console.log('━'.repeat(50));

    // Page Load
    const pageLoad = this.measurePageLoad();
    console.log('\n📄 PAGE LOAD TIMING:');
    console.table(pageLoad);
    const loadRating = pageLoad.totalLoad < 1800 ? '✅ Excellent' : pageLoad.totalLoad < 3000 ? '⚠️ OK' : '❌ Slow';
    console.log(`   Total: ${pageLoad.totalLoad}ms — ${loadRating}`);

    // Bundle Sizes
    const bundles = this.measureBundleSizes();
    console.log('\n📦 BUNDLE SIZES:');
    console.table(bundles.summary);
    console.log('   Top JS files:');
    bundles.jsFiles.slice(0, 5).forEach(f =>
      console.log(`   ${f.size}KB — ${f.name}`)
    );

    // Web Vitals
    console.log('\n⚡ CORE WEB VITALS (collecting 3s...):');
    const vitals = await this.measureWebVitals();
    Object.entries(vitals).forEach(([name, v]) => {
      if (v.value !== undefined) {
        const unit = name === 'CLS' ? '' : 'ms';
        console.log(`   ${name}: ${v.value}${unit} — ${v.rating}`);
      }
    });

    // API Response Times
    console.log('\n🌐 API RESPONSE TIMES:');
    const api = await this.measureAPIEndpoints();
    console.table(api);

    // Memory
    console.log('\n💾 MEMORY USAGE:');
    const mem = this.measureMemory();
    if (!mem.error) {
      console.log(`   Used: ${mem.usedJS_MB}MB / ${mem.totalJS_MB}MB (${mem.usage_pct}%)`);
    } else {
      console.log(`   ${mem.error}`);
    }

    // Summary
    console.log('\n' + '━'.repeat(50));
    console.log('📊 AUDIT SUMMARY:');
    console.log(`   Page Load:    ${pageLoad.totalLoad}ms  ${pageLoad.totalLoad < 1800 ? '✅' : '❌'} (target: <1800ms)`);
    console.log(`   TTFB:         ${pageLoad.ttfb}ms   ${pageLoad.ttfb < 800 ? '✅' : '❌'} (target: <800ms)`);
    console.log(`   Initial Bundle: ${bundles.jsFiles[0]?.size || 0}KB ${bundles.jsFiles[0]?.size < 100 ? '✅' : '⚠️'} (target: <100KB for initial)`);
    if (vitals.LCP) console.log(`   LCP:          ${vitals.LCP.value}ms  ${vitals.LCP.rating}`);
    if (vitals.CLS) console.log(`   CLS:          ${vitals.CLS.value}     ${vitals.CLS.rating}`);

    console.log('\n💡 Run CuraBookPerf.exportReport() to download a JSON report');

    return { pageLoad, bundles, vitals, api, memory: mem };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. تصدير التقرير / Export Report
  // ──────────────────────────────────────────────────────────────────────────
  async exportReport() {
    const data = await this.runFullAudit();
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...data,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curabook-perf-${Date.now()}.json`;
    a.click();

    console.log('✅ Report downloaded!');
  },
};

// تحميل تلقائي / Auto-run hint
console.log('✅ CuraBook Performance Tools loaded!');
console.log('📊 Run: CuraBookPerf.runFullAudit()');
console.log('💾 Export: CuraBookPerf.exportReport()');

// تصدير للاستخدام في Node.js / Export for Node.js
if (typeof module !== 'undefined') {
  module.exports = CuraBookPerf;
}
