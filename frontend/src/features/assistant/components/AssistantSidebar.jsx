/**
 * AssistantSidebar.jsx — v33 Sprint3
 *
 * Sidebar logic extracted from AssistantLayout.jsx.
 * Sprint 2: added Patients, Analytics, Settings pages to nav.
 * Sprint 3 LOW-01 FIX: Added notification badge counters for:
 *   - Appointments: shows pending appointment count
 *   - Notifications: shows unread notification count
 *
 * Usage:
 *   <AssistantSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
 */
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useTranslation from '../../../i18n/useTranslation';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

const P          = 'var(--primary)';
const SIDEBAR_W  = 240;
const COLLAPSED_W = 64;

const NAV_ITEMS = [
  { to: '/assistant-dashboard',      icon: '📊', labelKey: 'nav.dashboard'     },
  { to: '/assistant-appointments',   icon: '📋', labelKey: 'nav.appointments',  badgeKey: 'pending'       },
  { to: '/assistant-prescriptions',  icon: '💊', labelKey: 'nav.prescriptions' },
  { to: '/assistant-schedule',       icon: '🗓️', labelKey: 'nav.schedule'      },
  { to: '/assistant-patients',       icon: '👥', labelKey: 'nav.patients'      },
  { to: '/assistant-analytics',      icon: '📈', labelKey: 'nav.analytics'     },
  { to: '/assistant-chat',           icon: '💬', labelKey: 'nav.chat'          },
  { to: '/assistant-reports',        icon: '📄', labelKey: 'nav.reports'       },
  { to: '/assistant-notifications',  icon: '🔔', labelKey: 'nav.notifications', badgeKey: 'notifications' },
  { to: '/assistant-settings',       icon: '⚙️', labelKey: 'nav.settings'      },
  { to: '/assistant-profile',        icon: '👤', labelKey: 'nav.profile'       },
];

/* ── Badge dot style ─────────────────────────────────────────────────────── */
function Badge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span style={{
      marginInlineStart: 'auto',
      minWidth: 18,
      height: 18,
      borderRadius: 9999,
      background: '#ef4444',
      color: '#fff',
      fontSize: 10,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
      flexShrink: 0,
      lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ── Collapsed badge dot (no number, just a red dot) ────────────────────── */
function CollapsedDot() {
  return (
    <span style={{
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#ef4444',
      border: '1.5px solid var(--bg-card)',
    }} />
  );
}

export default function AssistantSidebar({ collapsed, onToggle }) {
  const { t } = useTranslation();
  const width = collapsed ? COLLAPSED_W : SIDEBAR_W;

  /* LOW-01: fetch pending appointments count */
  const { data: pendingData } = useQuery({
    queryKey: ['assistant', 'sidebar', 'pending-count'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(API.ASSISTANT.APPOINTMENTS, {
          params: { status: 'PENDING', page: 1, page_size: 1 },
        });
        return data?.count ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60_000,          // refresh every 60s
    refetchInterval: 60_000,
  });

  /* LOW-01: fetch unread notifications count */
  const { data: unreadData } = useQuery({
    queryKey: ['assistant', 'sidebar', 'unread-notif-count'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(API.NOTIFICATIONS.UNREAD_COUNT);
        return data?.unread_count ?? data?.count ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const pendingCount      = pendingData  ?? 0;
  const unreadNotifsCount = unreadData   ?? 0;

  function getBadgeCount(badgeKey) {
    if (badgeKey === 'pending')       return pendingCount;
    if (badgeKey === 'notifications') return unreadNotifsCount;
    return 0;
  }

  return (
    <aside style={{
      width,
      minHeight: '100%',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-base)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s ease',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowX: 'hidden',
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          margin: '16px auto 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-base)',
          background: 'var(--bg-page)',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '16px',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = 'var(--brand-primary-l)';
          e.currentTarget.style.color = P;
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = 'var(--bg-page)';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Nav items */}
      <nav style={{
        flex: 1,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {NAV_ITEMS.map(({ to, icon, labelKey, badgeKey }) => {
          const badgeCount = badgeKey ? getBadgeCount(badgeKey) : 0;
          return (
          <NavLink
            key={to}
            to={to}
            end={to === '/assistant-dashboard'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? P : 'var(--text-body)',
              background: isActive ? 'var(--brand-primary-l)' : 'transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              position: 'relative',
            })}
            onMouseOver={e => {
              if (!e.currentTarget.className?.includes('active'))
                e.currentTarget.style.background = 'var(--border-base)';
            }}
            onMouseOut={e => {
              if (!e.currentTarget.className?.includes('active'))
                e.currentTarget.style.background = 'transparent';
            }}
            title={collapsed ? t(labelKey) : ''}
          >
            <span style={{ fontSize: 18, flexShrink: 0, position: 'relative' }}>
              {icon}
              {collapsed && badgeCount > 0 && <CollapsedDot />}
            </span>
            {!collapsed && <span style={{ flex: 1 }}>{t(labelKey)}</span>}
            {!collapsed && <Badge count={badgeCount} />}
          </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
