/**
 * components/skeletons/index.jsx
 * Full skeleton loading library for CuraBook
 * Used across all pages for smooth loading states
 */

const pulse = `
  @keyframes cb-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
`;

const Base = ({ w = '100%', h = 16, r = 8, style = {} }) => (
  <>
    <style>{pulse}</style>
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--border-base) 25%, var(--border-base) 50%, var(--border-base) 75%)',
      backgroundSize: '200% 100%',
      animation: 'cb-pulse 1.5s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  </>
);

// ── Doctor Card Skeleton ──────────────────────────────────────────────────────
export function DoctorCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
      boxShadow: 'var(--shadow-md)',
      display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <Base w={60} h={60} r={50} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Base w="70%" h={14} />
          <Base w="50%" h={12} />
          <Base w="40%" h={11} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Base w={80} h={26} r={20} />
        <Base w={70} h={26} r={20} />
        <Base w={60} h={26} r={20} />
      </div>
      <Base w="100%" h={38} r={12} />
    </div>
  );
}

// ── Doctor List Skeleton ──────────────────────────────────────────────────────
export function DoctorListSkeleton({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <DoctorCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Appointment Card Skeleton ─────────────────────────────────────────────────
export function AppointmentCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
      boxShadow: 'var(--shadow-md)',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <Base w={50} h={50} r={50} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Base w="55%" h={14} />
        <Base w="40%" h={12} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <Base w={70} h={22} r={20} />
          <Base w={80} h={22} r={20} />
        </div>
      </div>
      <Base w={90} h={34} r={8} />
    </div>
  );
}

// ── Appointments List Skeleton ────────────────────────────────────────────────
export function AppointmentsSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <AppointmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Stat Card Skeleton ────────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
      boxShadow: 'var(--shadow-md)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Base w="50%" h={13} />
        <Base w={36} h={36} r={10} />
      </div>
      <Base w="40%" h={28} r={6} />
      <Base w="60%" h={11} />
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '16px' }}>
      {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

// ── Table Skeleton ────────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '16px', padding: '16px 20px',
        background: 'var(--bg-page)', borderBottom: '1px solid var(--border-base)',
      }}>
        {Array.from({ length: cols }).map((_, i) => <Base key={i} h={13} />)}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '16px', padding: '16px 20px',
          borderBottom: '1px solid var(--bg-page)',
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Base key={c} h={13} w={c === 0 ? '70%' : c === cols - 1 ? '60%' : '80%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Doctor Profile Skeleton ───────────────────────────────────────────────────
export function DoctorProfileSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <Base w={96} h={96} r={50} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px' }}>
              <Base w="60%" h={20} />
              <Base w="45%" h={14} />
              <Base w="35%" h={13} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Base w={80} h={24} r={20} />
                <Base w={70} h={24} r={20} />
                <Base w={90} h={24} r={20} />
              </div>
            </div>
          </div>
          <Base h={14} /><div style={{ height: 6 }} />
          <Base h={14} w="90%" /><div style={{ height: 6 }} />
          <Base h={14} w="75%" />
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[1,2,3,4].map(i => <Base key={i} h={36} r={8} />)}
          </div>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '10px', display: 'flex', gap: '12px' }}>
              <Base w={36} h={36} r={8} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Base w="30%" h={11} />
                <Base w="60%" h={13} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)', height: 'fit-content' }}>
        <Base h={18} w="50%" style={{ marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '20px' }}>
          {Array.from({ length: 21 }).map((_, i) => <Base key={i} h={32} r={8} />)}
        </div>
        <Base h={44} r={12} />
      </div>
    </div>
  );
}

// ── Notification Skeleton ─────────────────────────────────────────────────────
export function NotificationSkeleton({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px 18px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', gap: '14px', alignItems: 'flex-start',
        }}>
          <Base w={40} h={40} r={50} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <Base w="70%" h={13} />
            <Base w="50%" h={12} />
          </div>
          <Base w={50} h={12} />
        </div>
      ))}
    </div>
  );
}

// ── Profile Skeleton ──────────────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-lg)', padding: '32px', display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Base w={96} h={96} r={50} style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Base w="50%" h={20} style={{ background: 'rgba(255,255,255,0.3)' }} />
          <Base w="35%" h={14} style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
        <Base w="30%" h={16} style={{ marginBottom: '20px' }} />
        <AppointmentsSkeleton count={3} />
      </div>
    </div>
  );
}

// ── Generic Page Skeleton ─────────────────────────────────────────────────────
export function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '32px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      <Base h={32} w="30%" />
      <StatsSkeleton count={4} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}

// Default export all
export default {
  DoctorCardSkeleton, DoctorListSkeleton,
  AppointmentCardSkeleton, AppointmentsSkeleton,
  StatCardSkeleton, StatsSkeleton,
  TableSkeleton, DoctorProfileSkeleton,
  NotificationSkeleton, ProfileSkeleton, PageSkeleton,
};
