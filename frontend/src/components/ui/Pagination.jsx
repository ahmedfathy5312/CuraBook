export function Pagination({ page = 1, totalPages = 1, onChange, onPageChange }) {
  if (totalPages <= 1) return null;
  const handleChange = onChange || onPageChange || (() => {});

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btnStyle = (isActive, isDisabled) => ({
    width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
    border: isActive ? '1.5px solid var(--primary)' : '1.5px solid var(--border-base)',
    background: isActive ? 'var(--primary)' : 'var(--bg-card)',
    color: isActive ? '#fff' : isDisabled ? 'var(--text-hint)' : 'var(--text-h)',
    fontSize: '13px', fontWeight: 600, cursor: isDisabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', fontFamily: 'inherit',
    boxShadow: isActive ? '0 8px 18px rgba(14, 165, 190, 0.25)' : 'none',
    opacity: isDisabled ? 0.65 : 1,
  });

  return (
    <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Prev */}
      <button
        onClick={() => page > 1 && handleChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        aria-disabled={page === 1}
        style={btnStyle(false, page === 1)}
      >
        ←
      </button>

      {/* Pages */}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-hint)', fontSize: '13px' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => handleChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            style={btnStyle(p === page, false)}
            onMouseOver={e => { if (p !== page) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--primary)'; } }}
            onMouseOut={e => { if (p !== page) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-base)'; } }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => page < totalPages && handleChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        aria-disabled={page === totalPages}
        style={btnStyle(false, page === totalPages)}
      >
        →
      </button>
    </nav>
  );
}

export default Pagination;
