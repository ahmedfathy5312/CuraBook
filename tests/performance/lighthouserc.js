// tests/performance/lighthouserc.js
// Lighthouse CI configuration
// Install: npm install -g @lhci/cli
// Run:     lhci autorun --config=tests/performance/lighthouserc.js

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/doctor/dashboard',
        'http://localhost:3000/doctor/appointments',
        'http://localhost:3000/doctor/analytics',
        'http://localhost:3000/doctor/patients',
        'http://localhost:3000/doctor/prescriptions',
        'http://localhost:3000/doctor/schedule',
      ],
      numberOfRuns: 3,
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      settings: {
        preset: 'desktop',
        // Also test mobile:
        // formFactor: 'mobile',
        // screenEmulation: { mobile: true, width: 375, height: 812, deviceScaleFactor: 2 },
        throttling: {
          rttMs:              40,
          throughputKbps:     10240,  // 10 Mbps
          cpuSlowdownMultiplier: 1,
        },
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },

    assert: {
      // ── Performance thresholds ─────────────────────────────────────────
      assertions: {
        // Core Web Vitals
        'first-contentful-paint':      ['warn',  { maxNumericValue: 2000  }],  // < 2s
        'largest-contentful-paint':    ['error', { maxNumericValue: 2500  }],  // < 2.5s (CWV)
        'total-blocking-time':         ['warn',  { maxNumericValue: 300   }],  // < 300ms
        'cumulative-layout-shift':     ['error', { maxNumericValue: 0.1   }],  // CLS < 0.1
        'interactive':                 ['warn',  { maxNumericValue: 3800  }],  // TTI < 3.8s
        'speed-index':                 ['warn',  { maxNumericValue: 3000  }],

        // Bundle size
        'total-byte-weight':           ['warn',  { maxNumericValue: 500_000 }], // < 500KB

        // Accessibility (WCAG)
        'categories:accessibility':    ['error', { minScore: 0.85 }],  // ≥ 85

        // Best practices
        'categories:best-practices':   ['warn',  { minScore: 0.85 }],  // ≥ 85

        // SEO
        'categories:seo':              ['warn',  { minScore: 0.80 }],  // ≥ 80

        // Overall performance score
        'categories:performance':      ['warn',  { minScore: 0.75 }],  // ≥ 75

        // Specific audits
        'uses-optimized-images':       'warn',
        'uses-webp-images':            'warn',
        'uses-text-compression':       'error',
        'uses-responsive-images':      'warn',
        'efficient-animated-content':  'warn',
        'js-libraries':                'warn',
        'no-vulnerable-libraries':     'error',
        'is-on-https':                 'off',    // off for localhost testing
        'canonical':                   'off',    // off for localhost
      },
    },

    upload: {
      target: 'filesystem',
      outputDir: 'test-results/lighthouse',
    },
  },
};
