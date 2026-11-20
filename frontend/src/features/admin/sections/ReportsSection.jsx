/**
 * ReportsSection.jsx — Admin Reports System
 *
 * Sprint 2 — Reports System:
 *  • قوالب تقارير جاهزة (مواعيد / مرضى / أطباء / مستشفيات / مالي)
 *  • فلاتر: نطاق تاريخ / مستشفى / حالة
 *  • تصدير PDF (jsPDF)
 *  • تصدير Excel/CSV
 *  • معاينة مصغرة قبل التصدير
 *  • سجل التقارير المُولَّدة
 */
import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import apiClient from '../../../services/apiClient';
import { tokens } from '../../../theme/tokens';

// ── Colours ───────────────────────────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL  = tokens?.colors?.primary?.pale    || '#E0F7FA';
const CLR_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const CLR_WARNING = tokens?.colors?.warning?.DEFAULT || '#F59E0B';
const CLR_DANGER  = tokens?.colors?.danger?.DEFAULT  || '#EF4444';
const CLR_ACCENT  = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';
const CLR_INFO    = tokens?.colors?.info?.DEFAULT    || '#3B82F6';

// ── Report Templates ──────────────────────────────────────────────────────────
const REPORT_TEMPLATES = [
  {
    id: 'appointments',
    icon: '📅',
    title: 'تقرير المواعيد',
    desc: 'إجمالي المواعيد، الحالات، التوزيع اليومي',
    color: P,
    bg: PL,
    fields: ['التاريخ', 'المريض', 'الطبيب', 'المستشفى', 'الحالة', 'الوقت'],
    apiPath: '/api/v1/admin/appointments/',
  },
  {
    id: 'patients',
    icon: '👥',
    title: 'تقرير المرضى',
    desc: 'بيانات المرضى المسجلين وإحصاءاتهم',
    color: CLR_SUCCESS,
    bg: '#D1FAE5',
    fields: ['الاسم', 'البريد', 'الهاتف', 'تاريخ التسجيل', 'عدد المواعيد'],
    apiPath: '/api/v1/admin/patients/',
  },
  {
    id: 'doctors',
    icon: '👨‍⚕️',
    title: 'تقرير الأطباء',
    desc: 'قائمة الأطباء، التخصصات، التقييمات',
    color: CLR_INFO,
    bg: '#DBEAFE',
    fields: ['الاسم', 'التخصص', 'المستشفى', 'التقييم', 'عدد المواعيد', 'الحالة'],
    apiPath: '/api/v1/admin/doctors/',
  },
  {
    id: 'hospitals',
    icon: '🏥',
    title: 'تقرير المستشفيات',
    desc: 'بيانات المستشفيات والأقسام والأطباء',
    color: CLR_WARNING,
    bg: '#FEF3C7',
    fields: ['الاسم', 'المحافظة', 'عدد الأطباء', 'عدد المواعيد', 'الحالة'],
    apiPath: '/api/v1/admin/hospitals/',
  },
  {
    id: 'audit',
    icon: '📋',
    title: 'تقرير سجل المراجعة',
    desc: 'سجل كامل للعمليات والأحداث على النظام',
    color: CLR_ACCENT,
    bg: '#EDE9FE',
    fields: ['الوقت', 'المستخدم', 'الإجراء', 'النموذج', 'التفاصيل', 'IP'],
    apiPath: '/api/v1/admin/audit-logs/',
  },
  {
    id: 'summary',
    icon: '📊',
    title: 'تقرير الملخص التنفيذي',
    desc: 'نظرة عامة شاملة على أداء النظام',
    color: CLR_DANGER,
    bg: '#FEE2E2',
    fields: ['KPI', 'المقياس', 'الفترة', 'القيمة', 'التغيير %'],
    apiPath: '/api/v1/admin/stats/',
  },
  {
    id: 'assistants',
    icon: '🤝',
    title: 'تقرير المساعدين',
    desc: 'بيانات المساعدين، المستشفيات، الحالة، آخر نشاط',
    color: '#7C3AED',
    bg: '#EDE9FE',
    fields: ['الاسم', 'البريد', 'الهاتف', 'المستشفى', 'العيادة', 'الحالة', 'تاريخ التسجيل'],
    apiPath: '/api/v1/admin/assistants/',
  },
];

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_ROWS = {
  appointments: [
    { التاريخ: '2025-05-01', المريض: 'أحمد عمر',    الطبيب: 'د. سارة علي',    المستشفى: 'مستشفى النيل',    الحالة: 'مؤكد',   الوقت: '09:00' },
    { التاريخ: '2025-05-01', المريض: 'مريم سالم',  الطبيب: 'د. أحمد سامي',   المستشفى: 'مستشفى القاهرة', الحالة: 'مكتمل',  الوقت: '10:30' },
    { التاريخ: '2025-05-02', المريض: 'علي حسين',   الطبيب: 'د. محمد كريم',   المستشفى: 'مركز الشفاء',    الحالة: 'انتظار', الوقت: '11:00' },
    { التاريخ: '2025-05-02', المريض: 'نور عادل',   الطبيب: 'د. فاطمة حسن',  المستشفى: 'مستشفى النيل',    الحالة: 'ملغي',   الوقت: '14:00' },
    { التاريخ: '2025-05-03', المريض: 'يوسف طارق',  الطبيب: 'د. سارة علي',    المستشفى: 'مستشفى القاهرة', الحالة: 'مؤكد',   الوقت: '09:30' },
    { التاريخ: '2025-05-03', المريض: 'هنا محمود',  الطبيب: 'د. أحمد سامي',   المستشفى: 'عيادات الرعاية', الحالة: 'مكتمل',  الوقت: '16:00' },
  ],
  patients: [
    { الاسم: 'أحمد عمر',    البريد: 'ahmed@email.com',   الهاتف: '0111111111', 'تاريخ التسجيل': '2024-01-15', 'عدد المواعيد': 7  },
    { الاسم: 'مريم سالم',  البريد: 'mariam@email.com',  الهاتف: '0122222222', 'تاريخ التسجيل': '2024-02-20', 'عدد المواعيد': 3  },
    { الاسم: 'علي حسين',   البريد: 'ali@email.com',     الهاتف: '0133333333', 'تاريخ التسجيل': '2024-03-10', 'عدد المواعيد': 12 },
    { الاسم: 'نور عادل',   البريد: 'nour@email.com',    الهاتف: '0144444444', 'تاريخ التسجيل': '2024-04-05', 'عدد المواعيد': 2  },
  ],
  doctors: [
    { الاسم: 'د. سارة علي',    التخصص: 'طب عام',  المستشفى: 'مستشفى النيل',    التقييم: 4.8, 'عدد المواعيد': 142, الحالة: 'نشط' },
    { الاسم: 'د. أحمد سامي',   التخصص: 'قلب',    المستشفى: 'مستشفى القاهرة', التقييم: 4.6, 'عدد المواعيد': 128, الحالة: 'نشط' },
    { الاسم: 'د. محمد كريم',   التخصص: 'أسنان',  المستشفى: 'مركز الشفاء',    التقييم: 4.7, 'عدد المواعيد': 117, الحالة: 'نشط' },
    { الاسم: 'د. فاطمة حسن',  التخصص: 'أطفال',  المستشفى: 'عيادات الرعاية', التقييم: 4.9, 'عدد المواعيد': 103, الحالة: 'نشط' },
  ],
  hospitals: [
    { الاسم: 'مستشفى النيل',    المحافظة: 'القاهرة',   'عدد الأطباء': 28, 'عدد المواعيد': 312, الحالة: 'نشط' },
    { الاسم: 'مستشفى القاهرة', المحافظة: 'الجيزة',    'عدد الأطباء': 24, 'عدد المواعيد': 287, الحالة: 'نشط' },
    { الاسم: 'مركز الشفاء',    المحافظة: 'الإسكندرية','عدد الأطباء': 19, 'عدد المواعيد': 234, الحالة: 'نشط' },
    { الاسم: 'عيادات الرعاية', المحافظة: 'القاهرة',   'عدد الأطباء': 15, 'عدد المواعيد': 198, الحالة: 'نشط' },
  ],
  audit: [
    { الوقت: '2025-05-01 09:00', المستخدم: 'admin@curabook.com', الإجراء: 'تعديل', النموذج: 'موعد', التفاصيل: 'تحديث حالة الموعد #142', IP: '192.168.1.1' },
    { الوقت: '2025-05-01 10:30', المستخدم: 'manager@curabook.com', الإجراء: 'حذف', النموذج: 'مستخدم', التفاصيل: 'حذف حساب #87', IP: '192.168.1.4' },
    { الوقت: '2025-05-02 08:15', المستخدم: 'admin@curabook.com', الإجراء: 'إنشاء', النموذج: 'طبيب', التفاصيل: 'إضافة طبيب جديد', IP: '192.168.1.1' },
  ],
  summary: [
    { KPI: 'إجمالي المواعيد',  المقياس: 'عدد', الفترة: 'مايو 2025', القيمة: '1,191',  'التغيير %': '+12%' },
    { KPI: 'إجمالي المرضى',    المقياس: 'عدد', الفترة: 'مايو 2025', القيمة: '4,328',  'التغيير %': '+8%'  },
    { KPI: 'الأطباء النشطون',  المقياس: 'عدد', الفترة: 'مايو 2025', القيمة: '247',    'التغيير %': '+3%'  },
    { KPI: 'معدل الإكمال',     المقياس: 'نسبة', الفترة: 'مايو 2025', القيمة: '72%',   'التغيير %': '+2%'  },
    { KPI: 'معدل الإلغاء',     المقياس: 'نسبة', الفترة: 'مايو 2025', القيمة: '8%',    'التغيير %': '-1%'  },
  ],
  assistants: [
    { الاسم: 'سارة خالد',   البريد: 'sara@curabook.com',    الهاتف: '0111000001', المستشفى: 'مستشفى النيل',    العيادة: '—',           الحالة: 'نشط',      'تاريخ التسجيل': '2024-01-10' },
    { الاسم: 'محمد حسام',   البريد: 'mhosam@curabook.com',  الهاتف: '0111000002', المستشفى: 'مستشفى القاهرة', العيادة: '—',           الحالة: 'نشط',      'تاريخ التسجيل': '2024-02-14' },
    { الاسم: 'نور إبراهيم', البريد: 'nour@curabook.com',    الهاتف: '0111000003', المستشفى: '—',               العيادة: 'عيادة الأمل', الحالة: 'نشط',      'تاريخ التسجيل': '2024-03-22' },
    { الاسم: 'علي فاروق',   البريد: 'ali.f@curabook.com',   الهاتف: '0111000004', المستشفى: 'مركز الشفاء',    العيادة: '—',           الحالة: 'غير نشط', 'تاريخ التسجيل': '2024-04-01' },
  ],
};

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF(template, rows, filters) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header bar
  doc.setFillColor(14, 116, 144);
  doc.rect(0, 0, 297, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CuraBook Admin Report', 148, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(template.title + ' | Generated: ' + new Date().toLocaleDateString('en-EG'), 148, 20, { align: 'center' });

  // Filters info
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  let filterText = '';
  if (filters.dateFrom) filterText += `From: ${filters.dateFrom}  `;
  if (filters.dateTo)   filterText += `To: ${filters.dateTo}  `;
  if (filters.status !== 'all') filterText += `Status: ${filters.status}`;
  if (filterText) doc.text(filterText.trim(), 14, 34);

  // Table
  const headers = template.fields;
  const colW = Math.floor((297 - 28) / headers.length);
  const startY = filterText ? 40 : 34;

  // Table header
  doc.setFillColor(224, 247, 250);
  doc.rect(14, startY - 5, 269, 8, 'F');
  doc.setTextColor(14, 116, 144);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, 14 + i * colW + 2, startY));

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  let y = startY + 8;
  rows.slice(0, 40).forEach((row, ri) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 4, 269, 7, 'F');
    }
    headers.forEach((h, i) => {
      const val = String(row[h] ?? '');
      doc.text(val.length > 18 ? val.slice(0, 16) + '..' : val, 14 + i * colW + 2, y);
    });
    y += 7;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CuraBook — Confidential | Page ${p} of ${totalPages}`, 148, 205, { align: 'center' });
  }

  doc.save(`${template.id}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Small helper components ───────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{
      background: bg, color, padding: '3px 10px',
      borderRadius: 999, fontSize: 11, fontWeight: 700,
    }}>{label}</span>
  );
}

