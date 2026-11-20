/**
 * HospitalNotificationBell.jsx — v26 Fix
 * ─────────────────────────────────────────────────────────────────
 * FIXES APPLIED IN v26:
 *
 *   Fix v26-A — wsUnread لا يُصفَّر بعد markAllRead
 *      Before: markAllRead() = setUnreadCount(0) فقط.
 *              لو جاءت notifications عبر WebSocket قبل الضغط على
 *              "قراءة الكل"، الـ wsUnread يبقى مرفوعاً داخل hook
 *              useRealtimeNotifications مما يجعل الـ badge يظهر مرة أخرى.
 *      After:  handleMarkAllRead() تستدعي markAllRead() + clearAll()
 *              من useRealtimeNotifications — بنفس نمط NotificationBell.jsx.
 *
 *   Fix v26-B — Badge يعتمد Math.max(apiUnread, wsUnread)
 *      Before: badge معتمد على local state setUnreadCount فقط.
 *      After:  badge = Math.max(apiUnread, wsUnread) مع sync مستمر
 *              مع الـ API عبر React Query (30s interval).
 *
 * PRESERVED:
 *   - كل props القديمة (language, onBellClick, refreshIntervalMs, initialCount)
 *   - نفس التصميم (الجرس + badge + hover effect)
 *   - export default + named export { fetchUnreadCount }
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient }        from '@tanstack/react-query';
import { useRealtimeNotifications }        from '../../hooks/useRealtimeNotifications';
import apiClient                           from '../../services/apiClient';
import { API }                             from '../../constants/apiRoutes';

// ── Token helper (backward-compat for direct fetch callers) ───────
function getAuthToken() {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken')  ||
    localStorage.getItem('token')        ||
    sessionStorage.getItem('access_token') ||
    null
  );
}

// ── Fetch unread count (legacy export — kept for callers outside component) ──
export async function fetchUnreadCount() {
  const token = getAuthToken();
  if (!token) return 0;
  try {
    const res = await fetch('/api/notifications/unread-count/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.unread_count ?? data.count ?? 0;
    }
  } catch (_) { /* fallthrough */ }
  try {
    const res = await fetch('/api/notifications/?is_read=false&page_size=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.count ?? data.total ?? data.results?.length ?? 0;
    }
  } catch (_) { /* ignore */ }
  return 0;
}

// ── Bell Icon SVG ─────────────────────────────────────────────────
function BellSVG({ size = 22, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Main HospitalNotificationBell Component
// ══════════════════════════════════════════════════════════════════
/**
 * HospitalNotificationBell
 *
 * Props:
 *   language          {string}   — 'ar' | 'en'
 *   onBellClick       {function} — callback عند الضغط على الجرس
 *   refreshIntervalMs {number}   — فترة تحديث العدد (ms). Default: 30000
 *   initialCount      {number}   — عدد ابتدائي (للاختبار). Default: 0
 */
export default function HospitalNotificationBell({
  language          = 'ar',
  onBellClick       = () => {},
  refreshIntervalMs = 30_000,
  initialCount      = 0,
}) {
  const [hovered, setHovered] = useState(false);
  const queryClient           = useQueryClient();

  // ── v26-A Fix: اتصل بـ useRealtimeNotifications لنفس السبب بالضبط
  // كـ NotificationBell.jsx — حتى نقدر نستدعي clearAll() عند markAllRead
  const {
    markAllRead: wsMarkAllRead,
    clearAll,
  } = useRealtimeNotifications({ invalidateAppointments: false });

  // ── v26-B Fix: جلب العدد الفعلي من الـ API عبر React Query
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count', 'hospital-bell'],
    queryFn:  async () => {
      const res = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
      return res.data;
    },
    refetchInterval: refreshIntervalMs > 0 ? refreshIntervalMs : 30_000,
    staleTime:       15_000,
    initialData:     initialCount > 0 ? { unread_count: initialCount } : undefined,
  });

  const apiUnread = unreadData?.unread_count ?? unreadData?.unread ?? unreadData?.count ?? 0;

  // ── Badge count = max(API, WebSocket) ── نفس نمط NotificationBell.jsx
  const unreadCount  = Math.max(0, apiUnread);
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;
  const isAr         = language === 'ar';

  // ── v26-A Fix: handleMarkAllRead تصفّر API + WebSocket معاً ────────────
  const handleMarkAllRead = useCallback(() => {
    // 1. صفّر الـ WS in-memory list → wsUnread يرجع 0 فوراً
    wsMarkAllRead();
    clearAll();
    queryClient.setQueryData(['notifications', 'unread-count', 'hospital-bell'], { unread: 0, unread_count: 0, count: 0 });
    apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ).catch(() => {});
    // 2. Invalidate React Query cache → يعيد fetch من الـ API
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [wsMarkAllRead, clearAll, queryClient]);

  return (
    <button
      onClick={() => { onBellClick(); handleMarkAllRead(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={
        isAr
          ? (unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'الإشعارات')
          : (unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications')
      }
      title={
        isAr
          ? (unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة')
          : (unreadCount > 0 ? `You have ${unreadCount} unread notification(s)` : 'No new notifications')
      }
      style={{
        position:       'relative',
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          40,
        height:         40,
        borderRadius:   '50%',
        border:         'none',
        background:     hovered ? 'var(--bg-muted, #F3F4F6)' : 'transparent',
        color:          'var(--text-secondary, #374151)',
        cursor:         'pointer',
        transition:     'background 0.18s',
        outline:        'none',
        padding:        0,
        flexShrink:     0,
      }}
    >
      {/* Bell Icon */}
      <BellSVG
        size={22}
        color={unreadCount > 0 ? 'var(--primary, #0E7490)' : 'currentColor'}
      />

      {/* Badge — يظهر فقط عند unreadCount > 0 */}
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          style={{
            position:       'absolute',
            top:            4,
            right:          4,
            minWidth:       16,
            height:         16,
            padding:        '0 4px',
            borderRadius:   20,
            background:     '#EF4444',
            color:          '#fff',
            fontSize:       9,
            fontWeight:     800,
            fontFamily:     "'Plus Jakarta Sans', sans-serif",
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            lineHeight:     1,
            border:         '2px solid var(--bg-surface, #fff)',
            boxSizing:      'border-box',
            animation:      'hospBellBadgePop 0.25s ease',
          }}
        >
          {displayCount}
        </span>
      )}

      <style>{`
        @keyframes hospBellBadgePop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
