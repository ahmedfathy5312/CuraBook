/**
 * HospitalDoctorCardGrid.jsx — Bug #8 Fix
 * ─────────────────────────────────────────────────────────────────
 * PROBLEMS FIXED:
 *
 *   1. "Add Doctor" invitation card inside the doctors grid
 *      Before: A card titled "إضافة طبيب جديد / دعوة للانضمام لمستشفلك"
 *              appeared inside the same grid as real doctor cards,
 *              mixing Action Elements with Data Elements — confusing UX.
 *      After:  The grid renders ONLY doctor data cards. The "Add Doctor"
 *              action is exclusively in the page header button.
 *
 *   2. Filter "all" not translated in Arabic mode
 *      Before: The "All" filter tab showed the English word "all" even
 *              when the UI language was Arabic.
 *      After:  "الكل" is used in Arabic mode, "All" in English mode.
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE — Replace your existing doctors grid section:
 *
 *   import HospitalDoctorCardGrid from
 *     '../../components/hospital/HospitalDoctorCardGrid';
 *   import AddDoctorToHospitalModal from
 *     '../../components/hospital/AddDoctorToHospitalModal';
 *
 *   // State:
 *   const [showAddModal, setShowAddModal]   = useState(false);
 *   const [activeFilter, setActiveFilter]   = useState('all');
 *
 *   // In JSX — page header:
 *   <button onClick={() => setShowAddModal(true)}>
 *     + {isAr ? 'إضافة طبيب' : 'Add Doctor'}
 *   </button>
 *
 *   // In JSX — where the grid was:
 *   <HospitalDoctorCardGrid
 *     doctors={doctors}
 *     language={currentLanguage}
 *     loading={isLoading}
 *     activeFilter={activeFilter}
 *     onFilterChange={setActiveFilter}
 *     onViewProfile={(doctor) => setSelectedDoctor(doctor)}
 *     onRemoveDoctor={(doctorId) => handleRemove(doctorId)}
 *   />
 *
 *   // Modal (separate from grid):
 *   {showAddModal && (
 *     <AddDoctorToHospitalModal
 *       hospitalId={currentHospitalId}
 *       language={currentLanguage}
 *       onSuccess={() => { setShowAddModal(false); refetchDoctors(); }}
 *       onClose={() => setShowAddModal(false)}
 *     />
 *   )}
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * QUICK PATCH — if you prefer to patch your existing page directly
 * rather than using this component, do the following two changes:
 *
 * CHANGE 1 — Remove the "Add Doctor" card from the grid.
 * Find in your HospitalDoctorsPage (or wherever the grid is rendered)
 * any JSX block that looks like one of these patterns and DELETE it:
 *
 *   Pattern A (explicit add-card in grid):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  <div className="... doctor-card add-card ...">              │
 *   │    <div className="..."><span>+</span></div>                 │
 *   │    <p>إضافة طبيب جديد</p>                                   │
 *   │    <p>دعوة للانضمام لمستشفلك</p>                            │
 *   │  </div>                                                      │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   Pattern B (conditional add-card mixed in doctors.map()):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  {[...doctors, { _isAddCard: true }].map(item =>            │
 *   │    item._isAddCard                                           │
 *   │      ? <AddDoctorCard key="add" onClick={...} />            │
 *   │      : <DoctorCard key={item.id} doctor={item} />           │
 *   │  )}                                                          │
 *   └──────────────────────────────────────────────────────────────┘
 *   → Replace with: {doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} />)}
 *
 *   Pattern C (separate component rendered inside grid wrapper):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  <div className="doctors-grid">                              │
 *   │    {doctors.map(d => <DoctorCard key={d.id} doctor={d} />)} │
 *   │    <AddNewDoctorCard onClick={() => setShowModal(true)} />   │  ← DELETE this line
 *   │  </div>                                                      │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * CHANGE 2 — Fix "all" → "الكل" in Arabic filter.
 * Find your filter tabs / filter buttons definition and change:
 *
 *   Before:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  const filters = [                                           │
 *   │    { value: 'all', label: 'all' },      // ← WRONG          │
 *   │    { value: 'active',   label: isAr ? 'نشط' : 'Active' },   │
 *   │    { value: 'inactive', label: isAr ? 'غير نشط' : 'Inactive'},│
 *   │  ];                                                          │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   After:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  const filters = [                                           │
 *   │    { value: 'all', label: isAr ? 'الكل' : 'All' }, // ← FIX│
 *   │    { value: 'active',   label: isAr ? 'نشط' : 'Active' },   │
 *   │    { value: 'inactive', label: isAr ? 'غير نشط' : 'Inactive'},│
 *   │  ];                                                          │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   Also check your i18n / translation files (e.g. ar.json / en.json):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  // ar.json                                                  │
 *   │  {                                                           │
 *   │    "filter_all": "الكل",    // was: "all"                   │
 *   │    "filter_active": "نشط",                                   │
 *   │    "filter_inactive": "غير نشط",                             │
 *   │    ...                                                       │
 *   │  }                                                           │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';

// ── Color tokens ──────────────────────────────────────────────────
const TEAL   = '#0E7490';
const TEAL_L = '#E0F7FA';
const GREEN  = '#10B981';
const RED    = '#EF4444';
const GR3    = '#D1D5DB';
const GR5    = '#6B7280';
const GR8    = '#1F2937';

// ── Filter tabs labels ────────────────────────────────────────────
/**
 * getFilterLabel()
 * ─────────────────
 * BUG #8 FIX — Core logic:
 * Returns the correct translated label for each filter value.
 * Previously, 'all' was returned as the raw string "all" in Arabic mode.
 */
