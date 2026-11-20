/**
 * ReportsSection.jsx — Bug #4 Fix (Enhanced)
 * Redesigned to match PDF design spec:
 *  - Stats row (total, lab, xray, last date)
 *  - Filters (search, type, date)
 *  - Table with: نوع التقرير | اسم التقرير | التاريخ | الطبيب | الإجراءات (عرض + تحميل)
 *  - Pagination
 *  - Clear empty state
 *
 * Bug #4 Fix: Download button now uses real Blob download via downloadFile utility.
 * If the parent passes onDownload, it's called first. If not, the component
 * handles the download internally using the report's download_url field.
 */
import React, { useState, useMemo, useCallback } from 'react';
import useTranslation from '../../i18n/useTranslation';
import { downloadReport } from '../../utils/downloadFile';

const PAGE_SIZE = 5;

const TYPE_META = {
  APPOINTMENT:     { label_ar: 'تقرير طبي',     label_en: 'Medical Report', icon: '📄', color: '#3B82F6' },
  PRESCRIPTION:    { label_ar: 'وصفة طبية',     label_en: 'Prescription',   icon: '💊', color: '#10B981' },
  MEDICAL_HISTORY: { label_ar: 'تاريخ مرضي',    label_en: 'Medical History', icon: '📋', color: '#8B5CF6' },
  LAB_RESULT:      { label_ar: 'تحليل مخبري',   label_en: 'Lab Test',        icon: '🧪', color: '#6366F1' },
  RADIOLOGY:       { label_ar: 'أشعة',           label_en: 'X-Ray',           icon: '🩻', color: '#F59E0B' },
  BILLING:         { label_ar: 'فواتير',          label_en: 'Billing',         icon: '🧾', color: '#EF4444' },
};

function getTypeMeta(type, lang) {
  const m = TYPE_META[type] || { label_ar: 'تقرير', label_en: 'Report', icon: '📋', color: 'var(--text-muted)' };
  return { ...m, label: lang === 'ar' ? m.label_ar : m.label_en };
}

