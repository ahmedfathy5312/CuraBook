/**
 * AssistantAnalyticsPage.jsx — Analytics Dashboard
 * Stats computed from assistant's appointments.
 * All data read-only — no financial / medical data.
 *
 * Sections:
 *  1. Filter bar (period + workplace)
 *  2. KPI row (total, confirmed rate, avg response, no-shows)
 *  3. Appointments over time — simple bar chart (SVG)
 *  4. Status distribution — donut chart (SVG)
 *  5. Busiest hours — horizontal bar chart (SVG)
 *  6. Busiest days — heat indicators
 */
import React, { useState, useMemo } from 'react';

import useTranslation from '../../../i18n/useTranslation';
import apiClient     from '../../../services/apiClient';
import { API }       from '../../../constants/apiRoutes';
import { tokens }    from '../../../theme/tokens';

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  primary:  tokens?.colors?.primary?.DEFAULT  || '#0E7490',
  primaryL: 'rgba(14, 116, 144, 0.14)',
  success:  tokens?.colors?.success?.DEFAULT  || '#31A870',
  warning:  tokens?.colors?.warning?.DEFAULT  || '#F59E0B',
  danger:   tokens?.colors?.danger?.DEFAULT   || '#E97D61',
  accent:   tokens?.colors?.accent?.DEFAULT   || '#8B5CF6',
  info:     tokens?.colors?.info?.DEFAULT     || '#3B82F6',
  border:   'var(--border-base, #E5E7EB)',
  strong:   'var(--border-strong, #D1D5DB)',
  muted:    'var(--text-muted, #6B7280)',
  hint:     'var(--text-hint, #9CA3AF)',
  light:    'var(--bg-subtle, #F3F4F6)',
  text:     'var(--text-h, #1F2937)',
  body:     'var(--text-body, #374151)',
  card:     'var(--bg-card, #fff)',
};

const STATUS_COLOR = {
  confirmed: C.success, pending: C.warning, cancelled: C.danger,
  completed: C.info, rejected: C.danger,
  reschedule_requested: C.accent, no_show: '#9CA3AF',
};

