/**
 * useBulkSelect.js — Shared bulk-selection logic
 * Sprint 4: Bulk Actions
 *
 * Usage:
 *   const bulk = useBulkSelect(filteredData);
 *   bulk.selected       → Set<id>
 *   bulk.allSelected    → boolean
 *   bulk.count          → number
 *   bulk.isSelected(id) → boolean
 *   bulk.toggle(id)     → void
 *   bulk.toggleAll()    → void
 *   bulk.clear()        → void
 *   bulk.selectedRows() → array of full row objects from filteredData
 */
import { useState, useCallback, useMemo } from 'react';

export function useBulkSelect(data = []) {
  const [selected, setSelected] = useState(new Set());

  const ids = useMemo(() => data.map(r => r?.id).filter(Boolean), [data]);

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected  = ids.length > 0 && ids.every(id => selected.has(id));
  const someSelected = ids.some(id => selected.has(id)) && !allSelected;
  const count        = [...selected].filter(id => ids.includes(id)).length; // only count visible

  const isSelected = useCallback((id) => selected.has(id), [selected]);

  const selectedRows = useCallback(
    () => data.filter(r => r?.id && selected.has(r.id)),
    [data, selected]
  );

  return { selected, allSelected, someSelected, count, isSelected, toggle, toggleAll, clear, selectedRows };
}

/* ─── CSV export utility ─────────────────────────────── */
export function exportToCSV(rows, columns, filename = 'export.csv') {
  if (!rows.length) return;

  // columns: [{ header, key }] — use readable keys only
  const exportCols = columns.filter(c => c.key && c.key !== '__check' && c.key !== 'id');
  const headers    = exportCols.map(c => c.header || c.key);

  const escape = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${str}"` : str;
  };

  const rows_csv = rows.map(row =>
    exportCols.map(col => escape(row[col.key])).join(',')
  );

  const csv   = [headers.join(','), ...rows_csv].join('\n');
  const blob  = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel Arabic
  const url   = URL.createObjectURL(blob);
  const link  = document.createElement('a');
  link.href   = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
