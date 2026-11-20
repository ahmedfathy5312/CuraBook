/**
 * features/notifications/pages/NotificationsPage.jsx — i18n fix (Sprint 3)
 * كل النصوص عبر useTranslation
 */
import { useState } from 'react';
import { formatDate, formatTime } from '../../../utils/formatters';
import { useNotifications, useMarkRead, useMarkAllRead } from '../hooks/useNotifications';
import { useTranslation } from '../../../i18n/useTranslation';

// ─── Single Notification Row ──────────────────────────────────────────────────
function normalizeNotificationText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getNotificationTimeBucket(notification) {
  const raw = notification.created_at || notification.timestamp || notification.created || notification.updated_at;
  const time = raw ? new Date(raw).getTime() : 0;
  if (!Number.isFinite(time) || time <= 0) return '';
  return Math.floor(time / 60_000);
}

function getNotificationSemanticKey(notification) {
  const metadata = notification.metadata || notification.data?.metadata || notification.data || {};
  const appointmentId = metadata.appointment_id || notification.appointment_id;
  const status = metadata.new_status || metadata.status || notification.new_status || notification.status;
  const type = notification.notification_type || notification.type || '';
  const title = normalizeNotificationText(notification.title || notification.message || notification.body);
  const statusKey = normalizeNotificationText(status || type || title);
  if (appointmentId) {
    return [
      'appointment',
      appointmentId,
      statusKey,
    ].join(':');
  }
  return [
    'notification',
    statusKey,
    title,
    getNotificationTimeBucket(notification),
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

function NotificationRow({ notif, onMarkRead, t }) {
  const typeCfgMap = {
    appointment_confirmed: { icon: '✅', color: 'var(--success)', bg: 'var(--success-light)' },
    appointment_rejected:  { icon: '❌', color: 'var(--danger)',  bg: 'var(--danger-light)' },
    appointment_reminder:  { icon: '⏰', color: 'var(--warning)', bg: 'var(--warning-light)' },
    new_appointment:       { icon: '📅', color: 'var(--info)',    bg: 'var(--info-light)' },
    prescription:          { icon: '💊', color: '#8B5CF6',        bg: 'var(--primary-pale)' },
    system:                { icon: 'ℹ️', color: 'var(--text-muted)', bg: 'var(--border-base)' },
  };
  const typeKey = notif.notification_type || notif.type || 'system';
  const cfg = typeCfgMap[typeKey] || typeCfgMap.system;
  const typeLabel = t(`notificationsPage.types.${typeKey}`) || t('notificationsPage.types.system');

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '16px',
        padding: '16px 20px',
        background: notif.is_read ? 'var(--bg-card)' : 'var(--bg-subtle)',
        borderBottom: '1px solid var(--border-base)',
        transition: 'background 0.2s',
      }}
    >
      {/* Icon badge */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: cfg.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '18px', flexShrink: 0,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Fix Dark Mode Contrast: Title uses bright white/light blue, Body uses light gray */}
        <p className="text-[var(--text-h)] dark:text-[#FFFFFF]" style={{
          fontSize: '14px', fontWeight: notif.is_read ? 500 : 700,
          margin: '0 0 4px', lineHeight: 1.5,
        }}>
          {notif.message || notif.title || t('notificationsPage.title')}
        </p>
        {notif.body && (
          <p className="text-[var(--text-muted)] dark:text-[#D1D5DB]" style={{ fontSize: '13px', margin: '0 0 6px', lineHeight: 1.5 }}>
            {notif.body}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px', color: cfg.color, fontWeight: 600,
            background: cfg.bg, padding: '2px 8px', borderRadius: 'var(--radius-full)',
          }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
            {notif.created_at
              ? `${formatDate(notif.created_at)} · ${formatTime(notif.created_at)}`
              : t('notificationsPage.justNow')}
          </span>
        </div>
      </div>

      {/* Unread indicator + mark-read */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        {!notif.is_read && (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'block' }} />
            <button
              onClick={() => onMarkRead(notif.id)}
              style={{
                fontSize: '11px', color: 'var(--primary)', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 0', fontFamily: 'inherit',
              }}
            >
              {t('notificationsPage.markRead')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { t, isRTL } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');

  const { data, isLoading, isError } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const rawNotifications = data?.results || data || [];
  const notifications = dedupeNotifications(rawNotifications);

  const filterKeys = ['all', 'unread', 'appointment_confirmed', 'appointment_rejected', 'appointment_reminder'];

  const filtered = notifications.filter(n => {
    if (activeFilter === 'all')    return true;
    if (activeFilter === 'unread') return !n.is_read;
    return (n.notification_type || n.type) === activeFilter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px', fontFamily: "'Cairo', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
            {t('notificationsPage.title')}
            {unreadCount > 0 && (
              <span style={{
                marginInlineStart: 8, background: 'var(--primary)', color: '#fff',
                borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700,
                padding: '2px 8px', verticalAlign: 'middle',
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-hint)', margin: 0 }}>
            {t('notificationsPage.subtitle')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={{
              background: 'var(--bg)', color: 'var(--primary)', border: '1.5px solid var(--border-base)',
              borderRadius: 'var(--radius-md)', padding: '8px 18px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              opacity: markAllRead.isPending ? 0.6 : 1,
            }}
          >
            {markAllRead.isPending ? t('notificationsPage.marking') : t('notificationsPage.markAllRead')}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterKeys.map(key => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
              background: activeFilter === key ? 'var(--primary)' : 'var(--border-base)',
              color:      activeFilter === key ? '#fff'    : 'var(--text-muted)',
              border:     activeFilter === key ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
            }}
          >
            {t(`notificationsPage.filters.${key}`)}
            {key === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-hint)', fontSize: '14px' }}>
            {t('notificationsPage.loading')}
          </div>
        ) : isError ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--danger)', fontSize: '14px' }}>
            {t('notificationsPage.error')}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔕</div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>
              {activeFilter === 'unread' ? t('notificationsPage.empty.allCaughtUp') : t('notificationsPage.empty.noNotifs')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-hint)', margin: 0 }}>
              {activeFilter === 'unread' ? t('notificationsPage.empty.noUnread') : t('notificationsPage.empty.willAppear')}
            </p>
          </div>
        ) : (
          filtered.map(notif => (
            <NotificationRow
              key={getNotificationSemanticKey(notif) || notif.id}
              notif={notif}
              onMarkRead={(id) => markRead.mutate(id)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
