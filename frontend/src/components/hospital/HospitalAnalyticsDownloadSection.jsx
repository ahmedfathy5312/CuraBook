/**
 * HospitalAnalyticsDownloadSection.jsx — Bug #4 Fix
 * ─────────────────────────────────────────────────────────────────
 * Replaces the broken "alert('جاري تحضير التقرير...')" download
 * buttons in the Hospital Analytics page with proper blob downloads.
 *
 * HOW TO USE in HospitalAnalytics page:
 *
 *   import HospitalAnalyticsDownloadSection from
 *     '../../components/hospital/HospitalAnalyticsDownloadSection';
 *
 *   // Replace the old broken download section with:
 *   <HospitalAnalyticsDownloadSection />
 *
 * ─────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import { downloadHospitalReport } from '../../utils/downloadFile';

// ── Per-button state shape ────────────────────────────────────────
const INITIAL_STATE = { loading: false, error: null, success: false };

export default function HospitalAnalyticsDownloadSection({ language = 'ar' }) {
  const isAr = language === 'ar';

  const [states, setStates] = useState({
    monthly: { ...INITIAL_STATE },
    doctors: { ...INITIAL_STATE },
    revenue: { ...INITIAL_STATE },
  });

  const setReportState = (type, patch) =>
    setStates(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));

  const handleDownload = async (type) => {
    // Clear previous messages
    setReportState(type, { loading: true, error: null, success: false });

    const ok = await downloadHospitalReport(type, {
      onStart:  () => setReportState(type, { loading: true }),
      onFinish: () => setReportState(type, { loading: false }),
      onError:  (msg) => setReportState(type, { error: msg, loading: false }),
    });

    if (ok) {
      setReportState(type, { success: true });
      // Auto-clear success message after 4 seconds
      setTimeout(() => setReportState(type, { success: false }), 4000);
    }
  };

  const reports = [
    {
      key: 'monthly',
      icon: '📊',
      label_ar: 'الملخص الشهري',
      label_en: 'Monthly Summary',
      sub_ar: 'شهري • PDF, Excel',
      sub_en: 'Monthly • PDF, Excel',
      color: '#3B82F6',
    },
    {
      key: 'doctors',
      icon: '👨‍⚕️',
      label_ar: 'أداء الأطباء',
      label_en: 'Doctor Performance',
      sub_ar: 'شهري • PDF, Excel',
      sub_en: 'Monthly • PDF, Excel',
      color: '#10B981',
    },
    {
      key: 'revenue',
      icon: '💰',
      label_ar: 'تحليل الإيرادات',
      label_en: 'Revenue Analysis',
      sub_ar: 'شهري • PDF, Excel',
      sub_en: 'Monthly • PDF, Excel',
      color: '#F59E0B',
    },
  ];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>📁</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
          {isAr ? 'التقارير الطبية والتحاليل' : 'Medical Reports & Analytics'}
        </h3>
      </div>

      {/* Report cards row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {reports.map((r) => {
          const s = states[r.key];
          return (
            <div
              key={r.key}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-base)',
                background: 'var(--bg-page)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Report info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: r.color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                >
                  {r.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-body)',
                      lineHeight: 1.3,
                    }}
                  >
                    {isAr ? r.label_ar : r.label_en}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '2px' }}>
                    {isAr ? r.sub_ar : r.sub_en}
                  </div>
                </div>
              </div>

              {/* Error message */}
              {s.error && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#DC2626',
                    background: '#FEF2F2',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    lineHeight: 1.4,
                  }}
                >
                  ❌ {s.error}
                </div>
              )}

              {/* Success message */}
              {s.success && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#059669',
                    background: '#ECFDF5',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    lineHeight: 1.4,
                  }}
                >
                  ✅ {isAr ? 'تم تحميل التقرير بنجاح' : 'Report downloaded successfully'}
                </div>
              )}

              {/* Download button */}
              <button
                onClick={() => handleDownload(r.key)}
                disabled={s.loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: s.loading ? 'var(--border-base)' : r.color,
                  color: s.loading ? 'var(--text-hint)' : '#fff',
                  border: 'none',
                  cursor: s.loading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: "'Cairo', sans-serif",
                  transition: 'opacity 0.15s',
                  opacity: s.loading ? 0.7 : 1,
                  width: '100%',
                }}
                onMouseOver={(e) => { if (!s.loading) e.currentTarget.style.opacity = '0.85'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = s.loading ? '0.7' : '1'; }}
              >
                {s.loading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    {isAr ? 'جاري التحضير...' : 'Preparing...'}
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {isAr ? 'تنزيل' : 'Download'}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Spinner keyframe (injected once) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
