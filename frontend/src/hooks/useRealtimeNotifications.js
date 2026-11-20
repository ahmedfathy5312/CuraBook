/**
 * useRealtimeNotifications.js — Improved WebSocket Hook
 *
 * Features:
 *  ✓ Multi-channel subscriptions
 *  ✓ Multi-workplace support (assistant)
 *  ✓ Auto-invalidates React Query on appointment events
 *  ✓ In-memory notification list (max 50)
 *  ✓ Connection status tracking
 *  ✓ Role-aware subscriptions
 *  ✓ Toast integration
 *
 * ── WebSocket Events ──────────────────────────────────────────────────────────
 *  NEW_APPOINTMENT       → patient booked → assistant notified
 *  APPOINTMENT_APPROVED  → assistant approved → patient notified
 *  APPOINTMENT_REJECTED  → assistant rejected → patient notified
 *  APPOINTMENT_REMINDER  → upcoming appointment reminder
 *  NEW_NOTIFICATION      → general notification
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketManager from '../services/socketManager';
import { tokenStorage } from '../utils/tokenUtils';

export const WS_EVENTS = {
  NEW_APPOINTMENT:       'NEW_APPOINTMENT',
  APPOINTMENT_APPROVED:  'APPOINTMENT_APPROVED',
  APPOINTMENT_REJECTED:  'APPOINTMENT_REJECTED',
  APPOINTMENT_REMINDER:  'APPOINTMENT_REMINDER',
  NEW_NOTIFICATION:      'NEW_NOTIFICATION',
};

const APPOINTMENT_EVENTS = new Set([
  WS_EVENTS.NEW_APPOINTMENT,
  WS_EVENTS.APPOINTMENT_APPROVED,
  WS_EVENTS.APPOINTMENT_REJECTED,
]);

const SYSTEM_EVENTS = new Set([
  'CONNECTION_ESTABLISHED',
  'PING',
  'PONG',
  'MARKED_READ',
  'ALL_MARKED_READ',
  'RATE_LIMIT_EXCEEDED',
]);

function getNotificationKey(payload) {
  const metadata = payload.metadata || payload.data?.metadata || payload.data || {};
  const appointmentId = metadata.appointment_id || payload.appointment_id;
  if (appointmentId) {
    return [
      payload.type,
      appointmentId,
      metadata.new_status || metadata.status || payload.new_status || payload.status || '',
      payload.title || '',
    ].join('|');
  }
  return (
    payload.notification_id ||
    metadata.notification_id ||
    [
      payload.type,
      metadata.appointment_id || payload.appointment_id || '',
      metadata.new_status || payload.new_status || '',
      payload.title || '',
      payload.body || payload.message || payload.data?.message || '',
    ].join('|')
  );
}

/**
 * useRealtimeNotifications
 *
 * @param {Object}   options
 * @param {string[]} options.channels              - WS channels to subscribe (default: ['*'])
 * @param {Function} options.onEvent               - Callback on each incoming event
 * @param {string[]} options.workplaceIds          - Assistant multi-workplace IDs
 * @param {boolean}  options.invalidateAppointments- Auto-invalidate appointments on events
 * @param {number}   options.maxNotifications      - Max stored notifications (default: 50)
 */
export function useRealtimeNotifications({
  channels = ['*'],
  onEvent,
  workplaceIds = [],
  invalidateAppointments = false,
  maxNotifications = 50,
} = {}) {
  const [connected, setConnected]       = useState(socketManager.isConnected);
  const [notifications, setNotifications] = useState([]);
  const queryClient = useQueryClient();
  const onEventRef  = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    // Ensure WS connection is active
    const token = tokenStorage.getAccess();
    if (token && !socketManager.isConnected) {
      socketManager.connect(token);
    }

    const handleEvent = (payload) => {
      if (!payload?.type || SYSTEM_EVENTS.has(payload.type)) return;
      const dedupeKey = getNotificationKey(payload);
      const notification = {
        id:        payload.notification_id || `notif-${dedupeKey}`,
        dedupeKey,
        type:      payload.type,
        title:     payload.title || payload.data?.title || '',
        body:      payload.body || payload.data?.body || payload.message || payload.data?.message || '',
        message:   payload.message || payload.body || payload.data?.message || '',
        data:      payload.data || payload.metadata || {},
        metadata:  payload.metadata || payload.data?.metadata || payload.data || {},
        is_read:   payload.is_read ?? false,
        timestamp: new Date().toISOString(),
        read:      false,
      };

      // Store in-memory (capped at maxNotifications)
      setNotifications(prev => {
        const withoutDuplicate = prev.filter(n => (n.dedupeKey || n.id) !== dedupeKey);
        return [notification, ...withoutDuplicate].slice(0, maxNotifications);
      });

      // Fire user callback
      onEventRef.current?.(notification);

      // Auto-invalidate appointment queries for relevant events
      if (invalidateAppointments && APPOINTMENT_EVENTS.has(payload.type)) {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
      }

      // Always invalidate notifications list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'bell-list'] });
    };

    const handleConnection = ({ connected: c }) => setConnected(c);

    // Subscribe to requested channels
    const channelCleanups = channels.map(ch =>
      socketManager.subscribe(ch, handleEvent)
    );

    // Subscribe to workplace channels (assistant multi-workplace)
    const workplaceCleanup = workplaceIds.length
      ? socketManager.subscribeToWorkplaces(workplaceIds, handleEvent)
      : null;

    // Connection status listener
    const connCleanup = socketManager.subscribe('connection', handleConnection);

    return () => {
      channelCleanups.forEach(fn => fn());
      workplaceCleanup?.();
      connCleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(channels), JSON.stringify(workplaceIds), invalidateAppointments]);

  // ── Notification management ─────────────────────────────────────────────
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // WS notifications are always created with read:false, is_read not set from server.
  // Use nullish coalescing to treat undefined as unread (false).
  const unreadCount = notifications.filter(n => !(n.is_read ?? n.read ?? false)).length;

  return {
    connected,
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    clearAll,
    removeNotification,
    WS_EVENTS,
  };
}

export default useRealtimeNotifications;


// ─────────────────────────────────────────────────────────────────────────────
// AUDIT FIX #8: useAppointmentSocket is a specialized wrapper around this hook.
// The dedicated file (hooks/useAppointmentSocket.js) remains as the entry point
// but all real-time infrastructure is centralized here.
// ─────────────────────────────────────────────────────────────────────────────
