import CuraBookNavbar from '../components/CuraBookNavbar';
import Footer from '../components/Footer';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import { SubscriptionBanner } from '../features/billing/components/SubscriptionBanner';
import MobileBottomNav from '../components/MobileBottomNav';

export default function HospitalLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <CuraBookNavbar rightSlot={<NotificationBell />} />
      <SubscriptionBanner />
      <main style={{ flex: 1, paddingBottom: '72px' }} className="page-enter">{children}</main>
      <MobileBottomNav role="hospital" />
      <Footer />
    </div>
  );
}
