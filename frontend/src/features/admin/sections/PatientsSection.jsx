/**
 * PatientsSection.jsx - Admin Patients Management Section
 * Advanced filtering, bulk export, and patient profile modal.
 */
import { useState, useCallback } from 'react';
import Avatar from '../../../components/ui/Avatar';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import { formatDate } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';
import AdvancedFilterBar, { applyFilters } from '../components/AdvancedFilterBar';
import BulkActionBar from '../components/BulkActionBar';
import { useBulkSelect, exportToCSV } from '../hooks/useBulkSelect';
import { PatientProfileModal } from '../components/AdminProfileModals';

const FILTER_CONFIG = [
  { key: 'is_active', label: 'الحالة', type: 'boolean' },
  { key: 'joined', label: 'تاريخ التسجيل', type: 'daterange' },
];

const EMPTY_FILTERS = { is_active: null, joined: null };

const EXPORT_COLS = [
  { header: 'الاسم', key: 'full_name' },
  { header: 'البريد', key: 'email' },
  { header: 'الهاتف', key: 'phone' },
  { header: 'تاريخ التسجيل', key: 'date_joined' },
  { header: 'الحالة', key: 'is_active' },
];

export default function PatientsSection({ patients = [], loading, filterFn, onToggle }) {
  const { t } = useTranslation();
  const [filterValues, setFilterValues] = useState(EMPTY_FILTERS);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const normalizedPatients = patients.map(patient => ({
    ...patient,
    is_active: patient.is_active ?? patient.user?.is_active ?? false,
    date_joined: patient.date_joined || patient.user?.date_joined || null,
  }));

  const textFiltered = filterFn ? filterFn(normalizedPatients, ['full_name', 'email']) : normalizedPatients;
  const filtered = applyFilters(textFiltered, filterValues, {
    is_active: 'is_active',
    joined: 'date_joined',
  });

  const bulk = useBulkSelect(filtered);
  const handleBulkExport = useCallback(
    () => exportToCSV(bulk.selectedRows(), EXPORT_COLS, 'patients_export.csv'),
    [bulk]
  );

  const checkCol = {
    header: (
      <input
        type="checkbox"
        checked={bulk.allSelected}
        ref={el => { if (el) el.indeterminate = bulk.someSelected; }}
        onChange={bulk.toggleAll}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#0E7490' }}
      />
    ),
    key: '__check',
    align: 'center',
    width: '56px',
    minWidth: 56,
    render: (_, row) => (
      <input
        type="checkbox"
        checked={bulk.isSelected(row.id)}
        onChange={() => bulk.toggle(row.id)}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#0E7490' }}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  const COLS = [
    checkCol,
    {
      header: t('adminCols.patient'),
      key: 'full_name',
      width: '38%',
      minWidth: 360,
      render: (v, r) => (
        <div
          className="admin-patient-cell"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0, maxWidth: '100%' }}
          onClick={() => setSelectedPatient(r)}
        >
          <Avatar name={v} size="sm" src={r.image} />
          <div>
            <div title={v || ''}>{v || '—'}</div>
            <div title={r.email || ''}>{r.email || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      header: t('adminCols.phone'),
      key: 'phone',
      width: '18%',
      minWidth: 170,
      render: v => (
        <span title={v || ''} style={{ direction: 'ltr', unicodeBidi: 'plaintext', whiteSpace: 'nowrap' }}>
          {v || '—'}
        </span>
      ),
    },
    {
      header: t('adminCols.joined'),
      key: 'date_joined',
      width: '18%',
      minWidth: 150,
      render: v => formatDate(v),
    },
    {
      header: t('adminCols.status'),
      key: 'is_active',
      width: '12%',
      minWidth: 110,
      align: 'center',
      render: v => <Badge status={v ? 'active' : 'inactive'} />,
    },
    {
      header: t('adminCols.actions'),
      key: 'id',
      align: 'right',
      width: '12%',
      minWidth: 120,
      render: (id, r) => (
        <Button variant="outline" size="xs" onClick={() => onToggle?.(id)}>
          {r.is_active ? t('adminStats.actions.deactivate') : t('adminStats.actions.activate')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <style>{`
        .admin-patient-cell > div:last-child {
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }
        .admin-patient-cell > div:last-child > div {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .admin-patient-cell > div:last-child > div:first-child {
          color: var(--txt-heading);
          font-weight: 700;
        }
        .admin-patient-cell > div:last-child > div:last-child {
          color: var(--text-hint, #8AAFC4);
          direction: ltr;
          font-size: 11px;
          text-align: right;
          unicode-bidi: plaintext;
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: '0 0 4px' }}>
          إدارة المرضى
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-hint, #8AAFC4)', margin: 0 }}>
          {bulk.count > 0 ? `${bulk.count} محدد · ` : ''}
          {`${filtered.length} من ${patients.length} مريض`}
        </p>
      </div>

      <AdvancedFilterBar
        filters={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      <Table columns={COLS} data={filtered} loading={loading} emptyTitle={t('adminStats.empty.patients')} />

      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clear}
        onExport={handleBulkExport}
      />

      <PatientProfileModal
        patient={selectedPatient}
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </div>
  );
}
