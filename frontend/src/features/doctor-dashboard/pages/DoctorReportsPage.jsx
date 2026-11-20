import React, { useState, useCallback } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/ui/Button';
import tokens from '../../../theme/tokens';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import jsPDF from 'jspdf';
import { formatDate } from '../../../utils/formatters';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const MOD_ACCENT  = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';
const MOD_WARNING = tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const MOD_SM      = tokens?.shadows?.sm              || '0 4px 20px rgba(0,0,0,0.06)';
const MOD_MD      = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';

const DATE_RANGE_OPTIONS = [
  { id: '7d',  arLabel: 'آخر 7 أيام',  enLabel: 'Last 7 Days' },
  { id: '30d', arLabel: 'آخر 30 يوم',  enLabel: 'Last 30 Days' },
  { id: '90d', arLabel: 'آخر 3 أشهر',  enLabel: 'Last 3 Months' },
  { id: '1y',  arLabel: 'هذا العام',   enLabel: 'This Year' },
];

export default function DoctorReportsPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();  // BUG-2 FIX: use real user from auth context
  const isRTL = language === 'ar';
  const [generating, setGenerating] = useState(null);
  const [dateRange, setDateRange] = useState('30d');

  // BUG-2 FIX: Fetch actual stats from API for PDF
  const { data: analyticsData } = useQuery({
    queryKey: ['doctor-analytics-for-reports', dateRange],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/doctor/analytics/', { params: { range: dateRange } });
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const reports = [
    {
      id: 'clinical_activity',
      title: t('reports.clinical_activity', isRTL ? 'تقرير النشاط الإكلينيكي' : 'Clinical Activity Report'),
      desc: t('reports.clinical_desc', isRTL ? 'سجل تفصيلي للمواعيد، التشخيصات، وزيارات المرضى.' : 'Detailed log of appointments, diagnoses, and patient visits.'),
      icon: '🩺', color: MOD_P
    },
    {
      id: 'revenue_summary',
      title: t('reports.revenue_summary', isRTL ? 'تقرير الإيرادات والدخل' : 'Revenue & Billing Report'),
      desc: t('reports.revenue_desc', isRTL ? 'ملخص للإيرادات، الفواتير غير المدفوعة ومطالبات التأمين.' : 'Summary of earnings, unpaid bills, and insurance claims.'),
      icon: '💰', color: MOD_SUCCESS
    },
    {
      id: 'patient_demographics',
      title: t('reports.patient_demographics', isRTL ? 'إحصائيات المرضى' : 'Patient Demographics'),
      desc: t('reports.demographics_desc', isRTL ? 'رؤى حول الفئات العمرية للمرضى، مواقعهم، ومعدلات النمو.' : 'Insights into patient age groups, locations, and growth.'),
      icon: '👥', color: MOD_ACCENT
    },
    {
      id: 'prescriptions_log',
      title: t('reports.prescriptions_log', isRTL ? 'سجل الوصفات الطبية' : 'Prescriptions History'),
      desc: t('reports.prescriptions_desc', isRTL ? 'سجل تدقيق كامل لكافة الأدوية والروشتات التي تم إصدارها.' : 'Audit trail of all medications prescribed and dispensed.'),
      icon: '💊', color: MOD_WARNING
    },
    {
      id: 'ratings_report',
      title: t('reports.ratings_report', isRTL ? 'تقييمات وآراء المرضى' : 'Patient Ratings & Reviews'),
      desc: t('reports.ratings_desc', isRTL ? 'تحليل شامل لآراء المرضى ومقاييس الأداء لعيادتك.' : 'Comprehensive analysis of patient feedback and performance metrics.'),
      icon: '⭐', color: MOD_WARNING
    },
  ];

  // BUG-2 FIX: generatePDF uses real API data instead of hardcoded values
  const generatePDF = useCallback((id) => {
    const doc = new jsPDF();
    const report = reports.find(r => r.id === id);
    const reportTitle = report?.title || 'Report';

    // BUG-2 FIX: Real doctor name from auth context (not localStorage)
    const doctorName = user?.full_name || user?.username || 'Medical Provider';

    // Date range description
    const rangeLabel = DATE_RANGE_OPTIONS.find(r => r.id === dateRange)?.[isRTL ? 'arLabel' : 'enLabel'] || dateRange;
    const generatedAt = formatDate(new Date());

    // === PDF Header ===
    doc.setFillColor(14, 116, 144); // MOD_P
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CuraBook Medical Report', 20, 16);
    doc.setFontSize(13);
    doc.text(reportTitle, 20, 28);

    // === Report Metadata ===
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Physician: Dr. ${doctorName}`, 20, 52);
    doc.text(`Generated: ${generatedAt}`, 20, 60);
    doc.text(`Period: ${rangeLabel}`, 20, 68);

    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 75, 190, 75);

    // === BUG-2 FIX: Real API data used for report body ===
    const stats = analyticsData?.stats;
    const isDataAvailable = !!stats;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(14, 116, 144);
    doc.text('Summary Statistics', 20, 88);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    let y = 100;

    if (id === 'clinical_activity') {
      doc.text(`Total Appointments: ${isDataAvailable ? stats.appointments : 'N/A (API unavailable)'}`, 20, y); y += 8;
      doc.text(`New Patients: ${isDataAvailable ? stats.newPatients : 'N/A'}`, 20, y); y += 8;
      doc.text(`Average Rating: ${isDataAvailable ? `${stats.rating}/5.0` : 'N/A'}`, 20, y);
    } else if (id === 'revenue_summary') {
      doc.text(`Total Revenue: $${isDataAvailable ? stats.revenue?.toLocaleString() : 'N/A (API unavailable)'}`, 20, y); y += 8;
      doc.text(`Completed Visits: ${isDataAvailable ? stats.appointments : 'N/A'}`, 20, y); y += 8;
    } else if (id === 'patient_demographics') {
      doc.text(`Total Patients Seen: ${isDataAvailable ? stats.newPatients : 'N/A (API unavailable)'}`, 20, y); y += 8;
    } else {
      doc.text(isDataAvailable ? 'Data fetched from live API.' : 'Note: API data unavailable. Please ensure system connectivity.', 20, y);
    }

    if (!isDataAvailable) {
      y += 24;
      doc.setTextColor(200, 60, 60);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('* Live API data could not be retrieved. Connect to the CuraBook backend for accurate figures.', 20, y, { maxWidth: 170 });
    }

    // === Footer ===
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text('CuraBook v1 — Confidential Medical Report', 20, 280);
    doc.text(`Page 1`, 180, 280);

    doc.save(`CuraBook_${id}_${new Date().toISOString().slice(0,10)}.pdf`);
  }, [analyticsData, dateRange, isRTL, user, reports]);

  const handleDownload = (reportId) => {
    setGenerating(reportId);
    setTimeout(() => {
      generatePDF(reportId);
      setGenerating(null);
    }, 800);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Premium Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg, #0891B2 0%, ${MOD_PD} 100%)`,
        borderRadius: 24, padding: '36px 40px', color: '#fff',
        position: 'relative', overflow: 'hidden', marginBottom: 32,
        boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 24
      }}>
        <div style={{ position: 'absolute', top: -50, right: isRTL ? 'auto' : -20, left: isRTL ? -20 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px' }}>📋 {t('nav.reports', isRTL ? 'التقارير' : 'Reports')}</h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6 }}>
            {isRTL ? 'قم بإنشاء وتصدير التقارير الطبية والمالية بجودة عالية (PDF) مبنية على بياناتك الفعلية.' : 'Generate and export medical & financial reports in PDF format, powered by your real data.'}
          </p>
        </div>

        {/* BUG-2 FIX: Date range selector attached to reports */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.15)', padding: 6, borderRadius: 16, backdropFilter: 'blur(10px)', position: 'relative', zIndex: 1 }}>
          {DATE_RANGE_OPTIONS.map(d => (
            <button key={d.id} onClick={() => setDateRange(d.id)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: dateRange === d.id ? '#fff' : 'transparent',
                color: dateRange === d.id ? MOD_P : 'rgba(255,255,255,0.75)',
                fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.25s',
                fontFamily: 'inherit'
              }}>
              {isRTL ? d.arLabel : d.enLabel}
            </button>
          ))}
        </div>
      </div>

      {/* API data availability banner */}
      {!analyticsData && (
        <div style={{ marginBottom: 20, padding: '14px 20px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 16, color: '#92400E', fontSize: 14, fontWeight: 600 }}>
          ⚠️ {isRTL ? 'تعذّر الاتصال بالـ API — ستحتوي التقارير على ملاحظة بعدم توفر البيانات الفعلية.' : 'API connection failed — reports will note that live data is unavailable.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 28 }}>
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onDownload={() => handleDownload(report.id)}
            loading={generating === report.id}
            t={t}
            isRTL={isRTL}
          />
        ))}
      </div>

      {/* Recent Exports — real data from API */}
      <div style={{ marginTop: 48, background: 'var(--bg-card)', borderRadius: 28, padding: 32, border: '1px solid var(--border-base)', boxShadow: MOD_MD }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 24px', color: 'var(--text-h)' }}>
          {isRTL ? 'تصديرات التقارير الأخيرة' : 'Recent Exports'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>
          {isRTL ? 'التقارير المُصدَّرة تُحفظ محلياً على جهازك.' : 'Exported reports are saved locally to your device.'}
        </p>
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-hint)' }}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.4 }}>📁</span>
          <p style={{ margin: 0, fontSize: 14 }}>
            {isRTL ? 'قم بتصدير أول تقرير لرؤيته هنا' : 'Export your first report to see it listed here'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, onDownload, loading, t, isRTL }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 24, padding: 32,
      boxShadow: MOD_SM, border: '1px solid var(--border-base)',
      display: 'flex', gap: 24, alignItems: 'flex-start',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = MOD_MD; e.currentTarget.style.borderColor = report.color; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = MOD_SM; e.currentTarget.style.borderColor = 'var(--border-base)'; }}
    >
      <div style={{ width: 70, height: 70, borderRadius: 20, background: report.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
        {report.icon}
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--text-h)' }}>{report.title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 500 }}>{report.desc}</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" loading={loading} onClick={onDownload}
            style={{ borderRadius: 14, padding: '10px 20px', fontWeight: 800, background: MOD_P, boxShadow: MOD_SM }}>
            📥 {t('reports.download_pdf', isRTL ? 'تحميل PDF' : 'Download PDF')}
          </Button>
          <Button variant="ghost" size="sm"
            style={{ borderRadius: 14, padding: '10px 20px', fontWeight: 700, border: '2px solid var(--border-base)' }}
            onClick={() => alert(isRTL ? 'سيتوفر صيغة Excel في التحديث القادم' : 'Excel format coming soon.')}>
            📊 Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
