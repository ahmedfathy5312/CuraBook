/**
 * AssistantReportsPage.jsx — Sprint 3
 * Reports Export: PDF and Excel for appointments, schedules, analytics.
 * PDF: browser print API (no extra library).
 * Excel: CSV download (no dependency needed, xlsx library optional).
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

const P = 'var(--primary)';

// ── CSV/Excel export ──────────────────────────────────────────────────────────
function exportCSV(rows, headers, filename) {
  const bom = '\uFEFF'; // UTF-8 BOM for Arabic in Excel
  const csvContent = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── PDF print ────────────────────────────────────────────────────────────────
function printReport(title, tableHTML) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  body { font-family: 'Cairo', Arial, sans-serif; padding: 32px; direction: rtl; }
  h1 { font-size: 22px; color: #0e7490; margin-bottom: 8px; }
  .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0e7490; color: #fff; padding: 10px 14px; text-align: right; }
  td { padding: 9px 14px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f0f9ff; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#0e7490;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:Cairo,sans-serif;font-size:13px;">طباعة / حفظ PDF</button>
<h1>${title}</h1>
<div class="meta">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' })}</div>
${tableHTML}
</body></html>`);
  win.document.close();
}

// Status labels
const STATUS_LABELS = { pending:'قيد الانتظار', confirmed:'مؤكد', cancelled:'ملغى', rejected:'مرفوض', rescheduled:'معاد جدولة', completed:'منتهي', no_show:'لم يحضر' };
const STATUS_COLORS = { pending:'#fef3c7,#d97706', confirmed:'#dcfce7,#16a34a', cancelled:'#fee2e2,#dc2626', rejected:'#fee2e2,#dc2626', completed:'#e0f2fe,#0369a1', no_show:'#f3f4f6,#6b7280', rescheduled:'#faf5ff,#7c3aed' };

function statusBadgeHTML(status) {
  const [bg,color] = (STATUS_COLORS[status]||'#f3f4f6,#6b7280').split(',');
  return `<span class="badge" style="background:${bg};color:${color}">${STATUS_LABELS[status]||status}</span>`;
}

// ── Period selector ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7d',  label: 'آخر 7 أيام',   days: 7   },
  { key: '30d', label: 'آخر 30 يوم',   days: 30  },
  { key: '90d', label: 'آخر 3 أشهر',   days: 90  },
  { key: '365d',label: 'آخر سنة',      days: 365 },
];

export default function AssistantReportsPage() {
  const [period, setPeriod] = useState('30d');
  const [generating, setGenerating] = useState(null);

  const periodDays = PERIODS.find(p => p.key === period)?.days || 30;
  const fromDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - periodDays);
    return d.toISOString().slice(0,10);
  }, [periodDays]);

  // MED-01 FIX: Load saved reports from backend/reports/ app
  const { data: savedReportsData } = useQuery({
    queryKey: ['assistant', 'reports', 'saved'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(API.REPORTS.LIST);
        return data;
      } catch {
        return null; // graceful fallback — reports app may have no records yet
      }
    },
    staleTime: 10 * 60_000,
  });

  const savedReports = useMemo(() => {
    const raw = savedReportsData?.results || savedReportsData || [];
    return Array.isArray(raw) ? raw : [];
  }, [savedReportsData]);

  // Load appointments for local export (reduced page size for performance)
  const { data: apptData, isLoading } = useQuery({
    queryKey: ['assistant', 'reports', 'appointments', period],
    queryFn: async () => {
      const { data } = await apiClient.get(API.ASSISTANT.APPOINTMENTS, { params: { page_size: 200, date_after: fromDate } });
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const appointments = useMemo(() => apptData?.results || apptData || [], [apptData]);

  // ── Report definitions ──────────────────────────────────────────────────────
  const REPORTS = [
    {
      id: 'appointments',
      icon: '📋',
      title: 'تقرير المواعيد',
      desc: 'قائمة كاملة بجميع المواعيد مع الحالة والمريض والدكتور',
      count: appointments.length,
      color: '#eff6ff',
      border: '#bfdbfe',
      exportCSV: () => {
        const headers = ['رقم الموعد','تاريخ الموعد','وقت البداية','اسم المريض','اسم الدكتور','الحالة','مكان العمل'];
        const rows = appointments.map(a => ({
          'رقم الموعد': a.id,
          'تاريخ الموعد': a.date || '',
          'وقت البداية': a.start_time?.slice(0,5) || '',
          'اسم المريض': a.patient_name || `مريض ${a.patient}`,
          'اسم الدكتور': a.doctor_name || `دكتور ${a.doctor}`,
          'الحالة': STATUS_LABELS[a.status] || a.status,
          'مكان العمل': a.workplace_name || '',
        }));
        exportCSV(rows, headers, `تقرير_المواعيد_${period}.csv`);
      },
      exportPDF: () => {
        const rows = appointments.slice(0, 200);
        const tableHTML = `<table>
          <thead><tr><th>#</th><th>التاريخ</th><th>الوقت</th><th>المريض</th><th>الدكتور</th><th>الحالة</th></tr></thead>
          <tbody>${rows.map(a=>`<tr>
            <td>${a.id}</td><td>${a.date||''}</td><td>${a.start_time?.slice(0,5)||''}</td>
            <td>${a.patient_name||`مريض ${a.patient}`}</td>
            <td>${a.doctor_name||`دكتور ${a.doctor}`}</td>
            <td>${statusBadgeHTML(a.status)}</td>
          </tr>`).join('')}</tbody>
        </table>${rows.length<appointments.length?`<p style="color:#64748b;font-size:12px;margin-top:12px">* يُعرض أول 200 سجل من ${appointments.length}</p>`:''}`;
        printReport('تقرير المواعيد', tableHTML);
      },
    },
    {
      id: 'summary',
      icon: '📊',
      title: 'ملخص إحصائي',
      desc: 'إجمالي المواعيد مقسّمة حسب الحالة مع نسب مئوية',
      count: Object.keys(STATUS_LABELS).length + ' حالات',
      color: '#f0fdf4',
      border: '#bbf7d0',
      exportCSV: () => {
        const summary = {};
        appointments.forEach(a => { summary[a.status] = (summary[a.status]||0) + 1; });
        const total = appointments.length || 1;
        const headers = ['الحالة','العدد','النسبة المئوية'];
        const rows = Object.entries(summary).map(([s,count]) => ({
          'الحالة': STATUS_LABELS[s]||s,
          'العدد': count,
          'النسبة المئوية': `${((count/total)*100).toFixed(1)}%`,
        }));
        rows.push({'الحالة':'الإجمالي','العدد':total,'النسبة المئوية':'100%'});
        exportCSV(rows, headers, `ملخص_احصائي_${period}.csv`);
      },
      exportPDF: () => {
        const summary = {};
        appointments.forEach(a => { summary[a.status] = (summary[a.status]||0) + 1; });
        const total = appointments.length || 1;
        const tableHTML = `<table>
          <thead><tr><th>الحالة</th><th>العدد</th><th>النسبة</th></tr></thead>
          <tbody>
          ${Object.entries(summary).map(([s,count])=>`<tr><td>${statusBadgeHTML(s)}</td><td>${count}</td><td>${((count/total)*100).toFixed(1)}%</td></tr>`).join('')}
          <tr style="font-weight:700;background:#f0f9ff"><td>الإجمالي</td><td>${total}</td><td>100%</td></tr>
          </tbody></table>`;
        printReport('الملخص الإحصائي', tableHTML);
      },
    },
    {
      id: 'daily',
      icon: '📅',
      title: 'تقرير يومي',
      desc: 'عدد المواعيد لكل يوم خلال الفترة المحددة',
      count: `${periodDays} يوم`,
      color: '#faf5ff',
      border: '#e9d5ff',
      exportCSV: () => {
        const byDate = {};
        appointments.forEach(a => { if(a.date){ byDate[a.date]=(byDate[a.date]||0)+1; } });
        const sorted = Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b));
        const headers = ['التاريخ','عدد المواعيد'];
        const rows = sorted.map(([date,count])=>({'التاريخ':date,'عدد المواعيد':count}));
        exportCSV(rows, headers, `تقرير_يومي_${period}.csv`);
      },
      exportPDF: () => {
        const byDate = {};
        appointments.forEach(a => { if(a.date){ byDate[a.date]=(byDate[a.date]||0)+1; } });
        const sorted = Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b));
        const tableHTML = `<table>
          <thead><tr><th>التاريخ</th><th>عدد المواعيد</th></tr></thead>
          <tbody>${sorted.map(([date,count])=>`<tr><td>${date}</td><td>${count}</td></tr>`).join('')}</tbody>
        </table>`;
        printReport('التقرير اليومي', tableHTML);
      },
    },
    {
      id: 'patients',
      icon: '👥',
      title: 'تقرير المرضى',
      desc: 'قائمة المرضى الفريدين مع عدد مواعيدهم',
      count: useMemo(()=>{const s=new Set(appointments.map(a=>a.patient));return s.size;},[appointments]),
      color: '#fff7ed',
      border: '#fed7aa',
      exportCSV: function() {
        const map = {};
        appointments.forEach(a => {
          const pid = a.patient;
          if (!map[pid]) map[pid] = { name: a.patient_name||`مريض ${pid}`, phone: a.patient_phone||'', count: 0 };
          map[pid].count++;
        });
        const headers = ['اسم المريض','رقم الهاتف','عدد المواعيد'];
        const rows = Object.values(map).sort((a,b)=>b.count-a.count).map(p=>({'اسم المريض':p.name,'رقم الهاتف':p.phone,'عدد المواعيد':p.count}));
        exportCSV(rows, headers, `تقرير_المرضى_${period}.csv`);
      },
      exportPDF: function() {
        const map = {};
        appointments.forEach(a => {
          const pid = a.patient;
          if (!map[pid]) map[pid] = { name: a.patient_name||`مريض ${pid}`, count: 0 };
          map[pid].count++;
        });
        const sorted = Object.values(map).sort((a,b)=>b.count-a.count).slice(0,100);
        const tableHTML = `<table>
          <thead><tr><th>اسم المريض</th><th>عدد المواعيد</th></tr></thead>
          <tbody>${sorted.map(p=>`<tr><td>${p.name}</td><td>${p.count}</td></tr>`).join('')}</tbody>
        </table>`;
        printReport('تقرير المرضى', tableHTML);
      },
    },
  ];

  const handleExport = async (report, format) => {
    setGenerating(`${report.id}-${format}`);
    await new Promise(r => setTimeout(r, 200));
    try {
      if (format === 'csv') report.exportCSV();
      else report.exportPDF();
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: 'Cairo,sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 6px' }}>📄 تصدير التقارير</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>قم بتصدير بيانات المواعيد كـ PDF أو Excel</p>
      </div>

      {/* Period selector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 28 }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>الفترة الزمنية</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding: '8px 18px', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: period === p.key ? P : 'var(--border-base)', color: period === p.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s', fontFamily: 'Cairo,sans-serif' }}>
              {p.label}
            </button>
          ))}
        </div>
        {!isLoading && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-hint)' }}>
            تم تحميل {appointments.length} موعد للفترة المحددة
          </p>
        )}
        {isLoading && <p style={{ margin: '10px 0 0', fontSize: 12, color: P }}>⏳ جارٍ تحميل البيانات...</p>}
      </div>

      {/* Report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px,1fr))', gap: 16 }}>
        {REPORTS.map(report => (
          <div key={report.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ background: report.color, borderBottom: `1px solid ${report.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{report.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-h)' }}>{report.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{typeof report.count === 'number' ? `${report.count} سجل` : report.count}</div>
              </div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>{report.desc}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleExport(report, 'csv')}
                  disabled={isLoading || generating !== null}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)', border: '1.5px solid #16a34a', background: generating===`${report.id}-csv` ? '#f0fdf4' : '#fff', color: '#16a34a', cursor: isLoading||generating?'default':'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Cairo,sans-serif', transition: 'all 0.15s' }}>
                  {generating===`${report.id}-csv` ? '⏳...' : '📥 Excel / CSV'}
                </button>
                <button
                  onClick={() => handleExport(report, 'pdf')}
                  disabled={isLoading || generating !== null}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)', border: 'none', background: generating===`${report.id}-pdf` ? '#0891b2' : P, color: '#fff', cursor: isLoading||generating?'default':'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Cairo,sans-serif', transition: 'all 0.15s' }}>
                  {generating===`${report.id}-pdf` ? '⏳...' : '🖨️ PDF / طباعة'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{ marginTop: 24, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
          <strong>ملاحظات:</strong>
          <ul style={{ margin: '6px 0 0 0', paddingRight: 20 }}>
            <li>ملف CSV يفتح مباشرة في Excel مع دعم كامل للغة العربية</li>
            <li>عند الضغط على "PDF / طباعة" ستظهر نافذة طباعة المتصفح — اختر "حفظ كـ PDF"</li>
            <li>البيانات المعروضة محدّثة حتى وقت فتح الصفحة</li>
          </ul>
        </div>
      </div>

      {/* MED-01 FIX: Saved Reports from backend/reports/ app */}
      {savedReports.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 16px' }}>
            🗂️ التقارير المحفوظة
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {savedReports.map(report => (
              <div key={report.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-base)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{report.icon || '📊'}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>{report.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {report.type} · {report.date}
                      {report.size ? ` · ${report.size}` : ''}
                    </div>
                  </div>
                </div>
                {report.file && (
                  <a
                    href={report.file}
                    download
                    style={{
                      padding: '8px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: P,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                      fontFamily: 'Cairo,sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📥 تحميل
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
