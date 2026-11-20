/**
 * AddAssistantToHospitalModal.jsx — Bug #6 Fix
 * ─────────────────────────────────────────────────────────────────
 * Replaces the broken "Add Assistant to Hospital" flow that created
 * a new assistant account instead of searching existing ones.
 *
 * PROBLEM FIXED:
 *   Before: The "Register New Assistant" button (when present) or any
 *           add-assistant flow created a brand-new account, causing
 *           data duplication and losing the assistant's existing data.
 *   After:  Search → Select → Link pattern:
 *           1. Search existing registered assistants by name or email
 *           2. Select from results
 *           3. Link the existing assistant account to this hospital
 *           4. Auto-refresh the assistants list without page reload
 *           5. Prevent duplicate linking with a clear message
 *
 * HOW TO USE in HospitalAssistants page:
 *
 *   import AddAssistantToHospitalModal from
 *     '../../components/hospital/AddAssistantToHospitalModal';
 *
 *   // State in your page:
 *   const [showAddModal, setShowAddModal] = useState(false);
 *
 *   // In JSX (e.g. next to the page header button):
 *   {showAddModal && (
 *     <AddAssistantToHospitalModal
 *       hospitalId={currentHospitalId}
 *       language={currentLanguage}
 *       onSuccess={() => { setShowAddModal(false); refetchAssistants(); }}
 *       onClose={() => setShowAddModal(false)}
 *     />
 *   )}
 *
 *   // Trigger button (re-add the removed "تسجيل مساعد جديد" button):
 *   <button onClick={() => setShowAddModal(true)}>
 *     + {isAr ? 'إضافة مساعد' : 'Add Assistant'}
 *   </button>
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useRef } from 'react';
import apiClient from '../../services/apiClient';

const MODAL = {
  surface: '#f8fafc',
  surfaceSoft: '#eef2f7',
  input: '#ffffff',
  textStrong: '#0f172a',
  textBody: '#1e293b',
  textMuted: '#475569',
  border: '#94a3b8',
  primary: '#0f766e',
  disabled: '#e2e8f0',
};

// ── Token helper ──────────────────────────────────────────────────
function getAuthToken() {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    null
  );
}

// ── API helpers ───────────────────────────────────────────────────

/**
 * Search for registered assistants by name or email.
 * GET /api/v1/assistants/search/?q=<query>
 *
 * Expected response shape:
 * { results: [ { id, name, email, role?, profile_picture?, ... }, ... ] }
 * Also handles: { assistants: [...] }  or a bare array.
 */
async function searchAssistants(query) {
  const { data } = await apiClient.get('/assistants/search/', {
    params: { q: query.trim() },
  });
  // Normalise various backend response shapes
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.assistants)) return data.assistants;
  return [];
}

/**
 * Link an existing assistant to the hospital.
 * POST /api/v1/hospitals/<hospitalId>/assistants/
 * Body: { assistant_id: <id> }
 */
async function linkAssistantToHospital(hospitalId, assistantId) {
  const { data } = await apiClient.post('/hospital/assistants/', {
    assistant_id: assistantId,
  });
  return data || {};
}

// ── Sub-components ────────────────────────────────────────────────

