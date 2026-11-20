import { cn } from '../../utils/cn';

const pulse = `
  @keyframes skeleton-pulse {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`;

const shimmerStyle = {
  background: 'linear-gradient(90deg, #E6EFF6 25%, #e0e0e0 50%, #E6EFF6 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.4s ease infinite',
  borderRadius: 'var(--radius-sm)',
};

export function Skeleton({ className, style }) {
  return (
    <>
      <style>{pulse}</style>
      <div style={{ ...shimmerStyle, ...style }} className={cn('rounded', className)} />
    </>
  );
}

Skeleton.Text = function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <style>{pulse}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ ...shimmerStyle, height: '14px', width: i === lines - 1 ? '65%' : '100%' }} />
      ))}
    </div>
  );
};

Skeleton.Card = function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
      <style>{pulse}</style>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ ...shimmerStyle, width: '48px', height: '48px', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmerStyle, height: '16px', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '60%' }} />
        </div>
      </div>
      <Skeleton.Text lines={2} />
    </div>
  );
};

Skeleton.Table = function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
      <style>{pulse}</style>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-base)' }}>
        <div style={{ ...shimmerStyle, height: '14px', width: '40%' }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
          gap: '16px', padding: '16px 24px',
          borderBottom: i < rows - 1 ? '1px solid var(--bg-page)' : 'none',
        }}>
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} style={{ ...shimmerStyle, height: '12px' }} />
          ))}
        </div>
      ))}
    </div>
  );
};

Skeleton.Doctor = function SkeletonDoctor() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
      <style>{pulse}</style>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ ...shimmerStyle, width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmerStyle, height: '16px', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '55%', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '40%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ ...shimmerStyle, height: '32px', flex: 1, borderRadius: 'var(--radius-md)' }} />
        <div style={{ ...shimmerStyle, height: '32px', flex: 1, borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  );
};

Skeleton.StatCard = function SkeletonStatCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
      <style>{pulse}</style>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ ...shimmerStyle, width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmerStyle, height: '28px', width: '60%', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, height: '12px', width: '80%' }} />
        </div>
      </div>
    </div>
  );
};

// ── FIX F-11: Row skeleton — for list/table row loading states ───────────────
Skeleton.Row = function SkeletonRow({ cols = 4 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '16px', padding: '16px 24px',
      borderBottom: '1px solid var(--bg-page)',
    }}>
      <style>{pulse}</style>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ ...shimmerStyle, height: '14px', width: i === 0 ? '80%' : '60%' }} />
      ))}
    </div>
  );
};

// ── FIX F-11: Page header skeleton ──────────────────────────────────────────
Skeleton.PageHeader = function SkeletonPageHeader() {
  return (
    <div style={{ marginBottom: '24px' }}>
      <style>{pulse}</style>
      <div style={{ ...shimmerStyle, height: '28px', width: '35%', marginBottom: '10px', borderRadius: 'var(--radius-md)' }} />
      <div style={{ ...shimmerStyle, height: '14px', width: '55%', borderRadius: 'var(--radius-sm)' }} />
    </div>
  );
};

// ── FIX F-11: List skeleton — N cards stacked vertically ────────────────────
Skeleton.List = function SkeletonList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{pulse}</style>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.Card key={i} />
      ))}
    </div>
  );
};

export default Skeleton;
