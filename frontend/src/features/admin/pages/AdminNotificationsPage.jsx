/**
 * AdminNotificationsPage.jsx
 * ISSUE-002 FIX: /admin-notifications route was missing — NotificationBell navigated here
 * and got a 404. This page renders the NotificationsSection as a standalone page.
 */
import NotificationsSection from '../sections/NotificationsSection';

export default function AdminNotificationsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', direction: 'rtl' }}>
      <NotificationsSection />
    </div>
  );
}
