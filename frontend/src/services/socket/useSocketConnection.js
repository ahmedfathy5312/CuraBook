/**
 * services/socket/useSocketConnection.js
 *
 * Standalone React hook that manages the WebSocket connection lifecycle.
 * Wraps socketManager.connect() / disconnect() with React effects.
 *
 * Usage:
 *   const { connected, connect, disconnect } = useSocketConnection();
 *
 * This file was required by the Enterprise spec as a separate, importable
 * hook so any component or hook can manage the connection independently
 * from useRealtimeNotifications.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import socketManager from '../socketManager';
import { tokenStorage } from '../../utils/tokenUtils';

/**
 * useSocketConnection
 *
 * @param {Object}  options
 * @param {boolean} options.autoConnect   - Connect on mount using stored token (default: true)
 * @param {string}  options.token         - Override token (optional; falls back to tokenStorage)
 * @returns {{ connected: boolean, connect: Function, disconnect: Function, reconnect: Function }}
 */
export function useSocketConnection({ autoConnect = true, token: tokenProp } = {}) {
  const [connected, setConnected] = useState(() => socketManager.isConnected);
  const mountedRef = useRef(true);

  // Keep connected state in sync with the socket manager
  useEffect(() => {
    mountedRef.current = true;

    const unsub = socketManager.subscribe('connection', (payload) => {
      if (mountedRef.current) {
        setConnected(!!payload?.connected);
      }
    });

    // Reflect current state immediately in case it changed before subscribe
    setConnected(socketManager.isConnected);

    return () => {
      mountedRef.current = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (!autoConnect) return;
    const token = tokenProp || tokenStorage.getAccess();
    if (token && !socketManager.isConnected) {
      socketManager.connect(token);
    }
  }, [autoConnect, tokenProp]);

  const connect = useCallback((overrideToken) => {
    const token = overrideToken || tokenProp || tokenStorage.getAccess();
    if (token) {
      socketManager.connect(token);
    }
  }, [tokenProp]);

  const disconnect = useCallback(() => {
    socketManager.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    socketManager.disconnect();
    setTimeout(() => {
      const token = tokenProp || tokenStorage.getAccess();
      if (token) socketManager.connect(token);
    }, 300);
  }, [tokenProp]);

  return { connected, connect, disconnect, reconnect };
}

export default useSocketConnection;
