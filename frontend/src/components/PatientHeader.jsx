import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import Avatar from './ui/Avatar';

const NAV_LINKS = [
  { to: '/hospitals',    label: 'Hospitals' },
  { to: '/doctors',      label: 'Find Doctors' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/prescriptions',label: 'Prescriptions' },
  { to: '/notifications',label: 'Notifications' },
  { to: '/profile',      label: 'Profile' },
];

const activeStyle = {
  padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px',
  fontWeight: 600, textDecoration: 'none', color: 'var(--primary)',
  background: 'var(--primary-pale)', transition: 'all 0.2s',
};
const inactiveStyle = {
  padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px',
  fontWeight: 600, textDecoration: 'none', color: 'var(--text-muted)',
  background: 'transparent', transition: 'all 0.2s',
};

export default function PatientHeader() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Logged out successfully.');
  };

  return (
    <header style={{
      background: 'var(--bg-card)',
      boxShadow: 'var(--shadow-sm)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <nav style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px',
      }}>

        {/* ── Logo ── */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <img src={logo} alt="CuraBook" style={{ height: '30px', width: '30px', borderRadius: 'var(--radius-md)' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>CuraBook</span>
        </Link>

        {/* ── Desktop Nav — pure CSS hide/show, NO inline display conflict ── */}
        <div className="patient-nav-desktop">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* ── Right Side ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <NotificationBell />
          <Avatar name={user?.full_name || user?.username} src={user?.profile_image} size="sm" />
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-full)',
              padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            Logout
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(p => !p)}
            className="patient-hamburger"
            aria-label="Toggle menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '22px', color: 'var(--text-body)', padding: '4px',
              lineHeight: 1,
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu ── */}
      <div className={`patient-nav-mobile${mobileOpen ? ' open' : ''}`}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '14px',
              fontWeight: 600, textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-body)',
              background: isActive ? 'var(--primary-pale)' : 'transparent',
            })}
          >
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left', background: 'none',
            border: 'none', padding: '12px 16px', fontSize: '14px',
            fontWeight: 600, color: 'var(--accent)', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          🚪 Logout
        </button>
      </div>
    </header>
  );
}
