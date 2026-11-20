/**
 * HospitalsSection.jsx — Admin Hospitals Management Section
 * Sprint 3: Advanced Filtering
 * Sprint 4: Bulk Actions
 * Gap #3: Clickable rows → HospitalProfileModal
 */
import { useState, useCallback } from 'react';
import Avatar from '../../../components/ui/Avatar';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import useTranslation from '../../../i18n/useTranslation';
import AdvancedFilterBar, { applyFilters } from '../components/AdvancedFilterBar';
import BulkActionBar from '../components/BulkActionBar';
import { useBulkSelect, exportToCSV } from '../hooks/useBulkSelect';
import { EGYPT_GOVERNORATES } from '../../../constants/GOVERNORATES';
import { HospitalProfileModal } from '../components/AdminProfileModals';

// ISSUE-009 FIX: Translate city value (English key → Arabic name) for display
// The backend may store city as either an Arabic string or an English key (e.g. 'cairo')
function translateCity(value) {
  if (!value) return '—';
  // Try to find in governorates by value (English key) or by ar (already Arabic)
  const found = EGYPT_GOVERNORATES.find(
    g => g.value === value || g.en?.toLowerCase() === value?.toLowerCase() || g.ar === value
  );
  return found ? found.ar : value; // Return Arabic name, or original if not found
}

const FILTER_CONFIG = [
  {
    key: 'city', label: 'المحافظة', type: 'select',
    options: EGYPT_GOVERNORATES.map(g => ({ value: g.ar, label: g.ar })),
  },
  { key: 'is_active', label: 'الحالة', type: 'boolean' },
  {
    key: 'min_doctors', label: 'الأطباء', type: 'select',
    options: [
      { value: '1',  label: '1+ طبيب'   },
      { value: '5',  label: '5+ أطباء'  },
      { value: '10', label: '10+ أطباء' },
      { value: '25', label: '25+ طبيب'  },
      { value: '50', label: '50+ طبيب'  },
    ],
  },
];

const EMPTY_FILTERS = { city: null, is_active: null, min_doctors: null };

const EXPORT_COLS = [
  { header: 'اسم المستشفى', key: 'name'          },
  { header: 'المحافظة',     key: 'city'          },
  { header: 'عدد الأطباء',  key: 'doctors_count' },
  { header: 'الحالة',       key: 'is_active'     },
];

export default function HospitalsSection({ hospitals = [], loading, onToggle, filterFn }) {
  const { t } = useTranslation();
  const [filterValues, setFilterValues] = useState(EMPTY_FILTERS);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const textFiltered = filterFn ? filterFn(hospitals, ['name', 'city']) : hospitals;
  const filtered = applyFilters(textFiltered, filterValues, {
    city:        'city',
    is_active:   'is_active',
    min_doctors: (item, val) => (item.doctors_count || 0) >= parseInt(val, 10),
  });

  const bulk = useBulkSelect(filtered);

  const handleBulkActivate   = useCallback(() => { bulk.selectedRows().filter(r => !r.is_active).forEach(r => onToggle?.(r.id)); bulk.clear(); }, [bulk, onToggle]);
  const handleBulkDeactivate = useCallback(() => { bulk.selectedRows().filter(r =>  r.is_active).forEach(r => onToggle?.(r.id)); bulk.clear(); }, [bulk, onToggle]);
  const handleBulkExport     = useCallback(() => exportToCSV(bulk.selectedRows(), EXPORT_COLS, 'hospitals_export.csv'), [bulk]);

  const checkCol = {
    header: (
      <input type="checkbox" checked={bulk.allSelected}
        ref={el => { if (el) el.indeterminate = bulk.someSelected; }}
        onChange={bulk.toggleAll}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#0E7490' }}
      />
    ),
    key: '__check', align: 'center', width: '56px', minWidth: 56,
    render: (_, row) => (
      <input type="checkbox" checked={bulk.isSelected(row.id)}
        onChange={() => bulk.toggle(row.id)}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#0E7490' }}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  const COLS = [
    checkCol,
    {
      header: t('adminCols.hospital'), key: 'name',
      width: '36%',
      minWidth: 300,
      render: (v, r) => (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => setSelectedHospital(r)}
        >
          <Avatar name={v} size="sm" />
          <span style={{ fontWeight: 600, color: 'var(--txt-heading)' }}>{v}</span>
        </div>
      ),
    },
    { header: t('adminCols.city'),    key: 'city', render: v => translateCity(v) },
    { header: t('adminCols.doctors'), key: 'doctors_count', render: v => v ?? '—' },
    { header: t('adminCols.status'),  key: 'is_active', render: v => <Badge status={v ? 'active' : 'inactive'} /> },
    {
      header: t('adminCols.action'), key: 'id', align: 'right',
      width: '18%',
      minWidth: 130,
      render: (id, r) => (
        <Button variant="outline" size="xs" onClick={() => onToggle?.(id)}>
          {r.is_active ? t('adminStats.actions.deactivate') : t('adminStats.actions.activate')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: '0 0 4px' }}>
          إدارة المستشفيات
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-hint, #8AAFC4)', margin: 0 }}>
          {bulk.count > 0 ? `${bulk.count} محدد · ` : ''}
          {`${filtered.length} من ${hospitals.length} مستشفى`}
        </p>
      </div>

      <AdvancedFilterBar
        filters={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      <Table columns={COLS} data={filtered} loading={loading} emptyTitle={t('adminStats.empty.hospitals')} />

      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clear}
        onActivate={onToggle ? handleBulkActivate   : undefined}
        onDeactivate={onToggle ? handleBulkDeactivate : undefined}
        onExport={handleBulkExport}
      />

      <HospitalProfileModal
        hospital={selectedHospital}
        open={!!selectedHospital}
        onClose={() => setSelectedHospital(null)}
        onToggle={onToggle}
      />
    </div>
  );
}
