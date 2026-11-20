/**
 * features/patient/pages/NotificationsPage.jsx — i18n + tokens fix (Sprint 3)
 * كل النصوص عبر useTranslation — كل الألوان عبر tokens أو CSS variables
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../notifications/hooks/useNotifications';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import { formatRelativeTime } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';
import { tokens } from '../../../theme/tokens';
import { translateNotifText } from '../../../utils/translateNotification';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

const TYPE_ICONS = {
  confirmed:  '✅',
  rejected:   '❌',
  cancelled:  '❌',
  pending:    '📅',
  reminder:   '⏰',
  general:    '🔔',
};

// ألوان من tokens — لا hardcoded hex
const TYPE_COLORS = {
  confirmed: { bg: 'var(--success-light)',  border: tokens?.colors?.success?.DEFAULT || '#31A870', icon: tokens?.colors?.success?.DEFAULT || '#31A870' },
  rejected:  { bg: 'var(--danger-light)',   border: tokens?.colors?.danger?.DEFAULT || '#E97D61',  icon: tokens?.colors?.danger?.DEFAULT || '#E97D61'  },
  cancelled: { bg: 'var(--danger-light)',   border: tokens?.colors?.danger?.DEFAULT || '#E97D61',  icon: tokens?.colors?.danger?.DEFAULT || '#E97D61'  },
  pending:   { bg: 'var(--warning-light)',  border: tokens?.colors?.warning?.DEFAULT || '#F59E0B', icon: tokens?.colors?.warning?.DEFAULT || '#F59E0B' },
  reminder:  { bg: 'var(--info-light, #EFF6FF)',     border: tokens?.colors?.info?.DEFAULT || '#3B82F6',    icon: tokens?.colors?.info?.DEFAULT || '#3B82F6'    },
  general:   { bg: tokens.colors.gray[50],       border: tokens.colors.gray[200],       icon: tokens.colors.gray[400]       },
};

function getNotificationSemanticKey(notification) {
  const metadata = notification.metadata || notification.data?.metadata || notification.data || {};
  const appointmentId = metadata.appointment_id || notification.appointment_id;
  const status = metadata.new_status || metadata.status || notification.new_status || notification.status;
  if (appointmentId) {
    return [
      'appointment',
      appointmentId,
      status || '',
      notification.notification_type || notification.type || '',
      notification.title || '',
    ].join(':');
  }
  return [
    notification.notification_type || notification.type || '',
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

function NotifCard({ notification, onMarkRead, t, lang }) {
  const type = notification.notification_type || notification.type || 'general';
  const colors = TYPE_COLORS[type] || TYPE_COLORS.general;
  const isRead = notification.is_read || notification.read;

  return (
    <div
      onClick={() => !isRead && onMarkRead(notification.id)}
      style={{
        background: isRead ? 'var(--bg-card)' : 'var(--bg-subtle)',
        border: `1.5px solid ${isRead ? 'var(--border-base)' : colors.border}`,
        borderRadius: 'var(--radius-lg, 16px)', padding: '16px 20px',
        display: 'flex', gap: '14px', alignItems: 'flex-start',
        cursor: isRead ? 'default' : 'pointer',
        transition: 'var(--transition-fast, all 0.18s ease)',
        opacity: isRead ? 0.75 : 1,
      }}
      onMouseEnter={e => { if (!isRead) e.currentTarget.style.transform = 'translateX(4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md, 10px)',
        background: isRead ? 'var(--bg-card)' : `${colors.icon}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', flexShrink: 0,
      }}>
        {TYPE_ICONS[type] || '🔔'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <p style={{
            margin: '0 0 4px', fontSize: '14px', fontWeight: isRead ? 500 : 700,
            color: 'var(--text-h)', lineHeight: '1.4',
          }}>
            {translateNotifText(notification.title || notification.message, lang, 'title')}
          </p>
          {!isRead && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: colors.icon, flexShrink: 0, marginTop: '4px',
            }} />
          )}
        </div>
        {notification.title && notification.message && (
          <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted, #5D7E96)', lineHeight: '1.4' }}>
            {translateNotifText(notification.message, lang, 'message')}
          </p>
        )}
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-hint)' }}>
          {formatRelativeTime(notification.created_at || notification.createdAt)}
        </p>
      </div>
    </div>
  );
}

function NotifSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-page)', borderRadius: 'var(--radius-lg, 16px)', padding: '16px 20px',
      border: '1.5px solid var(--border-base)', display: 'flex', gap: '14px',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md, 10px)', background: 'var(--border-base)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, background: 'var(--border-base)', borderRadius: 'var(--radius-xs)', marginBottom: 8, width: '70%' }} />
        <div style={{ height: 12, background: 'var(--border-base)', borderRadius: 'var(--radius-xs)', width: '45%' }} />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { t, lang } = useTranslation();
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications({ page_size: 50 });
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count', 'patient-page'],
    queryFn: async () => {
      const res = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
      return res.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const { connected, clearAll: clearWsNotifications } = useRealtimeNotifications({ invalidateAppointments: true });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const all = dedupeNotifications(data?.results || data || []);
  const unread = all.filter(n => !(n.is_read || n.read));
  const unreadCount = Math.max(0, Number(
    unreadData?.unread_count ?? unreadData?.unread ?? unreadData?.count ?? unread.length
  ) || 0);
  const filtered = filter === 'unread' ? unread : all;

  // Fully sync: clear WS in-memory list + invalidate bell badge + list
  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        clearWsNotifications?.();
        // FIX A: Invalidate parent key (cascades) + explicit bell badge + dropdown list
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'patient-page'] });
        qc.invalidateQueries({ queryKey: ['notifications', 'bell-list'] });
      },
    });
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-h)' }}>
              {t('notificationsPage.title')}
            </h1>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? tokens?.colors?.success?.DEFAULT || '#31A870' : tokens?.colors?.danger?.DEFAULT || '#E97D61',
              boxShadow: `0 0 6px ${connected ? tokens?.colors?.success?.DEFAULT || '#31A870' : tokens?.colors?.danger?.DEFAULT || '#E97D61'}`,
            }} title={connected ? 'Live' : 'Offline'} />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {unreadCount} {t('notificationsPage.filters.unread')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            style={{
              background: tokens?.colors?.primary?.pale || '#E0F7FA',
              color: tokens?.colors?.primary?.DEFAULT || '#0E7490',
              border: 'none',
              padding: '8px 18px', borderRadius: 'var(--radius-md, 10px)', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
              opacity: markAllRead.isPending ? 0.6 : 1,
            }}
          >
            {markAllRead.isPending ? t('notificationsPage.marking') : t('notificationsPage.markAllRead')}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'all',    label: `${t('notificationsPage.filters.all')} (${all.length})` },
          { id: 'unread', label: `${t('notificationsPage.filters.unread')} (${unreadCount})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-md, 10px)', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              fontFamily: 'inherit', transition: 'var(--transition-fast)',
              background: filter === tab.id ? tokens?.colors?.primary?.DEFAULT || '#0E7490' : 'var(--border-base)',
              color: filter === tab.id ? '#fff' : 'var(--text-muted, #5D7E96)',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map(i => <NotifSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🔔</p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-h)', margin: '0 0 6px' }}>
            {filter === 'unread' ? t('notificationsPage.empty.noUnread') : t('notificationsPage.empty.noNotifs')}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-hint)', margin: 0 }}>
            {filter === 'unread' ? t('notificationsPage.empty.allCaughtUp') : t('notificationsPage.empty.willAppear')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(notif => (
            <NotifCard
              key={notif.id}
              notification={notif}
              onMarkRead={(id) => markRead.mutate(id)}
              t={t}
              lang={lang}
            />
          ))}
        </div>
      )}

    </div>
  );
}