const getStatusLabel = (status, t) => {
  const keys = {
    confirmed: 'appointments.status.confirmed', pending: 'appointments.status.pending', cancelled: 'appointments.status.cancelled',
    completed: 'appointments.status.completed', rejected: 'appointments.status.rejected',
    reschedule_requested: 'appointments.status.reschedule_requested', no_show: 'appointments.status.no_show',
  };
  return keys[status] ? t(keys[status]) : status;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoDate(d) { return d.toISOString().split('T')[0]; }

function getPeriodDates(period) {
  const now   = new Date();
  const start = new Date(now);
  const span = period === '7d' ? 6 : period === '90d' ? 89 : 29;
  start.setDate(now.getDate() - span);
  return { start: isoDate(start), end: isoDate(now) };
}

function dayRange(startStr, endStr) {
  const days = [];
  const d    = new Date(startStr);
  const end  = new Date(endStr);
  while (d <= end) {
    days.push(isoDate(new Date(d)));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getAppointmentDate(appt) {
  return String(
    appt?.date ||
    appt?.appointment_date ||
    appt?.slot_date ||
    appt?.appointmentDate ||
    appt?.scheduled_date ||
    appt?.slot?.date ||
    ''
  ).slice(0, 10);
}

function getAppointmentTime(appt) {
  return String(
    appt?.time_slot ||
    appt?.start_time ||
    appt?.slot_time ||
    appt?.appointment_time ||
    appt?.time ||
    appt?.slot?.time ||
    ''
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${C.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      borderTop: `3px solid ${color || C.primary}`,
      boxShadow: tokens.shadows?.sm || '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: color || C.primary }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted }}>{sub}</p>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${C.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      boxShadow: tokens.shadows?.sm || '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: C.text }}>{title}</p>
      {children}
    </div>
  );
}

// ── Simple SVG bar chart ──────────────────────────────────────────────────────
function BarChart({ data, color = C.primary }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 500, H = 130, barW = Math.min(36, (W - 40) / data.length - 6);
  const xStep = (W - 40) / data.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H + 30}`} width="100%" style={{ display: 'block', minWidth: 280 }}>
        {data.map((d, i) => {
          const barH = Math.max(4, (d.value / maxVal) * H);
          const x    = 20 + i * xStep + (xStep - barW) / 2;
          const y    = H - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH}
                fill={color} rx={4} opacity={0.85} />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                  fontSize={9} fill={C.muted}>
                  {d.value}
                </text>
              )}
              <text x={x + barW / 2} y={H + 16} textAnchor="middle"
                fontSize={9} fill={C.muted}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({ data, t }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 55, CX = 80, CY = 80, thick = 22;
  let angle = -Math.PI / 2;

  const slices = data.map(d => {
    const ratio   = d.value / total;
    const sweep   = ratio * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, x1, y1, x2, y2, large, sweep };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" width={160} height={160} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => {
          if (s.sweep < 0.01) return null;
          return (
            <path
              key={i}
              d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
              fill={s.color} opacity={0.9}
            />
          );
        })}
        {/* inner circle (donut hole) */}
        <circle cx={CX} cy={CY} r={R - thick} fill="var(--bg-card)" />
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={20} fontWeight="800" fill={C.text}>
          {total}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize={9} fill={C.muted}>
          {t('assistantAnalytics.total')}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 120 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>
              {d.value} ({total > 0 ? Math.round(d.value / total * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.text }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {value}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: C.light, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 4,
          background: color, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const getPeriods = (t) => [
  { key: '7d',  label: t('assistantAnalytics.periods.7d') },
  { key: '30d', label: t('assistantAnalytics.periods.30d') },
  { key: '90d', label: t('assistantAnalytics.periods.90d') },
];

const getShortDays = (t) => [
  t('assistantAnalytics.days.sun'), t('assistantAnalytics.days.mon'), t('assistantAnalytics.days.tue'), t('assistantAnalytics.days.wed'), t('assistantAnalytics.days.thu'), t('assistantAnalytics.days.fri'), t('assistantAnalytics.days.sat')
];

export default function AssistantAnalyticsPage() {
  const { t, language } = useTranslation();
  const [period, setPeriod]  = useState('30d');
  const [exportLoading, setExportLoading] = useState(null);

  const [apptData, setApptData] = useState([]);
  const [serverStats, setServerStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [analyticsResult, appointmentsResult] = await Promise.allSettled([
          apiClient.get(API.ASSISTANT.ANALYTICS),
          apiClient.get(API.ASSISTANT.APPOINTMENTS, {
            params: { page_size: 500 },
          }),
        ]);

        if (!isMounted) return;

        if (analyticsResult.status === 'fulfilled') {
          setServerStats(analyticsResult.value.data);
        } else {
          setServerStats(null);
          console.warn('Assistant analytics endpoint unavailable:', analyticsResult.reason);
        }

        if (appointmentsResult.status === 'fulfilled') {
          const data = appointmentsResult.value.data;
          setApptData(data?.results || data || []);
          setAppointmentsLoaded(true);
        } else {
          setApptData([]);
          setAppointmentsLoaded(false);
          console.warn('Assistant appointments analytics sample unavailable:', appointmentsResult.reason);
        }
      } catch (error) {
        console.error('Failed to fetch assistant analytics data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, [period]);

  const appts = Array.isArray(apptData) ? apptData : [];

  // filter by period
  const { start, end } = getPeriodDates(period);
  const filtered = useMemo(() => {
    return appts.filter(a => {
      const d = getAppointmentDate(a);
      return d >= start && d <= end;
    });
  }, [appts, start, end]);

  // ── KPIs — prefer server stats, fall back to client computation ───────────
  const kpis = useMemo(() => {
    if (appointmentsLoaded) {
      const total     = filtered.length;
      const confirmed = filtered.filter(a => ['confirmed','completed'].includes(a.status?.toLowerCase())).length;
      const noShows   = filtered.filter(a => a.status?.toLowerCase() === 'no_show').length;
      const pending   = filtered.filter(a => a.status?.toLowerCase() === 'pending').length;
      const confirmRate = total > 0 ? Math.round(confirmed / total * 100) : 0;
      const noShowRate  = total > 0 ? Math.round(noShows  / total * 100) : 0;
      return { total, confirmed, noShows, pending, confirmRate, noShowRate };
    }
    // If we got server-side analytics data, use it directly (BUG-04 FIX)
    if (serverStats) {
      const total     = serverStats.appointments_total     ?? 0;
      const confirmed = serverStats.appointments_confirmed ?? 0;
      const pending   = serverStats.appointments_pending   ?? 0;
      const noShows   = serverStats.no_shows               ?? 0;
      const confirmRate = total > 0 ? Math.round(confirmed / total * 100) : 0;
      const noShowRate  = total > 0 ? Math.round(noShows  / total * 100) : 0;
      return { total, confirmed, noShows, pending, confirmRate, noShowRate };
    }
    // Fallback: compute from local appointments list
    const total     = filtered.length;
    const confirmed = filtered.filter(a => ['confirmed','completed'].includes(a.status?.toLowerCase())).length;
    const noShows   = filtered.filter(a => a.status?.toLowerCase() === 'no_show').length;
    const pending   = filtered.filter(a => a.status?.toLowerCase() === 'pending').length;
    const confirmRate = total > 0 ? Math.round(confirmed / total * 100) : 0;
    const noShowRate  = total > 0 ? Math.round(noShows  / total * 100) : 0;
    return { total, confirmed, noShows, pending, confirmRate, noShowRate };
  }, [appointmentsLoaded, serverStats, filtered]);

  // ── Appointments over time ────────────────────────────────────────────────
  const timeData = useMemo(() => {
    const days = dayRange(start, end);
    const map  = Object.fromEntries(days.map(d => [d, 0]));
    filtered.forEach(a => {
      const d = getAppointmentDate(a);
      if (map[d] !== undefined) map[d]++;
    });
    // collapse to at most 14 labels for 30d, 12 for 90d
    const entries = Object.entries(map);
    let step = 1;
    if (days.length > 60) step = 7;
    else if (days.length > 14) step = 2;
    return entries
      .filter((_, i) => i % step === 0)
      .map(([date, value]) => ({
        label: date.slice(5), // MM-DD
        value,
      }));
  }, [filtered, start, end]);

  // ── Status distribution ───────────────────────────────────────────────────
  const donutData = useMemo(() => {
    const counts = {};
    filtered.forEach(a => {
      const s = a.status?.toLowerCase() || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      label: getStatusLabel(status, t),
      value,
      color: STATUS_COLOR[status] || C.muted,
    })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ── Busiest hours ─────────────────────────────────────────────────────────
  const hoursData = useMemo(() => {
    const counts = {};
    for (let h = 8; h <= 20; h++) counts[h] = 0;
    filtered.forEach(a => {
      const time = getAppointmentTime(a);
      const h = parseInt(time.slice(0, 2), 10);
      if (!isNaN(h) && h >= 8 && h <= 20) counts[h]++;
    });
    const maxV = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([h, v]) => ({
      label: `${h}:00`,
      value: v,
      max:   maxV,
      color: v === maxV ? C.danger : C.primary,
    }));
  }, [filtered]);

  // ── Busiest days ──────────────────────────────────────────────────────────
  const daysData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    filtered.forEach(a => {
      const d = new Date(getAppointmentDate(a));
      if (!isNaN(d)) counts[d.getDay()]++;
    });
    const maxV = Math.max(...counts, 1);
    const shortDays = getShortDays(t);
    return counts.map((v, i) => ({ label: shortDays[i], value: v, max: maxV, color: C.accent }));
  }, [filtered, t]);

  const hasTimeData = timeData.some(d => d.value > 0);
  const hasStatusData = donutData.some(d => d.value > 0);
  const hasHourData = hoursData.some(d => d.value > 0);
  const hasDayData = daysData.some(d => d.value > 0);

  // ── Export functions ──────────────────────────────────────────────────────
  const handleExport = async (type) => {
    setExportLoading(type);
    try {
      const periodLabel = getPeriods(t).find(p => p.key === period)?.label || period;

      if (type === 'csv') {
        const rows = [
          ['نوع البيانات', 'القيمة'],
          ['إجمالي المواعيد', kpis.total],
          ['المواعيد المؤكدة', kpis.confirmed],
          ['نسبة التأكيد', `${kpis.confirmRate}%`],
          ['قيد المراجعة', kpis.pending],
          ['حالات الغياب', kpis.noShows],
          ['نسبة الغياب', `${kpis.noShowRate}%`],
          ['الفترة الزمنية', periodLabel],
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `analytics_${period}.csv`; a.click();
        URL.revokeObjectURL(url);
      }

      if (type === 'excel') {
        const rows = [
          ['تقرير التحليلات', '', ''],
          [`الفترة: ${periodLabel}`, '', ''],
          ['', '', ''],
          ['إحصائية', 'القيمة', 'النسبة'],
          ['إجمالي المواعيد', kpis.total, '100%'],
          ['المؤكدة', kpis.confirmed, `${kpis.confirmRate}%`],
          ['قيد المراجعة', kpis.pending, ''],
          ['الغياب', kpis.noShows, `${kpis.noShowRate}%`],
          ['', '', ''],
          ['التوزيع حسب الأيام', '', ''],
          ...daysData.map(d => [d.label, d.value, '']),
        ];
        const tsv = rows.map(r => r.join('\t')).join('\n');
        const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `analytics_${period}.xls`; a.click();
        URL.revokeObjectURL(url);
      }

      if (type === 'pdf') {
        // Build a simple printable HTML page and trigger download via data URI
        const periodLabel = getPeriods(t).find(p => p.key === period)?.label || period;
        const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير التحليلات والأداء</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #1F2937; direction: rtl; }
  h1 { font-size: 22px; color: #0E7490; margin-bottom: 4px; }
  .meta { font-size: 13px; color: #6B7280; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #E0F7FA; color: #0E7490; padding: 10px 14px; font-size: 13px; text-align: right; }
  td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #E5E7EB; }
  .kpi-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-bottom: 24px; }
  .kpi-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
  .kpi-value { font-size: 28px; font-weight: 800; color: #0E7490; }
  .kpi-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
</style>
</head>
<body>
  <h1>📊 تقرير التحليلات والأداء</h1>
  <p class="meta">الفترة: ${periodLabel} &nbsp;|&nbsp; تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-value">${kpis.total}</div><div class="kpi-label">إجمالي المواعيد</div></div>
    <div class="kpi-card"><div class="kpi-value">${kpis.confirmRate}%</div><div class="kpi-label">نسبة التأكيد</div></div>
    <div class="kpi-card"><div class="kpi-value">${kpis.pending}</div><div class="kpi-label">قيد المراجعة</div></div>
    <div class="kpi-card"><div class="kpi-value">${kpis.noShowRate}%</div><div class="kpi-label">نسبة الغياب</div></div>
  </div>
  <table>
    <tr><th>الإحصائية</th><th>القيمة</th><th>النسبة</th></tr>
    <tr><td>إجمالي المواعيد</td><td>${kpis.total}</td><td>100%</td></tr>
    <tr><td>المواعيد المؤكدة</td><td>${kpis.confirmed}</td><td>${kpis.confirmRate}%</td></tr>
    <tr><td>قيد المراجعة</td><td>${kpis.pending}</td><td>-</td></tr>
    <tr><td>حالات الغياب</td><td>${kpis.noShows}</td><td>${kpis.noShowRate}%</td></tr>
  </table>
  <table>
    <tr><th>اليوم</th><th>عدد المواعيد</th></tr>
    ${daysData.map(d => `<tr><td>${d.label}</td><td>${d.value}</td></tr>`).join('')}
  </table>
</body>
</html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `analytics_report_${period}.html`; a.click();
        URL.revokeObjectURL(url);
      }

      if (type === 'print') {
        window.print();
      }
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📊</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{t('assistantAnalytics.title')}</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Period filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {getPeriods(t).map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-pill)',
                  border: `1.5px solid ${period === p.key ? C.primary : C.border}`,
                  background: period === p.key ? C.primary : 'var(--bg-card)',
                  color: period === p.key ? '#fff' : C.muted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={isLoading || exportLoading === 'excel'}
              onClick={() => handleExport('excel')}
              title="تصدير Excel"
              style={{ padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', color: exportLoading==='excel'?C.muted:'var(--success)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportLoading==='excel'?0.6:1 }}>
              {exportLoading==='excel' ? '...' : '📊 Excel'}
            </button>
            <button
              disabled={isLoading || exportLoading === 'csv'}
              onClick={() => handleExport('csv')}
              title="تصدير CSV"
              style={{ padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', color: exportLoading==='csv'?C.muted:'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportLoading==='csv'?0.6:1 }}>
              {exportLoading==='csv' ? '...' : '📄 CSV'}
            </button>
            <button
              disabled={isLoading || exportLoading === 'pdf'}
              onClick={() => handleExport('pdf')}
              title="تحميل PDF"
              style={{ padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', color: exportLoading==='pdf'?C.muted:'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportLoading==='pdf'?0.6:1 }}>
              {exportLoading==='pdf' ? '...' : '📋 PDF'}
            </button>
            <button
              disabled={isLoading || exportLoading === 'print'}
              onClick={() => handleExport('print')}
              title="طباعة التقرير"
              style={{ padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: `1.5px solid ${C.border}`, background: 'var(--bg-card)', color: exportLoading==='print'?C.muted:'#7C3AED', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportLoading==='print'?0.6:1 }}>
              🖨️ طباعة
            </button>
          </div>
        </div>
      </div>

      {/* Permission notice */}
      <div style={{
        background: C.primaryL, border: `1px solid ${C.primary}`,
        borderRadius: 'var(--radius-md)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>ℹ️</span>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--primary-dark, #0C6478)', fontWeight: 600 }}>
          {t('assistantAnalytics.permissionNotice')}
        </p>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `3px solid ${C.border}`, borderTopColor: C.primary,
            animation: 'spin 0.8s linear infinite', margin: '0 auto 14px',
          }} />
          {t('assistantAnalytics.loading')}
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── KPI Row ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
            <KpiCard icon="📅" label={t('assistantAnalytics.totalAppts')} value={kpis.total}       color={C.primary} />
            <KpiCard icon="✅" label={t('assistantAnalytics.confirmRate')}    value={`${kpis.confirmRate}%`} color={C.success}
              sub={t('assistantAnalytics.confirmedSub', { count: kpis.confirmed }).replace('{{count}}', kpis.confirmed)} />
            <KpiCard icon="⏳" label={t('assistantAnalytics.pendingReview')} value={kpis.pending}    color={C.warning} />
            <KpiCard icon="🚫" label={t('assistantAnalytics.noShowRate')}     value={`${kpis.noShowRate}%`}  color={C.danger}
              sub={t('assistantAnalytics.noShowSub', { count: kpis.noShows }).replace('{{count}}', kpis.noShows)} />
          </div>

          {/* ── Charts Row ───────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
            <Card title={`📈 ${t('assistantAnalytics.apptsOverTime')} ${getPeriods(t).find(p => p.key === period)?.label}`}>
              {hasTimeData
                ? <BarChart data={timeData} color={C.primary} />
                : <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '20px 0' }}>{t('assistantAnalytics.noData')}</p>
              }
            </Card>
            <Card title={`🍩 ${t('assistantAnalytics.statusDist')}`}>
              {hasStatusData
                ? <DonutChart data={donutData} t={t} />
                : <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '20px 0' }}>{t('assistantAnalytics.noData')}</p>
              }
            </Card>
          </div>

          {/* ── Hours + Days ─────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
            <Card title={`⏰ ${t('assistantAnalytics.busiestHours')}`}>
              {hasHourData
                ? hoursData.map(h => <HBar key={h.label} label={h.label} value={h.value} max={h.max} color={h.color} />)
                : <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '20px 0' }}>{t('assistantAnalytics.noData')}</p>
              }
            </Card>
            <Card title={`📆 ${t('assistantAnalytics.busiestDays')}`}>
              {hasDayData
                ? daysData.map(d => <HBar key={d.label} label={d.label} value={d.value} max={d.max} color={d.color} />)
                : <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '20px 0' }}>{t('assistantAnalytics.noData')}</p>
              }
            </Card>
          </div>

          {/* ── No data overall notice ───────────────────────────────────────── */}
          {kpis.total === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 24px', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>{t('assistantAnalytics.noAppts')}</p>
              <p style={{ margin: '6px 0 0', fontSize: 12 }}>{t('assistantAnalytics.tryChangePeriod')}</p>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
