/**
 * DoctorPageSkeletons.jsx
 * =======================
 * Sprint 3 · P2-UX-2
 *
 * Named skeleton screens for every major doctor page section.
 * Each skeleton matches the exact layout of the real section
 * so the page doesn't jump when data loads.
 *
 * Exports:
 *   DashboardHeroSkeleton        — Hero gradient card
 *   DashboardStatsSkeleton       — 4-stat pills
 *   AppointmentListSkeleton      — appointment row × n
 *   ScheduleSidebarSkeleton      — today's schedule sidebar
 *   ProfileFormSkeleton          — settings form fields
 *   IdentityCardSkeleton         — DoctorIdentityCard placeholder
 *   QuickAccessSkeleton          — quick access grid
 *   AnalyticsChartSkeleton       — chart placeholder
 *   PatientListSkeleton          — patient row × n
 */

import React from 'react';
import tokens from '../../../theme/tokens';

// ── Keyframe injection (once per mount) ───────────────────────────────────────
const KEYFRAME_STYLE = `
@keyframes dps-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes dps-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`;

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('dps-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'dps-keyframes';
  s.textContent = KEYFRAME_STYLE;
  document.head.appendChild(s);
}

// ── Base primitive ────────────────────────────────────────────────────────────
function Bone({ w = '100%', h = 16, r = 8, style = {} }) {
  injectKeyframes();
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--bg-subtle,#F3F4F6) 25%, var(--bg-hover,#E5E7EB) 50%, var(--bg-subtle,#F3F4F6) 75%)',
      backgroundSize: '200% 100%',
      animation: 'dps-shimmer 1.8s infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

function Circle({ size = 48 }) {
  return <Bone w={size} h={size} r={size} />;
}

// ── Exported skeletons ────────────────────────────────────────────────────────

/**
 * Hero gradient card placeholder
 */
export function DashboardHeroSkeleton({ isRTL = false }) {
  return (
    <div style={{
      borderRadius: 24, padding: '40px',
      background: 'linear-gradient(135deg, var(--bg-subtle,#F3F4F6), var(--bg-hover,#E5E7EB))',
      marginBottom: 28, direction: isRTL ? 'rtl' : 'ltr',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Bone w="40%" h={12} />
          <Bone w="65%" h={36} />
          <Bone w="80%" h={14} />
          <Bone w="55%" h={14} />
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '20px 28px', background: 'rgba(0,0,0,0.06)', borderRadius: 20, flexWrap: 'wrap' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <Bone w={50} h={28} />
              <Bone w={60} h={10} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Identity card placeholder (matches DoctorIdentityCard full variant)
 */
export function IdentityCardSkeleton({ isRTL = false, compact = false }) {
  const pad = compact ? '16px 20px' : '32px';
  const sz  = compact ? 52 : 88;
  return (
    <div style={{
      background: 'var(--bg-card,#fff)',
      borderRadius: compact ? 16 : 24, padding: pad,
      boxShadow: tokens?.shadows?.md || '0 6px 24px rgba(0,0,0,0.08)',
      border: '1px solid var(--border-base,#E5E7EB)',
      display: 'flex', gap: 20, alignItems: 'flex-start',
      direction: isRTL ? 'rtl' : 'ltr',
      marginBottom: compact ? 20 : 24,
    }}>
      <Circle size={sz} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Bone w="50%" h={compact ? 16 : 24} />
        <Bone w="30%" h={12} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Bone w={90} h={26} r={20} />
          <Bone w={110} h={26} r={20} />
          {!compact && <Bone w={80} h={26} r={20} />}
        </div>
        {!compact && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {[72,72,72,72,72].map((w,i) => <Bone key={i} w={w} h={52} r={14} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Appointment list rows
 */
export function AppointmentListSkeleton({ rows = 4, isRTL = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, direction: isRTL ? 'rtl' : 'ltr' }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: 'var(--bg-card,#fff)',
          borderRadius: 16,
          border: '1px solid var(--border-base,#E5E7EB)',
        }}>
          <Circle size={44} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w="45%" h={14} />
            <Bone w="30%" h={11} />
          </div>
          <Bone w={70}  h={22} r={20} />
          <Bone w={60}  h={11} />
        </div>
      ))}
    </div>
  );
}

/**
 * Today's schedule sidebar
 */
export function ScheduleSidebarSkeleton({ rows = 5, isRTL = false }) {
  return (
    <div style={{
      background: 'var(--bg-card,#fff)',
      borderRadius: 24, padding: 24,
      boxShadow: tokens?.shadows?.sm || '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid var(--border-base,#E5E7EB)',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      <Bone w="60%" h={18} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-base,#E5E7EB)' }}>
            <Bone w={40} h={40} r={12} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Bone w="60%" h={12} />
              <Bone w="40%" h={10} />
            </div>
            <Bone w={50} h={20} r={20} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Profile settings form
 */
export function ProfileFormSkeleton({ isRTL = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Avatar row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
        <Circle size={80} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Bone w={140} h={14} />
          <Bone w={100} h={11} />
        </div>
      </div>
      {/* Fields */}
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Bone w="25%" h={11} />
          <Bone w="100%" h={42} r={10} />
        </div>
      ))}
      <Bone w={120} h={40} r={10} style={{ marginTop: 8 }} />
    </div>
  );
}

/**
 * Quick Access grid
 */
export function QuickAccessSkeleton({ cols = 4, isRTL = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 16, marginBottom: 32,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {Array.from({ length: cols * 2 }, (_, i) => (
        <div key={i} style={{
          borderRadius: 20, padding: '20px 16px',
          background: 'var(--bg-card,#fff)',
          border: '1px solid var(--border-base,#E5E7EB)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <Bone w={40} h={40} r={12} />
          <Bone w="70%" h={13} />
          <Bone w="55%" h={10} />
        </div>
      ))}
    </div>
  );
}

/**
 * Analytics chart placeholder
 */
export function AnalyticsChartSkeleton({ height = 280, isRTL = false }) {
  return (
    <div style={{
      borderRadius: 20, padding: 24,
      background: 'var(--bg-card,#fff)',
      border: '1px solid var(--border-base,#E5E7EB)',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Bone w={160} h={18} />
          <Bone w={100} h={11} />
        </div>
        <Bone w={100} h={32} r={20} />
      </div>
      {/* Bar chart simulation */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
        {[0.6, 0.85, 0.45, 0.9, 0.7, 0.55, 0.8].map((ratio, i) => (
          <Bone key={i} w="100%" h={height * ratio} r={6} />
        ))}
      </div>
    </div>
  );
}

/**
 * Patient list rows
 */
export function PatientListSkeleton({ rows = 5, isRTL = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, direction: isRTL ? 'rtl' : 'ltr' }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: 'var(--bg-card,#fff)',
          borderRadius: 14,
          border: '1px solid var(--border-base,#E5E7EB)',
        }}>
          <Circle size={40} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Bone w="40%" h={13} />
            <Bone w="25%" h={10} />
          </div>
          <Bone w={80} h={10} />
          <Bone w={32} h={32} r={10} />
        </div>
      ))}
    </div>
  );
}

/**
 * Convenience: full dashboard page skeleton
 * Renders all the above in the correct layout.
 */
export function DashboardPageSkeleton({ isRTL = false }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>
      <DashboardHeroSkeleton isRTL={isRTL} />
      <IdentityCardSkeleton  isRTL={isRTL} compact />
      <QuickAccessSkeleton   isRTL={isRTL} />
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, alignItems: 'start' }}>
        <AppointmentListSkeleton isRTL={isRTL} rows={5} />
        <ScheduleSidebarSkeleton isRTL={isRTL} rows={5} />
      </div>
    </div>
  );
}

export default {
  DashboardHeroSkeleton,
  IdentityCardSkeleton,
  AppointmentListSkeleton,
  ScheduleSidebarSkeleton,
  ProfileFormSkeleton,
  QuickAccessSkeleton,
  AnalyticsChartSkeleton,
  PatientListSkeleton,
  DashboardPageSkeleton,
};
