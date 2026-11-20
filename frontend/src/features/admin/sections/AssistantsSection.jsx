/**
 * AssistantsSection.jsx — Admin Assistants Management Section
 *
 * يعرض قائمة المساعدين مع:
 * - Advanced Filter Bar (الحالة، المستشفى)
 * - Bulk Actions (export CSV)
 * - Clickable rows → AssistantProfileModal
 *
 * يستخدم البيانات من /admin/doctors/ مع فلترة is_assistant
 * (حتى يتم إنشاء endpoint مستقل للمساعدين في الباك)
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
import { AssistantProfileModal } from '../components/AdminProfileModals';

const PRIMARY = '#0E7490';

// ── Filter Config ──────────────────────────────────────────────────────────────
const FILTER_CONFIG = [
  { key: 'is_active',     label: 'الحالة',    type: 'boolean' },
  { key: 'joined',        label: 'تاريخ الانضمام', type: 'daterange' },
];

const EMPTY_FILTERS = { is_active: null, joined: null };

// ── Export Columns ─────────────────────────────────────────────────────────────
const EXPORT_COLS = [
  { header: 'الاسم',           key: 'full_name'    },
  { header: 'البريد',          key: 'email'        },
  { header: 'الهاتف',          key: 'phone'        },
  { header: 'المستشفى',        key: 'hospital_name'},
  { header: 'تاريخ الانضمام',  key: 'date_joined'  },
  { header: 'الحالة',          key: 'is_active'    },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function AssistantsSection({ assistants: propAssistants = [], loading: propLoading = false, filterFn, onToggle }) {
  const { t } = useTranslation();
  const [filterValues, setFilterValues]       = useState(EMPTY_FILTERS);
  const [selectedAssistant, setSelectedAssistant] = useState(null);

  // ISSUE-016 FIX: Use only parent-provided data (AdminDashboardPage manages the query)
  // Removed redundant standalone useQuery fetch that caused race conditions
  const assistants = propAssistants;
  const loading    = propLoading;

  // Text filter (from search bar in topbar)
  const textFiltered = filterFn
    ? filterFn(assistants, ['full_name', 'email', 'hospital_name'])
    : assistants;

  // Advanced filters
  const filtered = applyFilters(textFiltered, filterValues, {
    is_active: 'is_active',
    joined:    'date_joined',
  });

  const bulk = useBulkSelect(filtered);

  const handleBulkExport = useCallback(
    () => exportToCSV(bulk.selectedRows(), EXPORT_COLS, 'assistants_export.csv'),
    [bulk]
  );

  // ── Checkbox column ──────────────────────────────────────────────────────────
  const checkCol = {
    header: (
      <input
        type="checkbox"
        checked={bulk.allSelected}
        ref={el => { if (el) el.indeterminate = bulk.someSelected; }}
        onChange={bulk.toggleAll}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: PRIMARY }}
      />
    ),
    key: '__check', align: 'center', width: '56px', minWidth: 56,
    render: (_, row) => (
      <input
        type="checkbox"
        checked={bulk.isSelected(row.id)}
        onChange={() => bulk.toggle(row.id)}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: PRIMARY }}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  // ── Table columns ─────────────────────────────────────────────────────────────
  const COLS = [
    checkCol,
    {
      header: 'المساعد',
      key: 'full_name',
      width: '27%',
      minWidth: 260,
      render: (v, r) => (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => setSelectedAssistant(r)}
        >
          <Avatar name={v} size="sm" src={r.image} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--txt-heading)' }}>{v || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint, #8AAFC4)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'الهاتف',
      key: 'phone',
      width: '13%',
      minWidth: 140,
      render: v => v || '—',
    },
    {
      header: 'المستشفى',
      key: 'hospital_name',
      width: '17%',
      minWidth: 180,
      wrap: true,
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>🏥</span>
          <span style={{ fontSize: 13, color: 'var(--text-body)', whiteSpace: 'normal', lineHeight: 1.45 }}>{v || r.hospital || '—'}</span>
        </div>
      ),
    },
    {
      header: 'العيادة',
      key: 'clinic_name',
      width: '27%',
      minWidth: 280,
      wrap: true,
      render: v => (
        <span style={{
          display: 'block',
          color: 'var(--text-body)',
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.5,
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
        }}>
          {v || '—'}
        </span>
      ),
    },
    {
      header: 'الحالة',
      key: 'is_active',
      width: '7%',
      minWidth: 110,
      render: v => <Badge status={v ? 'active' : 'inactive'} />,
    },
    {
      header: 'الإجراء',
      key: 'id',
      align: 'right',
      width: '9%',
      minWidth: 120,
      render: (id, r) => (
        <Button variant="outline" size="xs" onClick={() => onToggle?.(id)}>
          {r.is_active ? 'تعطيل' : 'تفعيل'}
        </Button>
      ),
    },
  ];

  // ── Empty state when API has no assistants endpoint yet ───────────────────────
  const emptyTitle = loading
    ? 'جاري التحميل...'
    : assistants.length === 0
      ? 'لا يوجد مساعدون مسجّلون بعد'
      : 'لا توجد نتائج مطابقة للفلتر';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: '0 0 4px' }}>
          🧑‍💼 إدارة المساعدين
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-hint, #8AAFC4)', margin: 0 }}>
          {bulk.count > 0 ? `${bulk.count} محدد · ` : ''}
          {`${filtered.length} من ${assistants.length} مساعد`}
        </p>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilterBar
        filters={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      {/* Table */}
      <Table
        columns={COLS}
        data={filtered}
        loading={loading}
        emptyTitle={emptyTitle}
      />

      {/* Bulk Actions */}
      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clear}
        onExport={handleBulkExport}
      />

      {/* Assistant Profile Modal */}
      <AssistantProfileModal
        assistant={selectedAssistant}
        open={!!selectedAssistant}
        onClose={() => setSelectedAssistant(null)}
      />
    </div>
  );
}
