/**
 * DoctorIdentityCard.jsx
 * ======================
 * Sprint 3 · P2-UX-1
 *
 * Shared identity banner used in:
 *   - DoctorDashboardPage    (compact variant)
 *   - DoctorProfileOverviewPage (full variant)
 *
 * Props:
 *   profile  {object}  — full doctor profile (name, specialty, clinic_name, etc.)
 *   stats    {object}  — optional stats object (today_count, pending_count …)
 *   variant  "full" | "compact"   default: "full"
 *   isRTL    {boolean}
 *   loading  {boolean} — renders skeleton if true
 */

import React from 'react';
import Avatar from '../ui/Avatar';
import tokens from '../../theme/tokens';
import { ms, me } from '../../utils/rtl';

// ── Module-level safe constants ───────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL  = tokens?.colors?.primary?.lighter || '#E0F7FA';
const PD  = tokens?.colors?.primary?.dark    || '#0C6478';
const SUC = tokens?.colors?.success?.DEFAULT || '#31A870';
const SUBG= tokens?.colors?.success?.bg      || '#D1FAE5';
const GR4 = tokens?.colors?.gray?.[400]      || '#9CA3AF';
const GR5 = tokens?.colors?.gray?.[500]      || '#6B7280';
const GR8 = tokens?.colors?.gray?.[800]      || '#1F2937';
const SM  = tokens?.shadows?.sm              || '0 1px 3px rgba(0,0,0,0.08)';
const MD  = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 8,
      background: 'var(--bg-subtle, #F3F4F6)',
      animation: 'dic-pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

function InfoChip({ icon, label, color = P, bg = PL }) {
  if (!label) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      background: bg, color: color,
      fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      {label}
    </span>
  );
}

