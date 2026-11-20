import Skeleton from './Skeleton';
import { EmptyState } from './EmptyState';

export function Table({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data',
  emptyMessage = '',
  emptyPreset,
  caption,
}) {
  if (loading) return <Skeleton.Table rows={5} />;

  if (!data.length) {
    return <EmptyState preset={emptyPreset} title={emptyTitle} message={emptyMessage} compact />;
  }

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: columns.some(col => col.minWidth) ? columns.reduce((sum, col) => sum + (col.minWidth || 120), 0) : undefined, borderCollapse: 'collapse', tableLayout: 'fixed' }} role="table">
          <colgroup>
            {columns.map(col => (
              <col key={col.key} style={{ width: col.width, minWidth: col.minWidth }} />
            ))}
          </colgroup>
          {caption && (
            <caption style={{
              fontSize: '14px', fontWeight: 700, color: 'var(--text-h)',
              padding: '16px 24px', textAlign: 'left',
            }}>
              {caption}
            </caption>
          )}
          <thead>
            <tr role="row" style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border-base)' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  role="columnheader"
                  scope="col"
                  style={{
                    padding: '12px 20px',
                    fontSize: '11px', fontWeight: 600, color: 'var(--text-hint)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    textAlign: col.align || 'start',
                    whiteSpace: 'nowrap',
                    width: col.width,
                    minWidth: col.minWidth,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.filter(Boolean).map((row, ri) => (
              <tr
                key={row?.id ?? ri}
                role="row"
                style={{
                  borderBottom: ri < data.length - 1 ? '1px solid var(--bg-page)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    role="cell"
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px', color: 'var(--text-body)',
                      textAlign: col.align || 'start',
                      verticalAlign: 'middle',
                      width: col.width,
                      minWidth: col.minWidth,
                      overflow: col.truncate ? 'hidden' : undefined,
                      textOverflow: col.truncate ? 'ellipsis' : undefined,
                      whiteSpace: col.wrap ? 'normal' : 'nowrap',
                    }}
                  >
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
