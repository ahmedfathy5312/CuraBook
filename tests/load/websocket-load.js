// tests/load/websocket-load.js
// Load test for WebSocket (real-time notifications)
// Run: k6 run tests/load/websocket-load.js

import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const wsErrors      = new Rate('ws_errors');
const wsConnectTime = new Trend('ws_connect_duration_ms', true);
const wsMessages    = new Counter('ws_messages_received');

export const options = {
  scenarios: {
    websocket_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 0  },
      ],
    },
  },
  thresholds: {
    'ws_errors':               ['rate<0.05'],   // < 5% WS errors
    'ws_connect_duration_ms':  ['p(95)<2000'],  // connect in < 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WS_URL   = BASE_URL.replace(/^http/, 'ws');

function getToken() {
  const res = http.post(
    `${BASE_URL}/api/auth/login/`,
    JSON.stringify({
      email:    __ENV.TEST_DOCTOR_EMAIL    || 'doctor@curabook.test',
      password: __ENV.TEST_DOCTOR_PASSWORD || 'TestDoc@123',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) return null;
  return JSON.parse(res.body)?.access;
}

export default function () {
  const token = getToken();
  if (!token) { wsErrors.add(1); return; }

  const start = Date.now();

  const res = ws.connect(
    `${WS_URL}/ws/notifications/?token=${token}`,
    {},
    function (socket) {
      wsConnectTime.add(Date.now() - start);

      socket.on('open', () => {
        check(socket, { 'WS: connection opened': () => true });
      });

      socket.on('message', (data) => {
        wsMessages.add(1);
        try {
          const msg = JSON.parse(data);
          check(msg, {
            'WS: message has type':    (m) => !!m.type,
            'WS: message not error':   (m) => m.type !== 'error',
          });
        } catch {
          // Non-JSON message — fine
        }
      });

      socket.on('error', (e) => {
        wsErrors.add(1);
        console.error('WS error:', e);
      });

      // Stay connected for 5 seconds, simulating an active browser session
      sleep(5);
      socket.close();
    },
  );

  check(res, { 'WS: connected successfully': (r) => r && r.status === 101 });
  if (!res || res.status !== 101) wsErrors.add(1);

  sleep(2);
}
