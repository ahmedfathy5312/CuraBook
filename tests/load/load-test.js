// tests/load/load-test.js
// CuraBook Load Testing using k6
// Install: https://k6.io/docs/get-started/installation/
// Run:     k6 run tests/load/load-test.js
// Run with env: k6 run -e BASE_URL=https://staging.curabook.com tests/load/load-test.js

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ── Custom metrics ─────────────────────────────────────────────────────────
const errorRate        = new Rate('errors');
const loginDuration    = new Trend('login_duration_ms',    true);
const dashboardDuration = new Trend('dashboard_duration_ms', true);
const apptListDuration = new Trend('appt_list_duration_ms', true);
const analyticsApiDuration = new Trend('analytics_api_duration_ms', true);
const apiErrors        = new Counter('api_errors');

// ── Test configuration ─────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario 1: Smoke test — 1 user, 1 minute
    smoke: {
      executor:  'constant-vus',
      vus:       1,
      duration:  '1m',
      tags:      { scenario: 'smoke' },
      exec:      'smokeTest',
    },

    // Scenario 2: Load test — ramp up to 50 users over 5 min, hold 10 min, ramp down
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10  },  // warm up
        { duration: '5m', target: 50  },  // ramp to peak
        { duration: '3m', target: 50  },  // hold peak
        { duration: '2m', target: 0   },  // ramp down
      ],
      tags: { scenario: 'load' },
      exec: 'loadTest',
      startTime: '2m',  // start after smoke test
    },

    // Scenario 3: Stress test — push to 100 users
    stress: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50  },
        { duration: '5m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 0   },
      ],
      tags: { scenario: 'stress' },
      exec: 'stressTest',
      startTime: '14m', // start after load test
    },

    // Scenario 4: Spike test — sudden burst
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 5   },
        { duration: '30s', target: 200 }, // spike!
        { duration: '1m',  target: 200 },
        { duration: '1m',  target: 5   },
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeTest',
      startTime: '26m',
    },
  },

  thresholds: {
    // Overall error rate < 1%
    'errors':                           ['rate<0.01'],
    // 95% of login requests < 1s
    'login_duration_ms':                ['p(95)<1000'],
    // 95% of dashboard loads < 2s
    'dashboard_duration_ms':            ['p(95)<2000'],
    // 95% of appointment list loads < 1.5s
    'appt_list_duration_ms':            ['p(95)<1500'],
    // 95% of analytics API calls < 1s
    'analytics_api_duration_ms':        ['p(95)<1000'],
    // HTTP request duration p95 < 3s
    'http_req_duration':                ['p(95)<3000'],
    // HTTP request failure rate < 1%
    'http_req_failed':                  ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const API      = `${BASE_URL}/api`;

// ── Helpers ────────────────────────────────────────────────────────────────
function getAuthHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function loginAsDoctor() {
  const payload = JSON.stringify({
    email:    __ENV.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
    password: __ENV.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
  });

  const start = Date.now();
  const res = http.post(`${API}/auth/login/`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags:    { name: 'POST /auth/login' },
  });
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login: status 200':        (r) => r.status === 200,
    'login: has access token':  (r) => JSON.parse(r.body || '{}')?.access !== undefined,
  });

  if (!ok) {
    errorRate.add(1);
    apiErrors.add(1);
    return null;
  }
  errorRate.add(0);
  return JSON.parse(res.body).access;
}

