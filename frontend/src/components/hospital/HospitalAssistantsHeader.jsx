/**
 * HospitalAssistantsHeader.jsx — Bug #9 Fix
 * ─────────────────────────────────────────────────────────────────
 * PROBLEM FIXED:
 *   The "تسجيل مساعد جديد" (Register a new assistant) button was
 *   accidentally deleted from the Hospital Assistants page header,
 *   leaving hospital admins with no way to add assistants.
 *
 *   This fix:
 *   1. Restores the "تسجيل مساعد جديد / Register New Assistant"
 *      button in the page header area.
 *   2. The button opens the AddAssistantToHospitalModal (Bug #6 fix)
 *      which uses the Search → Select → Link pattern.
 *   3. The button is styled consistently with the rest of the system.
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE — full header component:
 *
 *   import HospitalAssistantsHeader from
 *     '../../components/hospital/HospitalAssistantsHeader';
 *   import AddAssistantToHospitalModal from
 *     '../../components/hospital/AddAssistantToHospitalModal';
 *
 *   // State:
 *   const [showAddModal, setShowAddModal] = useState(false);
 *
 *   // In JSX (replace your page header):
 *   <HospitalAssistantsHeader
 *     language={currentLanguage}
 *     totalCount={assistants.length}
 *     onAddClick={() => setShowAddModal(true)}
 *   />
 *
 *   {showAddModal && (
 *     <AddAssistantToHospitalModal
 *       hospitalId={currentHospitalId}
 *       language={currentLanguage}
 *       onSuccess={() => { setShowAddModal(false); refetchAssistants(); }}
 *       onClose={() => setShowAddModal(false)}
 *     />
 *   )}
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * QUICK PATCH — if you prefer to patch your existing page directly:
 *
 * STEP 1 — Ensure AddAssistantToHospitalModal is imported:
 * ┌──────────────────────────────────────────────────────────────┐
 * │  import AddAssistantToHospitalModal from                     │
 * │    '../../components/hospital/AddAssistantToHospitalModal';  │
 * └──────────────────────────────────────────────────────────────┘
 *
 * STEP 2 — Add state for the modal (if not already present):
 * ┌──────────────────────────────────────────────────────────────┐
 * │  const [showAddAssistantModal, setShowAddAssistantModal] =   │
 * │    useState(false);                                          │
 * └──────────────────────────────────────────────────────────────┘
 *
 * STEP 3 — Add the button back to your page header JSX.
 * Find the header/toolbar section of HospitalAssistantsPage
 * and ADD this button (it was deleted — add it back):
 * ┌──────────────────────────────────────────────────────────────┐
 * │  <button                                                     │
 * │    onClick={() => setShowAddAssistantModal(true)}            │
 * │    style={{                                                  │
 * │      display: 'inline-flex',                                 │
 * │      alignItems: 'center',                                   │
 * │      gap: 8,                                                 │
 * │      padding: '10px 20px',                                   │
 * │      borderRadius: 12,                                       │
 * │      background: '#0E7490',                                  │
 * │      color: '#fff',                                          │
 * │      border: 'none',                                         │
 * │      fontSize: 14,                                           │
 * │      fontWeight: 600,                                        │
 * │      cursor: 'pointer',                                      │
 * │    }}                                                        │
 * │  >                                                           │
 * │    <span style={{ fontSize: 18 }}>📋</span>                 │
 * │    {isAr ? 'تسجيل مساعد جديد' : 'Register New Assistant'}  │
 * │  </button>                                                   │
 * └──────────────────────────────────────────────────────────────┘
 *
 * STEP 4 — Add modal to JSX (after the page header or at end of return):
 * ┌──────────────────────────────────────────────────────────────┐
 * │  {showAddAssistantModal && (                                 │
 * │    <AddAssistantToHospitalModal                              │
 * │      hospitalId={currentHospitalId}                          │
 * │      language={currentLanguage}                              │
 * │      onSuccess={() => {                                      │
 * │        setShowAddAssistantModal(false);                      │
 * │        refetchAssistants(); // or fetchAssistants()          │
 * │      }}                                                      │
 * │      onClose={() => setShowAddAssistantModal(false)}         │
 * │    />                                                        │
 * │  )}                                                          │
 * └──────────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';

// ── Color tokens ──────────────────────────────────────────────────
const TEAL   = '#0E7490';
const TEAL_D = '#0C6478';
const GR5    = '#6B7280';
const GR8    = '#1F2937';

// ── The restored "Register New Assistant" button ──────────────────
/**
 * RegisterAssistantButton
 * ────────────────────────
 * BUG #9 FIX — This is the deleted button, restored.
 * Styled to match the design system (teal primary button with icon).
 */
export function RegisterAssistantButton({ language = 'en', onClick }) {
  const isAr = language === 'ar';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 12,
        background: TEAL,
        color: '#fff',
        border: 'none',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap',
        direction: isAr ? 'rtl' : 'ltr',
      }}
      onMouseEnter={e => e.currentTarget.style.background = TEAL_D}
      onMouseLeave={e => e.currentTarget.style.background = TEAL}
    >
      <span style={{ fontSize: 18 }}>📋</span>
      {isAr ? 'تسجيل مساعد جديد' : 'Register New Assistant'}
    </button>
  );
}

// ── Full page header component ────────────────────────────────────
/**
 * HospitalAssistantsHeader
 * ─────────────────────────
 * Full header component for the Hospital Assistants page.
 * Includes:
 *   - Page title
 *   - Total count badge
 *   - "Register New Assistant" button (Bug #9 fix — was deleted)
 *
 * Props:
 *   language    {string}   — 'ar' | 'en'
 *   totalCount  {number}   — total number of assistants
 *   onAddClick  {function} — called when button is clicked
 */
export default function HospitalAssistantsHeader({
  language   = 'en',
  totalCount = 0,
  onAddClick = () => {},
}) {
  const isAr = language === 'ar';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      {/* Title + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: GR8,
        }}>
          {isAr ? 'المساعدون' : 'Assistants'}
        </h2>
        {totalCount > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 28,
            height: 24,
            padding: '0 8px',
            borderRadius: 20,
            background: '#E0F7FA',
            color: TEAL,
            fontSize: 12,
            fontWeight: 700,
          }}>
            {totalCount}
          </span>
        )}
      </div>

      {/* BUG #9 FIX — Restored "Register New Assistant" button */}
      <RegisterAssistantButton language={language} onClick={onAddClick} />
    </div>
  );
}
