/**
 * AssistantProfilePage.jsx — Sprint 3 refactor
 *
 * Was ~1000 lines (monolith). Now a thin shell composing 4 focused tabs:
 *   ProfileTab      → personal info + avatar upload
 *   PasswordTab     → change password + strength meter
 *   ScheduleTab     → read-only schedule view
 *   NotificationsTab → notification preferences
 *
 * All business logic lives inside the respective tab components.
 * Shared primitives live in AssistantUI.jsx (Component Library).
 */
import { useState } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { User, Lock, Calendar, Bell } from 'lucide-react';
import ProfileTab       from '../components/ProfileTab';
import PasswordTab      from '../components/PasswordTab';
import ScheduleTab      from '../components/ScheduleTab';
import NotificationsTab from '../components/NotificationsTab';
import { COLORS } from '../components/AssistantUI';

/* ─── Tab definition ─────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'profile',  icon: <User size={15} />,     labelKey: 'assistantProfilePage.tabs.profile'  },
  { id: 'password', icon: <Lock size={15} />,     labelKey: 'assistantProfilePage.tabs.password' },
  { id: 'schedule', icon: <Calendar size={15} />, labelKey: 'assistantProfilePage.tabs.schedule' },
  { id: 'notifs',   icon: <Bell size={15} />,     labelKey: 'assistantProfilePage.tabs.notifs'   },
];

/* ─── Tab bar ─────────────────────────────────────────────────────────────────── */
function TabBar({ active, onSelect }) {
  const { t } = useTranslation();
  return (
    <div style={{
      background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      marginBottom: 4,
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-base)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              flex: 1, minWidth: 100, padding: '16px 12px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12,
              fontWeight: active === tab.id ? 700 : 500,
              color: active === tab.id ? COLORS.primary : 'var(--text-muted)',
              borderBottom: active === tab.id ? `2px solid ${COLORS.primary}` : '2px solid transparent',
              transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {tab.icon} {t(tab.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────────── */
export default function AssistantProfilePage() {
  const { isRTL, t } = useTranslation();
  const [tab, setTab] = useState('profile');

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: "'Cairo', sans-serif" }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      {/* ProfileTab owns the gradient header (has avatar upload) */}
      {tab === 'profile' && <ProfileTab />}

      {/* Compact header for non-profile tabs */}
      {tab !== 'profile' && (
        <div style={{
          background: 'linear-gradient(135deg,#1B5E8A 0%,#1a6b65 100%)',
          padding: '24px 32px 32px',
        }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800 }}>
            {tab === 'password' ? `🔐 ${t('assistantProfilePage.tabs.password')}`
              : tab === 'schedule' ? `📅 ${t('assistantProfilePage.tabs.schedule')}`
              : `🔔 ${t('assistantProfilePage.tabs.notifs')}`}
          </h1>
        </div>
      )}

      {/* Tabs navigation — in-content area, offset up for profile tab */}
      <div style={{
        maxWidth: 860, margin: tab === 'profile' ? '-30px auto 0' : '24px auto 0',
        padding: '0 24px', position: 'relative', zIndex: 5,
      }}>
        <TabBar active={tab} onSelect={setTab} />

        {/* Tab content */}
        {tab === 'password' && <div style={{ marginTop: 0 }}><PasswordTab /></div>}
        {tab === 'schedule' && <div style={{ marginTop: 0 }}><ScheduleTab /></div>}
        {tab === 'notifs'   && <div style={{ marginTop: 0 }}><NotificationsTab /></div>}
      </div>
    </div>
  );
}