function getFilterLabel(value, isAr) {
  const map = {
    all:      isAr ? 'الكل'     : 'All',
    active:   isAr ? 'نشط'      : 'Active',
    inactive: isAr ? 'غير نشط'  : 'Inactive',
    pending:  isAr ? 'بانتظار الدعوة' : 'Invite Pending',
  };
  return map[value] ?? value;
}

// ── Status indicator ──────────────────────────────────────────────
function StatusDot({ active }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8, borderRadius: '50%',
      background: active ? GREEN : RED,
      marginInlineEnd: 6,
      flexShrink: 0,
    }} />
  );
}

// ── Single doctor card ────────────────────────────────────────────
/**
 * DoctorCard
 * ──────────
 * BUG #8 FIX — this card is for DATA ONLY (real doctors).
 * The old "Add Doctor" action card has been removed from this grid.
 * The "Add Doctor" button lives exclusively in the page header.
 */
function DoctorCard({ doctor, isAr, onViewProfile, onRemove }) {
  const name      = doctor?.full_name || doctor?.name || '—';
  const specialty = doctor?.specialty || '';
  const email     = doctor?.email     || '';
  const phone     = doctor?.phone     || doctor?.phone_number || '';
  const isActive  = doctor?.is_active ?? doctor?.status === 'active' ?? true;
  const imgSrc    = doctor?.profile_image || doctor?.avatar || '';

  return (
    <div style={{
      background: 'var(--bg-card, #fff)',
      border: '1px solid var(--border-base, #E5E7EB)',
      borderRadius: 16,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
      direction: isAr ? 'rtl' : 'ltr',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
    >
      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: TEAL_L,
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: TEAL,
        }}>
          {imgSrc
            ? <img src={imgSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            : (name.charAt(0) || 'D')
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: GR8,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </p>
          {specialty && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: TEAL, fontWeight: 500 }}>
              {specialty}
            </p>
          )}
        </div>
        {/* Status badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '3px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 600,
          background: isActive ? '#D1FAE5' : '#FEE2E2',
          color: isActive ? '#065F46' : '#991B1B',
          flexShrink: 0,
        }}>
          <StatusDot active={isActive} />
          {isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
        </span>
      </div>

      {/* Contact info */}
      {(email || phone) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: GR5 }}>
              <span>✉</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
            </div>
          )}
          {phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: GR5 }}>
              <span>📞</span>
              <span>{phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
        {onViewProfile && (
          <button
            onClick={() => onViewProfile(doctor)}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 10,
              background: TEAL_L, color: TEAL,
              border: `1px solid ${TEAL}33`,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#B2EBF2'}
            onMouseLeave={e => e.currentTarget.style.background = TEAL_L}
          >
            {isAr ? 'عرض الملف' : 'View Profile'}
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(doctor.id || doctor._id)}
            style={{
              padding: '7px 12px', borderRadius: 10,
              background: '#FEE2E2', color: '#991B1B',
              border: '1px solid #FECACA',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
            onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card, #fff)',
      border: '1px solid var(--border-base, #E5E7EB)',
      borderRadius: 16, padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <style>{`@keyframes hdc-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: GR3, animation: 'hdc-pulse 1.4s infinite', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 14, width: '60%', borderRadius: 6, background: GR3, animation: 'hdc-pulse 1.4s infinite' }} />
          <div style={{ height: 11, width: '40%', borderRadius: 6, background: GR3, animation: 'hdc-pulse 1.4s infinite 0.2s' }} />
        </div>
      </div>
      <div style={{ height: 11, width: '80%', borderRadius: 6, background: GR3, animation: 'hdc-pulse 1.4s infinite 0.1s' }} />
      <div style={{ height: 32, borderRadius: 10, background: GR3, animation: 'hdc-pulse 1.4s infinite 0.15s' }} />
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────
const DEFAULT_FILTERS = ['all', 'active', 'inactive'];

function FilterTabs({ filters = DEFAULT_FILTERS, activeFilter, onChange, isAr }) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      {filters.map(value => {
        const isActive = activeFilter === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: isActive ? `2px solid ${TEAL}` : '2px solid transparent',
              background: isActive ? TEAL_L : 'var(--bg-subtle, #F3F4F6)',
              color: isActive ? TEAL : GR5,
              transition: 'all 0.15s',
            }}
          >
            {/* BUG #8 FIX: getFilterLabel returns 'الكل' in Arabic, not 'all' */}
            {getFilterLabel(value, isAr)}
          </button>
        );
      })}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyDoctors({ isAr, activeFilter }) {
  const msg = activeFilter !== 'all'
    ? (isAr ? `لا يوجد أطباء بحالة "${getFilterLabel(activeFilter, isAr)}"` : `No doctors with status "${getFilterLabel(activeFilter, false)}"`)
    : (isAr ? 'لم يتم إضافة أي أطباء بعد' : 'No doctors added yet');

  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', color: GR5,
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      <span style={{ fontSize: 48, marginBottom: 12 }}>👨‍⚕️</span>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{msg}</p>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────
/**
 * HospitalDoctorCardGrid
 *
 * Props:
 *   doctors        {array}    — list of doctor objects from API
 *   language       {string}   — 'ar' | 'en' (default 'en')
 *   loading        {boolean}  — show skeleton cards
 *   skeletonCount  {number}   — number of skeleton cards (default 8)
 *   activeFilter   {string}   — 'all' | 'active' | 'inactive'
 *   onFilterChange {function} — called with new filter value
 *   onViewProfile  {function} — called with doctor object
 *   onRemoveDoctor {function} — called with doctor id
 *   filters        {array}    — custom filter values (optional)
 *   showFilters    {boolean}  — show filter tabs (default true)
 */
export default function HospitalDoctorCardGrid({
  doctors        = [],
  language       = 'en',
  loading        = false,
  skeletonCount  = 8,
  activeFilter   = 'all',
  onFilterChange = () => {},
  onViewProfile  = null,
  onRemoveDoctor = null,
  filters        = DEFAULT_FILTERS,
  showFilters    = true,
}) {
  const isAr = language === 'ar';

  // Filter locally if API doesn't filter
  const filteredDoctors = activeFilter === 'all'
    ? doctors
    : doctors.filter(d => {
        const isActive = d?.is_active ?? d?.status === 'active' ?? true;
        if (activeFilter === 'active')   return isActive;
        if (activeFilter === 'inactive') return !isActive;
        return true;
      });

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter tabs — BUG #8 FIX: "الكل" instead of "all" */}
      {showFilters && (
        <FilterTabs
          filters={filters}
          activeFilter={activeFilter}
          onChange={onFilterChange}
          isAr={isAr}
        />
      )}

      {/* Grid — BUG #8 FIX: NO "Add Doctor" card inside grid */}
      <div style={gridStyle}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <SkeletonCard key={`sk-${i}`} />
            ))
          : filteredDoctors.length === 0
            ? <EmptyDoctors isAr={isAr} activeFilter={activeFilter} />
            : filteredDoctors.map(doctor => (
                <DoctorCard
                  key={doctor.id || doctor._id || doctor.email}
                  doctor={doctor}
                  isAr={isAr}
                  onViewProfile={onViewProfile}
                  onRemove={onRemoveDoctor}
                />
              ))
        }
      </div>
    </div>
  );
}

// Named re-exports for convenience
export { FilterTabs, DoctorCard, getFilterLabel };