// ── Smoke Test ─────────────────────────────────────────────────────────────
export function smokeTest() {
  group('Smoke: Auth + Dashboard', () => {
    const token = loginAsDoctor();
    if (!token) return;

    const headers = getAuthHeaders(token);

    // Dashboard stats
    const start = Date.now();
    const dashRes = http.get(`${API}/doctor/dashboard/stats/`, {
      headers, tags: { name: 'GET /doctor/dashboard/stats' },
    });
    dashboardDuration.add(Date.now() - start);

    check(dashRes, {
      'dashboard stats: status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });
  sleep(1);
}

// ── Load Test ──────────────────────────────────────────────────────────────
export function loadTest() {
  group('Load: Full Doctor Workflow', () => {
    const token = loginAsDoctor();
    if (!token) return;

    const headers = getAuthHeaders(token);

    // 1. Dashboard
    group('Dashboard Stats', () => {
      const start = Date.now();
      const res = http.get(`${API}/doctor/dashboard/stats/`, {
        headers, tags: { name: 'GET /doctor/dashboard/stats' },
      });
      dashboardDuration.add(Date.now() - start);
      check(res, { 'dashboard stats 200': (r) => r.status === 200 }) || errorRate.add(1);
      sleep(0.5);
    });

    // 2. Appointments list
    group('Appointments List', () => {
      const start = Date.now();
      const res = http.get(`${API}/doctor/appointments/?page=1&page_size=20`, {
        headers, tags: { name: 'GET /doctor/appointments' },
      });
      apptListDuration.add(Date.now() - start);
      check(res, {
        'appointments 200':        (r) => r.status === 200,
        'appointments has results': (r) => {
          try { return Array.isArray(JSON.parse(r.body)?.results); }
          catch { return false; }
        },
      }) || errorRate.add(1);
      sleep(0.5);
    });

    // 3. Analytics
    group('Analytics API', () => {
      const start = Date.now();
      const res = http.get(`${API}/analytics/doctor/?range=month`, {
        headers, tags: { name: 'GET /analytics/doctor' },
      });
      analyticsApiDuration.add(Date.now() - start);
      check(res, { 'analytics 200': (r) => r.status === 200 }) || errorRate.add(1);
      sleep(0.5);
    });

    // 4. Patients list
    group('Patients List', () => {
      const res = http.get(`${API}/doctor/patients/?page=1`, {
        headers, tags: { name: 'GET /doctor/patients' },
      });
      check(res, { 'patients 200': (r) => r.status === 200 }) || errorRate.add(1);
      sleep(0.5);
    });

    // 5. Notifications
    group('Notifications', () => {
      const res = http.get(`${API}/notifications/?unread=true`, {
        headers, tags: { name: 'GET /notifications' },
      });
      check(res, { 'notifications 200': (r) => r.status === 200 }) || errorRate.add(1);
    });
  });

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

// ── Stress Test ────────────────────────────────────────────────────────────
export function stressTest() {
  // Same as load test but more concurrent — focus on DB-heavy endpoints
  group('Stress: Heavy API Calls', () => {
    const token = loginAsDoctor();
    if (!token) return;
    const headers = getAuthHeaders(token);

    // Hit analytics (DB-heavy)
    const aRes = http.get(`${API}/analytics/doctor/?range=year`, {
      headers, tags: { name: 'GET /analytics/doctor/year' },
    });
    check(aRes, { 'analytics stress 200': (r) => r.status === 200 }) || errorRate.add(1);

    // Hit appointments with date filter (DB-heavy query)
    const today    = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
    const apptRes = http.get(
      `${API}/doctor/appointments/?date_from=${today}&date_to=${nextMonth}&page=1`,
      { headers, tags: { name: 'GET /appointments/daterange' } },
    );
    check(apptRes, { 'appt date filter 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
  sleep(1);
}

// ── Spike Test ─────────────────────────────────────────────────────────────
export function spikeTest() {
  // Minimal — just auth + one endpoint to test sudden load
  group('Spike: Login Burst', () => {
    const token = loginAsDoctor();
    if (!token) { errorRate.add(1); return; }

    const res = http.get(`${API}/doctor/dashboard/stats/`, {
      headers: getAuthHeaders(token),
      tags: { name: 'GET /dashboard spike' },
    });
    check(res, { 'spike dashboard 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
  sleep(0.5);
}

// ── Summary ────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'test-results/load-test-report.html': htmlReport(data),
    'test-results/load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
