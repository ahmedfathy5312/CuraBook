export function Spinner({ size = 24, color = 'var(--primary)', className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-page)', flexDirection: 'column', gap: '16px',
      }}
    >
      <Spinner size={40} />
      <p style={{ color: 'var(--text-hint)', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>
        Loading...
      </p>
    </div>
  );
}

export function SectionLoader({ height = '200px' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height, flexDirection: 'column', gap: '12px',
      }}
    >
      <Spinner size={32} />
    </div>
  );
}

export default Spinner;
