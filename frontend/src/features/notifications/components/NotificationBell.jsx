/**
 * NotificationBell.jsx — Design System v18
 * - aria-label على الـ button (accessibility fix per proposal)
 * - bell bounce animation عند إشعار جديد
 * - badge scale pop animation
 * - ألوان جديدة: primary #1B5E8A
 * - Arabic text throughout
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { formatRelativeTimeAr } from '../../../utils/dateUtils';
import { translateNotifText } from '../../../utils/translateNotification';
import useTranslation from '../../../i18n/useTranslation';

// Map role → notifications page path
const ROLE_NOTIF_PATH = {
  doctor:    '/doctor-notifications',
  patient:   '/notifications',
  hospital:  '/hospital-notifications',
  assistant: '/assistant-notifications',
  admin:     '/admin-notifications',
};

const NOTIF_ICONS = {
  APPOINTMENT_APPROVED: '✅',
  APPOINTMENT_REJECTED: '❌',
  NEW_APPOINTMENT:      '📅',
  APPOINTMENT_REMINDER: '⏰',
  PRESCRIPTION_READY:   '💊',
  CHAT_MESSAGE:         '💬',
};

function getNotificationSemanticKey(notification) {
  const metadata = notification.metadata || notification.data?.metadata || notification.data || {};
  const appointmentId = metadata.appointment_id || notification.appointment_id;
  const status = metadata.new_status || metadata.status || notification.new_status || notification.status;
  if (appointmentId) {
    return ['appointment', appointmentId, status || notification.type || notification.notification_type || 'new'].join(':');
  }
  return [
    notification.type || notification.notification_type || '',
    notification.title || '',
    notification.body || notification.message || '',
  ].join(':');
}

function dedupeNotifications(notifications) {
  const seen = new Set();
  return notifications.filter(notification => {
    const key = getNotificationSemanticKey(notification);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [ringing, setRinging]     = useState(false);
  const prevUnread                = useRef(0);
  const ref                       = useRef(null);
  const navigate                  = useNavigate();
  const { role }                  = useAuth();
  const queryClient               = useQueryClient();
  // BUG-FIX: use reactive translation hook so lang updates when user switches language
  const { lang }                  = useTranslation();

  const { notifications: wsNotifications, markAsRead, markAllRead, clearAll, connected } =
    useRealtimeNotifications({ invalidateAppointments: true });
  const unreadQueryKey = ['notifications', 'unread-count', role || 'guest'];
  const bellListQueryKey = ['notifications', 'bell-list', role || 'guest'];

  // Fetch real unread count from API
  const { data: unreadData } = useQuery({
    queryKey: unreadQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
      return res.data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Bug #11 Fix: Also fetch the actual notifications list from API so the dropdown list
  // is never empty while the badge shows a non-zero count.
  const { data: apiNotifData } = useQuery({
    queryKey: bellListQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(API.NOTIFICATIONS.LIST, { params: { page_size: 10 } });
      return res.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Merge API notifications with real-time WS notifications (WS takes priority for fresh ones)
  const apiNotifications = Array.isArray(apiNotifData)
    ? apiNotifData
    : (apiNotifData?.results || apiNotifData?.data?.results || (Array.isArray(apiNotifData?.data) ? apiNotifData.data : []));

  // Combine by semantic key to avoid duplicates from WS + API refresh or repeated DB rows.
  const wsKeys = new Set(wsNotifications.map(getNotificationSemanticKey));
  const mergedNotifications = dedupeNotifications([
    ...wsNotifications,
    ...apiNotifications.filter(n => !wsKeys.has(getNotificationSemanticKey(n))),
  ]).slice(0, 20); // cap at 20 in dropdown

  // Use merged notifications for the list, API count for the badge
  const notifications = mergedNotifications;

  const apiUnread  = typeof unreadData?.unread_count === 'number' ? unreadData.unread_count
                   : typeof unreadData?.unread === 'number' ? unreadData.unread
                   : typeof unreadData?.count === 'number' ? unreadData.count
                   : 0;
  const unreadCount = Math.max(0, apiUnread);

  // Navigate to the correct notifications page based on user role
  const notifPath = ROLE_NOTIF_PATH[role] || '/notifications';

  /* Trigger bell bounce when unread count increases */
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 650);
      return () => clearTimeout(t);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  /* Close on outside click */
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = (id) => {
    markAsRead(id);
    if (!String(id).startsWith('notif-')) {
      apiClient.patch(API.NOTIFICATIONS.MARK_READ(id)).catch(() => {});
    }
    queryClient.setQueryData(unreadQueryKey, old => ({
      ...(old || {}),
      unread: Math.max(0, apiUnread - 1),
      unread_count: Math.max(0, apiUnread - 1),
      count: Math.max(0, apiUnread - 1),
    }));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleMarkAllRead = () => {
    markAllRead();
    // Also clear WS in-memory notifications; API unread count remains the badge source.
    // without waiting for queryClient round-trip
    clearAll();
    queryClient.setQueryData(unreadQueryKey, { unread: 0, unread_count: 0, count: 0 });
    // Also call the API to persist mark-all-read on the server
    apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ)
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── Bell Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={
          unreadCount > 0
            ? `الإشعارات — ${unreadCount} إشعار جديد`
            : 'الإشعارات'
        }
        aria-expanded={open}
        aria-haspopup="true"
        title={connected ? 'الإشعارات (متصل)' : 'الإشعارات (غير متصل)'}
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1.5px solid var(--border-base)',
          background: open ? 'var(--primary-pale)' : 'var(--bg-card)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          transition: 'all 0.18s ease',
          outline: 'none',
        }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'var(--bg-card)'; }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        {/* Bell with bounce animation */}
        <span
          className={ringing ? 'bell-bounce' : ''}
          aria-hidden="true"
          style={{ display: 'block', lineHeight: 1 }}
        >
          🔔
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="badge-pop"
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '18px',
              height: '18px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--danger)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
              padding: '0 3px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          role="dialog"
          aria-label="الإشعارات"
          style={{
            position: 'absolute',
            top: '48px',
            right: 0,
            width: 'min(360px, 90vw)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            zIndex: 1000,
            boxShadow: 'var(--shadow-hover)',
            border: '1px solid var(--border-base)',
            overflow: 'hidden',
            animation: 'fadeUp 0.2s cubic-bezier(0,0,0.2,1)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-base)',
            direction: 'rtl',
          }}>
            <span style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-h)',
              fontFamily: "'Cairo', sans-serif",
            }}>
              الإشعارات
              {unreadCount > 0 && (
                <span style={{
                  marginInlineEnd: '8px',
                  background: 'var(--bg-hover)',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: "'Cairo', sans-serif",
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-hint)',
                fontFamily: "'Cairo', sans-serif",
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔔</div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  لا توجد إشعارات حالياً
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleMarkRead(n.id)}
                  aria-label={n.message}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border-base)',
                    cursor: 'pointer',
                    background: (n.is_read ?? n.read) ? 'var(--bg-card)' : 'var(--bg-subtle)',
                    transition: 'background 0.15s',
                    direction: 'rtl',
                    outline: 'none',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseOut={e => e.currentTarget.style.background = (n.is_read ?? n.read) ? 'var(--bg-card)' : 'var(--bg-subtle)'}
                  onFocus={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onBlur={e => e.currentTarget.style.background = (n.is_read ?? n.read) ? 'var(--bg-card)' : 'var(--bg-subtle)'}
                >
                  {/* Icon */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: (n.is_read ?? n.read) ? 'var(--bg-subtle)' : 'var(--bg-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    flexShrink: 0,
                  }}>
                    {NOTIF_ICONS[n.type] || '🔔'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Fix Dark Mode Contrast: Title uses bright white/light blue, Time uses light gray */}
                    <p className="text-[var(--text-h)] dark:text-[#FFFFFF]" style={{
                      fontSize: '13px',
                      margin: '0 0 4px',
                      fontWeight: (n.is_read ?? n.read) ? 500 : 700,
                      fontFamily: "'Cairo', sans-serif",
                      lineHeight: 1.6,
                    }}>
                      {translateNotifText(n.title || n.message, lang, 'title')}
                    </p>
                    <p className="text-[var(--text-hint)] dark:text-[#D1D5DB]" style={{
                      fontSize: '11px',
                      margin: 0,
                      fontFamily: "'Cairo', sans-serif",
                    }}>
                      {formatRelativeTimeAr(n.timestamp || n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!(n.is_read ?? n.read) && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      flexShrink: 0,
                      marginTop: '5px',
                    }} aria-hidden="true" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)' }}>
            <button
              onClick={() => { setOpen(false); navigate(notifPath); }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--primary)',
                fontWeight: 600,
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                transition: 'background 0.15s',
                fontFamily: "'Cairo', sans-serif",
                direction: 'rtl',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              عرض كل الإشعارات ←
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
