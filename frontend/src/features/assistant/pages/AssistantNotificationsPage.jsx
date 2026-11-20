/**
 * AssistantNotificationsPage.jsx — Notification Center
 * Full notification center for the assistant role.
 * - Real list from /notifications/ API
 * - Mark single / mark all as read
 * - Filter by type (all, appointment, system)
 * - Grouped by date (Today / Yesterday / Earlier)
 * - Preferences toggle panel (sound, browser notifs, email)
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/apiClient';
import { API }   from '../../../constants/apiRoutes';
import { useToast } from '../../../context/ToastContext';
import { useTranslation } from '../../../i18n/useTranslation';
import { useRTL } from '../utils/rtlUtils';
import '../styles/rtl.css';
import { tokens } from '../../../theme/tokens';

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  primary:  tokens?.colors?.primary?.DEFAULT  || '#0E7490',
  primaryL: tokens?.colors?.primary?.pale     || '#E0F7FA',
  success:  tokens?.colors?.success?.DEFAULT  || '#31A870',
  warning:  tokens?.colors?.warning?.DEFAULT  || '#F59E0B',
  danger:   tokens?.colors?.danger?.DEFAULT   || '#E97D61',
  accent:   tokens?.colors?.accent?.DEFAULT   || '#8B5CF6',
  info:     tokens?.colors?.info?.DEFAULT     || '#3B82F6',
  border:   tokens?.colors?.border            || 'var(--border-base)',
  muted:    'var(--text-muted)',
  text:     'var(--text-h)',
};

// ── Notification type config ──────────────────────────────────────────────────
function getTypeConfig(notification) {
  const msg = (notification.message || notification.title || '').toLowerCase();
  if (msg.includes('cancel') || msg.includes('reject') || msg.includes('ملغ') || msg.includes('رفض'))
    return { icon: '🔴', color: C.danger,  bg: '#FEE2E2', label: 'إلغاء / رفض' };
  if (msg.includes('confirm') || msg.includes('مؤكد') || msg.includes('approved') || msg.includes('قبل'))
    return { icon: '🟢', color: C.success, bg: '#D1FAE5', label: 'تأكيد' };
  if (msg.includes('reschedule') || msg.includes('إعادة') || msg.includes('rescheduled'))
    return { icon: '🟡', color: C.warning, bg: '#FEF3C7', label: 'إعادة جدولة' };
  if (msg.includes('appointment') || msg.includes('موعد') || msg.includes('booking') || msg.includes('حجز'))
    return { icon: '📅', color: C.primary, bg: C.primaryL, label: 'موعد جديد' };
  if (msg.includes('doctor') || msg.includes('دكتور') || msg.includes('message') || msg.includes('رسالة'))
    return { icon: '💬', color: C.accent,  bg: '#F5F3FF', label: 'رسالة' };
  return { icon: '🔔', color: C.info,    bg: '#DBEAFE', label: 'تنبيه' };
}

// ── Relative time ─────────────────────────────────────────────────────────────
function relTime(dateStr) {
  const now  = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `منذ ${hr} ساعة`;
  const dy = Math.floor(hr / 24);
  return `منذ ${dy} يوم`;
}

function groupByDate(notifications) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups    = { 'اليوم': [], 'أمس': [], 'سابقاً': [] };
  notifications.forEach(n => {
    const d = new Date(n.created_at || n.timestamp || Date.now()); d.setHours(0,0,0,0);
    if (d >= today)               groups['اليوم'].push(n);
    else if (d >= yesterday)      groups['أمس'].push(n);
    else                          groups['سابقاً'].push(n);
  });
  return groups;
}

// ── Single notification card ──────────────────────────────────────────────────
function NotifCard({ notification, onMarkRead }) {
  const cfg     = getTypeConfig(notification);
  const isRead  = notification.is_read;
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 18px',
        background: isRead
          ? (hover ? 'var(--bg-hover)' : 'var(--bg-card)')
          : (hover ? 'var(--bg-hover)' : 'var(--bg-subtle)'),
        borderLeft: `3px solid ${isRead ? C.border : cfg.color}`,
        transition: 'background 0.15s',
        cursor: 'default',
      }}
    >
      {/* icon */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: isRead ? 'var(--bg-subtle)' : `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
        opacity: isRead ? 0.6 : 1,
      }}>
        {cfg.icon}
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: isRead ? 400 : 700,
          color: isRead ? C.muted : C.text,
          lineHeight: 1.5,
        }}>
          {notification.message || notification.title || 'إشعار جديد'}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: C.muted }}>
          {relTime(notification.created_at || notification.timestamp)}
        </p>
      </div>

      {/* unread dot + mark-read btn */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {!isRead && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'block' }} />
        )}
        {!isRead && hover && (
          <button
            onClick={() => onMarkRead(notification.id)}
            title="تحديد كمقروء"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 16, color: C.muted, padding: 0, lineHeight: 1,
            }}
          >
            ✓
          </button>
        )}
      </div>
    </div>
  );
}

// ── Preferences panel ─────────────────────────────────────────────────────────
function PreferencesPanel({ prefs, onChange }) {
  const rows = [
    { key: 'sound',    label: 'صوت التنبيه',              icon: '🔊' },
    { key: 'browser',  label: 'إشعارات المتصفح',           icon: '🖥️' },
    { key: 'email',    label: 'البريد الإلكتروني',         icon: '📧' },
    { key: 'newAppt',  label: 'مواعيد جديدة',              icon: '📅' },
    { key: 'confirm',  label: 'تأكيدات المواعيد',           icon: '✅' },
    { key: 'cancel',   label: 'إلغاءات المواعيد',           icon: '❌' },
    { key: 'reminder', label: 'تذكيرات يومية',              icon: '⏰' },
  ];
  return (
    <div style={{ padding: '20px 24px', borderTop: `1px solid ${C.border}` }}>
      <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.text }}>إعدادات الإشعارات</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(r => (
          <label key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: C.text }}>{r.icon} {r.label}</span>
            <div
              onClick={() => onChange(r.key, !prefs[r.key])}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: prefs[r.key] ? C.primary : C.border,
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-card)',
                position: 'absolute', top: 2,
                left: prefs[r.key] ? 20 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }} />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyNotifs() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>لا توجد إشعارات</p>
      <p style={{ margin: '6px 0 0', fontSize: 13 }}>ستظهر هنا عند وصول إشعارات جديدة</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',         label: 'الكل'         },
  { key: 'appointment', label: 'مواعيد'        },
  { key: 'unread',      label: 'غير مقروءة'   },
];

export default function AssistantNotificationsPage() {
  const qc   = useQueryClient();
  const toast = useToast();
  const [filter, setFilter]   = useState('all');
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    sound: true, browser: true, email: false,
    newAppt: true, confirm: true, cancel: true, reminder: true,
  });

  // ── fetch notifications
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.NOTIFICATIONS.LIST, { params: { page_size: 60 } });
      return data?.results || data || [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    onError: () => {},
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count', 'assistant-page'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
      return data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // ── mark single read
  const markRead = useMutation({
    mutationFn: (id) => apiClient.post(API.NOTIFICATIONS.MARK_READ(id)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications', 'list'] });
      const previous = qc.getQueryData(['notifications', 'list']);
      qc.setQueryData(['notifications', 'list'], (old) => {
        if (!old) return old;
        const list = Array.isArray(old) ? old : (old?.results || []);
        const updated = list.map(n => String(n.id) === String(id) ? { ...n, is_read: true } : n);
        return Array.isArray(old) ? updated : { ...old, results: updated };
      });
      [['notifications', 'unread-count'], ['notifications', 'unread-count', 'assistant-page']].forEach(key => {
        qc.setQueryData(key, old => {
          if (!old) return old;
          const current = old.unread_count ?? old.unread ?? old.count ?? 0;
          const next = Math.max(0, current - 1);
          return { ...old, unread: next, unread_count: next, count: next };
        });
      });
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'assistant-page'] });
    },
    onError: () => toast?.error?.('فشل تحديد الإشعار كمقروء'),
  });

  // ── mark all read — POST /notifications/mark_all_read/
  const markAllRead = useMutation({
    mutationFn: () => apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ),

    // Optimistic update: flip all notifications to is_read=true in the cache
    // queryKey must match the useQuery above: ['notifications', 'list']
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications', 'list'] });
      const previous = qc.getQueryData(['notifications', 'list']);
      qc.setQueryData(['notifications', 'list'], (old) => {
        if (!old) return old;
        const list = Array.isArray(old) ? old : (old?.results || []);
        const updated = list.map(n => ({ ...n, is_read: true }));
        return Array.isArray(old) ? updated : { ...old, results: updated };
      });
      [['notifications', 'unread-count'], ['notifications', 'unread-count', 'assistant-page']].forEach(key => {
        qc.setQueryData(key, old => ({ ...(old || {}), unread: 0, unread_count: 0, count: 0 }));
      });
      return { previous };
    },

    onSuccess: () => {
      // Re-fetch fresh data from server
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'assistant-page'] });
      toast?.success?.('تم تحديد جميع الإشعارات كمقروءة ✅');
    },

    onError: (_err, _vars, context) => {
      // Roll back the optimistic update
      if (context?.previous !== undefined) {
        qc.setQueryData(['notifications', 'list'], context.previous);
      }
      // Re-fetch to sync with server state
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      toast?.error?.('فشل تحديد الإشعارات كمقروءة — يرجى المحاولة مرة أخرى');
    },
  });

  const notifications = data || [];

  // apply filter
  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'appointment') {
      const msg = (n.message || n.title || '').toLowerCase();
      return msg.includes('appointment') || msg.includes('موعد') || msg.includes('booking') || msg.includes('حجز');
    }
    return true;
  });

  const unreadCount = Math.max(0, Number(
    unreadData?.unread_count ?? unreadData?.unread ?? unreadData?.count ?? notifications.filter(n => !n.is_read).length
  ) || 0);
  const groups      = groupByDate(filtered);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>
            الإشعارات
            {unreadCount > 0 && (
              <span style={{
                marginRight: 8, fontSize: 12, fontWeight: 700,
                background: C.danger, color: '#fff',
                borderRadius: 10, padding: '2px 8px', verticalAlign: 'middle',
              }}>{unreadCount}</span>
            )}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${C.primary}`, background: 'transparent',
                color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Cairo,sans-serif',
              }}
            >
              {markAllRead.isPending ? '...' : '✓ تحديد الكل كمقروء'}
            </button>
          )}
          <button
            onClick={() => setShowPrefs(v => !v)}
            style={{
              padding: '7px 14px', borderRadius: 'var(--radius-pill)',
              border: `1.5px solid ${C.border}`, background: showPrefs ? C.primaryL : 'var(--bg-card)',
              color: showPrefs ? C.primary : C.muted, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
            }}
          >
            ⚙️ إعدادات الإشعارات
          </button>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius-pill)',
              border: `1.5px solid ${filter === f.key ? C.primary : C.border}`,
              background: filter === f.key ? C.primary : 'var(--bg-card)',
              color: filter === f.key ? '#fff' : C.muted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Cairo,sans-serif', transition: 'all 0.15s',
            }}
          >
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span style={{ marginRight: 4, background: 'rgba(255,255,255,.3)', borderRadius: 8, padding: '0 6px' }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main card ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${C.border}`,
        boxShadow: tokens.shadows?.sm || '0 1px 4px rgba(0,0,0,.06)',
        overflow: 'hidden',
      }}>
        {/* preferences panel */}
        {showPrefs && (
          <PreferencesPanel
            prefs={prefs}
            onChange={(key, val) => setPrefs(p => ({ ...p, [key]: val }))}
          />
        )}

        {/* loading */}
        {isLoading && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            جاري تحميل الإشعارات...
          </div>
        )}

        {/* error */}
        {isError && !isLoading && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.danger }}>
            ⚠️ فشل تحميل الإشعارات — تحقق من اتصالك بالإنترنت
          </div>
        )}

        {/* empty */}
        {!isLoading && !isError && filtered.length === 0 && <EmptyNotifs />}

        {/* groups */}
        {!isLoading && !isError && filtered.length > 0 &&
          Object.entries(groups).map(([label, items]) => {
            if (!items.length) return null;
            return (
              <div key={label}>
                <div style={{
                  padding: '10px 18px 6px',
                  fontSize: 11, fontWeight: 800, color: C.muted,
                  textTransform: 'uppercase', letterSpacing: '.04em',
                  background: 'var(--bg-subtle)',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {label} ({items.length})
                </div>
                {items.map((n, i) => (
                  <div key={n.id || i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <NotifCard notification={n} onMarkRead={(id) => markRead.mutate(id)} />
                  </div>
                ))}
              </div>
            );
          })
        }
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
