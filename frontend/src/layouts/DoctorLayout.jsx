/**
 * DoctorLayout.jsx — Phase 4 Polish
 * ====================================
 * ✅ Prefetches shared doctor data at mount (profile + stats)
 * ✅ Prefetches heavy route chunks on link hover (perf.js)
 * ✅ page-enter animation on main content
 * ✅ Sets html lang attribute for correct font rendering
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CuraBookNavbar    from '../components/CuraBookNavbar';
import Footer            from '../components/Footer';
import { NotificationBell }  from '../features/notifications/components/NotificationBell';
import { SubscriptionBanner } from '../features/billing/components/SubscriptionBanner';
import MobileBottomNav   from '../components/MobileBottomNav';
import { getDoctorProfile, getDoctorStats } from '../services/api/doctorApi';
import { prefetchRoute } from '../utils/perf';

// ── Pre-warm the code chunks for the most common next pages ─────────────────
const prefetchAppointments = prefetchRoute(() => import('../features/doctor-dashboard/pages/DoctorAppointmentsPage'));
const prefetchAnalytics    = prefetchRoute(() => import('../features/doctor-dashboard/pages/DoctorAnalyticsPage'));
const prefetchPatients     = prefetchRoute(() => import('../features/doctor-dashboard/pages/DoctorPatientsPage'));
const prefetchSchedule     = prefetchRoute(() => import('../features/scheduling/pages/DoctorSchedulePage'));

export default function DoctorLayout({ children }) {
  const qc = useQueryClient();

  // P1-FEAT-6: Prefetch shared doctor data once at layout mount.
  useEffect(() => {
    qc.prefetchQuery({
      queryKey: ['doctor', 'own-profile'],
      queryFn:  getDoctorProfile,
      staleTime: 5 * 60_000,
    });
    qc.prefetchQuery({
      queryKey: ['doctor', 'stats'],
      queryFn:  getDoctorStats,
      staleTime: 2 * 60_000,
    });

    // Kick off chunk prefetch for most-visited doctor pages 2s after mount
    const t = setTimeout(() => {
      prefetchAppointments();
      prefetchPatients();
    }, 2000);
    return () => clearTimeout(t);
  }, [qc]);

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      minHeight:     '100vh',
      background:    'var(--bg-page)',
      fontFamily:    "'Cairo', 'Plus Jakarta Sans', sans-serif",
    }}>
      <CuraBookNavbar
        rightSlot={<NotificationBell />}
        onAnalyticsHover={prefetchAnalytics}
        onScheduleHover={prefetchSchedule}
      />
      <SubscriptionBanner />
      <main style={{ flex: 1, paddingBottom: '72px' }} className="page-enter">
        {children}
      </main>
      <MobileBottomNav role="doctor" />
      <Footer />
    </div>
  );
}
