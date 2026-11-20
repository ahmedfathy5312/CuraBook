/**
 * features/hospital/components/HospitalAppointmentsSection.jsx
 * =============================================================
 * F-08 FIX: Extracted from HospitalDashboardPage.jsx
 * Renders the Appointments tab — status pills, doctor/dept filters, appointments table.
 * Bug #7 FIX: Added Actions column with confirm/reject/pending buttons.
 */
import { useState } from 'react';
import { Table } from '../../../components/ui/Table';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import HospitalAppointmentActionsCell from '../../../components/hospital/HospitalAppointmentActionsCell';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';

export default function HospitalAppointmentsSection({
  appointments,
  filteredAppts,
  apptLoading,
  apptStatusFilter,
  setApptStatusFilter,
  apptDoctorFilter,
  setApptDoctorFilter,
  apptDeptFilter,
  setApptDeptFilter,
  apptDepts,
  apptCols,
}) {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';

  // Local copy of appointments for optimistic status updates (Bug #7)
  const [localRows, setLocalRows] = useState(null);

  // Merge parent filteredAppts with local optimistic updates
  const rows = localRows
    ? filteredAppts.map(a => localRows[a.id] ? { ...a, status: localRows[a.id] } : a)
    : filteredAppts;

  const handleStatusChange = (id, newStatus) => {
    setLocalRows(prev => ({ ...(prev || {}), [id]: newStatus }));
  };

  const statusFilters = ['all', 'confirmed', 'pending', 'rejected', 'cancelled'];
  const normalizeStatus = (status) => String(status || '').toLowerCase();

  // Build columns: existing cols + Actions column (Bug #7)
  const columnsWithActions = [
    ...(apptCols || []),
    {
      key: 'actions',
      header: isAr ? 'الإجراءات' : 'Actions',
      align: 'center',
      render: (_, appointment) => (
        <HospitalAppointmentActionsCell
          appointment={appointment}
          language={language}
          onStatusChange={handleStatusChange}
        />
      ),
    },
  ];

  return (
    <div style={{ animation: 'pageEnter 0.25s ease' }}>
      {/* Filters toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusFilters.map(s => (
            <button key={s} onClick={() => setApptStatusFilter(s)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-full)', border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                background: apptStatusFilter === s ? PRIMARY : 'var(--border-base)',
                color:      apptStatusFilter === s ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {t(`hospitalAppointments.statusFilters.${s}`)}{' '}
              <span style={{ opacity: 0.7 }}>
                ({s === 'all' ? appointments.length : appointments.filter(a => normalizeStatus(a.status) === s).length})
              </span>
            </button>
          ))}
        </div>

        {/* Doctor search filter */}
        <input
          type="text"
          placeholder={`🔍 ${t('hospitalAppointments.filterByDoctor')}`}
          value={apptDoctorFilter}
          onChange={e => setApptDoctorFilter(e.target.value)}
          style={{
            border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '8px 14px',
            fontSize: 13, color: 'var(--text-h)', outline: 'none', fontFamily: 'inherit',
            minWidth: 200, background: 'var(--bg-card)', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = PRIMARY}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        {/* Department filter */}
        {apptDepts.length > 0 && (
          <select
            value={apptDeptFilter}
            onChange={e => setApptDeptFilter(e.target.value)}
            style={{
              border: '1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '8px 14px',
              fontSize: 13, color: apptDeptFilter ? 'var(--text-h)' : '#9CA3AF',
              outline: 'none', fontFamily: 'inherit', background: 'var(--bg-card)',
              minWidth: 180, cursor: 'pointer', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = PRIMARY}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="">🏛 {t('hospitalAppointments.allDepartments')}</option>
            {apptDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {(apptDoctorFilter || apptDeptFilter) && (
          <button
            onClick={() => { setApptDoctorFilter(''); setApptDeptFilter(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}
          >
            ✕ {t('hospitalAppointments.clearAll')}
          </button>
        )}
      </div>

      <Table
        columns={columnsWithActions}
        data={rows}
        loading={apptLoading}
        emptyTitle={t('hospitalAppointments.emptyTitle')}
      />
    </div>
  );
}
