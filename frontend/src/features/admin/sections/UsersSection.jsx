/**
 * UsersSection.jsx — Admin User Management Section
 * Sprint 3: Advanced Filtering
 * Sprint 4: Bulk Actions (checkboxes + action bar)
 * Gap #3: Clickable assistant rows → AssistantProfileModal
 */
import { useState, useCallback } from 'react';
import Avatar from '../../../components/ui/Avatar';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';
import AdvancedFilterBar, { applyFilters } from '../components/AdvancedFilterBar';
import BulkActionBar from '../components/BulkActionBar';
import { useBulkSelect, exportToCSV } from '../hooks/useBulkSelect';
import { AssistantProfileModal } from '../components/AdminProfileModals';

const FILTER_CONFIG = [
  {
    key: 'role', label: 'الدور', type: 'select',
    options: [
      { value: 'patient',   label: 'مريض'  },
      { value: 'doctor',    label: 'طبيب'  },
      { value: 'assistant', label: 'مساعد' },
      { value: 'admin',     label: 'مشرف'  },
    ],
  },
  { key: 'is_active', label: 'الحالة',        type: 'boolean'   },
  { key: 'joined',    label: 'تاريخ التسجيل', type: 'daterange' },
];

const FILTER_FIELD_MAP = {
  role:      'role',
  is_active: 'is_active',
  joined:    'date_joined',
};

const EMPTY_FILTERS = { role: null, is_active: null, joined: null };

const EXPORT_COLS = [
  { header: 'الاسم',         key: 'full_name'   },
  { header: 'البريد',        key: 'email'       },
  { header: 'الدور',         key: 'role'        },
  { header: 'الهاتف',        key: 'phone'       },
  { header: 'تاريخ التسجيل', key: 'date_joined' },
  { header: 'الحالة',        key: 'is_active'   },
];

export default function UsersSection({ users = [], loading, onToggle, filterFn, onDeleteUser }) {
  const { t } = useTranslation();
  const [filterValues, setFilterValues] = useState(EMPTY_FILTERS);
  const [confirm, setConfirm]           = useState({ open: false, mode: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);

  // Filtering
  const textFiltered = filterFn ? filterFn(users, ['full_name', 'email', 'role']) : users;
  const filtered     = applyFilters(textFiltered, filterValues, FILTER_FIELD_MAP);

  // Bulk selection
  const bulk = useBulkSelect(filtered);

  /* ── Bulk handlers ── */
  const handleBulkActivate = useCallback(() => {
    bulk.selectedRows().filter(r => !r.is_active).forEach(r => onToggle?.(r.id));
    bulk.clear();
  }, [bulk, onToggle]);

  const handleBulkDeactivate = useCallback(() => {
    bulk.selectedRows().filter(r => r.is_active).forEach(r => onToggle?.(r.id));
    bulk.clear();
  }, [bulk, onToggle]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    setActionLoading(true);
    for (const r of bulk.selectedRows()) {
      try { await onDeleteUser?.(r.id); } catch (_) {}
    }
    setActionLoading(false);
    setConfirm({ open: false, mode: null });
    bulk.clear();
  }, [bulk, onDeleteUser]);

  const handleBulkExport = useCallback(() => {
    exportToCSV(bulk.selectedRows(), EXPORT_COLS, 'users_export.csv');
  }, [bulk]);

  /* ── Checkbox column ── */
  const checkCol = {
    header: (
      <input
        type="checkbox"
        checked={bulk.allSelected}
        ref={el => { if (el) el.indeterminate = bulk.someSelected; }}
        onChange={bulk.toggleAll}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#0E7490' }}
        aria-label="تحديد الكل"
      />
    ),
    key: '__check',
    align: 'center',
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

  const USER_COLS = [
    checkCol,
    {
      header: t('adminCols.user'), key: 'full_name',
      render: (v, r) => (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: r.role === 'assistant' ? 'pointer' : 'default' }}
          onClick={() => r.role === 'assistant' ? setSelectedAssistant(r) : undefined}
          title={r.role === 'assistant' ? 'عرض الملف الشخصي' : ''}
        >
          <Avatar name={v} size="sm" src={r.image} />
          <div>
            <div style={{ fontWeight: 600 }}>{v || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint, #8AAFC4)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    { header: t('adminCols.role'),   key: 'role',        render: v => {
      // ISSUE-005 FIX: Role values (doctor, patient, admin, hospital, assistant)
      // must not go through appointments.status.* i18n — use roles.* namespace instead
      const ROLE_LABELS = {
        doctor:    'دكتور',
        patient:   'مريض',
        admin:     'مدير',
        hospital:  'مستشفى',
        assistant: 'مساعد',
      };
      const ROLE_COLORS = {
        doctor:    { bg: '#DBEAFE', text: '#1D4ED8' },
        patient:   { bg: '#D1FAE5', text: '#065F46' },
        admin:     { bg: '#FEE2E2', text: '#991B1B' },
        hospital:  { bg: '#EDE9FE', text: '#6D28D9' },
        assistant: { bg: '#FEF3C7', text: '#92400E' },
      };
      const label = ROLE_LABELS[v] || v || '—';
      const colors = ROLE_COLORS[v] || { bg: '#F3F4F6', text: '#374151' };
      return (
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
          fontSize: 12, fontWeight: 600, background: colors.bg, color: colors.text,
        }}>{label}</span>
      );
    } },
    { header: t('adminCols.phone'),  key: 'phone',       render: v => v || '—' },
    { header: t('adminCols.joined'), key: 'date_joined', render: v => formatDate(v) },
    { header: t('adminCols.status'), key: 'is_active',   render: v => <Badge status={v ? 'active' : 'inactive'} /> },
    {
      header: t('adminCols.actions'), key: 'id', align: 'right',
      render: (id, r) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="outline" size="xs" onClick={() => onToggle?.(id)}>
            {r.is_active ? t('adminStats.actions.deactivate') : t('adminStats.actions.activate')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: '0 0 4px' }}>
            {t('adminStats.sections.userManagement')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-hint, #8AAFC4)', margin: 0 }}>
            {bulk.count > 0 ? `${bulk.count} محدد · ` : ''}
            {`${filtered.length} من ${users.length} مستخدم`}
          </p>
        </div>
      </div>

      <AdvancedFilterBar
        filters={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      <Table columns={USER_COLS} data={filtered} loading={loading} emptyTitle={t('adminStats.empty.users')} />

      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clear}
        onActivate={onToggle ? handleBulkActivate   : undefined}
        onDeactivate={onToggle ? handleBulkDeactivate : undefined}
        onDelete={onDeleteUser ? () => setConfirm({ open: true, mode: 'delete' }) : undefined}
        onExport={handleBulkExport}
      />

      <ConfirmDialog
        open={confirm.open && confirm.mode === 'delete'}
        title="حذف المستخدمين المحددين"
        message={`هل أنت متأكد من حذف ${bulk.count} مستخدم؟ هذا الإجراء لا يمكن التراجع عنه.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setConfirm({ open: false, mode: null })}
      />

      <AssistantProfileModal
        assistant={selectedAssistant}
        open={!!selectedAssistant}
        onClose={() => setSelectedAssistant(null)}
      />
    </div>
  );
}
