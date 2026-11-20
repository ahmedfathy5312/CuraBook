import CuraBookNavbar from '../components/CuraBookNavbar';
import Footer from '../components/Footer';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import MobileBottomNav from '../components/MobileBottomNav';

export default function PatientLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <CuraBookNavbar rightSlot={<NotificationBell />} />
      <main id="main-content" style={{ flex: 1, paddingBottom: '72px' }} tabIndex={-1}>
        <div className="page-enter">{children}</div>
      </main>
      <MobileBottomNav role="patient" />
      <Footer />
    </div>
  );
}
