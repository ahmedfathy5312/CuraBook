export function Tabs({ tabs = [], active, onChange, variant = 'underline' }) {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label="Tab navigation"
        style={{
          display: 'flex', gap: '6px', flexWrap: 'wrap',
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              id={`tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-full)', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                background: isActive ? 'var(--primary)' : 'var(--border-base)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                outline: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
              onFocus={e => { if (!isActive) e.target.style.boxShadow = '0 0 0 3px rgba(27,94,138,0.2)'; }}
              onBlur={e => { e.target.style.boxShadow = 'none'; }}
            >
              {tab.label}
              {tab.count != null && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)', padding: '0 7px',
                  fontSize: '11px', fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // underline variant (default)
  return (
    <div
      role="tablist"
      style={{
        display: 'flex', gap: '0', borderBottom: '2px solid var(--border-base)', overflowX: 'auto',
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '10px 18px', border: 'none', borderBottom: '2px solid transparent',
              marginBottom: '-2px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s', background: 'none', whiteSpace: 'nowrap',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              borderBottomColor: isActive ? 'var(--primary)' : 'transparent',
              outline: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onFocus={e => { if (!isActive) e.target.style.color = 'var(--text-body)'; }}
            onBlur={e => { if (!isActive) e.target.style.color = 'var(--text-muted)'; }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{
                background: isActive ? '#B8D9EF' : 'var(--border-base)',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-full)', padding: '0 7px',
                fontSize: '11px', fontWeight: 700,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
