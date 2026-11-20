/**
 * DoctorsSection.jsx - Admin Doctors Management Section
 */
import { useState, useCallback } from 'react';
import Avatar from '../../../components/ui/Avatar';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import { getDoctorPrefix } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';
import AdvancedFilterBar, { applyFilters } from '../components/AdvancedFilterBar';
import BulkActionBar from '../components/BulkActionBar';
import { useBulkSelect, exportToCSV } from '../hooks/useBulkSelect';
import { SPECIALTIES } from '../../../constants/SPECIALTIES_DATA';
import { DoctorProfileModal } from '../components/AdminProfileModals';

const FILTER_CONFIG = [
  {
    key: 'specialty',
    label: 'التخصص',
    type: 'select',
    options: SPECIALTIES.map(s => ({ value: s.ar, label: s.ar })),
  },
  { key: 'is_active', label: 'الحالة', type: 'boolean' },
  {
    key: 'min_rating',
    label: 'الحد الأدنى للتقييم',
    type: 'select',
    options: [
      { value: '3', label: '3 نجوم فأكثر' },
      { value: '4', label: '4 نجوم فأكثر' },
      { value: '4.5', label: '4.5 نجوم فأكثر' },
    ],
  },
  { key: 'joined', label: 'تاريخ الانضمام', type: 'daterange' },
];

const EMPTY_FILTERS = { specialty: null, is_active: null, min_rating: null, joined: null };

const EXPORT_COLS = [
  { header: 'الاسم', key: 'name' },
  { header: 'التخصص', key: 'specialty' },
  { header: 'جهة العمل', key: 'workplace_name' },
  { header: 'نوع جهة العمل', key: 'workplace_type_label' },
  { header: 'التقييم', key: 'rating' },
  { header: 'الحالة', key: 'is_active' },
];

const dash = '—';

export default function DoctorsSection({ doctors = [], loading, onToggle, filterFn }) {
  const { t, lang } = useTranslation();
  const [filterValues, setFilterValues] = useState(EMPTY_FILTERS);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const isArabic = lang !== 'en';
  const workplaceHeader = isArabic ? 'جهة العمل' : 'Workplace';
  const workplaceTypeLabels = {
    hospital: isArabic ? 'مستشفى' : 'Hospital',
    private_clinic: isArabic ? 'عيادة خاصة' : 'Private clinic',
  };

  const normalizedDoctors = doctors.map(d => {
    const user = d.user || {};
    const hospitalName =
      d.hospital_name ||
      (d.hospital && typeof d.hospital === 'object' ? d.hospital.name : d.hospital) ||
      user.hospital_name ||
      '';
    const clinicName =
      d.clinic_name ||
      d.primary_clinic_name ||
      (d.clinic && typeof d.clinic === 'object' ? d.clinic.name : d.clinic) ||
      (Array.isArray(d.clinics) && d.clinics[0]?.name) ||
      '';
    const workplaceName = d.workplace_name || hospitalName || clinicName || '';
    const workplaceType =
      d.workplace_type ||
      (hospitalName ? 'hospital' : clinicName ? 'private_clinic' : '');

    return {
      ...d,
      name: d.name || user.full_name || user.username || dash,
      specialty: d.specialty || dash,
      hospital_name: hospitalName,
      clinic_name: clinicName,
      workplace_name: workplaceName,
      workplace_type: workplaceType,
      workplace_type_label: workplaceTypeLabels[workplaceType] || workplaceType || dash,
      rating: d.rating ?? d.avg_rating ?? null,
      is_active: d.is_active ?? user.is_active ?? false,
      image: d.image || d.profile_image || user.profile_image || null,
      date_joined: d.date_joined || user.date_joined || null,
    };
  });

  const textFiltered = filterFn
    ? filterFn(normalizedDoctors, ['name', 'specialty', 'hospital_name', 'clinic_name', 'workplace_name'])
    : normalizedDoctors;
  const filtered = applyFilters(textFiltered, filterValues, {
    specialty: 'specialty',
    is_active: 'is_active',
    min_rating: (item, val) => parseFloat(item.rating || 0) >= parseFloat(val),
    joined: 'date_joined',
  });

  const bulk = useBulkSelect(filtered);

  const handleBulkActivate = useCallback(() => {
    bulk.selectedRows().filter(r => !r.is_active).forEach(r => onToggle?.(r.id));
    bulk.clear();
  }, [bulk, onToggle]);

  const handleBulkDeactivate = useCallback(() => {
    bulk.selectedRows().filter(r => r.is_active).forEach(r => onToggle?.(r.id));
    bulk.clear();
  }, [bulk, onToggle]);

  const handleBulkExport = useCallback(() => {
    exportToCSV(bulk.selectedRows(), EXPORT_COLS, 'doctors_export.csv');
  }, [bulk]);

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
      header: t('adminCols.doctor'),
      key: 'name',
      width: '30%',
      minWidth: 260,
      render: (v, r) => (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => setSelectedDoctor(r)}
        >
          <Avatar name={v} size="sm" src={r.image} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--txt-heading)' }}>{getDoctorPrefix(lang)} {v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint, #8AAFC4)' }}>{r.specialty}</div>
          </div>
        </div>
      ),
    },
    {
      header: workplaceHeader,
      key: 'workplace_name',
      width: '32%',
      minWidth: 280,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--txt-heading)' }}>{v || dash}</div>
          {r.workplace_type && (
            <span style={{
              display: 'inline-flex',
              marginTop: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(34, 211, 238, 0.12)',
              color: 'var(--primary, #22d3ee)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
              fontSize: 11,
              fontWeight: 700,
            }}>
              {workplaceTypeLabels[r.workplace_type] || r.workplace_type}
            </span>
          )}
        </div>
      ),
    },
    { header: t('adminCols.rating'), key: 'rating', render: v => v ? `⭐ ${Number(v).toFixed(1)}` : dash },
    { header: t('adminCols.status'), key: 'is_active', render: v => <Badge status={v ? 'active' : 'inactive'} /> },
    {
      header: t('adminCols.action'),
      key: 'id',
      align: 'right',
      width: '14%',
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
          إدارة الأطباء
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-hint, #8AAFC4)', margin: 0 }}>
          {bulk.count > 0 ? `${bulk.count} محدد · ` : ''}
          {`${filtered.length} من ${normalizedDoctors.length} طبيب`}
        </p>
      </div>

      <AdvancedFilterBar
        filters={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues(EMPTY_FILTERS)}
        resultCount={filtered.length}
      />

      <Table columns={COLS} data={filtered} loading={loading} emptyTitle={t('adminStats.empty.doctors')} />

      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clear}
        onActivate={onToggle ? handleBulkActivate : undefined}
        onDeactivate={onToggle ? handleBulkDeactivate : undefined}
        onExport={handleBulkExport}
      />

      <DoctorProfileModal
        doctor={selectedDoctor}
        open={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        onToggle={onToggle}
      />
    </div>
  );
}