function StatBox({ icon, value, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 18px', borderRadius: '12px',
      background: 'var(--bg-page)', border: '1px solid var(--border-base)',
      minWidth: '140px', flex: '1',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: color + '18', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function ReportsSection({ title, reports = [], loading = false, onDownload, onView }) {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';

  const [searchQ, setSearchQ]         = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterDate, setFilterDate]   = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Bug #4 Fix: per-report download loading & error state
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [downloadErrors, setDownloadErrors] = useState({});

  // Bug #4 Fix: proper blob download handler
  const handleDownloadClick = async (report) => {
    if (onDownload) { onDownload(report); return; }

    const reportId  = report.id || report.report_id;
    const dlUrl     = report.download_url || `/api/v1/reports/${reportId}/download/`;
    const dlName    = report.filename || `${(report.name || 'report').replace(/\s+/g, '_')}.pdf`;
    const token     =
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
      null;

    setDownloadingIds(prev => new Set([...prev, reportId]));
    setDownloadErrors(prev => { const n = {...prev}; delete n[reportId]; return n; });

    try {
      const res = await fetch(dlUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = dlName; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 200);
    } catch (err) {
      const msg = isAr ? 'حدث خطأ أثناء تحميل التقرير. حاول مرة أخرى.' : 'Download failed. Please try again.';
      setDownloadErrors(prev => ({ ...prev, [reportId]: msg }));
    } finally {
      setDownloadingIds(prev => { const n = new Set(prev); n.delete(reportId); return n; });
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalReports = reports.length;
  const labTests     = reports.filter(r => r.type === 'LAB_RESULT' || r.type === 'MEDICAL_HISTORY').length;
  const xrays        = reports.filter(r => r.type === 'RADIOLOGY').length;
  const lastDate     = reports.length > 0
    ? reports.reduce((latest, r) => (r.date > latest ? r.date : latest), reports[0]?.date || '')
    : null;

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let arr = [...reports];
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      arr = arr.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.doctor_name || '').toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q)
      );
    }
    if (filterType) arr = arr.filter(r => r.type === filterType);
    if (filterDate) arr = arr.filter(r => (r.date || '').startsWith(filterDate));
    return arr;
  }, [reports, searchQ, filterType, filterDate]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(currentPage, totalPages);
  const pageReports = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  // ── Type options ───────────────────────────────────────────────────────────
  const typeOptions = [
    { value: '',                 label: isAr ? 'جميع الأنواع'   : 'All Types'     },
    { value: 'APPOINTMENT',      label: isAr ? 'تقرير طبي'      : 'Medical Report' },
    { value: 'MEDICAL_HISTORY',  label: isAr ? 'تاريخ مرضي'    : 'Medical History' },
    { value: 'LAB_RESULT',       label: isAr ? 'تحليل مخبري'   : 'Lab Test'        },
    { value: 'RADIOLOGY',        label: isAr ? 'أشعة'           : 'X-Ray'           },
    { value: 'BILLING',          label: isAr ? 'فواتير'         : 'Billing'         },
    { value: 'PRESCRIPTION',     label: isAr ? 'وصفة طبية'     : 'Prescription'   },
  ];

  // ── Unique months for date filter ──────────────────────────────────────────
  const months = useMemo(() => {
    const set = new Set(reports.map(r => (r.date || '').slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [reports]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-sm)',
      marginTop: '28px',
      fontFamily: "'Cairo', sans-serif",
      direction: isAr ? 'rtl' : 'ltr',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📄</span>
            {title || (isAr ? 'التقارير الطبية والتحاليل' : 'Medical Reports & Analytics')}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-hint)' }}>
            {isAr ? 'عرض جميع تقاريرك الطبية والتحاليل السابقة' : 'View all your medical reports and previous analyses'}
          </p>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      {!loading && reports.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <StatBox icon="📋" value={totalReports} label={isAr ? 'إجمالي التقارير' : 'Total Reports'}  color="#3B82F6" />
          <StatBox icon="🧪" value={labTests}     label={isAr ? 'تحاليل مخبرية'  : 'Lab Tests'}       color="#8B5CF6" />
          <StatBox icon="🩻" value={xrays}        label={isAr ? 'أشعة'            : 'X-Rays'}           color="#F59E0B" />
          {lastDate && (
            <StatBox icon="📅" value={lastDate}   label={isAr ? 'آخر تقرير'       : 'Latest Report'}   color="#10B981" />
          )}
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '52px', borderRadius: '10px', background: 'var(--border-base)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : reports.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────────────── */
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-hint)' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>📁</div>
          <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: 'var(--text-body)' }}>
            {isAr ? 'لا توجد تقارير طبية حتى الآن' : 'No medical reports yet'}
          </p>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {isAr
              ? 'ستظهر هنا تقاريرك الطبية وتحاليلك بعد زيارة الأطباء.'
              : 'Your medical reports and analyses will appear here after doctor visits.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Filters ──────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: '10px', flexWrap: 'wrap',
            marginBottom: '16px', alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
              <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: '10px', fontSize: '14px', color: 'var(--text-hint)', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                value={searchQ}
                onChange={handleFilterChange(setSearchQ)}
                placeholder={isAr ? 'ابحث عن تقرير أو تحليل...' : 'Search report or test...'}
                style={{
                  width: '100%', padding: isAr ? '9px 32px 9px 12px' : '9px 12px 9px 32px',
                  borderRadius: '10px', border: '1px solid var(--border-base)',
                  fontSize: '13px', background: 'var(--bg-page)', color: 'var(--text-body)',
                  fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            {/* Date filter */}
            <select
              value={filterDate}
              onChange={handleFilterChange(setFilterDate)}
              style={{
                padding: '9px 12px', borderRadius: '10px',
                border: '1px solid var(--border-base)', fontSize: '13px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                fontFamily: "'Cairo', sans-serif", cursor: 'pointer', minWidth: '130px',
              }}
            >
              <option value="">{isAr ? 'جميع التواريخ' : 'All Dates'}</option>
              {months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={handleFilterChange(setFilterType)}
              style={{
                padding: '9px 12px', borderRadius: '10px',
                border: '1px solid var(--border-base)', fontSize: '13px',
                background: 'var(--bg-page)', color: 'var(--text-body)',
                fontFamily: "'Cairo', sans-serif", cursor: 'pointer', minWidth: '130px',
              }}
            >
              {typeOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Table ────────────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-hint)', fontSize: '13px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
              {isAr ? 'لا توجد نتائج تطابق البحث' : 'No results match your search'}
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%', borderCollapse: 'collapse',
                  fontSize: '13px', color: 'var(--text-body)',
                }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border-base)' }}>
                      {[
                        isAr ? 'نوع التقرير' : 'Type',
                        isAr ? 'اسم التقرير' : 'Report Name',
                        isAr ? 'التاريخ'      : 'Date',
                        isAr ? 'الطبيب'       : 'Doctor',
                        isAr ? 'الإجراءات'    : 'Actions',
                      ].map((h, i) => (
                        <th key={i} style={{
                          padding: '12px 14px', fontWeight: 700, fontSize: '12px',
                          color: 'var(--text-hint)', textAlign: isAr ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageReports.map((report, idx) => {
                      const meta = getTypeMeta(report.type, language);
                      return (
                        <tr
                          key={report.id || idx}
                          style={{
                            borderBottom: '1px solid var(--border-base)',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg-page)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Type */}
                          <td style={{ padding: '14px 14px' }}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '4px 10px', borderRadius: '20px',
                              background: meta.color + '15', color: meta.color,
                              fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap',
                            }}>
                              {meta.icon} {meta.label}
                            </div>
                          </td>

                          {/* Name */}
                          <td style={{ padding: '14px 14px', fontWeight: 500, maxWidth: '220px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {report.name || (isAr ? 'تقرير طبي' : 'Medical Report')}
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '14px 14px', color: 'var(--text-hint)', whiteSpace: 'nowrap' }}>
                            {report.date || '—'}
                          </td>

                          {/* Doctor */}
                          <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                            {report.doctor_name ? (
                              <span style={{ color: 'var(--text-body)' }}>
                                {isAr ? 'د. ' : 'Dr. '}{report.doctor_name.replace(/^(د\.\s*|Dr\.\s*)/i, '')}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-hint)' }}>—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 14px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {/* View button */}
                              <button
                                onClick={() => onView && onView(report)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  padding: '6px 12px', borderRadius: '8px',
                                  background: 'var(--primary-pale, #E0F2FE)',
                                  color: 'var(--primary, #0E7490)',
                                  border: 'none', cursor: 'pointer',
                                  fontSize: '12px', fontWeight: 600,
                                  fontFamily: "'Cairo', sans-serif",
                                  transition: 'opacity 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                                onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                title={isAr ? 'عرض' : 'View'}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                                {isAr ? 'عرض' : 'View'}
                              </button>

                              {/* Download button */}
                              <button
                                onClick={() => handleDownloadClick(report)}
                                disabled={downloadingIds.has(report.id || report.report_id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  padding: '6px 12px', borderRadius: '8px',
                                  background: 'transparent',
                                  color: 'var(--text-hint)',
                                  border: '1px solid var(--border-base)',
                                  cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                  fontFamily: "'Cairo', sans-serif",
                                  transition: 'all 0.15s',
                                }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary, #0E7490)'; e.currentTarget.style.color = 'var(--primary, #0E7490)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-hint)'; }}
                                title={isAr ? 'تحميل' : 'Download'}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                {isAr ? 'تحميل' : 'Download'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ──────────────────────────────────────────── */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '16px', paddingTop: '16px',
                borderTop: '1px solid var(--border-base)',
                flexWrap: 'wrap', gap: '8px',
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-hint)' }}>
                  {isAr
                    ? `عرض ${Math.min((safePage-1)*PAGE_SIZE+1, filtered.length)} إلى ${Math.min(safePage*PAGE_SIZE, filtered.length)} من ${filtered.length} تقرير`
                    : `Showing ${Math.min((safePage-1)*PAGE_SIZE+1, filtered.length)}–${Math.min(safePage*PAGE_SIZE, filtered.length)} of ${filtered.length} reports`
                  }
                </p>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: '1px solid var(--border-base)', background: 'var(--bg-page)',
                        color: safePage === 1 ? 'var(--text-hint)' : 'var(--text-body)',
                        cursor: safePage === 1 ? 'default' : 'pointer', fontFamily: "'Cairo', sans-serif",
                      }}
                    >{isAr ? 'السابق' : 'Prev'}</button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px', fontSize: '12px',
                            fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: safePage === p ? 'var(--primary, #0E7490)' : 'var(--bg-page)',
                            color: safePage === p ? '#fff' : 'var(--text-body)',
                            fontFamily: "'Cairo', sans-serif",
                          }}
                        >{p}</button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: '1px solid var(--border-base)', background: 'var(--bg-page)',
                        color: safePage === totalPages ? 'var(--text-hint)' : 'var(--text-body)',
                        cursor: safePage === totalPages ? 'default' : 'pointer', fontFamily: "'Cairo', sans-serif",
                      }}
                    >{isAr ? 'التالي' : 'Next'}</button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
