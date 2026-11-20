/**
 * NotificationsSection.jsx — Admin Notifications Center
 *
 * Sprint 1 — UX Design Report §7.9 تطبيق:
 *  • Tabs: الكل / غير مقروء / مواعيد / نظام / مستخدمين
 *  • تجميع الإشعارات حسب اليوم (اليوم / الأمس / سابقاً)
 *  • Mark single / Mark All as Read
 *  • Delete notification
 *  • Send Broadcast panel (Admin-only)
 *  • Empty states & Skeleton loading
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import { useToast } from '../../../context/ToastContext';

// ── Colour palette ──────────────────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PL  = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const CLR_SUCCESS = tokens?.colors?.success?.DEFAULT || '#31A870';
const CLR_DANGER  = tokens?.colors?.danger?.DEFAULT  || '#E97D61';
const CLR_WARNING = tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const CLR_INFO    = tokens?.colors?.info?.DEFAULT    || '#3B82F6';
const CLR_ACCENT  = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';

// ── Notification type config ─────────────────────────────────────────────────
const TYPE_CFG = {
  system:                { icon: '⚙️', color: CLR_INFO,    bg: '#EFF6FF',  label: 'نظام'         },
  new_appointment:       { icon: '📅', color: CLR_SUCCESS, bg: '#D1FAE5',  label: 'موعد جديد'   },
  appointment_confirmed: { icon: '✅', color: CLR_SUCCESS, bg: '#D1FAE5',  label: 'موعد مؤكد'   },
  appointment_rejected:  { icon: '❌', color: CLR_DANGER,  bg: '#FEE2E2',  label: 'موعد ملغي'   },
  appointment_reminder:  { icon: '⏰', color: CLR_WARNING, bg: '#FEF3C7',  label: 'تذكير'        },
  user_registration:     { icon: '👤', color: CLR_WARNING, bg: '#FEF3C7',  label: 'مستخدم جديد' },
  prescription:          { icon: '💊', color: CLR_ACCENT,  bg: '#EDE9FE',  label: 'وصفة'         },
  security_alert:        { icon: '🔒', color: CLR_DANGER,  bg: '#FEE2E2',  label: 'تنبيه أمني'  },
  report_ready:          { icon: '📋', color: CLR_ACCENT,  bg: '#EDE9FE',  label: 'تقرير جاهز'  },
  default:               { icon: '🔔', color: P,           bg: PL,         label: 'إشعار'        },
};

function getCfg(type = '') {
  return TYPE_CFG[type] || TYPE_CFG.default;
}

// ── Time helpers ─────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'منذ لحظات';
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 172800) return 'الأمس';
  return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function getDayGroup(dateStr) {
  if (!dateStr) return 'سابقاً';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 86400)  return 'اليوم';
  if (diff < 172800) return 'الأمس';
  return 'سابقاً';
}

// ── Tab Pill ─────────────────────────────────────────────────────────────────
function TabPill({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: 'var(--radius-full, 999px)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        border: 'none',
        background: active ? P : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-muted)',
        boxShadow: active ? `0 2px 8px ${P}44` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : P,
          color: active ? '#fff' : '#fff',
          borderRadius: 'var(--radius-full)', padding: '1px 7px',
          fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: 'center',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border-base)' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--border-base)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, background: 'var(--border-base)', borderRadius: 6, width: '70%' }} />
        <div style={{ height: 11, background: 'var(--border-base)', borderRadius: 6, width: '45%' }} />
      </div>
    </div>
  );
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ notif, onMarkRead, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const typeKey = notif.notification_type || notif.type || 'default';
  const cfg = getCfg(typeKey);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '15px 20px',
        background: notif.is_read
          ? (hovered ? 'var(--bg-page)' : 'var(--bg-card)')
          : (hovered ? '#EBF8FF' : '#F0F9FF'),
        borderBottom: '1px solid var(--border-base)',
        transition: 'background 0.15s',
        borderLeft: notif.is_read ? 'none' : `3px solid ${P}`,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: cfg.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, flexShrink: 0,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: notif.is_read ? 500 : 700,
          color: 'var(--text-h)', margin: '0 0 4px', lineHeight: 1.5,
        }}>
          {notif.message || notif.title || 'إشعار جديد'}
        </p>
        {notif.body && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.5 }}>
            {notif.body}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, color: cfg.color, fontWeight: 600,
            background: cfg.bg, padding: '2px 9px',
            borderRadius: 'var(--radius-full)', border: `1px solid ${cfg.color}22`,
          }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-hint, #94A3B8)' }}>
            {timeAgo(notif.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {!notif.is_read && (
          <>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: P, display: 'block' }} />
            <button onClick={() => onMarkRead(notif.id)} style={{
              fontSize: 11, color: P, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, fontFamily: 'inherit',
            }}>
              تحديد كمقروء
            </button>
          </>
        )}
        <button onClick={() => onDelete(notif.id)} style={{
          fontSize: 11, color: CLR_DANGER, fontWeight: 600,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontFamily: 'inherit',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}>
          حذف
        </button>
      </div>
    </div>
  );
}

// ── Section header (اليوم / الأمس / سابقاً) ──────────────────────────────────
function DayGroupHeader({ label }) {
  return (
    <div style={{
      padding: '10px 20px 6px',
      background: 'var(--bg-page)',
      borderBottom: '1px solid var(--border-base)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-base)' }} />
    </div>
  );
}

// ── Send Broadcast Panel ──────────────────────────────────────────────────────
function BroadcastPanel({ onSend, sending }) {
  const [target, setTarget] = useState('all');
  const [msgType, setMsgType] = useState('system');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    onSend({ target, type: msgType, message });
    setMessage('');
  };

  const fieldStyle = {
    padding: '9px 12px', borderRadius: 'var(--radius-base, 8px)',
    border: '1px solid var(--border-base)', background: 'var(--bg-card)',
    fontSize: 13, color: 'var(--text-body)', fontFamily: 'inherit',
    outline: 'none', flex: 1,
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--radius-lg, 12px)',
      padding: 20, marginTop: 24,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        📣 إرسال إشعار جماعي
      </h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={target} onChange={e => setTarget(e.target.value)} style={fieldStyle}>
          <option value="all">الجميع</option>
          <option value="doctors">الأطباء</option>
          <option value="patients">المرضى</option>
          <option value="hospitals">المستشفيات</option>
          <option value="assistants">المساعدين</option>
        </select>
        <select value={msgType} onChange={e => setMsgType(e.target.value)} style={fieldStyle}>
          <option value="system">نظام</option>
          <option value="security_alert">تنبيه أمني</option>
          <option value="appointment_reminder">تذكير</option>
        </select>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="نص الإشعار..."
          style={{ ...fieldStyle, flex: 3, minWidth: 200 }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          style={{
            padding: '9px 20px', borderRadius: 'var(--radius-base)',
            background: P, color: '#fff', fontWeight: 700, fontSize: 13,
            border: 'none', cursor: message.trim() && !sending ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', opacity: message.trim() && !sending ? 1 : 0.6,
            transition: 'opacity 0.2s',
          }}
        >
          {sending ? '⏳ إرسال...' : 'إرسال 📤'}
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyNotifications({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔕</div>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: 'var(--txt-heading)' }}>لا توجد إشعارات</p>
      <p style={{ fontSize: 13, margin: 0 }}>{label || 'لا توجد إشعارات في هذا التصنيف حالياً'}</p>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function NotificationsSection() {
  const qc = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Fetch
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get(API.NOTIFICATIONS.LIST, { params: { limit: 100 } });
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Mark single read
  const markRead = useMutation({
    mutationFn: id => apiClient.patch(API.NOTIFICATIONS.MARK_READ(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  // Mark all read
  const markAll = useMutation({
    mutationFn: () => apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast?.success?.('تم تحديد جميع الإشعارات كمقروءة');
    },
  });

  // Delete
  const deleteNotif = useMutation({
    mutationFn: id => apiClient.delete(API.NOTIFICATIONS.DELETE(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  // Broadcast
  // ISSUE-018 FIX: Use the correct API path via apiClient (prefix /api/v1/ handled by baseURL)
  const handleBroadcast = async (payload) => {
    if (!payload?.message?.trim()) {
      toast?.error?.('يرجى كتابة نص الإشعار');
      return;
    }
    setSendingBroadcast(true);
    try {
      await apiClient.post('/notifications/broadcast/', payload);
      toast?.success?.('تم إرسال الإشعار للمستخدمين بنجاح');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'حدث خطأ أثناء الإرسال';
      toast?.error?.(msg);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const notifications = useMemo(() => {
    const raw = data?.results || data || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  // Tab counts
  const counts = useMemo(() => ({
    all:       notifications.length,
    unread:    notifications.filter(n => !n.is_read).length,
    appointments: notifications.filter(n => (n.type || n.notification_type || '').includes('appointment')).length,
    system:    notifications.filter(n => (n.type || n.notification_type || '') === 'system').length,
    users:     notifications.filter(n => (n.type || n.notification_type || '').includes('user')).length,
  }), [notifications]);

  // Filter by tab
  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'unread':       return notifications.filter(n => !n.is_read);
      case 'appointments': return notifications.filter(n => (n.type || n.notification_type || '').includes('appointment'));
      case 'system':       return notifications.filter(n => (n.type || n.notification_type || '') === 'system');
      case 'users':        return notifications.filter(n => (n.type || n.notification_type || '').includes('user'));
      default:             return notifications;
    }
  }, [notifications, activeTab]);

  // Group by day
  const grouped = useMemo(() => {
    const groups = {};
    const order = ['اليوم', 'الأمس', 'سابقاً'];
    filtered.forEach(n => {
      const g = getDayGroup(n.created_at);
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    return order.filter(k => groups[k]).map(k => ({ label: k, items: groups[k] }));
  }, [filtered]);

  const TABS = [
    { id: 'all',          label: 'الكل' },
    { id: 'unread',       label: 'غير مقروء' },
    { id: 'appointments', label: 'المواعيد' },
    { id: 'system',       label: 'نظام' },
    { id: 'users',        label: 'مستخدمين' },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt-heading)', margin: '0 0 4px' }}>
            🔔 مركز الإشعارات
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {counts.unread > 0 ? `لديك ${counts.unread} إشعار غير مقروء` : 'جميع الإشعارات مقروءة ✓'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => markAll.mutate()}
            disabled={counts.unread === 0 || markAll.isPending}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-base)',
              border: `1px solid ${P}`, background: 'var(--bg-card)',
              color: P, fontWeight: 600, fontSize: 13,
              cursor: counts.unread > 0 ? 'pointer' : 'not-allowed',
              opacity: counts.unread > 0 ? 1 : 0.4,
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            ✓ قراءة الكل
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map(tab => (
          <TabPill
            key={tab.id}
            label={tab.label}
            count={tab.id === 'all' ? undefined : counts[tab.id]}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Notifications card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-base)',
        borderRadius: 'var(--radius-lg, 12px)',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : grouped.length === 0 ? (
          <EmptyNotifications />
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              <DayGroupHeader label={group.label} />
              {group.items.map(notif => (
                <NotifRow
                  key={notif.id}
                  notif={notif}
                  onMarkRead={id => markRead.mutate(id)}
                  onDelete={id => deleteNotif.mutate(id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Broadcast panel */}
      <BroadcastPanel onSend={handleBroadcast} sending={sendingBroadcast} />
    </div>
  );
}
