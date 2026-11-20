/**
 * __tests__/websocket.test.js
 *
 * WebSocket layer unit tests — updated for:
 *  - CRITICAL-01 FIX: socketManager.on() / .off() aliases
 *  - SEC-01 FIX:      Ticket-based WS auth (no JWT in URL)
 *  - Keepalive ping/pong
 *  - eventRegistry subscribe/emit/unsubscribe
 *  - WS_EVENTS required keys
 *  - useSocketConnection hook exports
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Mock WebSocket ───────────────────────────────────────────────────────────
class MockWebSocket {
  constructor(url) {
    this.url        = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    this._sent  = [];
    MockWebSocket._instances.push(this);
  }
  send(data) { this._sent.push(data); }
  close(code = 1000) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code });
  }
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen({});
  }
  simulateMessage(data) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }
  simulateError() {
    if (this.onerror) this.onerror({});
  }
  static CONNECTING = 0;
  static OPEN       = 1;
  static CLOSING    = 2;
  static CLOSED     = 3;
  static _instances = [];
  static reset()    { MockWebSocket._instances = []; }
}

global.WebSocket = MockWebSocket;

// ─── Mock fetch for ticket endpoint ──────────────────────────────────────────
function mockFetchTicket(ticket = 'test-ticket-uuid', status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok:   status === 200,
    status,
    json: async () => ({ ticket }),
  });
}

function mockFetchTicketFail() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
}


// ═══════════════════════════════════════════════════════════════════
// 1. socketManager — core functionality
// ═══════════════════════════════════════════════════════════════════

describe('socketManager', () => {
  let socketManager;

  beforeEach(() => {
    vi.resetModules();
    MockWebSocket.reset();
    vi.useFakeTimers();
    mockFetchTicket('abc-ticket-123');
    socketManager = require('../services/socketManager.jsx').default;
  });

  afterEach(() => {
    try { socketManager.disconnect(); } catch (_) {}
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── SEC-01: Ticket-based auth ─────────────────────────────────────────────

  it('SEC-01: fetches a WS ticket before connecting', async () => {
    socketManager.connect('my-jwt-token');
    await vi.runAllTimersAsync();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/ws-ticket/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Authorization': 'Bearer my-jwt-token' }),
      })
    );
  });

  it('SEC-01: WS URL uses ?ticket= param (not ?token=)', async () => {
    mockFetchTicket('secure-uuid-ticket');
    socketManager.connect('my-jwt-token');
    await vi.runAllTimersAsync();
    expect(MockWebSocket._instances).toHaveLength(1);
    expect(MockWebSocket._instances[0].url).toContain('ticket=secure-uuid-ticket');
    expect(MockWebSocket._instances[0].url).not.toContain('token=');
  });

  it('SEC-02: falls back via reconnect backoff if ticket fetch throws (no JWT in URL)', async () => {
    mockFetchTicketFail();
    socketManager.connect('fallback-token');
    await vi.runAllTimersAsync();
    // SEC-02 FIX: No WS connection opened — schedules reconnect instead of ?token=JWT
    const tokenUrls = MockWebSocket._instances.filter(ws =>
      ws.url && ws.url.includes('token=fallback-token')
    );
    expect(tokenUrls).toHaveLength(0);
  });

  it('SEC-02: falls back via reconnect backoff if ticket endpoint returns non-200 (no JWT in URL)', async () => {
    mockFetchTicket('', 503);
    socketManager.connect('fallback-token-503');
    await vi.runAllTimersAsync();
    // SEC-02 FIX: JWT must NEVER appear in URL — even on 503 ticket failure
    const tokenUrls = MockWebSocket._instances.filter(ws =>
      ws.url && ws.url.includes('token=fallback-token-503')
    );
    expect(tokenUrls).toHaveLength(0);
  });

  it('SEC-01: JWT token never appears in URL when ticket succeeds', async () => {
    mockFetchTicket('unique-ticket-xyz');
    socketManager.connect('secret-jwt-should-not-be-in-url');
    await vi.runAllTimersAsync();
    const url = MockWebSocket._instances[0].url;
    expect(url).not.toContain('secret-jwt-should-not-be-in-url');
    expect(url).toContain('unique-ticket-xyz');
  });

  // ── CRITICAL-01: on/off aliases ───────────────────────────────────────────

  it('CRITICAL-01: on() is a function', () => {
    expect(typeof socketManager.on).toBe('function');
  });

  it('CRITICAL-01: off() is a function', () => {
    expect(typeof socketManager.off).toBe('function');
  });

  it('CRITICAL-01: on() receives events just like subscribe()', async () => {
    const handler = vi.fn();
    socketManager.on('test.event', handler);
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    const ws = MockWebSocket._instances[0];
    ws.simulateOpen();
    ws.simulateMessage({ type: 'test.event', data: { id: 1 } });
    expect(handler).toHaveBeenCalledWith({ type: 'test.event', data: { id: 1 } });
  });

  it('CRITICAL-01: off() removes a handler added with on()', async () => {
    const handler = vi.fn();
    socketManager.on('cancel.event', handler);
    socketManager.off('cancel.event', handler);
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    MockWebSocket._instances[0].simulateOpen();
    MockWebSocket._instances[0].simulateMessage({ type: 'cancel.event', data: {} });
    expect(handler).not.toHaveBeenCalled();
  });

  it('CRITICAL-01: on() returns a cleanup function (same as subscribe)', () => {
    const handler = vi.fn();
    const cleanup = socketManager.on('cleanup.test', handler);
    expect(typeof cleanup).toBe('function');
  });

  it('CRITICAL-01: on() and subscribe() are interchangeable', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    socketManager.subscribe('shared.channel', h1);
    socketManager.on('shared.channel', h2);
    // Both are on the same channel — emit one to see both fire
    socketManager._emit('shared.channel', { ping: true });
    expect(h1).toHaveBeenCalledWith({ ping: true });
    expect(h2).toHaveBeenCalledWith({ ping: true });
  });

  // ── Keepalive ─────────────────────────────────────────────────────────────

  it('sends a ping every 25 seconds after connection', async () => {
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    const ws = MockWebSocket._instances[0];
    ws.simulateOpen();

    vi.advanceTimersByTime(25000);
    const pingMessages = ws._sent.map(s => JSON.parse(s)).filter(m => m.type === 'ping');
    expect(pingMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('stops pinging after disconnect', async () => {
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    const ws = MockWebSocket._instances[0];
    ws.simulateOpen();
    socketManager.disconnect();

    const sentBefore = ws._sent.length;
    vi.advanceTimersByTime(50000);
    expect(ws._sent.length).toBe(sentBefore); // no new pings after disconnect
  });

  // ── Core connection behavior ──────────────────────────────────────────────

  it('isConnected is false before connecting', () => {
    expect(socketManager.isConnected).toBe(false);
  });

  it('isConnected is true after open', async () => {
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    MockWebSocket._instances[0].simulateOpen();
    expect(socketManager.isConnected).toBe(true);
  });

  it('isConnected is false after disconnect', async () => {
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    MockWebSocket._instances[0].simulateOpen();
    socketManager.disconnect();
    expect(socketManager.isConnected).toBe(false);
  });

  it('wildcard "*" subscriber receives all events', async () => {
    const handler = vi.fn();
    socketManager.subscribe('*', handler);
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    const ws = MockWebSocket._instances[0];
    ws.simulateOpen();
    ws.simulateMessage({ type: 'ANY_TYPE', data: {} });
    expect(handler).toHaveBeenCalled();
  });

  it('intentionalClose prevents reconnect after disconnect()', async () => {
    mockFetchTicket();
    socketManager.connect('tok');
    await vi.runAllTimersAsync();
    const ws = MockWebSocket._instances[0];
    ws.simulateOpen();
    socketManager.disconnect();
    // After intentional close, ws.onclose should not schedule reconnect
    vi.advanceTimersByTime(35000);
    // Only 1 WS instance was ever created
    expect(MockWebSocket._instances.length).toBe(1);
  });
});


// ═══════════════════════════════════════════════════════════════════
// 2. WS_EVENTS — required keys
// ═══════════════════════════════════════════════════════════════════

describe('WS_EVENTS — required event keys', () => {
  it('useRealtimeNotifications exports WS_EVENTS with all required keys', () => {
    const { WS_EVENTS } = require('../hooks/useRealtimeNotifications.js');
    const required = [
      'NEW_APPOINTMENT',
      'APPOINTMENT_APPROVED',
      'APPOINTMENT_REJECTED',
      'APPOINTMENT_REMINDER',
      'NEW_NOTIFICATION',
    ];
    required.forEach(key => {
      expect(WS_EVENTS[key]).toBeDefined();
      expect(WS_EVENTS[key]).toBe(key);
    });
  });
});


// ═══════════════════════════════════════════════════════════════════
// 3. eventRegistry — subscribe / emit / unsubscribe
// ═══════════════════════════════════════════════════════════════════

describe('eventRegistry', () => {
  let WS_EVENTS_REG, EVENT_QUERY_MAP;

  beforeEach(() => {
    vi.resetModules();
    const mod = require('../services/socket/eventRegistry.js');
    WS_EVENTS_REG  = mod.WS_EVENTS;
    EVENT_QUERY_MAP = mod.EVENT_QUERY_MAP;
  });

  it('WS_EVENTS has APPOINTMENT_CONFIRMED', () => {
    expect(WS_EVENTS_REG.APPOINTMENT_CONFIRMED).toBeDefined();
  });

  it('WS_EVENTS has APPOINTMENT_CANCELLED', () => {
    expect(WS_EVENTS_REG.APPOINTMENT_CANCELLED).toBeDefined();
  });

  it('WS_EVENTS has USER_ONLINE and USER_OFFLINE', () => {
    expect(WS_EVENTS_REG.USER_ONLINE).toBeDefined();
    expect(WS_EVENTS_REG.USER_OFFLINE).toBeDefined();
  });

  it('WS_EVENTS has ERROR and CONNECTED', () => {
    expect(WS_EVENTS_REG.ERROR).toBeDefined();
    expect(WS_EVENTS_REG.CONNECTED).toBeDefined();
  });

  it('EVENT_QUERY_MAP has entries for appointment events', () => {
    expect(EVENT_QUERY_MAP[WS_EVENTS_REG.APPOINTMENT_CONFIRMED]).toBeDefined();
    expect(EVENT_QUERY_MAP[WS_EVENTS_REG.APPOINTMENT_CANCELLED]).toBeDefined();
    expect(EVENT_QUERY_MAP[WS_EVENTS_REG.APPOINTMENT_COMPLETED]).toBeDefined();
  });

  it('EVENT_QUERY_MAP values are arrays of query key arrays', () => {
    const keys = EVENT_QUERY_MAP[WS_EVENTS_REG.APPOINTMENT_CONFIRMED];
    expect(Array.isArray(keys)).toBe(true);
    keys.forEach(key => expect(Array.isArray(key)).toBe(true));
  });
});


// ═══════════════════════════════════════════════════════════════════
// 4. eventHandlers — initSocketEventHandlers
// ═══════════════════════════════════════════════════════════════════

describe('eventHandlers — initSocketEventHandlers', () => {
  it('exports initSocketEventHandlers as default or named export', () => {
    vi.resetModules();
    const mod = require('../services/socket/eventHandlers.js');
    const fn = mod.initSocketEventHandlers || mod.default;
    expect(typeof fn).toBe('function');
  });

  it('initSocketEventHandlers returns a cleanup function', () => {
    vi.resetModules();
    MockWebSocket.reset();
    const { initSocketEventHandlers } = require('../services/socket/eventHandlers.js');
    const mockQC = { invalidateQueries: vi.fn(), setQueryData: vi.fn() };
    const cleanup = initSocketEventHandlers(mockQC, vi.fn());
    expect(typeof cleanup).toBe('function');
    cleanup(); // should not throw
  });
});


// ═══════════════════════════════════════════════════════════════════
// 5. useSocketConnection — hook exports
// ═══════════════════════════════════════════════════════════════════

describe('useSocketConnection', () => {
  it('exports useSocketConnection as named export', () => {
    vi.resetModules();
    const mod = require('../services/socket/useSocketConnection.js');
    expect(typeof mod.useSocketConnection).toBe('function');
  });

  it('exports default as a function', () => {
    vi.resetModules();
    const mod = require('../services/socket/useSocketConnection.js');
    expect(typeof mod.default).toBe('function');
  });
});


// ═══════════════════════════════════════════════════════════════════
// 6. SEC-01 Backend contract — WS ticket endpoint in apiRoutes
// ═══════════════════════════════════════════════════════════════════

describe('SEC-01: API.AUTH.WS_TICKET constant', () => {
  it('apiRoutes.js exports AUTH.WS_TICKET', () => {
    const { API } = require('../constants/apiRoutes.js');
    expect(API.AUTH.WS_TICKET).toBeDefined();
    expect(API.AUTH.WS_TICKET).toBe('/auth/ws-ticket/');
  });
});