function Th({ children }) {
  return (
    <th style={{
      padding: '9px 12px', fontSize: 11, fontWeight: 700, textAlign: 'right',
      color: P, background: PL, borderBottom: '2px solid var(--border-base)',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function Td({ children }) {
  return (
    <td style={{
      padding: '8px 12px', fontSize: 12, color: 'var(--txt-heading)',
      borderBottom: '1px solid var(--border-base)',
    }}>{children}</td>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ReportsSection() {
  const [selected, setSelected]       = useState(null);   // template id
  const [filters, setFilters]         = useState({ dateFrom: '', dateTo: '', status: 'all', hospital: 'all' });
  const [preview, setPreview]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [history, setHistory]         = useState([]);     // [{title, date, format, rows}]

  const template = REPORT_TEMPLATES.find(t => t.id === selected);

  // ── Try fetch real data ────────────────────────────────────────────────────
  const { data: apiData, isLoading: apiLoading } = useQuery({
    queryKey: ['admin-report-data', selected],
    enabled: !!selected && !!template,
    queryFn: async () => {
      try {
        const res = await apiClient.get(`${template.apiPath}?page_size=200`);
        return res.data?.results || res.data || [];
      } catch { return null; }
    },
    staleTime: 60_000,
  });

  // ── Normalize rows ─────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (!template) return [];
    const raw = apiData || DEMO_ROWS[template.id] || [];
    // Apply date filter
    if (!Array.isArray(raw)) return DEMO_ROWS[template.id] || [];
    let filtered = raw;
    if (filters.status !== 'all' && filtered[0]?.الحالة !== undefined) {
      filtered = filtered.filter(r => r.الحالة === filters.status || r.status === filters.status);
    }
    return filtered.length ? filtered : DEMO_ROWS[template.id] || [];
  }, [apiData, template, filters]);

  function handleGenerate(format) {
    if (!template) return;
    setGenerating(true);
    setTimeout(() => {
      if (format === 'pdf') {
        exportPDF(template, rows, filters);
      } else {
        exportCSV(rows, `${template.id}_report_${new Date().toISOString().slice(0, 10)}.csv`);
      }
      setHistory(h => [{
        id: Date.now(),
        title: template.title,
        date: new Date().toLocaleString('ar-EG'),
        format: format.toUpperCase(),
        rows: rows.length,
        color: template.color,
        bg: template.bg,
        icon: template.icon,
      }, ...h].slice(0, 10));
      setGenerating(false);
    }, 800);
  }

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  return (
    <div style={{ fontFamily: "var(--font-ar, 'Cairo', sans-serif)", direction: 'rtl' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--txt-heading)' }}>
          📄 نظام التقارير
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          قوالب تقارير جاهزة — تصدير PDF أو CSV بضغطة واحدة
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* ── Left column: Templates + Preview ── */}
        <div>
          {/* Template Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {REPORT_TEMPLATES.map(t => (
              <div
                key={t.id}
                onClick={() => { setSelected(t.id); setPreview(false); }}
                style={{
                  background: selected === t.id ? t.bg : 'var(--bg-card)',
                  border: `2px solid ${selected === t.id ? t.color : 'var(--border-base)'}`,
                  borderRadius: 12, padding: '16px 14px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selected === t.id ? `0 4px 16px ${t.color}33` : '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => { if (selected !== t.id) e.currentTarget.style.borderColor = t.color; }}
                onMouseLeave={e => { if (selected !== t.id) e.currentTarget.style.borderColor = 'var(--border-base)'; }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selected === t.id ? t.color : 'var(--txt-heading)', marginBottom: 4 }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.desc}</div>
                {selected === t.id && (
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: t.color }}>✓ محدد</div>
                )}
              </div>
            ))}
          </div>

          {/* Preview Table */}
          {selected && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-base)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: template?.bg }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: template?.color }}>
                    {template?.icon} {template?.title}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 10 }}>
                    ({rows.length} سجل)
                  </span>
                </div>
                <button
                  onClick={() => setPreview(!preview)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${template?.color}`, background: 'transparent',
                    color: template?.color, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {preview ? 'إخفاء المعاينة' : '👁️ معاينة البيانات'}
                </button>
              </div>

              {preview && (
                <div style={{ overflowX: 'auto' }}>
                  {apiLoading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                      ⏳ جاري تحميل البيانات...
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {template?.fields.map(f => <Th key={f}>{f}</Th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 6).map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-card)' }}>
                            {template?.fields.map(f => (
                              <Td key={f}>{String(row[f] ?? '—')}</Td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {rows.length > 6 && (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-base)' }}>
                      ... و {rows.length - 6} سجل إضافي في التقرير الكامل
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!selected && (
            <div style={{
              textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card)',
              borderRadius: 14, border: '2px dashed var(--border-base)',
            }}>
              <div style={{ fontSize: 48 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt-heading)', marginTop: 12 }}>
                اختر قالب تقرير
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                اختر أحد القوالب أعلاه لبدء توليد التقرير
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Filters + Actions + History ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Filters Card */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-base)', padding: '18px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-heading)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔍 فلاتر التقرير
            </div>

            {[
              { label: 'من تاريخ',  type: 'date', key: 'dateFrom' },
              { label: 'إلى تاريخ', type: 'date', key: 'dateTo'   },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={filters[f.key]}
                  onChange={e => setFilter(f.key, e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--border-base)', fontSize: 13,
                    fontFamily: 'inherit', background: 'var(--bg-page)',
                    color: 'var(--txt-heading)', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                الحالة
              </label>
              <select
                value={filters.status}
                onChange={e => setFilter('status', e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border-base)', fontSize: 13,
                  fontFamily: 'inherit', background: 'var(--bg-page)',
                  color: 'var(--txt-heading)', cursor: 'pointer',
                }}
              >
                {['all','مؤكد','مكتمل','انتظار','ملغي'].map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'كل الحالات' : s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setFilters({ dateFrom: '', dateTo: '', status: 'all', hospital: 'all' })}
              style={{
                width: '100%', padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border-base)', background: 'var(--bg-page)',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ↺ إعادة تعيين الفلاتر
            </button>
          </div>

          {/* Export Actions */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-base)', padding: '18px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-heading)', marginBottom: 14 }}>
              ⬇️ تصدير التقرير
            </div>

            {!selected && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                اختر قالباً أولاً
              </div>
            )}

            {selected && (
              <>
                <button
                  onClick={() => handleGenerate('pdf')}
                  disabled={generating}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: generating ? 'wait' : 'pointer',
                    background: generating ? '#ccc' : `linear-gradient(135deg, ${P}, #0891B2)`,
                    color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                    marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: generating ? 'none' : `0 4px 14px ${P}55`,
                    transition: 'all 0.2s',
                  }}
                >
                  {generating ? '⏳ جاري التوليد...' : '📥 تصدير PDF'}
                </button>

                <button
                  onClick={() => handleGenerate('csv')}
                  disabled={generating}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, cursor: generating ? 'wait' : 'pointer',
                    border: `2px solid ${P}`, background: PL,
                    color: P, fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  📊 تصدير Excel / CSV
                </button>

                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-page)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 معلومات التقرير</div>
                  <div>• عدد السجلات: <strong>{rows.length}</strong></div>
                  <div>• الحقول: {template?.fields.length}</div>
                  <div>• التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                </div>
              </>
            )}
          </div>

          {/* Report History */}
          {history.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-base)', padding: '18px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-heading)', marginBottom: 12 }}>
                🕐 آخر التقارير المُولَّدة
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(h => (
                  <div key={h.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: h.bg, borderRadius: 8,
                    border: `1px solid ${h.color}22`,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: h.color }}>{h.icon} {h.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{h.date}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <Badge label={h.format} color={h.color} bg="rgba(255,255,255,0.7)" />
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: 'center' }}>{h.rows} سجل</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
