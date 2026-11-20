import { formatNumberLocale } from '../../utils/formatters';
/**
 * components/shared/DashboardCharts.jsx
 *
 * Production-grade chart components using Recharts.
 *
 * Components exported and their consumers:
 *  - DonutChart              → admin/sections/OverviewSection
 *  - SimpleBarChart          → admin/sections/OverviewSection
 *  - TrendLine               → admin/sections/OverviewSection
 *  - StatCardWithTrend       → doctor-dashboard/pages/DoctorAnalyticsPage
 *  - AppointmentStatusDonut  → hospital/pages/HospitalDashboardPage
 *  - WeeklyAppointmentTrend  → hospital/pages/HospitalDashboardPage
 *  - DoctorSpecialtyBar      → hospital/pages/HospitalDashboardPage
 *  - HospitalKpiCards        → hospital/pages/HospitalDashboardPage
 */

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

// ── Enhancement #16 FIX: i18n helpers for chart labels ───────────────────────
// Translates status keys used in charts to Arabic or English
function translateStatus(key, isAr) {
  const map = {
    pending:   { ar: 'قيد الانتظار', en: 'Pending'   },
    confirmed: { ar: 'مؤكد',         en: 'Confirmed' },
    completed: { ar: 'مكتمل',        en: 'Completed' },
    cancelled: { ar: 'ملغي',         en: 'Cancelled' },
    rejected:  { ar: 'مرفوض',        en: 'Rejected'  },
    no_show:   { ar: 'لم يحضر',      en: 'No Show'   },
    scheduled: { ar: 'مجدول',        en: 'Scheduled' },
    approved:  { ar: 'موافق عليه',   en: 'Approved'  },
  };
  const entry = map[key?.toLowerCase?.()];
  if (entry) return isAr ? entry.ar : entry.en;
  // fallback: capitalize first letter
  return key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : key;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
const EMPTY_COLOR = 'var(--border)';

function EmptyBox({ size, message = 'No data yet', icon = '📊' }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: size || 160 }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-hint)', fontWeight: 500, marginTop: 6 }}>{message}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)',
      padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-sm)',
    }}>
      {label && <div style={{ fontWeight: 600, color: 'var(--text-body)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block', flexShrink: 0 }} />
          <span>{p.name}: <strong style={{ color: 'var(--text-h)' }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
export function DonutChart({ data = [], size = 200, title, isRTL = false }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const isEmpty = !data.length || total === 0;

  const pieData = isEmpty
    ? [{ name: isRTL ? 'لا توجد بيانات' : 'No data', value: 1, color: EMPTY_COLOR }]
    : data.map(d => ({ name: d.label, value: d.value, color: d.color || 'var(--primary)' }));

  return (
    <div style={{ textAlign: 'center' }}>
      {title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 8 }}>{title}</div>}
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={size}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.28}
              outerRadius={size * 0.42}
              paddingAngle={isEmpty ? 0 : 2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            {!isEmpty && <ReTooltip content={<ChartTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
        {!isEmpty && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)', fontWeight: 500 }}>{isRTL ? 'الإجمالي' : 'Total'}</div>
          </div>
        )}
      </div>
      {isEmpty && <EmptyBox size={80} />}
      {!isEmpty && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-body)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color || 'var(--primary)', flexShrink: 0 }} />
              <span>{d.label}</span>
              <span style={{ fontWeight: 700, color: d.color || 'var(--primary)' }}>({d.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
export function SimpleBarChart({ data = [], title, height = 220, isRTL = false }) {
  const isEmpty = !data.length || data.every(d => !d.value);
  const chartData = data.map(d => ({ name: d.label, value: d.value || 0, color: d.color || 'var(--primary)' }));

  return (
    <div>
      {title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 12 }}>{title}</div>}
      {isEmpty ? (
        <EmptyBox size={height} message={isRTL ? 'لا توجد بيانات بعد' : 'No data available yet'} icon="📈" />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-base)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-hint)' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-page)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── TrendLine Sparkline ──────────────────────────────────────────────────────
export function TrendLine({ data = [], width = 120, height = 40, color = 'var(--primary)' }) {
  if (data.length < 2) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `sparkGrad${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Stat Card with Trend ─────────────────────────────────────────────────────
export function StatCardWithTrend({ label, value, trend = [], icon, color = 'var(--primary)', loading, lang }) {
  const isUp = trend.length >= 2 && trend[trend.length - 1] > trend[trend.length - 2];
  const diff = trend.length >= 2 ? Math.abs(trend[trend.length - 1] - trend[trend.length - 2]) : 0;

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ height: 14, background: 'var(--border-base)', borderRadius: 'var(--radius-xs)', marginBottom: 8, width: '60%' }} />
        <div style={{ height: 28, background: 'var(--border-base)', borderRadius: 'var(--radius-xs)', width: '40%' }} />
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 20,
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>{(lang && typeof value === 'number') ? formatNumberLocale(value, lang) : (value ?? '—')}</div>
        {trend.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: isUp ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {isUp ? '↑' : '↓'} {diff}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>vs last week</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>{icon}</div>
        {trend.length >= 2 && <TrendLine data={trend} color={color} />}
      </div>
    </div>
  );
}

export default { DonutChart, SimpleBarChart, TrendLine, StatCardWithTrend };

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT FIX #7: Moved from features/hospital/components/DashboardCharts.jsx
// These composed charts are used across multiple features (doctor + hospital)
// and belong at the shared level.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  confirmed:  'var(--success)',
  approved:   'var(--success)',
  pending:    'var(--warning)',
  cancelled:  'var(--text-muted)',
  rejected:   'var(--danger)',
  completed:  'var(--primary)',
  no_show:    'var(--accent)',
  scheduled:  'var(--primary)',
};

/**
 * AppointmentStatusDonut
 * Donut chart of appointment status distribution.
 * Used by: DoctorDashboardPage, HospitalDashboard
 *
 * Props:
 *   appointments   — raw appointment array (used when analyticsData is null)
 *   analyticsData  — pre-built [{label, value, color}] from /hospital/analytics/
 *                    endpoint (covers ALL appointments, not just the current page).
 *                    When provided, takes priority over deriving counts locally.
 *   size           — donut diameter (default 180)
 */
export function AppointmentStatusDonut({ appointments = [], analyticsData = null, size = 180, lang = 'en' }) {
  const isAr = lang === 'ar';
  // F-13 FIX: prefer data from the dedicated analytics endpoint when available —
  // it covers all appointments across all pages, giving accurate totals.
  // Enhancement #16 FIX: translate status labels using lang prop
  const data = analyticsData
    ? analyticsData.map(d => ({ ...d, label: translateStatus(d.label?.toLowerCase?.().replace(/ /g,'_'), isAr) || d.label }))
    : (() => {
      const counts = appointments.reduce((acc, a) => {
        if (!a) return acc;
        const s = (a.status || '').toLowerCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          label: translateStatus(key, isAr),
          value,
          color: STATUS_COLORS[key] || 'var(--text-muted)',
        }));
    })();

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '20px' }}>
        {isAr ? 'حالات المواعيد' : 'Appointment Status'}
      </h3>
      {data.length === 0 ? (
        <p style={{ color: 'var(--text-hint)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <DonutChart data={data} size={size} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {data.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-body)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                {d.label} ({d.value})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WeeklyAppointmentTrend
 * 7-day appointment count sparkline.
 * Used by: DoctorDashboardPage, HospitalDashboard
 */
export function WeeklyAppointmentTrend({ appointments = [], lang = 'en' }) {
  const isAr = lang === 'ar';
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const counts = days.map(day =>
    appointments.filter(a => {
      if (!a) return false;
      const aDate = (a.created_at || a.date || '').slice(0, 10);
      return aDate === day;
    }).length,
  );

  const locale = isAr ? 'ar-EG' : 'en-GB';
  const dayLabels = days.map(d => {
    const dt = new Date(d);
    return dt.toLocaleDateString(locale, { weekday: 'short' });
  });

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '4px' }}>
        {isAr ? 'اتجاه الحجوزات (7 أيام)' : '7-Day Booking Trend'}
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginBottom: '20px' }}>
        {isAr ? 'المواعيد المحجوزة في آخر 7 أيام' : 'Appointments booked in the last 7 days'}
      </p>
      <TrendLine data={counts} width={260} height={60} color='var(--primary)' />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        {dayLabels.map((label, i) => (
          <span key={i} style={{ fontSize: '10px', color: 'var(--text-hint)', width: '30px', textAlign: 'center' }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// AUDIT FIX ISSUE #7 (FINAL): Hospital-specific charts merged from
// features/hospital/components/DashboardCharts.jsx into shared level.
// All charts now live in one file — no more cross-feature imports.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DoctorSpecialtyBar — Horizontal bar chart for doctor specialty distribution.
 * Previously in features/hospital/components/DashboardCharts.jsx
 */
export function DoctorSpecialtyBar({ doctors = [], lang = 'en' }) {
  const isAr = lang === 'ar';
  const groups = doctors.reduce((acc, d) => {
    const s = d.specialty || d.doctor_specialty || (isAr ? 'أخرى' : 'Other');
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', marginBottom: '20px' }}>
        {isAr ? 'تخصصات الأطباء' : 'Doctor Specialties'}
      </h3>
      {data.length === 0 ? (
        <p style={{ color: 'var(--text-hint)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
      ) : (
        <SimpleBarChart data={data} height={220} />
      )}
    </div>
  );
}

/**
 * HospitalKpiCards — 4-card KPI grid for hospital overview.
 * Previously in features/hospital/components/DashboardCharts.jsx
 */
export function HospitalKpiCards({ stats = {}, appointments = [], loading = false, lang }) {
  const isAr = lang === 'ar';

  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  }).map(day =>
    appointments.filter(a => (a.created_at || a.date || '').slice(0, 10) === day).length,
  );

  const cards = [
    { label: isAr ? 'إجمالي الأطباء'     : 'Total Doctors',        value: stats.total_doctors,        icon: '👨‍⚕️', color: 'var(--primary)', trend: [] },
    { label: isAr ? 'إجمالي المرضى'      : 'Total Patients',       value: stats.total_patients,       icon: '👥',   color: 'var(--primary)', trend: [] },
    { label: isAr ? 'إجمالي المواعيد'    : 'Total Appointments',   value: stats.total_appointments,   icon: '📅',   color: 'var(--success)', trend: days7 },
    { label: isAr ? 'مواعيد معلقة'       : 'Pending Appointments', value: stats.pending_appointments, icon: '⏳',   color: 'var(--warning)', trend: [] },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
      {cards.map(c => (
        <StatCardWithTrend
          key={c.label}
          label={c.label}
          value={c.value}
          icon={c.icon}
          color={c.color}
          trend={c.trend}
          loading={loading}
        
              lang={lang}
            />
      ))}
    </div>
  );
}
