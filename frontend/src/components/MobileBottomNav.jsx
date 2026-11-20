/**
 * MobileBottomNav — Design System v18
 * Patient: 5 tabs (الرئيسية / ابحث / مواعيدي / رسائل / حسابي)
 * Doctor:  5 tabs (لوحتي / جدولي / مرضاي / أرباحي / الإعدادات)
 * Colors: new --primary #1B5E8A
 */
import { NavLink } from 'react-router-dom';
import useTranslation from '../i18n/useTranslation';

// ── Tab Configs per Proposal ────────────────────────────────────────────────
const PATIENT_TABS = [
  { to: '/dashboard',    icon: HomeIcon,     label: 'الرئيسية' },
  { to: '/search',       icon: SearchIcon,   label: 'ابحث'     },
  { to: '/appointments', icon: CalendarIcon, label: 'مواعيدي'  },
  { to: '/chat',         icon: ChatIcon,     label: 'رسائل'    },
  { to: '/profile',      icon: UserIcon,     label: 'حسابي'    },
];

const DOCTOR_TABS = [
  { to: '/doctor-dashboard',     icon: DashIcon,     label: 'لوحتي'    },
  { to: '/doctor-schedule',      icon: CalendarIcon, label: 'جدولي'    },
  { to: '/chat/doctor',          icon: ChatIcon,     label: 'رسائل'    },
  { to: '/patient-management',   icon: UsersIcon,    label: 'مرضاي'    },
  { to: '/profile-settings',     icon: UserIcon,     label: 'حسابي'    },
];

const HOSPITAL_TABS = [
  { to: '/hospital-dashboard',  icon: HomeIcon,    label: 'الرئيسية' },
  { to: '/manage-doctors',      icon: UsersIcon,   label: 'دكاترة'   },
  { to: '/manage-assistants',   icon: UsersIcon,   label: 'مساعدون' },
  { to: '/billing',             icon: CardIcon,    label: 'اشتراك'   },
  { to: '/profile-settings-hospital', icon: UserIcon, label: 'حسابي' },
];

const ASSISTANT_TABS = [
  { to: '/assistant-dashboard',     icon: HomeIcon,     labelKey: 'nav.myDashboard' },
  { to: '/assistant-schedule',      icon: CalendarIcon, labelKey: 'nav.schedule' },
  { to: '/assistant-appointments',  icon: GridIcon,     labelKey: 'nav.appointments' },
  { to: '/assistant-analytics',     icon: DashIcon,     labelKey: 'assistantAnalytics.navLabel' },
  { to: '/assistant-settings',      icon: UserIcon,     labelKey: 'nav.settings' },
];

const ADMIN_TABS = [
  { to: '/admin-dashboard',   icon: HomeIcon,   label: 'الرئيسية' },
  { to: '/admin-users',       icon: UsersIcon,  label: 'مستخدمون' },
  { to: '/admin-hospitals',   icon: HeartIcon,  label: 'مستشفيات' },
  { to: '/admin-audit-logs',  icon: GridIcon,   label: 'سجلات'    },
];

const TAB_MAP = {
  patient:   PATIENT_TABS,
  doctor:    DOCTOR_TABS,
  hospital:  HOSPITAL_TABS,
  assistant: ASSISTANT_TABS,
  admin:     ADMIN_TABS,
};

const PRIMARY = 'var(--primary)';
const GRAY    = 'var(--text-muted)';
const PALE    = 'var(--primary-pale)';

export default function MobileBottomNav({ role = 'patient' }) {
  const { t, language } = useTranslation();
  const tabs = TAB_MAP[role] || PATIENT_TABS;

  return (
    <>
      <style>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          z-index: 200;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-shadow: var(--shadow-lg);
        }
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: flex; }
        }
        .mobile-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 4px 6px;
          text-decoration: none;
          color: ${GRAY};
          gap: 3px;
          transition: color 0.18s ease;
          font-size: 10px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          min-width: 0;
          position: relative;
        }
        .mobile-tab.active {
          color: ${PRIMARY};
        }
        .mobile-tab.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 32px;
          height: 3px;
          background: ${PRIMARY};
          border-radius: 0 0 4px 4px;
        }
        .mobile-tab svg {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }
        .mobile-tab-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.18s ease;
        }
        .mobile-tab.active .mobile-tab-icon {
          background: ${PALE};
        }
      `}</style>
      <nav className="mobile-bottom-nav" aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}>
        {tabs.map(({ to, icon: Icon, label, labelKey }) => {
          const displayLabel = labelKey ? t(labelKey) : label;
          return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
            aria-label={displayLabel}
          >
            <div className="mobile-tab-icon">
              <Icon />
            </div>
            <span>{displayLabel}</span>
          </NavLink>
        );})}
      </nav>
    </>
  );
}

/* ── SVG Icons ─────────────────────────────────────────────────────────────── */
function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function DashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function CardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function HeartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function EarningsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
