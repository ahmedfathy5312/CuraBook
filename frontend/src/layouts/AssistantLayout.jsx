/**
 * AssistantLayout — v32
 * Top Navbar only — no sidebar.
 * Navigation is handled exclusively through the top Navbar (CuraBookNavbar).
 */
import CuraBookNavbar  from '../components/CuraBookNavbar';
import MobileBottomNav from '../components/MobileBottomNav';
import Footer          from '../components/Footer';
import { NotificationBell } from '../features/notifications/components/NotificationBell';

export default function AssistantLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <CuraBookNavbar rightSlot={<NotificationBell />} />

      <main style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingBottom: '72px' }} className="page-enter">
        {children}
      </main>

      <MobileBottomNav role="assistant" />
      <Footer />
    </div>
  );
}
