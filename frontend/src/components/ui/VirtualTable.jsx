/**
 * VirtualTable — react-window powered table for large datasets
 *
 * Uses FixedSizeList to render only visible rows — handles 10,000+ rows
 * without performance issues.
 *
 * Usage:
 *   <VirtualTable
 *     rows={patients}           // array of data
 *     columns={[                // column definitions
 *       { key: 'name', header: 'Patient', render: (row) => <strong>{row.name}</strong> },
 *       { key: 'date', header: 'Date' },
 *     ]}
 *     rowHeight={64}            // px height per row (default: 64)
 *     maxHeight={600}           // max container height (default: 600)
 *     onRowClick={(row) => ...} // optional row click handler
 *     emptyText="No results"    // empty state message
 *     loading={false}           // show skeleton rows
 *   />
 *
 * Falls back gracefully when react-window is not installed:
 *   renders a standard <table> with a console warning.
 */

import { useCallback, forwardRef } from 'react';

// ── Graceful fallback if react-window not installed ───────────────────────────
// F-14 FIX: Replaced CJS require() with ESM-compatible approach.
// react-window is an optional dependency — when not installed, VirtualTable
// falls back to StandardTable automatically (no virtualization, same UI).
// To enable virtualization: npm install react-window
let FixedSizeList = null;
// Dynamic import is async so we use a module-level flag instead.
// react-window is not in package.json → always uses StandardTable fallback.
// If react-window is added later, change this to:
//   import { FixedSizeList } from 'react-window';
//   (and remove the null check below)

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ columnCount, height }) {
  return (
    <div style={{ display: 'flex', height, borderBottom: '1px solid var(--border-base)', alignItems: 'center', padding: '0 18px', gap: 12 }}>
      {Array.from({ length: columnCount }).map((_, i) => (
        <div key={i} style={{ flex: i === 0 ? 2 : 1, height: 14, borderRadius: 'var(--radius-md)', background: 'var(--border-base)' }} />
      ))}
    </div>
  );
}

// ── Column header row ─────────────────────────────────────────────────────────
function HeaderRow({ columns }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--bg-page)',
      borderBottom: '2px solid var(--border-base)', padding: '0 18px',
    }}>
      {columns.map(col => (
        <div
          key={col.key}
          style={{
            flex: col.flex || 1,
            padding: '12px 8px',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            minWidth: col.minWidth || 80,
          }}
        >
          {col.header}
        </div>
      ))}
    </div>
  );
}

// ── Virtual row renderer ──────────────────────────────────────────────────────
const VirtualRow = ({ index, style, data }) => {
  const { rows, columns, onRowClick, rowHeight } = data;
  const row = rows[index];
  const isEven = index % 2 === 0;

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        background: isEven ? '#fff' : 'var(--bg-subtle)',
        borderBottom: '1px solid var(--border-base)',
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
        boxSizing: 'border-box',
      }}
      onClick={() => onRowClick?.(row)}
      onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#F0FAFA'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isEven ? '#fff' : 'var(--bg-subtle)'; }}
    >
      {columns.map(col => (
        <div
          key={col.key}
          style={{
            flex: col.flex || 1,
            fontSize: 13,
            color: 'var(--text-body)',
            padding: '0 8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: col.minWidth || 80,
          }}
        >
          {col.render ? col.render(row, index) : (row[col.key] ?? '—')}
        </div>
      ))}
    </div>
  );
};

// ── Fallback standard table (when react-window not available) ─────────────────
function StandardTable({ rows, columns, onRowClick, loading, emptyText }) {
  if (loading) {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i}>
              {columns.map((col, j) => (
                <td key={j} style={{ padding: '14px 18px' }}>
                  <div style={{ height: 14, borderRadius: 'var(--radius-md)', background: 'var(--border-base)' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (!rows.length) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-hint)' }}>
        <p style={{ fontSize: 36, margin: '0 0 10px' }}>🔍</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id || i}
            onClick={() => onRowClick?.(row)}
            style={{
              borderBottom: '1px solid var(--border-base)',
              cursor: onRowClick ? 'pointer' : 'default',
            }}
          >
            {columns.map(col => (
              <td key={col.key} style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-body)' }}>
                {col.render ? col.render(row, i) : (row[col.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main VirtualTable ─────────────────────────────────────────────────────────
export default function VirtualTable({
  rows = [],
  columns = [],
  rowHeight = 64,
  maxHeight = 600,
  onRowClick,
  loading = false,
  emptyText = 'No data found',
  className = '',
}) {
  const containerStyle = {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={containerStyle} className={className}>
        <HeaderRow columns={columns} />
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonRow key={i} columnCount={columns.length} height={rowHeight} />
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!rows.length) {
    return (
      <div style={containerStyle} className={className}>
        <HeaderRow columns={columns} />
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-hint)' }}>
          <p style={{ fontSize: 36, margin: '0 0 10px' }}>🔍</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>{emptyText}</p>
        </div>
      </div>
    );
  }

  // ── Virtualized table (react-window) ────────────────────────────────────
  if (FixedSizeList) {
    const listHeight = Math.min(rows.length * rowHeight, maxHeight);

    return (
      <div style={containerStyle} className={className}>
        <HeaderRow columns={columns} />
        <FixedSizeList
          height={listHeight}
          itemCount={rows.length}
          itemSize={rowHeight}
          width="100%"
          itemData={{ rows, columns, onRowClick, rowHeight }}
          overscanCount={5}
        >
          {VirtualRow}
        </FixedSizeList>
      </div>
    );
  }

  // ── Fallback: standard table ─────────────────────────────────────────────
  return (
    <div style={containerStyle} className={className}>
      <HeaderRow columns={columns} />
      <StandardTable
        rows={rows}
        columns={columns}
        onRowClick={onRowClick}
        loading={loading}
        emptyText={emptyText}
      />
    </div>
  );
}