function StatPill({ value, label, loading }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 18px',
      background: 'var(--bg-subtle, #F9FAFB)',
      borderRadius: 14,
      minWidth: 72,
    }}>
      {loading
        ? <SkeletonLine width={32} height={20} style={{ marginBottom: 4 }} />
        : <span style={{ fontSize: 22, fontWeight: 900, color: GR8, lineHeight: 1 }}>{value ?? '—'}</span>
      }
      <span style={{ fontSize: 11, color: GR5, marginTop: 4, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DoctorIdentityCard({
  profile,
  stats,
  variant = 'full',
  isRTL   = false,
  loading = false,
}) {
  const isCompact = variant === 'compact';

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-card, #fff)',
        borderRadius: 20, padding: isCompact ? '20px 24px' : '28px 32px',
        boxShadow: MD, border: '1px solid var(--border-base, #E5E7EB)',
        display: 'flex', gap: 20, alignItems: 'center',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ width: isCompact ? 64 : 88, height: isCompact ? 64 : 88, borderRadius: '50%', background: 'var(--bg-subtle, #F3F4F6)', animation: 'dic-pulse 1.5s infinite', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonLine width="55%" height={isCompact ? 16 : 22} />
          <SkeletonLine width="35%" height={12} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <SkeletonLine width={80} height={24} style={{ borderRadius: 20 }} />
            <SkeletonLine width={100} height={24} style={{ borderRadius: 20 }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Resolve data (supports both flat stats object and nested profile) ──────
  const name          = profile?.full_name     || profile?.name     || stats?.name     || '';
  const specialty     = profile?.specialty     || stats?.specialty  || '';
  const clinicName    = profile?.clinic?.name  || profile?.clinic_name || stats?.clinic_name  || '';
  const clinicCity    = profile?.clinic?.city  || profile?.clinic_city || stats?.clinic_city  || '';
  const hospitalName  = profile?.hospital_name || stats?.hospital_name || '';
  const experience    = profile?.experience_years ?? stats?.experience_years;
  const imageUrl      = profile?.profile_image || stats?.profile_image || '';
  const acceptsBook   = profile?.accepts_booking ?? stats?.accepts_booking ?? true;

  const location = clinicCity || '';
  const workplace = clinicName || hospitalName || '';

  // ── Full variant ────────────────────────────────────────────────────────────
  if (!isCompact) {
    return (
      <>
        <style>{`@keyframes dic-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
        <div style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: 24, padding: '32px',
          boxShadow: MD, border: '1px solid var(--border-base, #E5E7EB)',
          direction: isRTL ? 'rtl' : 'ltr',
          marginBottom: 24,
        }}>

          {/* Top row: avatar + info */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Avatar with online indicator */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={imageUrl}
                name={name}
                size={88}
                style={{ border: `3px solid ${PL}` }}
              />
              <span style={{
                position: 'absolute', bottom: 4,
                insetInlineEnd: 4,
                width: 14, height: 14,
                borderRadius: '50%',
                background: acceptsBook ? SUC : GR4,
                border: '2px solid #fff',
              }} />
            </div>

            {/* Name + chips */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: 'var(--text-h, #111827)', lineHeight: 1.2 }}>
                {name || '—'}
              </h2>

              {/* Chips row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {specialty    && <InfoChip icon="🩺" label={specialty}                  color={P}   bg={PL} />}
                {workplace    && <InfoChip icon="🏥" label={workplace}                  color={GR8} bg="var(--bg-subtle, #F3F4F6)" />}
                {location     && <InfoChip icon="📍" label={location}                   color={GR5} bg="var(--bg-subtle, #F3F4F6)" />}
                {experience != null && <InfoChip icon="⏱" label={`${experience} ${isRTL ? 'سنة خبرة' : 'yrs exp'}`} color={GR5} bg="var(--bg-subtle, #F3F4F6)" />}
                <InfoChip
                  icon={acceptsBook ? '✅' : '🔴'}
                  label={acceptsBook ? (isRTL ? 'يقبل حجوزات' : 'Accepting Bookings') : (isRTL ? 'مغلق للحجز' : 'Not Accepting')}
                  color={acceptsBook ? '#065F46' : '#991B1B'}
                  bg={acceptsBook ? SUBG : '#FEE2E2'}
                />
              </div>

              {/* Stats row */}
              {stats && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <StatPill value={stats.today_count}  label={isRTL ? 'اليوم'      : 'Today'}      loading={false} />
                  <StatPill value={stats.pending_count} label={isRTL ? 'معلقة'     : 'Pending'}    loading={false} />
                  <StatPill value={stats.total_count}   label={isRTL ? 'إجمالي'    : 'Total'}      loading={false} />
                  <StatPill value={stats.unique_patients} label={isRTL ? 'مرضى'    : 'Patients'}   loading={false} />
                  {stats.completion_rate != null && (
                    <StatPill value={`${stats.completion_rate}%`} label={isRTL ? 'إكمال' : 'Rate'} loading={false} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Compact variant ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes dic-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <div style={{
        background: 'var(--bg-card, #fff)',
        borderRadius: 16, padding: '16px 20px',
        boxShadow: SM, border: '1px solid var(--border-base, #E5E7EB)',
        display: 'flex', gap: 14, alignItems: 'center',
        direction: isRTL ? 'rtl' : 'ltr',
        marginBottom: 20,
      }}>

        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={imageUrl} name={name} size={52} style={{ border: `2px solid ${PL}` }} />
          <span style={{
            position: 'absolute', bottom: 2, insetInlineEnd: 2,
            width: 10, height: 10, borderRadius: '50%',
            background: acceptsBook ? SUC : GR4,
            border: '2px solid #fff',
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--text-h, #111827)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name || '—'}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {specialty && <InfoChip icon="🩺" label={specialty}   color={P}   bg={PL} />}
            {workplace && <InfoChip icon="🏥" label={workplace}   color={GR8} bg="var(--bg-subtle, #F3F4F6)" />}
          </div>
        </div>

        {/* Booking badge */}
        <InfoChip
          icon={acceptsBook ? '✅' : '🔴'}
          label={acceptsBook ? (isRTL ? 'متاح' : 'Open') : (isRTL ? 'مغلق' : 'Closed')}
          color={acceptsBook ? '#065F46' : '#991B1B'}
          bg={acceptsBook ? SUBG : '#FEE2E2'}
        />
      </div>
    </>
  );
}
