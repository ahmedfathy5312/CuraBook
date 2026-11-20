import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../../../i18n/useTranslation';
import tokens from '../../../theme/tokens';
import Button from '../../../components/ui/Button';
import apiClient from '../../../services/apiClient';
import API from '../../../constants/apiRoutes';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import { translateNotifText } from '../../../utils/translateNotification';
import { useToast } from '../../../context/ToastContext';

const MOD_P = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD = tokens?.colors?.primary?.dark || '#0C6478';
const MOD_WARNING = tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const MOD_DANGER = tokens?.colors?.danger?.DEFAULT || '#EF4444';
const MOD_MUTED = tokens?.colors?.gray?.[400] || '#9CA3AF';
const MOD_MD = tokens?.shadows?.md || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_SM = tokens?.shadows?.sm || '0 4px 20px rgba(0,0,0,0.06)';

function timeAgo(dateStr, isRTL) {
  if (!dateStr) return '';
  const diff = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return isRTL ? 'الآن' : 'Just now';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return isRTL ? `منذ ${mins} دقيقة` : `${mins} mins ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return isRTL ? `منذ ${hours} ساعة` : `${hours} hours ago`;
  }
  const days = Math.floor(diff / 86400);
  return isRTL ? `منذ ${days} يوم` : `${days} days ago`;
}

function getIconForType(type) {
  switch (type) {
    case 'appointment': return { icon: '📅', color: MOD_P };
    case 'review': return { icon: '⭐', color: MOD_WARNING };
    case 'reminder': return { icon: '🔔', color: MOD_MUTED };
    case 'payment': return { icon: '💳', color: MOD_SUCCESS };
    case 'system': return { icon: '⚙️', color: '#6366F1' };
    case 'message': return { icon: '💬', color: MOD_P };
    case 'urgent': return { icon: '🚨', color: MOD_DANGER };
    default: return { icon: '📌', color: MOD_P };
  }
}

function getActionForType(type, isRTL) {
  switch (type) {
    case 'appointment': return { label: isRTL ? 'عرض الموعد' : 'View Appointment', to: '/patient-appointments' };
    case 'review': return { label: isRTL ? 'عرض التقييمات' : 'View Reviews', to: '/doctor-analytics' };
    case 'payment': return { label: isRTL ? 'عرض الفاتورة' : 'View Invoice', to: '/billing' };
    case 'message': return { label: isRTL ? 'الرد' : 'Reply', to: '/chat/doctor' };
    case 'system': return { label: isRTL ? 'الإعدادات' : 'Settings', to: '/profile-settings' };
    default: return null;
  }
}

const readFilters = (isRTL, unreadCount) => [
  { id: 'all', label: isRTL ? 'الكل' : 'All' },
  { id: 'unread', label: `${isRTL ? 'غير مقروء' : 'Unread'} (${unreadCount})` },
  { id: 'read', label: isRTL ? 'مقروء' : 'Read' },
];

const typeFilters = (isRTL) => [
  { id: 'all', icon: '🔔', label: isRTL ? 'كل الأنواع' : 'All Types' },
  { id: 'appointment', icon: '📅', label: isRTL ? 'المواعيد' : 'Appointments' },
  { id: 'message', icon: '💬', label: isRTL ? 'الرسائل' : 'Messages' },
  { id: 'review', icon: '⭐', label: isRTL ? 'التقييمات' : 'Reviews' },
  { id: 'payment', icon: '💳', label: isRTL ? 'المدفوعات' : 'Payments' },
  { id: 'urgent', icon: '🚨', label: isRTL ? 'عاجل' : 'Urgent' },
  { id: 'system', icon: '⚙️', label: isRTL ? 'النظام' : 'System' },
];

function getNotificationText(notif, language) {
  const title = notif.title || notif.subject || '';
  const body = notif.body || notif.message || notif.description || '';
  return {
    title: translateNotifText(title, language, 'title'),
    body: translateNotifText(body, language, 'message'),
  };
}

function removeNotificationFromCache(old, id) {
  if (!old) return old;
  if (Array.isArray(old)) return old.filter(n => n.id !== id);
  if (Array.isArray(old.results)) {
    const nextResults = old.results.filter(n => n.id !== id);
    return { ...old, results: nextResults, count: Math.max(0, Number(old.count || nextResults.length) - 1) };
  }
  return old;
}

export default function DoctorNotificationsPage() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const toast = useToast();
  const qc = useQueryClient();
  const { clearAll: clearWsNotifications } = useRealtimeNotifications({ invalidateAppointments: false });
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const PAGE_STEP = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get(API.NOTIFICATIONS.LIST);
      return res.data;
    },
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count', 'doctor-page'],
    queryFn: async () => {
      const res = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
      return res.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const notifications = Array.isArray(data) ? data : (data?.results || []);
  const unreadCount = Math.max(0, Number(
    unreadData?.unread_count ?? unreadData?.unread ?? unreadData?.count ?? notifications.filter(n => !n.is_read).length
  ) || 0);

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.post(API.NOTIFICATIONS.MARK_READ(id));
      return res.data;
    },
    onMutate: (id) => {
      qc.setQueryData(['notifications'], old => {
        if (!old) return old;
        const mark = n => n.id === id ? { ...n, is_read: true } : n;
        if (Array.isArray(old)) return old.map(mark);
        if (Array.isArray(old.results)) return { ...old, results: old.results.map(mark) };
        return old;
      });
      [['notifications', 'unread-count'], ['notifications', 'unread-count', 'doctor-page']].forEach(key => {
        qc.setQueryData(key, old => {
          if (!old) return old;
          const current = old.unread_count ?? old.unread ?? old.count ?? 0;
          const next = Math.max(0, current - 1);
          return { ...old, unread: next, unread_count: next, count: next };
        });
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'doctor-page'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'bell-list'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ);
      return res.data;
    },
    onMutate: () => {
      qc.setQueryData(['notifications'], old => {
        if (!old) return old;
        const mark = n => ({ ...n, is_read: true });
        if (Array.isArray(old)) return old.map(mark);
        if (Array.isArray(old.results)) return { ...old, results: old.results.map(mark) };
        return old;
      });
      [['notifications', 'unread-count'], ['notifications', 'unread-count', 'doctor-page']].forEach(key => {
        qc.setQueryData(key, old => ({ ...(old || {}), unread: 0, unread_count: 0, count: 0 }));
      });
    },
    onSuccess: () => {
      clearWsNotifications?.();
      toast.success(isRTL ? 'تم تحديد كل الإشعارات كمقروءة' : 'All notifications marked as read.');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'doctor-page'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'bell-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(API.NOTIFICATIONS.DELETE(id));
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = qc.getQueryData(['notifications']);
      const previousUnread = qc.getQueryData(['notifications', 'unread-count', 'doctor-page']);
      const deleted = notifications.find(n => n.id === id);

      qc.setQueryData(['notifications'], old => removeNotificationFromCache(old, id));
      if (deleted && !deleted.is_read) {
        [['notifications', 'unread-count'], ['notifications', 'unread-count', 'doctor-page']].forEach(key => {
          qc.setQueryData(key, old => {
            if (!old) return old;
            const current = old.unread_count ?? old.unread ?? old.count ?? 0;
            const next = Math.max(0, current - 1);
            return { ...old, unread: next, unread_count: next, count: next };
          });
        });
      }

      return { previousNotifications, previousUnread };
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم حذف الإشعار' : 'Notification deleted.');
    },
    onError: (err, _id, context) => {
      if (context?.previousNotifications) qc.setQueryData(['notifications'], context.previousNotifications);
      if (context?.previousUnread) qc.setQueryData(['notifications', 'unread-count', 'doctor-page'], context.previousUnread);
      toast.error(err?.response?.data?.detail || (isRTL ? 'فشل حذف الإشعار' : 'Failed to delete notification.'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count', 'doctor-page'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'bell-list'] });
    },
  });

  const handleMarkAsRead = (id, isRead) => {
    if (id && !isRead) markReadMutation.mutate(id);
  };

  const filtered = notifications.filter(n => {
    const readOK = filter === 'all' ? true : filter === 'unread' ? !n.is_read : n.is_read;
    const typeOK = typeFilter === 'all' ? true : n.type === typeFilter;
    return readOK && typeOK;
  });
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{
        background: `linear-gradient(135deg, ${MOD_WARNING} 0%, ${MOD_DANGER} 100%)`,
        borderRadius: 24,
        padding: '36px 40px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 32,
        boxShadow: MOD_MD,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <div style={{ position: 'absolute', top: -50, right: isRTL ? 'auto' : -20, left: isRTL ? -20 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px' }}>
            🔔 {t('notifications.title', isRTL ? 'الإشعارات' : 'Notifications')}
          </h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.92, maxWidth: 470, lineHeight: 1.7 }}>
            {isRTL
              ? 'تابع آخر التحديثات الخاصة بمواعيدك، ورسائل المرضى، والتنبيهات المهمة داخل النظام.'
              : 'Keep track of appointment updates, patient messages, and important system alerts.'}
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Button
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            style={{ fontWeight: 800, borderRadius: 16, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 24px', backdropFilter: 'blur(10px)' }}
          >
            {markAllReadMutation.isPending ? '...' : '✓'} {isRTL ? 'تحديد الكل كمقروء' : 'Mark All as Read'}
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {readFilters(isRTL, unreadCount).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '10px 24px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 800,
              background: filter === f.id ? MOD_P : 'var(--bg-card)',
              color: filter === f.id ? '#fff' : 'var(--text-h)',
              border: filter === f.id ? '2px solid transparent' : '2px solid var(--border-base)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: filter === f.id ? `0 8px 20px ${MOD_P}40` : 'none',
              fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {typeFilters(isRTL).map(tp => (
          <button
            key={tp.id}
            onClick={() => { setTypeFilter(tp.id); setVisibleCount(PAGE_STEP); }}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 800,
              background: typeFilter === tp.id ? 'rgba(14,116,144,0.18)' : 'var(--bg-subtle)',
              color: typeFilter === tp.id ? '#67E8F9' : 'var(--text-h)',
              border: `1.5px solid ${typeFilter === tp.id ? MOD_PD : 'var(--border-base)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <span>{tp.icon}</span> {tp.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: MOD_MUTED, fontSize: 18, fontWeight: 800 }}>
            {isRTL ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 24, border: '2px dashed var(--border-base)' }}>
            <span style={{ fontSize: 52, display: 'block', marginBottom: 16, opacity: 0.55 }}>🔕</span>
            <p style={{ fontWeight: 800, color: 'var(--text-h)', fontSize: 16, margin: 0 }}>
              {isRTL ? 'لا توجد إشعارات لهذا التصنيف' : 'No notifications for this category'}
            </p>
          </div>
        ) : visible.map(notif => {
          const { icon, color } = getIconForType(notif.type);
          const { title, body } = getNotificationText(notif, language);
          const action = getActionForType(notif.type, isRTL);
          const isDeleting = deleteMutation.isPending && deleteMutation.variables === notif.id;

          return (
            <div
              key={notif.id}
              onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
              style={{
                display: 'flex',
                gap: 20,
                padding: '24px 28px',
                background: notif.is_read ? 'var(--bg-card)' : 'var(--bg-subtle)',
                borderRadius: 24,
                border: '2px solid',
                borderColor: notif.is_read ? 'var(--border-base)' : color,
                cursor: notif.is_read ? 'default' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: notif.is_read ? MOD_SM : `0 10px 30px ${color}20`,
                position: 'relative',
                overflow: 'hidden',
                opacity: isDeleting ? 0.55 : 1,
              }}
              onMouseEnter={e => { if (!notif.is_read) e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { if (!notif.is_read) e.currentTarget.style.transform = 'none'; }}
            >
              {!notif.is_read && (
                <div style={{ position: 'absolute', top: 0, [isRTL ? 'right' : 'left']: 0, bottom: 0, width: 8, background: color }} />
              )}
              {!notif.is_read && (
                <div style={{ position: 'absolute', top: 24, [isRTL ? 'left' : 'right']: 24, width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}` }} />
              )}

              <div style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: notif.is_read ? 'var(--bg-subtle)' : `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
              }}>
                {icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 8, paddingInlineEnd: !notif.is_read ? 20 : 0 }}>
                  <h4 style={{ margin: 0, fontSize: 18, color: 'var(--text-h)', fontWeight: notif.is_read ? 700 : 900, lineHeight: 1.45 }}>
                    {title || (isRTL ? 'إشعار جديد' : 'New Notification')}
                  </h4>
                  <span style={{ fontSize: 13, color: notif.is_read ? 'var(--text-hint)' : color, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {timeAgo(notif.created_at, isRTL)}
                  </span>
                </div>
                {body && (
                  <p style={{ margin: '0 0 16px', fontSize: 15, color: notif.is_read ? 'var(--text-muted)' : 'var(--text-body)', lineHeight: 1.7, fontWeight: notif.is_read ? 500 : 700 }}>
                    {body}
                  </p>
                )}

                {action && (
                  <Link
                    to={action.to}
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 16px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                      background: `${color}15`,
                      color,
                      border: `1px solid ${color}35`,
                      transition: 'all 0.2s',
                    }}
                  >
                    {action.label} ←
                  </Link>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (notif.id && window.confirm(isRTL ? 'هل تريد حذف هذا الإشعار؟' : 'Delete this notification?')) {
                    deleteMutation.mutate(notif.id);
                  }
                }}
                disabled={isDeleting}
                style={{
                  position: 'absolute',
                  bottom: 24,
                  [isRTL ? 'left' : 'right']: 24,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(239,68,68,0.10)',
                  border: `1px solid ${MOD_DANGER}30`,
                  color: MOD_DANGER,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  opacity: isDeleting ? 0.5 : 0.85,
                  transition: 'all 0.2s',
                }}
                title={isRTL ? 'حذف' : 'Delete'}
              >
                {isDeleting ? '...' : '🗑'}
              </button>
            </div>
          );
        })}

        {!isLoading && hasMore && (
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <button
              onClick={() => setVisibleCount(c => c + PAGE_STEP)}
              style={{ padding: '14px 40px', borderRadius: 50, border: `2px solid ${MOD_P}`, background: 'var(--bg-card)', color: MOD_P, fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = MOD_P; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = MOD_P; }}
            >
              {isRTL ? `تحميل المزيد (${filtered.length - visibleCount} متبقي)` : `Load More (${filtered.length - visibleCount} remaining)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
