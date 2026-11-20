/**
 * CuraBookNavbar.jsx â€” Design System v18
 * - ط£ظ„ظˆط§ظ† ط¬ط¯ظٹط¯ط©: primary #1B5E8A
 * - font-family: Cairo
 * - Breadcrumb طھط­طھ ط§ظ„ظ€ navbar (desktop)
 * - Arabic nav labels for logged-in users
 * - aria-labels on all icon buttons (accessibility fix)
 * - RTL-ready
 */
import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useTranslation from '../i18n/useTranslation';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../hooks/useDarkMode';
import logo from '../assets/logo.png';

const C = {
  primary:   'var(--primary)',
  light:     'var(--primary-light)',
  pale:      'var(--primary-pale)',
  dark:      'var(--primary-dark)',
  accent:    'var(--accent)',
  white:     'var(--bg-card)',
  gray:      'var(--text-muted)',
  border:    'var(--border)',
  text:      'var(--text-h)',
  bg:        'var(--bg)',
};


/* â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function CuraBookNavbar({ rightSlot }) {
  const { user, logout, role } = useAuth();
  const { t, language: lang, setLang } = useTranslation();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const navigate  = useNavigate();
  const location  = useLocation();
  const toast     = useToast();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* â”€â”€ Links defined inside the component to use t() â”€â”€ */
  const LOGO_SIDE_LINKS = [
    { to: '/about-us',   label: t('nav.aboutUs') },
    { to: '/contact-us', label: t('nav.contactUs') },
  ];

  const ROLE_LINKS = {
    patient: [
      { to: '/dashboard',     label: t('nav.home') },
      { to: '/hospitals',     label: t('nav.hospitals') },
      { to: '/doctors',       label: t('nav.searchDoctors') },
      { to: '/appointments',  label: t('nav.myAppointments') },
      { to: '/prescriptions', label: t('nav.prescriptions') },
      { to: '/chat',          label: t('chat.title') || (lang === 'ar' ? '\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a' : 'Messages') },
    ],
    doctor: [
      { to: '/doctor-dashboard',     label: t('nav.myDashboard') },
      { to: '/patient-management',   label: t('nav.patients') },
      { to: '/doctor-schedule',      label: t('nav.schedule') },
      { to: '/doctor-analytics',     label: t('analytics.title') },
      { to: '/doctor-assistants',    label: t('nav.assistants') },
      { to: '/profile-settings',     label: t('nav.settings') },
    ],
    hospital: [
      { to: '/hospital-dashboard',                    label: t('nav.home') },
      { to: '/manage-doctors',                        label: t('nav.doctors') },
      { to: '/manage-assistants',                     label: t('nav.assistants') },
      { to: '/hospital-dashboard?tab=appointments',   label: t('nav.appointments') },
      { to: '/hospital-dashboard?tab=analytics',      label: t('nav.analytics') || '\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a' },
      { to: '/hospital-dashboard?tab=schedule',       label: t('nav.schedules') || '\u0627\u0644\u062c\u062f\u0627\u0648\u0644' },
    ],
    assistant: [
      { to: '/assistant-dashboard',  label: t('nav.myDashboard') },
      { to: '/assistant-schedule',   label: t('nav.schedule') },
      { to: '/assistant-appointments', label: t('nav.appointments') },
      { to: '/assistant-analytics',  label: t('assistantAnalytics.navLabel') },
      { to: '/assistant-settings',   label: t('nav.settings') },
    ],
    admin: [
      { to: '/admin-dashboard', label: t('nav.adminDashboard') || '\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629' },
      { to: '/admin-dashboard?tab=users', label: t('admin.users') || '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646' },
      { to: '/admin-dashboard?tab=patients', label: t('nav.patients') || (lang === 'ar' ? '\u0627\u0644\u0645\u0631\u0636\u0649' : 'Patients') },
      { to: '/admin-dashboard?tab=doctors', label: t('doctors.title') || '\u0627\u0644\u0623\u0637\u0628\u0627\u0621' },
      { to: '/admin-dashboard?tab=assistants', label: lang === 'ar' ? '\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0648\u0646' : 'Assistants' },
      { to: '/admin-dashboard?tab=hospitals', label: t('admin.hospitals') || '\u0627\u0644\u0645\u0633\u062a\u0634\u0641\u064a\u0627\u062a' },
      { to: '/admin-dashboard?tab=settings', label: t('nav.settings') || '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' },
    ],
  };

  const ROLE_BADGE = {
    doctor:    { label: t('roles.doctor'),    bg: 'var(--primary-pale)', color: 'var(--primary)', border: 'var(--border)' },
    hospital:  { label: t('roles.hospital'),  bg: 'var(--primary-pale)', color: 'var(--primary)', border: 'var(--border)' },
    assistant: { label: t('roles.assistant'), bg: 'var(--primary-pale)', color: 'var(--primary)', border: 'var(--border)' },
    admin:     { label: t('roles.admin'),     bg: 'var(--gold-light)',    color: 'var(--gold)',    border: 'var(--gold)' },
  };

  const ROUTE_LABELS = {
    '/':                               t('nav.home'),
    '/dashboard':                      t('nav.home'),
    '/doctors':                        t('nav.doctors'),
    '/appointments':                   t('nav.appointments'),
    '/prescriptions':                  t('nav.prescriptions'),
    '/hospitals':                      t('nav.hospitals'),
    '/profile':                        t('nav.profile'),
    '/search':                         t('nav.searchDoctors'),
    '/doctor-dashboard':               t('nav.doctorDashboard'),
    '/patient-management':             t('nav.patients'),
    '/doctor-schedule':                t('nav.schedule'),
    '/billing':                        t('nav.billing'),
    '/hospital-dashboard':             t('nav.hospitalDashboard'),
    '/manage-doctors':                 t('nav.doctors'),
    '/admin-dashboard':                t('nav.adminDashboard'),
    '/chat':                           t('chat.title'),
    '/chat/doctor':                    t('chat.title'),
    '/notifications':                  t('notifications.title'),
    // â”€â”€ Doctor routes missing from breadcrumb/active state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    '/doctor-analytics':               t('analytics.title'),
    '/profile-settings':               t('nav.settings'),
    '/doctor-notifications':           t('notifications.title'),
    '/doctor-messages':                t('chat.title'),
    '/doctor-prescriptions':           t('nav.prescriptions'),
    '/doctor-reports':                 t('nav.reports'),
    '/doctor-assistants':              t('nav.assistants'),
    '/new-patient-record':             t('patientRecords.title'),
    '/patient-record-details':         t('patientRecords.title'),
    '/booking-success':                t('booking.success'),
    '/video':                          t('nav.video'),
    '/hospital-profile-settings':      t('nav.settings'),
    '/hospital-notifications':         t('notifications.title'),
    '/assistant-dashboard':            t('nav.myDashboard'),
    '/assistant-schedule':             t('nav.schedule'),
    '/assistant-appointments':         t('nav.appointments'),
    '/assistant-analytics':            t('assistantAnalytics.navLabel'),
    '/assistant-settings':             t('nav.settings'),
  };

  const Breadcrumb = ({ pathname }) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const crumbs = [{ label: t('nav.home'), path: '/' }];
    let built = '';
    for (const seg of segments) {
      built += '/' + seg;
      const label = ROUTE_LABELS[built];
      // Bug #10 Fix: skip if label is same as previous crumb (prevents duplicate breadcrumbs like "ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ / ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ")
      if (label && label !== crumbs[crumbs.length - 1]?.label) {
        crumbs.push({ label, path: built });
      }
    }
    if (crumbs.length <= 1) return null;

    return (
      <div style={{
        maxWidth: '1280px', margin: '0 auto', padding: '6px 24px',
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '12px', color: 'var(--text-hint)',
        fontFamily: "'Cairo', sans-serif",
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        borderTop: `1px solid ${C.border}`,
        background: 'var(--bg)',
      }}>
        {crumbs.map((c, i) => (
          <span key={c.path} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {i > 0 && <span aria-hidden="true" style={{ fontSize: '10px' }}>{lang === 'ar' ? '\u2039' : '\u203a'}</span>}
            {i === crumbs.length - 1 ? (
              <span style={{ color: C.primary, fontWeight: 600 }}>{c.label}</span>
            ) : (
              <Link to={c.path} style={{ color: 'var(--text-hint)', textDecoration: 'none' }}
                onMouseOver={e => e.currentTarget.style.color = C.light}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-hint)'}>
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast?.success(t('auth.logoutSuccess'));
    setOpen(false);
  };

  const centerLinks = user ? (ROLE_LINKS[role] || []) : [];
  const badge       = ROLE_BADGE[role];
  const initials    = (user?.full_name || user?.username || '?')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const activeLinkStyle = {
    padding: '6px 14px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    color: C.primary,
    background: C.pale,
    fontFamily: "'Cairo', sans-serif",
    transition: 'all 0.18s ease',
  };
  const inactiveLinkStyle = {
    ...activeLinkStyle,
    color: C.gray,
    background: 'transparent',
    fontWeight: 500,
  };

  return (
    <>
      <style>{`
        .cb-nav-link:hover   { color: ${C.primary} !important; background: ${C.pale} !important; }
        .cb-logo-link:hover  { color: ${C.primary} !important; background: ${C.pale} !important; }
        .cb-cta-btn:hover    { background: ${C.dark} !important; transform: translateY(-1px); }
        .cb-ghost-btn:hover  { background: ${C.pale} !important; }
      `}</style>

      <header style={{
        background: C.white,
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        {/* â”€â”€ Main nav bar â”€â”€ */}
        <nav style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }}>

          {/* RIGHT: Logo + about/contact (guest) + role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginInlineStart: '8px' }}>
              <img src={logo} alt="CuraBook" style={{ height: '30px', width: '30px', borderRadius: 'var(--radius-md)' }} />
              <span style={{ fontSize: '18px', fontWeight: 900, color: C.primary, fontFamily: "'Cairo', sans-serif", letterSpacing: '-0.01em' }}>
                CuraBook
              </span>
            </Link>

            {/* Guest: About Us + Contact */}
            {!user && (
              <div className="cb-logo-links" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {LOGO_SIDE_LINKS.map(({ to, label }) => (
                  <NavLink key={to} to={to} className="cb-logo-link" style={({ isActive }) => ({
                    padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontSize: '13px', fontWeight: 500,
                    textDecoration: 'none', color: isActive ? C.primary : C.gray,
                    background: isActive ? C.pale : 'transparent', transition: 'all 0.18s ease',
                    fontFamily: "'Cairo', sans-serif",
                  })}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Role badge */}
            {badge && (
              <span style={{
                background: badge.bg, color: badge.color,
                fontSize: '11px', fontWeight: 700,
                padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                border: `1px solid ${badge.border}`,
                letterSpacing: '0.02em',
                fontFamily: "'Cairo', sans-serif",
              }}>
                {badge.label}
              </span>
            )}
          </div>

          {/* CENTER: Role nav links */}
          <div className="patient-nav-desktop" style={{ flex: 1, justifyContent: 'center', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            {centerLinks.map(({ to, label }) => {
              // Bug #10 Fix (enhanced): exact match OR startsWith for sub-pages.
              // Also handles cases where the nav item path differs from the URL segment,
              // e.g. '/profile-settings' nav item is also active on '/profile-settings/*'.
              // For '/doctor-analytics' we also match sub-routes like '/doctor-analytics/*'.
              const pathname = location.pathname;
              const [toPath, toQuery] = to.split('?');
              const isActive = toQuery
                ? pathname === toPath && location.search === `?${toQuery}`
                : pathname === toPath && !location.search || pathname.startsWith(toPath + '/');
              return (
                <NavLink key={to} to={to} className="cb-nav-link" end={false}
                  style={() => isActive ? activeLinkStyle : inactiveLinkStyle}>
                  {label}
                </NavLink>
              );
            })}
          </div>

          {/* LEFT: Tools + auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              aria-label={lang === 'ar' ? 'Switch to English' : '\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0644\u0644\u0639\u0631\u0628\u064a\u0629'}
              title={lang === 'ar' ? 'Switch to English' : '\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0644\u0644\u0639\u0631\u0628\u064a\u0629'}
              style={{
                background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 'var(--radius-pill)',
                padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                color: C.primary, fontFamily: "'Cairo', sans-serif", transition: 'all 0.18s',
                flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.background = C.pale; }}
              onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
            >
              {lang === 'ar' ? 'EN' : '\u0639'}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
              title={isDark ? t('common.lightMode') : t('common.darkMode')}
              className="dark-mode-toggle"
              style={{
                background: isDark ? 'var(--bg-card)' : C.pale,
                border: `1.5px solid ${isDark ? 'var(--border)' : C.border}`,
                borderRadius: 'var(--radius-pill)',
                padding: '5px 10px',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {isDark ? '\u2600' : '\u263e'}
            </button>

            {/* rightSlot â€” NotificationBell injected by layouts */}
            {rightSlot && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {rightSlot}
              </div>
            )}

            {/* Auth section */}
            {user ? (
              <>
                {/* Profile Dropdown â€” Bug #1 Home Fix: Settings/Profile menu in Navbar */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setProfileOpen(p => !p)}
                    aria-label={`${lang === 'ar' ? '\u062d\u0633\u0627\u0628' : 'Account'}: ${user.full_name || user.username}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: profileOpen ? C.pale : 'none',
                      border: `1.5px solid ${profileOpen ? C.primary : C.border}`,
                      borderRadius: 'var(--radius-pill)', padding: '4px 10px 4px 4px',
                      cursor: 'pointer', transition: 'all 0.18s',
                      fontFamily: "'Cairo', sans-serif",
                    }}
                    onMouseOver={e => { if (!profileOpen) { e.currentTarget.style.background = C.pale; e.currentTarget.style.borderColor = C.primary; }}}
                    onMouseOut={e => { if (!profileOpen) { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = C.border; }}}
                  >
                    {/* Avatar circle */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${C.primary}, ${C.light})`,
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.full_name || user.username}
                    </span>
                    <span style={{ fontSize: 10, color: C.gray, transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }}>&#9662;</span>
                  </button>

                  {/* Dropdown panel */}
                  {profileOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        onClick={() => setProfileOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                      />
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)',
                        [lang === 'ar' ? 'left' : 'right']: 0,
                        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)', border: `1px solid ${C.border}`,
                        minWidth: 220, zIndex: 150, overflow: 'hidden',
                        animation: 'profileDropIn 0.18s ease',
                      }}>
                        {/* User info header */}
                        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{user.full_name || user.username}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.gray }}>{user.email || ''}</p>
                        </div>

                        {/* Menu items â€” Enhancement #18: hospital gets Edit Profile + Change Password + Dashboard */}
                        {(role === 'hospital' ? [
                          {
                            icon: '\u270e',
                            label: lang === 'ar' ? '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a' : 'Edit Profile',
                            to: '/hospital-profile-settings',
                          },
                          {
                            icon: '\u{1f512}',
                            label: lang === 'ar' ? '\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Change Password',
                            to: '/hospital-profile-settings#change-password',
                          },
                          {
                            icon: '\u{1f3e5}',
                            label: lang === 'ar' ? '\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0633\u062a\u0634\u0641\u0649' : 'Hospital Dashboard',
                            to: '/hospital-dashboard',
                          },
                        ] : [
                          {
                            icon: '\u{1f464}',
                            label: lang === 'ar' ? '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a' : 'My Profile',
                            to: '/profile-settings',
                          },
                          {
                            icon: '\u2699',
                            label: lang === 'ar' ? '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Settings',
                            to: '/profile-settings',
                          },
                        ]).map(item => (
                          <button
                            key={item.to + item.label}
                            onClick={() => { navigate(item.to); setProfileOpen(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '11px 16px', border: 'none',
                              background: 'none', cursor: 'pointer', textAlign: lang === 'ar' ? 'right' : 'left',
                              fontSize: 13, color: C.text, fontFamily: "'Cairo', sans-serif",
                              fontWeight: 500, transition: 'background 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = C.pale}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontSize: 16 }}>{item.icon}</span>
                            {item.label}
                          </button>
                        ))}

                        {/* Divider + Logout */}
                        <div style={{ borderTop: `1px solid ${C.border}` }}>
                          <button
                            onClick={() => { setProfileOpen(false); handleLogout(); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '11px 16px', border: 'none',
                              background: 'none', cursor: 'pointer', textAlign: lang === 'ar' ? 'right' : 'left',
                              fontSize: 13, color: 'var(--danger, #DC2626)', fontFamily: "'Cairo', sans-serif",
                              fontWeight: 600, transition: 'background 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#FEF2F2'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontSize: 16 }}>{"\u21aa"}</span>
                            {lang === 'ar' ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c' : 'Logout'}
                          </button>
                        </div>

                        <style>{`
                          @keyframes profileDropIn {
                            from { opacity: 0; transform: translateY(-6px); }
                            to   { opacity: 1; transform: translateY(0); }
                          }
                        `}</style>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login"
                  style={{
                    padding: '7px 16px', borderRadius: 'var(--radius-pill)', fontSize: '13px',
                    fontWeight: 600, textDecoration: 'none', color: C.primary,
                    border: `1.5px solid ${C.primary}`, transition: 'all 0.18s ease',
                    background: 'transparent', fontFamily: "'Cairo', sans-serif",
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = C.pale; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {t('nav.login')}
                </Link>
                <Link to="/join" className="cb-cta-btn" style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-pill)', fontSize: '13px',
                  fontWeight: 700, textDecoration: 'none', color: 'white',
                  background: C.primary, border: `1.5px solid ${C.primary}`,
                  transition: 'all 0.18s ease',
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
                  fontFamily: "'Cairo', sans-serif",
                }}>
                  {"\u2726"} {t('nav.startFree')}
                </Link>
              </>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setOpen(p => !p)}
              className="patient-hamburger"
              aria-label={open ? t('common.close') : t('common.menu')}
              aria-expanded={open}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '22px', color: C.text, padding: '4px', lineHeight: 1,
              }}
            >
              {open ? '\u00d7' : '\u2630'}
            </button>
          </div>
        </nav>

        {/* â”€â”€ Breadcrumb (desktop only) â”€â”€ */}
        <div className="patient-nav-desktop" style={{ display: 'flex' }}>
          {user && <Breadcrumb pathname={location.pathname} />}
        </div>

        {/* â”€â”€ Mobile menu â”€â”€ */}
        <div className={`patient-nav-mobile${open ? ' open' : ''}`} style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
          {!user && LOGO_SIDE_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'block', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              color: isActive ? C.primary : C.text,
              background: isActive ? C.pale : 'transparent',
              fontFamily: "'Cairo', sans-serif",
            })}>
              {label}
            </NavLink>
          ))}

          {centerLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} style={({ isActive }) => ({
              display: 'block', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              color: isActive ? C.primary : C.text,
              background: isActive ? C.pale : 'transparent',
              fontFamily: "'Cairo', sans-serif",
            })}>
              {label}
            </NavLink>
          ))}

          <div style={{ height: '1px', background: C.border, margin: '8px 0' }} />

          {user ? (
            <button onClick={handleLogout} style={{
              width: '100%', textAlign: 'right', background: 'none', border: 'none',
              padding: '12px 16px', fontSize: '14px', fontWeight: 600,
              color: 'var(--danger)', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
            }}>
              {"\u21aa"} {t('nav.logout')}
            </button>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} style={{
                display: 'block', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                color: C.primary, fontFamily: "'Cairo', sans-serif",
              }}>
                {"\u{1f511}"} {t('nav.login')}
              </Link>
              <Link to="/join" onClick={() => setOpen(false)} style={{
                display: 'block', margin: '8px 16px 16px',
                padding: '13px 16px', borderRadius: 'var(--radius-md)',
                fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                color: 'white', background: C.primary, textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                fontFamily: "'Cairo', sans-serif",
              }}>
                {"\u2726"} {t('nav.startFree')}
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}