function AssistantResultRow({ assistant, isAr, onSelect, isSelected }) {
  const name = assistant.name || assistant.full_name || assistant.username || '—';
  const email = assistant.email || '';
  const role = assistant.role || assistant.job_title || '';
  const avatar = assistant.profile_picture || assistant.avatar || null;

  return (
    <button
      type="button"
      className="assistant-result-row"
      data-selected={isSelected ? 'true' : 'false'}
      onClick={() => onSelect(assistant)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 14px',
        background: isSelected ? 'rgba(14,116,144,0.12)' : 'transparent',
        border: isSelected ? `1.5px solid ${MODAL.primary}` : '1px solid transparent',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: isAr ? 'right' : 'left',
        transition: 'background 0.15s',
      }}
    >
      {/* Avatar */}
      <div className="assistant-result-avatar" style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: '#e2e8f0',
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: MODAL.textBody,
      }}>
        {avatar
          ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (name.charAt(0) || 'م').toUpperCase()
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="assistant-result-name" style={{ fontWeight: 800, fontSize: 14, color: MODAL.textStrong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div className="assistant-result-meta" style={{ fontSize: 12, color: MODAL.textMuted, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {email}
          {role ? ` · ${role}` : ''}
        </div>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <span style={{ color: '#10b981', fontSize: 18, flexShrink: 0 }}>✓</span>
      )}
    </button>
  );
}

// ── Main Modal ────────────────────────────────────────────────────

export default function AddAssistantToHospitalModal({
  hospitalId,
  language = 'ar',
  onSuccess,
  onClose,
}) {
  const isAr = language === 'ar';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState(null);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searched, setSearched] = useState(false);

  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [linkSuccess, setLinkSuccess] = useState(false);

  const inputRef = useRef(null);

  // ── Search handler ──────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setResults([]);
    setSelectedAssistant(null);
    setSearched(false);
    setLinkError(null);

    try {
      const data = await searchAssistants(query);
      setResults(data);
      setSearched(true);
    } catch (err) {
      setSearchError(
        isAr
          ? `حدث خطأ أثناء البحث: ${err.message}`
          : `Search error: ${err.message}`
      );
    } finally {
      setSearchLoading(false);
    }
  }, [query, isAr]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Link handler ────────────────────────────────────────────────
  const handleLink = async () => {
    if (!selectedAssistant) return;

    setLinkLoading(true);
    setLinkError(null);

    try {
      await linkAssistantToHospital(hospitalId, selectedAssistant.id);
      setLinkSuccess(true);
      // Brief success flash, then close and refresh
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err) {
      const msg = err.message || '';
      const alreadyAdded =
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('مضاف') ||
        msg.toLowerCase().includes('موجود') ||
        msg.toLowerCase().includes('duplicate');

      setLinkError(
        alreadyAdded
          ? (isAr
              ? 'هذا المساعد مضاف مسبقاً لهذا المستشفى.'
              : 'This assistant is already assigned to this hospital.')
          : (isAr
              ? `فشل ربط المساعد: ${msg}`
              : `Failed to link assistant: ${msg}`)
      );
    } finally {
      setLinkLoading(false);
    }
  };

  // ── Backdrop click ──────────────────────────────────────────────
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // ── Labels ──────────────────────────────────────────────────────
  const t = {
    title:        isAr ? 'إضافة مساعد للمستشفى'          : 'Add Assistant to Hospital',
    searchLabel:  isAr ? 'ابحث عن مساعد مسجل'             : 'Search registered assistant',
    placeholder:  isAr ? 'ابحث بالاسم أو البريد الإلكتروني' : 'Search by name or email',
    searchBtn:    isAr ? 'بحث'                             : 'Search',
    searching:    isAr ? 'جاري البحث...'                  : 'Searching...',
    noResults:    isAr ? 'لا توجد نتائج للبحث'            : 'No results found',
    selectHint:   isAr ? 'اختر مساعداً من النتائج'         : 'Select an assistant from results',
    linkBtn:      isAr ? 'ربط المساعد بالمستشفى'           : 'Link Assistant to Hospital',
    linking:      isAr ? 'جاري الربط...'                  : 'Linking...',
    successMsg:   isAr ? '✅ تم ربط المساعد بنجاح!'       : '✅ Assistant linked successfully!',
    cancel:       isAr ? 'إلغاء'                          : 'Cancel',
    resultsCount: (n) => isAr ? `${n} نتيجة` : `${n} result${n !== 1 ? 's' : ''}`,
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        className="hospital-add-assistant-modal"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          background: MODAL.surface,
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <style>{`
          html.dark .hospital-add-assistant-modal {
            background: #111c2b !important;
            color: #f8fafc !important;
          }
          html.dark .hospital-add-assistant-modal input {
            background-color: #172638 !important;
            color: #f8fafc !important;
            -webkit-text-fill-color: #f8fafc !important;
            border-color: #4b6b88 !important;
            box-shadow: none !important;
          }
          html.dark .hospital-add-assistant-modal input::placeholder {
            color: #cbd5e1 !important;
            -webkit-text-fill-color: #cbd5e1 !important;
            opacity: 1 !important;
          }
          html.dark .hospital-add-assistant-modal button:disabled {
            opacity: 1 !important;
            background: #26384d !important;
            color: #dbeafe !important;
            border: 1.5px solid #4b6b88 !important;
          }
          html.dark .hospital-add-assistant-modal > div,
          html.dark .hospital-add-assistant-modal [style*="background: #eef2f7"] {
            background: #172638 !important;
          }
          html.dark .hospital-add-assistant-modal h2,
          html.dark .hospital-add-assistant-modal label {
            color: #f8fafc !important;
          }
          .hospital-add-assistant-modal .assistant-result-row:hover {
            background: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
          }
          .hospital-add-assistant-modal .assistant-result-row[data-selected="true"] {
            background: rgba(14,116,144,0.12) !important;
            border-color: #0f766e !important;
          }
          html.dark .hospital-add-assistant-modal .assistant-result-row {
            background: #172638 !important;
            border-color: #35526f !important;
          }
          html.dark .hospital-add-assistant-modal .assistant-result-row:hover {
            background: #20324a !important;
            border-color: #5b7da0 !important;
          }
          html.dark .hospital-add-assistant-modal .assistant-result-row[data-selected="true"] {
            background: rgba(34,211,238,0.14) !important;
            border-color: #22d3ee !important;
          }
          html.dark .hospital-add-assistant-modal .assistant-result-name {
            color: #f8fafc !important;
          }
          html.dark .hospital-add-assistant-modal .assistant-result-meta {
            color: #cbd5e1 !important;
          }
          html.dark .hospital-add-assistant-modal .assistant-result-avatar {
            background: #e0f2fe !important;
            color: #0f172a !important;
          }
          html.dark .hospital-add-assistant-modal .modal-footer {
            background: #172638 !important;
            border-color: #4b6b88 !important;
          }
          html.dark .hospital-add-assistant-modal .modal-secondary-btn {
            color: #f8fafc !important;
            border-color: #64748b !important;
          }
          .hospital-add-assistant-modal input::placeholder {
            color: #334155;
            opacity: 1;
          }
        `}</style>
        <div style={{
          padding: '18px 20px',
          borderBottom: `1px solid ${MODAL.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: MODAL.textStrong }}>
            🔍 {t.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: MODAL.textMuted,
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* Search bar */}
          <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: MODAL.textBody, marginBottom: 8 }}>
            {t.searchLabel}
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              disabled={searchLoading || linkSuccess}
              style={{
                flex: 1,
                padding: '9px 13px',
                border: `1.5px solid ${MODAL.border}`,
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                color: MODAL.textStrong,
                background: MODAL.input,
                WebkitTextFillColor: MODAL.textStrong,
                caretColor: MODAL.textStrong,
                fontWeight: 700,
                direction: isAr ? 'rtl' : 'ltr',
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!query.trim() || searchLoading || linkSuccess}
              style={{
                padding: '9px 18px',
                background: (!query.trim() || searchLoading) ? MODAL.disabled : MODAL.primary,
                color: (!query.trim() || searchLoading) ? MODAL.textBody : '#fff',
                border: (!query.trim() || searchLoading) ? `1.5px solid ${MODAL.border}` : 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                cursor: (!query.trim() || searchLoading) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
            >
              {searchLoading ? t.searching : t.searchBtn}
            </button>
          </div>

          {/* Search error */}
          {searchError && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 13,
              marginBottom: 14,
            }}>
              ⚠️ {searchError}
            </div>
          )}

          {/* Results */}
          {searched && !searchLoading && (
            <div>
              <div style={{ fontSize: 13, color: MODAL.textBody, fontWeight: 700, marginBottom: 8 }}>
                {results.length === 0
                  ? t.noResults
                  : `${t.resultsCount(results.length)} — ${t.selectHint}`}
              </div>

              {results.length > 0 && (
                <div style={{
                  maxHeight: 260,
                  overflowY: 'auto',
                  borderRadius: 8,
                  border: `1px solid ${MODAL.border}`,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                  {results.map((asst) => (
                    <AssistantResultRow
                      key={asst.id}
                      assistant={asst}
                      isAr={isAr}
                      onSelect={setSelectedAssistant}
                      isSelected={selectedAssistant?.id === asst.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Link error */}
          {linkError && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 13,
            }}>
              ⚠️ {linkError}
            </div>
          )}

          {/* Success */}
          {linkSuccess && (
            <div style={{
              marginTop: 14,
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              color: '#16a34a',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
            }}>
              {t.successMsg}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!linkSuccess && (
          <div className="modal-footer" style={{
            padding: '14px 20px',
            borderTop: `1px solid ${MODAL.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
            background: MODAL.surfaceSoft,
          }}>
            <button
              type="button"
              className="modal-secondary-btn"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                border: `1.5px solid ${MODAL.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: MODAL.textStrong,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleLink}
              disabled={!selectedAssistant || linkLoading}
              style={{
                padding: '9px 20px',
                background: !selectedAssistant || linkLoading ? MODAL.disabled : MODAL.primary,
                color: !selectedAssistant || linkLoading ? MODAL.textBody : '#fff',
                border: !selectedAssistant || linkLoading ? `1.5px solid ${MODAL.border}` : 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                cursor: !selectedAssistant || linkLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                minWidth: 170,
              }}
            >
              {linkLoading ? t.linking : t.linkBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
