/**
 * AdminLayout.jsx
 * F-04 FIX: NotificationBell integrated.
 */
import CuraBookNavbar from '../components/CuraBookNavbar';
import MobileBottomNav from '../components/MobileBottomNav';
import Footer from '../components/Footer';
import { NotificationBell } from '../features/notifications/components/NotificationBell';

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <CuraBookNavbar rightSlot={<NotificationBell />} />
      <main style={{ flex: 1, paddingBottom: '72px' }} className="page-enter">{children}</main>
      <MobileBottomNav role="admin" />
      <Footer />
    </div>
  );
}
