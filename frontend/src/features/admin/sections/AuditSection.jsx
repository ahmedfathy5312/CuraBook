/**
 * AuditSection.jsx - Admin Audit Logs Section
 */
import { useState } from 'react';
import { Table } from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import { formatDateTime } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';
import AdvancedFilterBar, { applyFilters } from '../components/AdvancedFilterBar';

const FILTER_CONFIG = [
  {
    key: 'action_type',
    label: 'نوع الإجراء',
    type: 'select',
    options: [
      { value: 'create', label: 'إنشاء' },
      { value: 'update', label: 'تعديل' },
      { value: 'delete', label: 'حذف' },
      { value: 'login', label: 'تسجيل دخول' },
      { value: 'logout', label: 'تسجيل خروج' },
      { value: 'booking', label: 'حجز' },
      { value: 'toggle', label: 'تفعيل/تعطيل' },
      { value: 'verify', label: 'توثيق' },
    ],
  },
  { key: 'date_range', label: 'النطاق الزمني', type: 'daterange' },
];

const EMPTY_FILTERS = { action_type: null, date_range: null };
const dash = '—';

function normalizeAuditLog(log) {
  const metadata = log.metadata || {};
  const newData = log.new_data || {};
  const oldData = log.old_data || {};
  const user = log.user || log.actor_username || metadata.identifier || metadata.username || metadata.email || 'النظام';
  const target = log.target || metadata.target || metadata.entity || metadata.appointment_id || metadata.booking_id || log.object_id || 'النظام';
  const description = log.description || log.note || metadata.description || metadata.message || log.action_display || log.action || '';

  return {
    ...log,
    user,
    user_role: log.user_role || metadata.role || metadata.user_role || '',
    target,
    description,
    _search_text: [
      user,
      log.user_role,
      log.action,
      log.action_display,
      target,
      description,
      log.ip_address,
      ...Object.values(metadata),
      ...Object.values(newData),
      ...Object.values(oldData),
    ].filter(Boolean).join(' '),
  };
}

export default function AuditSection({ auditLogs = [], auditData, loading, page, onPageChange, filterFn }) {
  const { t } = useTranslation();
  const [filterValues, setFilterValues] = useState(EMPTY_FILTERS);

  const normalizedLogs = auditLogs.map(normalizeAuditLog);
  const textFiltered = filterFn
    ? filterFn(normalizedLogs, ['_search_text', 'user', 'action', 'target', 'description', 'ip_address'])
    : normalizedLogs;
  const filtered = applyFilters(textFiltered, filterValues, {
    action_type: (item, val) => (item.action || '').toLowerCase().includes(String(val).toLowerCase()),
    date_range: 'timestamp',
  });

  const totalCount = auditData?.count || normalizedLogs.length;
  const totalPages = auditData?.total_pages || Math.ceil(totalCount / 20);

  const COLS = [
    {
      header: t('adminCols.user'),
      key: 'user',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--txt-heading)' }}>{v || dash}</div>
          {r.user_role && (
            <div style={{ fontSize: 11, color: 'var(--text-hint, #8AAFC4)', marginTop: 2 }}>
              {r.user_role}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t('adminCols.action'),
      key: 'action',
      render: (v, r) => (
        <div>
          <code style={{
            fontSize: 12,
            background: 'var(--border-base)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            display: 'block',
            marginBottom: 2,
          }}>
            {v || dash}
          </code>
          {r.action_display && r.action_display !== v && (
            <span style={{ fontSize: 11, color: 'var(--text-hint, #8AAFC4)' }}>{r.action_display}</span>
          )}
        </div>
      ),
    },
    {
      header: t('adminCols.target'),
      key: 'target',
      render: (v, r) => (
        <div style={{ maxWidth: 240 }}>
          <div style={{ fontSize: 13, color: 'var(--text-body)' }}>{v || dash}</div>
          {r.description && r.description !== v && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-hint, #8AAFC4)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {r.description}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t('adminCols.ip'),
      key: 'ip_address',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || dash}</span>,
    },
    { header: t('adminCols.time'), key: 'timestamp', render: v => formatDateTime(v) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-heading)', margin: '0 0 4px' }}>
          سجلات التدقيق
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-hint, #8AAFC4)', margin: 0 }}>
          {`${filtered.length} من ${normalizedLogs.length} سجل (الصفحة الحالية)`}
        </p>
      </div>

      <AdvancedFilterBar
        filters={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      <Table columns={COLS} data={filtered} loading={loading} emptyTitle={t('adminStats.empty.logs')} />

      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
        </div>
      )}
      {totalCount > 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-hint, #8AAFC4)', marginTop: 8 }}>
          صفحة {page} من {totalPages} — {totalCount} سجل إجمالاً
        </p>
      )}
    </div>
  );
}
