/**
 * useAppointmentSocket.js
 * @deprecated AUDIT FIX #8 — appointment socket logic is now centralized in
 * useRealtimeNotifications.js. This file is kept for backward compatibility
 * and simply wraps useRealtimeNotifications with appointment-specific defaults.
 * New code should import directly from useRealtimeNotifications.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeNotifications, WS_EVENTS } from './useRealtimeNotifications';
import { useToast } from '../context/ToastContext';

const APPOINTMENT_TOAST_MESSAGES = {
  [WS_EVENTS.NEW_APPOINTMENT]:      '📅 New appointment request received!',
  [WS_EVENTS.APPOINTMENT_APPROVED]: '✅ Your appointment has been confirmed!',
  [WS_EVENTS.APPOINTMENT_REJECTED]: '❌ Your appointment was declined.',
  [WS_EVENTS.APPOINTMENT_REMINDER]: '⏰ Reminder: You have an upcoming appointment.',
};

APPOINTMENT_TOAST_MESSAGES.APPOINTMENT_CONFIRMED = 'Your appointment has been confirmed!';
APPOINTMENT_TOAST_MESSAGES.APPOINTMENT_CANCELLED = 'تم إلغاء الموعد';
APPOINTMENT_TOAST_MESSAGES.APPOINTMENT_COMPLETED = 'Appointment completed.';

const APPOINTMENT_STATUS_CHANNELS = [
  WS_EVENTS.APPOINTMENT_APPROVED,
  WS_EVENTS.APPOINTMENT_REJECTED,
  WS_EVENTS.APPOINTMENT_REMINDER,
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_COMPLETED',
];

/**
 * useAppointmentSocket
 *
 * @param {Object} options
 * @param {string}   options.role            - Current user role ('patient' | 'assistant' | 'doctor')
 * @param {string[]} options.workplaceIds    - For assistants: workplace IDs to subscribe to
 * @param {Function} options.onNewAppointment
 * @param {Function} options.onApproved
 * @param {Function} options.onRejected
 * @param {Function} options.onReminder
 */
export function useAppointmentSocket({
  role,
  workplaceIds = [],
  onNewAppointment,
  onApproved,
  onRejected,
  onReminder,
} = {}) {
  const queryClient = useQueryClient();
  const toast       = useToast();

  const handleEvent = useCallback((notification) => {
    const { type } = notification;

    // Show toast for the event
    const msg = APPOINTMENT_TOAST_MESSAGES[type];
    if (msg) {
      if (type === WS_EVENTS.APPOINTMENT_APPROVED || type === 'APPOINTMENT_CONFIRMED') toast.success(msg);
      else if (type === WS_EVENTS.APPOINTMENT_REJECTED) toast.error(msg);
      else toast.info(msg);
    }

    // Invalidate relevant queries based on role
    if (role === 'patient') {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'patient'] });
    } else if (role === 'assistant') {
      queryClient.invalidateQueries({ queryKey: ['assistant', 'appointments'] });
    } else if (role === 'doctor') {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'stats'] });
    }

    // Call specific handlers
    switch (type) {
      case WS_EVENTS.NEW_APPOINTMENT:       onNewAppointment?.(notification.data); break;
      case WS_EVENTS.APPOINTMENT_APPROVED:  onApproved?.(notification.data);       break;
      case WS_EVENTS.APPOINTMENT_REJECTED:  onRejected?.(notification.data);       break;
      case WS_EVENTS.APPOINTMENT_REMINDER:  onReminder?.(notification.data);       break;
      default: break;
    }
  }, [role, queryClient, toast, onNewAppointment, onApproved, onRejected, onReminder]);

  const realtimeData = useRealtimeNotifications({
    channels: [
      WS_EVENTS.NEW_APPOINTMENT,
      ...APPOINTMENT_STATUS_CHANNELS,
    ],
    workplaceIds,
    invalidateAppointments: false, // we handle invalidation ourselves
    onEvent: handleEvent,
  });

  return {
    connected:    realtimeData.connected,
    unreadCount:  realtimeData.unreadCount,
    WS_EVENTS,
  };
}

export default useAppointmentSocket;
