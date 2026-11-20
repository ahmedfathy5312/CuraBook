// tests/load/scenarios/doctor-flow.js
// k6 Load Test — Full Doctor User Journey
// Simulates a doctor logging in, browsing appointments, analytics, and logging out.
//
// Run:  k6 run tests/load/scenarios/doctor-flow.js
// Run with target URL:
//       k6 run -e BASE_URL=https://staging.curabook.com tests/load/scenarios/doctor-flow.js

import http    from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ─────────────────────────────────────────────────────────
const errorRate         = new Rate('doctor_flow_errors');
const loginDuration     = new Trend('doctor_login_ms',         true);
const dashboardDuration = new Trend('doctor_dashboard_ms',     true);
const appointmentDuration = new Trend('doctor_appointments_ms',  true);
const analyticsDuration = new Trend('doctor_analytics_ms',     true);
const totalRequests     = new Counter('doctor_flow_requests');

// ── Test options ───────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Smoke: 1 VU, verify flow works
    smoke: {
      executor:  'constant-vus',
      vus:       1,
      duration:  '1m',
      tags:      { scenario: 'smoke' },
    },

    // Load: ramp to 25 doctors concurrently
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 5  },
        { duration: '5m', target: 25 },
        { duration: '3m', target: 25 },
        { duration: '2m', target: 0  },
      ],
      startTime: '1m',
      tags:      { scenario: 'load' },
    },
  },

  thresholds: {
    'doctor_flow_errors':       ['rate<0.05'],    // < 5% errors
    'doctor_login_ms':          ['p(95)<3000'],   // login < 3s
    'doctor_dashboard_ms':      ['p(95)<2000'],   // dashboard < 2s
    'doctor_appointments_ms':   ['p(95)<2000'],   // appointments < 2s
    'doctor_analytics_ms':      ['p(95)<2500'],   // analytics < 2.5s
    'http_req_duration':        ['p(95)<3000'],   // overall < 3s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

const HEADERS_JSON = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
};

// ── Auth helper ────────────────────────────────────────────────────────────

function login() {
  const start = Date.now();
  const res   = http.post(
    `${BASE_URL}/api/auth/login/`,
    JSON.stringify({
      email:    __ENV.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
      password: __ENV.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
    }),
    { headers: HEADERS_JSON, tags: { name: 'login' } },
  );

  loginDuration.add(Date.now() - start);
  totalRequests.add(1);

  const ok = check(res, {
    'login: status 200':    r => r.status === 200,
    'login: has access token': r => {
      try { return !!JSON.parse(r.body).access; } catch { return false; }
    },
  });

  errorRate.add(!ok);

  if (!ok) return null;
  return JSON.parse(res.body).access;
}

// ── Main scenario ──────────────────────────────────────────────────────────

export default function () {
  const token = login();
  if (!token) { sleep(2); return; }

  const auth = {
    headers: {
      ...HEADERS_JSON,
      Authorization: `Bearer ${token}`,
    },
  };

  // ── 1. Doctor Dashboard ────────────────────────────────────────────────

  group('Dashboard', () => {
    const start = Date.now();
    const res   = http.get(`${BASE_URL}/api/doctor/stats/`, { ...auth, tags: { name: 'dashboard-stats' } });
    dashboardDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
      'dashboard: status 200':   r => r.status === 200,
      'dashboard: has patients': r => {
        try { return JSON.parse(r.body).total_patients !== undefined; } catch { return false; }
      },
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // ── 2. Appointments List ───────────────────────────────────────────────

  group('Appointments', () => {
    const start = Date.now();
    const res   = http.get(
      `${BASE_URL}/api/appointments/?page=1&page_size=20`,
      { ...auth, tags: { name: 'appointments-list' } },
    );
    appointmentDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
      'appointments: status 200': r => r.status === 200,
      'appointments: has results': r => {
        try { return Array.isArray(JSON.parse(r.body).results); } catch { return false; }
      },
    });
    errorRate.add(!ok);

    // Filter by status
    const filterRes = http.get(
      `${BASE_URL}/api/appointments/?status=PENDING`,
      { ...auth, tags: { name: 'appointments-filter' } },
    );
    totalRequests.add(1);
    check(filterRes, { 'filter: status 200': r => r.status === 200 });
  });

  sleep(1);

  // ── 3. Analytics ───────────────────────────────────────────────────────

  group('Analytics', () => {
    for (const range of ['week', 'month']) {
      const start = Date.now();
      const res   = http.get(
        `${BASE_URL}/api/analytics/doctor/?range=${range}`,
        { ...auth, tags: { name: `analytics-${range}` } },
      );
      analyticsDuration.add(Date.now() - start);
      totalRequests.add(1);

      const ok = check(res, {
        [`analytics ${range}: status 200`]: r => r.status === 200,
        [`analytics ${range}: has kpis`]:   r => {
          try { return !!JSON.parse(r.body).kpis; } catch { return false; }
        },
      });
      errorRate.add(!ok);
      sleep(0.5);
    }
  });

  sleep(1);

  // ── 4. Patients list ───────────────────────────────────────────────────

  group('Patients', () => {
    const res = http.get(
      `${BASE_URL}/api/doctor/patients/?page=1&page_size=10`,
      { ...auth, tags: { name: 'patients-list' } },
    );
    totalRequests.add(1);
    check(res, { 'patients: status 200': r => r.status === 200 });
  });

  sleep(1);

  // ── 5. Notifications ──────────────────────────────────────────────────

  group('Notifications', () => {
    const res = http.get(
      `${BASE_URL}/api/notifications/?page=1`,
      { ...auth, tags: { name: 'notifications' } },
    );
    totalRequests.add(1);
    check(res, { 'notifications: status 200': r => r.status === 200 });
  });

  sleep(2);
}

// ── Summary report ─────────────────────────────────────────────────────────

export function handleSummary(data) {
  const { metrics } = data;
  const errorPct = ((metrics.doctor_flow_errors?.values?.rate ?? 0) * 100).toFixed(1);

  return {
    'test-results/load/doctor-flow-summary.json': JSON.stringify(data, null, 2),
    stdout: `
╔══════════════════════════════════════════════════════╗
║       CuraBook — Doctor Flow Load Test Summary       ║
╠══════════════════════════════════════════════════════╣
║ Error Rate:       ${errorPct.padStart(5)}%                            ║
║ Login p95:        ${String(Math.round(metrics.doctor_login_ms?.values?.['p(95)'] ?? 0) + 'ms').padStart(8)}                       ║
║ Dashboard p95:    ${String(Math.round(metrics.doctor_dashboard_ms?.values?.['p(95)'] ?? 0) + 'ms').padStart(8)}                       ║
║ Appointments p95: ${String(Math.round(metrics.doctor_appointments_ms?.values?.['p(95)'] ?? 0) + 'ms').padStart(8)}                       ║
║ Analytics p95:    ${String(Math.round(metrics.doctor_analytics_ms?.values?.['p(95)'] ?? 0) + 'ms').padStart(8)}                       ║
║ Total Requests:   ${String(metrics.doctor_flow_requests?.values?.count ?? 0).padStart(8)}                       ║
╚══════════════════════════════════════════════════════╝
`,
  };
}
