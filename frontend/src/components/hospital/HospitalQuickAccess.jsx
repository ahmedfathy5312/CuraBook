/**
 * HospitalQuickAccess.jsx — Bug #11 + Bug #12 Fix
 * ─────────────────────────────────────────────────────────────────
 * PROBLEMS FIXED:
 *
 *   Bug #11 — لوحة تحكم المستشفى تفتقر لقسم Quick Access
 *      Before: Dashboard المستشفى لا يحتوي على قسم "الوصول السريع"
 *              يُتيح الانتقال السريع للصفحات بضغطة واحدة.
 *      After:  قسم Quick Access كامل ببطاقات مُصمَّمة بنفس تصميم
 *              Doctor Dashboard — ألوان متناسقة، أيقونات، Hover Effects.
 *
 *   Bug #12 — بطاقات Quick Access لا تتطابق مع Routes الـ Navbar
 *      Before: إن وُجدت بطاقات، كانت تستخدم Routes مكتوبة بشكل منفصل
 *              (Hardcoded) فإذا تغيّر Route في الـ Navbar انكسرت الروابط.
 *      After:  مصدر واحد للـ Routes (HOSPITAL_NAV_ROUTES) يُستخدَم في
 *              كلٍّ من Quick Access وفي الـ Navbar — أي تحديث ينعكس
 *              تلقائياً في المكانين.
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE — الاستخدام:
 *
 *   Step 1 — Import HOSPITAL_NAV_ROUTES in your Navbar:
 *   ────────────────────────────────────────────────────
 *   import { HOSPITAL_NAV_ROUTES } from
 *     '../../components/hospital/HospitalQuickAccess';
 *
 *   // في الـ Navbar، استخدم HOSPITAL_NAV_ROUTES بدلاً من تعريف المسارات يدوياً:
 *   {HOSPITAL_NAV_ROUTES.map(route => (
 *     <NavLink key={route.key} to={route.path}>
 *       {isAr ? route.labelAr : route.labelEn}
 *     </NavLink>
 *   ))}
 *
 *   Step 2 — Add HospitalQuickAccess to your Home page:
 *   ─────────────────────────────────────────────────────
 *   import HospitalQuickAccess from
 *     '../../components/hospital/HospitalQuickAccess';
 *
 *   // في صفحة الـ Hospital Home Dashboard:
 *   <HospitalQuickAccess
 *     language={currentLanguage}
 *     navigate={navigate}       // من useNavigate()
 *   />
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * IMPORTANT — Route Paths:
 *   تأكّد من تطابق الـ path values في HOSPITAL_NAV_ROUTES مع
 *   المسارات الفعلية المستخدمة في مشروعك (react-router-dom).
 *   غيّر الـ path إذا كانت مختلفة — مثلاً:
 *     '/hospital/home'     أو   '/dashboard/hospital'
 *     '/hospital/doctors'  أو   '/hospital/physicians'
 *   المهم: نفس الـ path في الـ Navbar وفي Quick Access.
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';

// ══════════════════════════════════════════════════════════════════
// ── SINGLE SOURCE OF TRUTH — Hospital Navigation Routes
// ── Bug #12 Fix: هذه المصفوفة هي المصدر الوحيد للـ Routes
// ── استخدمها في الـ Navbar وفي Quick Access معاً
// ══════════════════════════════════════════════════════════════════
// ── Bug #12 Fix: These routes EXACTLY match the hospital Navbar links ──
// ── Bug #11 Fix: Added Settings card ──
export const HOSPITAL_NAV_ROUTES = [
  {
    key: 'home',
    path: '/hospital-dashboard',
    labelAr: 'الرئيسية',
    labelEn: 'Home',
    icon: '🏠',
    color: '#0E7490',
    bgColor: '#E0F7FA',
  },
  {
    key: 'doctors',
    path: '/manage-doctors',
    labelAr: 'الأطباء',
    labelEn: 'Doctors',
    icon: '👨‍⚕️',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    key: 'assistants',
    path: '/manage-assistants',
    labelAr: 'المساعدون',
    labelEn: 'Assistants',
    icon: '🧑‍💼',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  {
    key: 'appointments',
    path: '/hospital-dashboard?tab=appointments',
    labelAr: 'المواعيد',
    labelEn: 'Appointments',
    icon: '📅',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    key: 'analytics',
    path: '/hospital-dashboard?tab=analytics',
    labelAr: 'التحليلات',
    labelEn: 'Analytics',
    icon: '📊',
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  {
    key: 'schedules',
    path: '/hospital-dashboard?tab=schedule',
    labelAr: 'الجداول',
    labelEn: 'Schedules',
    icon: '🗓️',
    color: '#DC2626',
    bgColor: '#FEE2E2',
  },
  {
    key: 'settings',
    path: '/hospital-profile-settings',
    labelAr: 'الإعدادات',
    labelEn: 'Settings',
    icon: '⚙️',
    color: '#374151',
    bgColor: '#F3F4F6',
  },
];

// ══════════════════════════════════════════════════════════════════
// ── Quick Access Card Component
// ══════════════════════════════════════════════════════════════════
function QuickAccessCard({ route, isAr, onClick }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(route.path)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(route.path); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={isAr ? route.labelAr : route.labelEn}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '20px 16px',
        borderRadius: 16,
        background: hovered ? route.bgColor : 'var(--bg-card)',
        border: `2px solid ${hovered ? route.color : 'var(--border-base)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered
          ? `0 8px 24px ${route.color}28`
          : 'var(--shadow-sm)',
        outline: 'none',
        userSelect: 'none',
        minHeight: 110,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: hovered ? route.bgColor : 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        flexShrink: 0,
        transition: 'transform 0.2s, background 0.2s',
        transform: hovered ? 'scale(1.12)' : 'scale(1)',
      }}>
        {route.icon}
      </div>

      {/* Label */}
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: hovered ? route.color : 'var(--text-h)',
        fontFamily: "'Cairo', 'Plus Jakarta Sans', sans-serif",
        textAlign: 'center',
        lineHeight: 1.3,
        transition: 'color 0.2s',
      }}>
        {isAr ? route.labelAr : route.labelEn}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Main HospitalQuickAccess Component
// ══════════════════════════════════════════════════════════════════
/**
 * HospitalQuickAccess
 * ────────────────────
 * Bug #11 Fix — Quick Access section for the Hospital Dashboard.
 * Bug #12 Fix — Uses HOSPITAL_NAV_ROUTES (single source of truth).
 *
 * Props:
 *   language  {string}   — 'ar' | 'en'
 *   navigate  {function} — from useNavigate() in react-router-dom
 *   routes    {array}    — optional override; defaults to HOSPITAL_NAV_ROUTES
 */
export default function HospitalQuickAccess({
  language = 'ar',
  navigate,
  routes = HOSPITAL_NAV_ROUTES,
}) {
  const isAr = language === 'ar';

  const handleNavigate = (path) => {
    if (navigate) {
      navigate(path);
    } else {
      window.location.href = path;
    }
  };

  return (
    <div
      style={{
        marginBottom: 28,
        direction: isAr ? 'rtl' : 'ltr',
      }}
    >
      {/* Section Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <h2 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 800,
          color: 'var(--text-h)',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {isAr ? 'الوصول السريع' : 'Quick Access'}
        </h2>
        <div style={{
          flex: 1,
          height: 1,
          background: 'var(--border-base)',
        }} />
      </div>

      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 12,
      }}>
        {routes.map(route => (
          <QuickAccessCard
            key={route.key}
            route={route}
            isAr={isAr}
            onClick={handleNavigate}
          />
        ))}
      </div>
    </div>
  );
}
