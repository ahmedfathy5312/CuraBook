import React from 'react';

const shimmerStyles = {
  background: '#f6f7f8',
  backgroundImage: 'linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.5s infinite linear forwards',
};

const keyframes = `
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

export function ShimmerCard({ lines = 2 }) {
  return (
    <>
      <style>{keyframes}</style>
      <div style={{
        padding: '24px',
        borderRadius: 'var(--radius-lg, 12px)',
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border-base, #eaeaea)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ ...shimmerStyles, width: '60px', height: '60px', borderRadius: '50%' }}></div>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} style={{ ...shimmerStyles, height: '14px', borderRadius: '4px', width: i === 0 ? '80%' : '60%' }}></div>
        ))}
      </div>
    </>
  );
}

export function ShimmerDoctorCard() {
  return (
    <>
      <style>{keyframes}</style>
      <div style={{
        padding: '28px',
        borderRadius: 'var(--radius-lg, 12px)',
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border-base, #eaeaea)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ ...shimmerStyles, width: '64px', height: '64px', borderRadius: '50%', marginBottom: '8px' }}></div>
        <div style={{ ...shimmerStyles, height: '16px', borderRadius: '4px', width: '70%' }}></div>
        <div style={{ ...shimmerStyles, height: '12px', borderRadius: '4px', width: '50%' }}></div>
        <div style={{ ...shimmerStyles, height: '12px', borderRadius: '4px', width: '40%' }}></div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
            <div style={{ ...shimmerStyles, height: '36px', borderRadius: '20px', width: '100%' }}></div>
        </div>
      </div>
    </>
  );
}
