/**
 * CuraBook — WebSocket Event Registry
 * ======================================
 * FIX: eventRegistry.js was MISSING.
 * Central map of all WebSocket event types emitted by the backend.
 * Consumed by eventHandlers.js + components that subscribe to socket events.
 *
 * Backend: notifications/consumers.py WebSocket consumer
 */

// ─────────────────────────────────────────────────────────────────────────────
// Event Types (match backend send() type field exactly)
// ─────────────────────────────────────────────────────────────────────────────
export const WS_EVENTS = {
  // Connection lifecycle
  CONNECTED:           'connected',
  PING:                'ping',
  PONG:                'pong',

  // Notifications
  NOTIFICATION:        'notification',
  UNREAD_COUNT:        'unread_count',

  // Appointment events
  APPOINTMENT_CREATED:            'appointment.created',
  APPOINTMENT_CONFIRMED:          'appointment.confirmed',
  APPOINTMENT_REJECTED:           'appointment.rejected',
  APPOINTMENT_CANCELLED:          'appointment.cancelled',
  APPOINTMENT_COMPLETED:          'appointment.completed',
  APPOINTMENT_NO_SHOW:            'appointment.no_show',
  RESCHEDULE_REQUESTED:           'appointment.reschedule_requested',
  RESCHEDULE_APPROVED:            'appointment.reschedule_approved',
  RESCHEDULE_REJECTED:            'appointment.reschedule_rejected',

  // Presence
  USER_ONLINE:         'user.online',
  USER_OFFLINE:        'user.offline',

  // Error
  ERROR:               'error',
};

// ─────────────────────────────────────────────────────────────────────────────
// React Query cache keys invalidated by each WS event
// Used by eventHandlers.js to auto-refresh data on real-time updates
// ─────────────────────────────────────────────────────────────────────────────
export const EVENT_QUERY_MAP = {
  [WS_EVENTS.NOTIFICATION]:               [['notifications'], ['notifications', 'unread-count']],
  [WS_EVENTS.UNREAD_COUNT]:               [['notifications', 'unread-count']],
  [WS_EVENTS.APPOINTMENT_CREATED]:        [['appointments'], ['dashboard']],
  [WS_EVENTS.APPOINTMENT_CONFIRMED]:      [['appointments'], ['dashboard'], ['doctor', 'appointments']],
  [WS_EVENTS.APPOINTMENT_REJECTED]:       [['appointments'], ['dashboard']],
  [WS_EVENTS.APPOINTMENT_CANCELLED]:      [['appointments'], ['dashboard'], ['slots']],
  [WS_EVENTS.APPOINTMENT_COMPLETED]:      [['appointments'], ['dashboard'], ['doctor', 'stats']],
  [WS_EVENTS.APPOINTMENT_NO_SHOW]:        [['appointments'], ['dashboard'], ['doctor', 'stats']],
  [WS_EVENTS.RESCHEDULE_REQUESTED]:       [['appointments'], ['doctor', 'appointments']],
  [WS_EVENTS.RESCHEDULE_APPROVED]:        [['appointments'], ['slots']],
  [WS_EVENTS.RESCHEDULE_REJECTED]:        [['appointments']],
};

export default WS_EVENTS;
