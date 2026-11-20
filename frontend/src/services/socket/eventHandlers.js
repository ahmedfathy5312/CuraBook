/**
 * CuraBook — WebSocket Event Handlers
 * ======================================
 * FIX: eventHandlers.js was MISSING.
 * Connects incoming WebSocket events to React Query cache invalidations
 * and toast notifications.
 *
 * Usage: call initSocketEventHandlers(queryClient, toast) once after login.
 */

import socketManager from '../socketManager';
import { WS_EVENTS, EVENT_QUERY_MAP } from './eventRegistry';

/** Returns the user's current UI language (ar | en). */
const getLang = () => {
  try { return localStorage.getItem('curabook_lang') || 'ar'; } catch { return 'ar'; }
};

/**
 * Map of event type → user-facing toast message generator.
 * Return null to suppress the toast for that event.
 * Messages are bilingual — resolved at call-time so language switches work.
 */
const TOAST_MESSAGES = {
  [WS_EVENTS.APPOINTMENT_CREATED]:   () => ({ type: 'info',    message: getLang() === 'ar' ? 'تم حجز موعد جديد' : 'New appointment booked' }),
  [WS_EVENTS.APPOINTMENT_CONFIRMED]: () => ({ type: 'success', message: getLang() === 'ar' ? 'تم تأكيد الموعد' : 'Appointment confirmed' }),
  [WS_EVENTS.APPOINTMENT_REJECTED]:  () => ({ type: 'error',   message: getLang() === 'ar' ? 'تم رفض الموعد' : 'Appointment rejected' }),
  [WS_EVENTS.APPOINTMENT_CANCELLED]: () => ({ type: 'warning', message: getLang() === 'ar' ? 'تم إلغاء الموعد' : 'Appointment cancelled' }),
  [WS_EVENTS.APPOINTMENT_COMPLETED]: () => ({ type: 'success', message: getLang() === 'ar' ? 'تم اكتمال الموعد' : 'Appointment completed' }),
  [WS_EVENTS.APPOINTMENT_NO_SHOW]:   () => ({ type: 'warning', message: getLang() === 'ar' ? 'المريض لم يحضر' : 'Patient no-show recorded' }),
  [WS_EVENTS.RESCHEDULE_REQUESTED]:  () => ({ type: 'info',    message: getLang() === 'ar' ? 'طلب إعادة جدولة — يرجى المراجعة' : 'Reschedule requested — please review' }),
  [WS_EVENTS.RESCHEDULE_APPROVED]:   () => ({ type: 'success', message: getLang() === 'ar' ? 'تمت الموافقة على إعادة الجدولة' : 'Reschedule approved' }),
  [WS_EVENTS.RESCHEDULE_REJECTED]:   () => ({ type: 'error',   message: getLang() === 'ar' ? 'تم رفض طلب إعادة الجدولة' : 'Reschedule request rejected' }),
};

/**
 * Initialise all WebSocket event handlers.
 * Call once on login / app mount when socket is connected.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {function} showToast - (message: string, type: string) => void
 * @returns {function} cleanup — call on logout to remove all handlers
 */
export function initSocketEventHandlers(queryClient, showToast) {
  const handlers = [];

  /**
   * Register a handler for a WS event type.
   * Automatically invalidates relevant React Query caches.
   */
  function on(eventType, handler) {
    const wrappedHandler = (data) => {
      // 1. Invalidate React Query caches
      const queryKeys = EVENT_QUERY_MAP[eventType] ?? [];
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // 2. Show toast if configured
      const toastFactory = TOAST_MESSAGES[eventType];
      if (toastFactory && showToast) {
        const toast = toastFactory(data);
        if (toast) showToast(toast.message, toast.type);
      }

      // 3. Run custom handler
      handler?.(data);
    };

    socketManager.on(eventType, wrappedHandler);
    handlers.push({ eventType, handler: wrappedHandler });
  }

  // ── Register all event handlers ───────────────────────────────────────────

  on(WS_EVENTS.NOTIFICATION, (data) => {
    // Specific handler: increment unread badge count optimistically
    queryClient.setQueryData(['notifications', 'unread-count'], (prev) => {
      if (typeof prev?.count === 'number') return { ...prev, count: prev.count + 1 };
      return prev;
    });
  });

  on(WS_EVENTS.APPOINTMENT_CREATED,   null);
  on(WS_EVENTS.APPOINTMENT_CONFIRMED, null);
  on(WS_EVENTS.APPOINTMENT_REJECTED,  null);
  on(WS_EVENTS.APPOINTMENT_CANCELLED, null);
  on(WS_EVENTS.APPOINTMENT_COMPLETED, null);
  on(WS_EVENTS.APPOINTMENT_NO_SHOW,   null);
  on(WS_EVENTS.RESCHEDULE_REQUESTED,  null);
  on(WS_EVENTS.RESCHEDULE_APPROVED,   null);
  on(WS_EVENTS.RESCHEDULE_REJECTED,   null);

  // PONG — keep-alive, no action needed
  on(WS_EVENTS.PONG, null);

  // FIX: Handle presence events (USER_ONLINE / USER_OFFLINE)
  on(WS_EVENTS.USER_ONLINE,  null);   // registered so cleanup removes them; UI can subscribe separately
  on(WS_EVENTS.USER_OFFLINE, null);

  // FIX: Handle error event from server
  on(WS_EVENTS.ERROR, (data) => {
    console.warn('[SocketManager] Server error event:', data?.message || data);
  });

  // FIX: Handle connected confirmation from server
  on(WS_EVENTS.CONNECTED, null);

  // ── Cleanup function ──────────────────────────────────────────────────────
  return function cleanup() {
    handlers.forEach(({ eventType, handler }) => {
      socketManager.off(eventType, handler);
    });
  };
}

export default initSocketEventHandlers;
