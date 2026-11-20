/**
 * HospitalNotificationsPage.jsx — i18n FIXED (Sprint 3)
 * All strings via useTranslation — bilingual AR/EN
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useTranslation } from '../../../i18n/useTranslation';

const P = 'var(--primary)', PL = 'var(--primary-pale)';

const NOTIF_ICONS = {
  appointment: '📅',
  doctor:      '👨‍⚕️',
  patient:     '👤',
  department:  '🏢',
  system:      '🔔',
  reminder:    '⏰',
  default:     '🔔',
};

function getIcon(type = '') {
  const key = Object.keys(NOTIF_ICONS).find(k => type.toLowerCase().includes(k));
  return NOTIF_ICONS[key] || NOTIF_ICONS.default;
}

function timeAgo(dateStr, t) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return t('notificationsPage.justNow');
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function getNotificationSemanticKey(notification) {
  const metadata = notification.metadata || notification.data?.metadata || notification.data || {};
  const appointmentId = metadata.appointment_id || notification.appointment_id;
  const status = metadata.new_status || metadata.status || notification.new_status || notification.status;
  if (appointmentId) {
    return ['appointment', appointmentId, status || notification.notification_type || notification.type || 'new'].join(':');
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

function Pill({ label, val, filter, setFilter }) {
  const active = filter === val;
  return (
    <button
      onClick={() => setFilter(val)}
      style={{
        padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
        background: active ? P : 'var(--border-base)',
        color: active ? '#fff' : 'var(--text-muted)',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}

export default function HospitalNotificationsPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const { data: apiData, isLoading, isSuccess } = useQuery({
    queryKey: ['hospital', 'notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.NOTIFICATIONS.LIST);
      return data;
    },
    staleTime: 30_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count', 'hospital-page'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
      return data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const {
    notifications: wsNotifications,
    connected,
  } = useRealtimeNotifications({
    invalidateAppointments: true,
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['hospital', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'hospital-page'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id) => apiClient.patch(API.NOTIFICATIONS.MARK_READ(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'hospital-page'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['hospital', 'notifications'] });
      const previous = qc.getQueryData(['hospital', 'notifications']);
      // Optimistic update: mark all as read immediately in UI
      qc.setQueryData(['hospital', 'notifications'], (old) => {
        if (!old) return old;
        const results = Array.isArray(old) ? old : (old?.results || []);
        const updated = results.map(n => ({ ...n, is_read: true }));
        return Array.isArray(old) ? updated : { ...old, results: updated };
      });
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'hospital-page'] });
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        qc.setQueryData(['hospital', 'notifications'], context.previous);
      }
    },
  });

  const apiNotifs = Array.isArray(apiData)
    ? apiData
    : (apiData?.results || apiData?.data?.results || (Array.isArray(apiData?.data) ? apiData.data : []));
  const wsKeys = new Set(wsNotifications.map(getNotificationSemanticKey));
  const wsFormatted = wsNotifications.map(n => ({
    id: n.id || n.notification_id || `ws-${getNotificationSemanticKey(n)}`,
    title: n.title || n.message || n.body,
    body: n.body || n.data?.body || '',
    notification_type: n.type, is_read: n.is_read ?? n.read, metadata: n.metadata || n.data,
    created_at: n.created_at || n.timestamp, _fromWS: true,
  }));
  const apiFormatted = apiNotifs.filter(n => !wsKeys.has(getNotificationSemanticKey(n)));
  const allNotifications = dedupeNotifications([...wsFormatted, ...apiFormatted]);

  const unreadCount = Math.max(0, Number(
    unreadData?.unread_count ?? unreadData?.unread ?? unreadData?.count ?? apiNotifs.filter(n => !n.is_read).length
  ) || 0);
  const displayConnected = connected || isSuccess;

  const filtered = allNotifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read')   return n.is_read;
    return true;
  });

  const unreadLabel = unreadCount === 1
    ? t('hospitalNotificationsPage.unread', { count: unreadCount })
    : t('hospitalNotificationsPage.unreadPlural', { count: unreadCount });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {t('hospitalNotificationsPage.title')}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 600, padding: '2px 10px',
              borderRadius: 'var(--radius-full)',
              background: displayConnected ? 'var(--success-light)' : 'var(--bg-subtle)',
              color: displayConnected ? 'var(--success)' : 'var(--text-muted)',
              border: `1px solid ${displayConnected ? 'var(--success-light,#86efac)' : 'var(--border-base)'}`,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: displayConnected ? 'var(--success,#22c55e)' : 'var(--text-muted)', display: 'inline-block' }} />
              {displayConnected ? t('hospitalNotificationsPage.live') : t('hospitalNotificationsPage.offline')}
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {unreadCount > 0 ? unreadLabel : t('hospitalNotificationsPage.allCaughtUp')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', background: PL, color: P, border: `1px solid ${P}`, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {t('hospitalNotificationsPage.markAllRead')}
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Pill label={t('hospitalNotificationsPage.filterAll')}                      val="all"    filter={filter} setFilter={setFilter} />
        <Pill label={t('hospitalNotificationsPage.filterUnread', { count: unreadCount })} val="unread" filter={filter} setFilter={setFilter} />
        <Pill label={t('hospitalNotificationsPage.filterRead')}                     val="read"   filter={filter} setFilter={setFilter} />
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-hint)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <p>{t('hospitalNotificationsPage.loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-hint)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔔</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-body)', marginBottom: '8px' }}>
            {filter === 'unread' ? t('hospitalNotificationsPage.noUnread') : t('hospitalNotificationsPage.noNotifs')}
          </h3>
          <p style={{ fontSize: '14px' }}>
            {filter === 'unread' ? t('hospitalNotificationsPage.allCaughtUpMsg') : t('hospitalNotificationsPage.alertsWillAppear')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && !notif._fromWS && markRead.mutate(notif.id)}
              style={{
                background: notif.is_read ? 'var(--bg-card)' : 'var(--bg-subtle)',
                border: `1px solid ${notif.is_read ? 'var(--border)' : 'var(--primary)'}`,
                borderLeft: notif.is_read ? undefined : `4px solid ${P}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                cursor: notif.is_read ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '24px', flexShrink: 0 }}>
                {getIcon(notif.notification_type || notif.type || '')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ fontWeight: notif.is_read ? 500 : 700, color: 'var(--text-h)', fontSize: '14px', margin: 0 }}>
                    {notif.title || notif.message || t('hospitalNotificationsPage.fallbackTitle')}
                    {notif._fromWS && (
                      <span style={{ marginInlineStart: '8px', fontSize: '10px', background: 'var(--primary-pale,#E6F1FB)', color: P, padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        {t('hospitalNotificationsPage.newBadge')}
                      </span>
                    )}
                  </p>
                  <span style={{ fontSize: '12px', color: 'var(--text-hint)', flexShrink: 0 }}>
                    {timeAgo(notif.created_at, t)}
                  </span>
                </div>
                {notif.body && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{notif.body}</p>
                )}
                {!notif.is_read && !notif._fromWS && (
                  <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', color: P, fontWeight: 600 }}>
                    {t('hospitalNotificationsPage.markAsRead')}
                  </span>
                )}
              </div>
              {!notif.is_read && (
                <div style={{ width: '8px', height: '8px', background: P, borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
