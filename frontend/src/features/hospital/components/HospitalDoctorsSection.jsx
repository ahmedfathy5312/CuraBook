/**
 * features/hospital/components/HospitalDoctorsSection.jsx
 * =========================================================
 * F-08 FIX: Extracted from HospitalDashboardPage.jsx
 * Bug #8 FIX: Now uses HospitalDoctorCardGrid — proper grid without the
 * "Add Doctor" card mixed inside, and "all" filter correctly translated.
 */
import { useState } from 'react';
import { SearchInput } from '../../../components/ui/Input';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
// Bug #8 Fix: use the dedicated card grid component
import HospitalDoctorCardGrid from '../../../components/hospital/HospitalDoctorCardGrid';

const PRIMARY = tokens?.colors?.primary?.DEFAULT || '#0E7490';

export default function HospitalDoctorsSection({
  filteredDoctors,
  doctorsLoading,
  searchDoc,
  setSearchDoc,
  docStatusFilter,
  setDocStatusFilter,
  setShowAddModal,
  setRemoveConfirm,
  onViewProfile,
}) {
  const { t, language } = useTranslation();

  return (
    <div style={{ animation: 'pageEnter 0.25s ease' }}>
      {/* Toolbar — search only; filters are inside HospitalDoctorCardGrid */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput
          value={searchDoc}
          onChange={e => setSearchDoc(e.target.value)}
          placeholder={t('hospitalDoctors.searchPlaceholder')}
          style={{ flex: 1, minWidth: 220 }}
          aria-label={t('hospitalDoctors.searchPlaceholder')}
        />
        <span style={{ fontSize: 13, color: 'var(--text-hint)' }}>
          {filteredDoctors.length === 1
            ? t('hospitalDoctors.countSingular', { count: filteredDoctors.length })
            : t('hospitalDoctors.countPlural', { count: filteredDoctors.length })}
        </span>
      </div>

      {/* Bug #8 Fix: HospitalDoctorCardGrid renders ONLY doctor cards (no "Add Doctor" card mixed in).
          Filter tabs are built-in and use correct Arabic translation for "الكل". */}
      <HospitalDoctorCardGrid
        doctors={filteredDoctors}
        language={language}
        loading={doctorsLoading}
        activeFilter={docStatusFilter}
        onFilterChange={setDocStatusFilter}
        onViewProfile={onViewProfile}
        onRemoveDoctor={(doctorId) => setRemoveConfirm(doctorId)}
        showFilters={true}
      />
    </div>
  );
}
