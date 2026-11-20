// ─── CuraBook Socket Manager ──────────────────────────────────────────────────
// Singleton WebSocket manager with:
//   - SEC-01 + SEC-02 FIX: Ticket-based auth (JWT NEVER in URL, no fallback)
//   - Exponential backoff reconnection
//   - Channel-based subscriptions (subscribe/unsubscribe + on/off aliases)
//   - Ping/pong keepalive (25s interval)
//   - Multi-workplace support for assistants
//   - Auth token sync

import ENV from '../config/env.js';

function getWsBase() {
  if (typeof window === 'undefined') return ENV.WS_URL;
  if (ENV.WS_URL && ENV.WS_URL !== '/ws') {
    return ENV.WS_URL.replace(/\/$/, '');
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host     = window.location.host;
  return `${protocol}//${host}/ws`;
}

const WS_BASE = getWsBase();

class SocketManager {
  constructor() {
    this.ws               = null;
    this.subscribers      = new Map();   // channel → Set<callback>
    this.reconnectTimer   = null;
    this.reconnectCount   = 0;
    this.maxReconnects    = 12;
    this.connected        = false;
    this.intentionalClose = false;
    this._token           = null;
    this._pingInterval    = null;        // keepalive ping handle
  }

  // ── Public: connect ─────────────────────────────────────────────────────────
  connect(token) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    if (!token) return;

    this._token           = token;
    this.intentionalClose = false;

    // SEC-01: get a one-time ticket so JWT never appears in the WS URL
    this._connectWithTicket(token);
  }

  // ── SEC-01 + SEC-02: Ticket fetch then open WS — JWT NEVER touches the URL ──
  async _connectWithTicket(token) {
    try {
      // H-03 FIX: was reading import.meta.env?.VITE_API_URL directly — bypassed the
      // centralized ENV config and broke the CRA fallback mechanism.
      // Now uses ENV.API_BASE_URL which handles Vite + CRA env vars consistently.
      const apiBase = ENV.API_BASE_URL;

      const res = await fetch(`${apiBase}/auth/ws-ticket/`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // SEC-02 FIX: Do NOT fall back to ?token=JWT — that exposes credentials
        // in server logs, browser history, and HTTP Referer headers.
        // Schedule a clean reconnect instead; the token will be available next time.
        console.warn('[SocketManager] WS ticket request failed (%d) — retrying via backoff', res.status);
        this._scheduleReconnect();
        return;
      }

      const payload = await res.json();
      const ticket = payload?.ticket || payload?.data?.ticket;
      if (!ticket) {
        console.warn('[SocketManager] WS ticket response missing ticket — retrying via backoff');
        this._scheduleReconnect();
        return;
      }
      // Ticket is short-lived (30–60 s), single-use — safe in URL
      this._openWebSocket(`${WS_BASE}/notifications/?ticket=${ticket}`);
    } catch (err) {
      // SEC-02 FIX: Network error — retry cleanly, never expose JWT in URL
      console.warn('[SocketManager] Ticket fetch error — retrying via backoff:', err.message);
      this._scheduleReconnect();
    }
  }

  // ── Open the actual WebSocket ───────────────────────────────────────────────
  _openWebSocket(url) {
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected      = true;
        this.reconnectCount = 0;
        clearTimeout(this.reconnectTimer);
        this._startKeepalive();
        this._emit('connection', { connected: true });
        console.info('[SocketManager] Connected');
      };

      this.ws.onmessage = (e) => {
        try {
          const payload     = JSON.parse(e.data);
          const type        = payload.type || 'UNKNOWN';
          if (type === 'PING') {
            try { this.ws?.send(JSON.stringify({ action: 'ping' })); } catch (_) {}
            return;
          }
          if (type === 'PONG') return;
          if (type === 'CONNECTION_ESTABLISHED') {
            this._emit('connection', { connected: true, unread: payload.unread ?? 0 });
            return;
          }
          const channelSubs = this.subscribers.get(type) || new Set();
          const globalSubs  = this.subscribers.get('*')  || new Set();
          [...channelSubs, ...globalSubs].forEach(cb => {
            try { cb(payload); } catch (err) { console.error('[SocketManager] Subscriber error', err); }
          });
        } catch (err) {
          console.warn('[SocketManager] Parse error', err);
        }
      };

      this.ws.onerror = () => {
        this.connected = false;
        this._stopKeepalive();
        this._emit('connection', { connected: false });
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._stopKeepalive();
        this._emit('connection', { connected: false });
        if (!this.intentionalClose) this._scheduleReconnect();
      };
    } catch (err) {
      console.error('[SocketManager] Connection failed', err);
      this._scheduleReconnect();
    }
  }

  // ── Reconnection ────────────────────────────────────────────────────────────
  _scheduleReconnect() {
    if (this.reconnectCount >= this.maxReconnects) {
      console.warn('[SocketManager] Max reconnects reached. Giving up.');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 30000);
    this.reconnectCount++;
    console.info(`[SocketManager] Reconnect #${this.reconnectCount} in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      if (this._token) this.connect(this._token);
    }, delay);
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────
  disconnect() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    this._stopKeepalive();
    this.reconnectCount = 0;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  // ── Subscriptions ────────────────────────────────────────────────────────────
  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) this.subscribers.set(channel, new Set());
    this.subscribers.get(channel).add(callback);
    return () => this.unsubscribe(channel, callback);
  }

  unsubscribe(channel, callback) {
    const subs = this.subscribers.get(channel);
    if (subs) subs.delete(callback);
  }

  // CRITICAL-01 FIX: on/off aliases so eventHandlers.js works without changes
  on(channel, callback)  { return this.subscribe(channel, callback); }
  off(channel, callback) { return this.unsubscribe(channel, callback); }

  // Multi-workplace support (assistant role)
  subscribeToWorkplaces(workplaceIds = [], callback) {
    const cleanups = workplaceIds.map(id => this.subscribe(`workplace:${id}`, callback));
    return () => cleanups.forEach(fn => fn());
  }

  // ── Internal emit ────────────────────────────────────────────────────────────
  _emit(channel, payload) {
    const subs = this.subscribers.get(channel) || new Set();
    subs.forEach(cb => { try { cb(payload); } catch (e) {} });
  }

  // ── Keepalive ping (25s) ─────────────────────────────────────────────────────
  _startKeepalive() {
    this._stopKeepalive();
    this._pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.send(JSON.stringify({ type: 'ping' })); }
        catch (e) { console.warn('[SocketManager] Ping failed', e); }
      }
    }, 25000);
  }

  _stopKeepalive() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  // ── Token refresh support ────────────────────────────────────────────────────
  updateToken(token) {
    this._token = token;
    if (this.connected) return;
    this.reconnectCount = 0;
    this.connect(token);
  }

  get isConnected() { return this.connected; }
}

export const socketManager = new SocketManager();
export default socketManager;
