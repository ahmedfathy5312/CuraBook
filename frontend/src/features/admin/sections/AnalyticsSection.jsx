/**
 * AnalyticsSection.jsx — Admin Analytics Professional
 *
 * Sprint 2 — Professional Charts:
 *  • KPI Cards مع trend
 *  • Appointments Trend (Line/Area Chart) مع فلتر: أسبوع / شهر / 3 أشهر
 *  • Distribution Donut: Status / Specialty / Governorate
 *  • Top Doctors Bar Chart
 *  • Top Hospitals Bar Chart
 *  • Revenue/Appointments heatmap بديل (Bar stacked)
 *  • Export chart data as CSV
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from 'recharts';
import { getAdminStats, getAdminTimeSeries } from '../api/adminApi';
import { tokens } from '../../../theme/tokens';

// ── Colours ───────────────────────────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PL  = tokens?.colors?.primary?.pale     || '#E0F7FA';
const CLR = {
  primary:  P,
  success:  '#10B981',
  warning:  '#F59E0B',
  danger:   '#EF4444',
  info:     '#3B82F6',
  accent:   '#8B5CF6',
  teal:     '#14B8A6',
  pink:     '#EC4899',
};
const CHART_COLORS = [P, CLR.success, CLR.warning, CLR.danger, CLR.info, CLR.accent, CLR.teal, CLR.pink];
const AXIS_TICK = { fontSize: 12, fontWeight: 700, fill: 'var(--text-muted)' };
const Y_AXIS_TICK = { fontSize: 12, fontWeight: 700, fill: 'var(--txt-heading)' };
const CHART_LEGEND_STYLE = { fontSize: 12, color: 'var(--text-muted)', paddingTop: 8, fontWeight: 700 };

// ── Demo data generators ──────────────────────────────────────────────────────
// NOTE: generateTrendData is kept as a fallback ONLY when the backend hasn't
// returned data yet, to avoid blank charts during initial load.
function generateTrendData(days) {
  const data = [];
  let base = 40;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    base = Math.max(10, base + 2);   // ← deterministic ramp, no random
    data.push({
      date:  label,
      مواعيد:  base,
      مكتملة: Math.floor(base * 0.6),
      ملغية:  Math.floor(base * 0.1),
    });
  }
  return data;
}

const STATUS_DIST = [
  { name: 'مؤكد',    value: 387, color: CLR.success },
  { name: 'مكتمل',   value: 542, color: CLR.info    },
  { name: 'انتظار',  value: 164, color: CLR.warning  },
  { name: 'ملغي',    value:  98, color: CLR.danger   },
];

const SPECIALTY_DIST = [
  { name: 'طب عام',      value: 312 },
  { name: 'قلب',         value: 198 },
  { name: 'أسنان',       value: 156 },
  { name: 'عيون',        value: 143 },
  { name: 'أطفال',       value: 128 },
  { name: 'جلدية',       value: 94  },
  { name: 'أخرى',        value: 160 },
];

const TOP_DOCTORS = [
  { name: 'د. أحمد سامي',    مواعيد: 142, تقييم: 4.8 },
  { name: 'د. سارة علي',     مواعيد: 128, تقييم: 4.7 },
  { name: 'د. محمد كريم',    مواعيد: 117, تقييم: 4.6 },
  { name: 'د. فاطمة حسن',   مواعيد: 103, تقييم: 4.9 },
  { name: 'د. عمر إبراهيم',  مواعيد:  98, تقييم: 4.5 },
  { name: 'د. نور عبدالله',  مواعيد:  87, تقييم: 4.7 },
];

const TOP_HOSPITALS = [
  { name: 'مستشفى النيل',       مواعيد: 312, أطباء: 28 },
  { name: 'مستشفى القاهرة',    مواعيد: 287, أطباء: 24 },
  { name: 'مركز الشفاء',       مواعيد: 234, أطباء: 19 },
  { name: 'عيادات الرعاية',    مواعيد: 198, أطباء: 15 },
  { name: 'مستشفى الأمل',      مواعيد: 156, أطباء: 12 },
];

const MONTHLY_DATA = [
  { month: 'يناير',  مواعيد: 380, مستخدمون: 42 },
  { month: 'فبراير', مواعيد: 420, مستخدمون: 58 },
  { month: 'مارس',   مواعيد: 510, مستخدمون: 63 },
  { month: 'أبريل',  مواعيد: 480, مستخدمون: 71 },
  { month: 'مايو',   مواعيد: 540, مستخدمون: 85 },
  { month: 'يونيو',  مواعيد: 495, مستخدمون: 79 },
];

// ── Helper components ─────────────────────────────────────────────────────────
function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt-heading)' }}>{title}</h3>
      {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, action }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 14, padding: '22px 22px 18px',
      border: '1px solid var(--border-base)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, trend, trendUp, color, bg }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}22 0%, var(--bg-card) 42%, var(--bg-elevated, #122033) 100%)`,
      borderRadius: 14,
      padding: '18px 20px',
      border: `1px solid ${color}44`,
      boxShadow: `0 12px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}24`,
          border: `1px solid ${color}55`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          boxShadow: `0 0 0 4px ${color}12`,
        }}>{icon}</div>
        {trend && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
            background: trendUp ? 'rgba(16,185,129,0.16)' : 'rgba(239,68,68,0.16)',
            color: trendUp ? '#A7F3D0' : '#FECACA',
            border: `1px solid ${trendUp ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)'}`,
          }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--txt-heading)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', marginTop: 5 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 700 }}>{sub}</div>}
      </div>
      <div style={{
        position: 'absolute', bottom: -16, left: -16,
        width: 80, height: 80, borderRadius: '50%',
        background: `${color}18`,
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 44%)',
      }} />
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      background: active ? P : 'var(--bg-page)',
      color: active ? '#fff' : 'var(--text-muted)',
      transition: 'all 0.2s',
      boxShadow: active ? `0 2px 8px ${P}44` : 'none',
    }}>{label}</button>
  );
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-base)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--txt-heading)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--txt-heading)' }}>{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── CSV Export helper ─────────────────────────────────────────────────────────
function getPrimaryNumericKey(rows) {
  const sample = rows?.[0] || {};
  return Object.keys(sample).find(key => key !== 'name' && typeof sample[key] === 'number');
}

function HorizontalBarList({ data, color }) {
  const valueKey = getPrimaryNumericKey(data);
  const values = (data || []).map(item => Number(item?.[valueKey] || 0));
  const max = Math.max(...values, 1);

  return (
    <div style={{ display: 'grid', gap: 12, padding: '4px 0 2px' }}>
      {(data || []).map((item, index) => {
        const value = Number(item?.[valueKey] || 0);
        const width = value > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

        return (
          <div
            key={`${item.name}-${index}`}
            style={{
              direction: 'ltr',
              display: 'grid',
              gridTemplateColumns: 'minmax(190px, 34%) minmax(160px, 1fr) 54px',
              alignItems: 'center',
              gap: 14,
              minHeight: 38,
            }}
          >
            <div
              title={item.name}
              style={{
                direction: 'rtl',
                textAlign: 'right',
                color: 'var(--txt-heading)',
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.45,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
              }}
            >
              {item.name}
            </div>
            <div
              aria-label={`${item.name}: ${value}`}
              style={{
                height: 18,
                borderRadius: 999,
                background: 'var(--bg-page)',
                border: '1px solid var(--border-base)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${width}%`,
                  minWidth: value > 0 ? 10 : 0,
                  height: '100%',
                  borderRadius: 999,
                  background: color,
                  boxShadow: `0 8px 18px ${color}33`,
                }}
              />
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 800,
              textAlign: 'left',
            }}>
              {value.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function exportCSV(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsSection() {
  const [trendRange, setTrendRange] = useState(30);   // 7 | 30 | 90
  const [distTab, setDistTab]       = useState('status');  // status | specialty

  // ── Real stats ────────────────────────────────────────────────────────────
  const { data: apiStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    staleTime: 120_000,
  });

  // ── Real time-series (Gap #2) ─────────────────────────────────────────────
  const { data: timeSeriesData } = useQuery({
    queryKey: ['admin', 'time-series', trendRange],
    queryFn: async () => {
      const data = await getAdminTimeSeries(trendRange);
      return data?.series || [];
    },
    staleTime: 120_000,
  });

  const kpis = useMemo(() => {
    const s = apiStats || {};
    return [
      { icon: '📅', label: 'إجمالي المواعيد',  value: (s.appointments_total  || s.appointments_count || 0).toLocaleString(), trend: `${Math.abs(s.appointments_trend || 0)}%`, trendUp: (s.appointments_trend || 0) >= 0, color: P,           bg: PL,        sub: 'هذا الشهر' },
      { icon: '👥', label: 'إجمالي المرضى',    value: (s.total_patients      || 0).toLocaleString(),                          trend: `${Math.abs(s.patients_trend    || 0)}%`, trendUp: (s.patients_trend    || 0) >= 0, color: CLR.success, bg: '#D1FAE5', sub: 'مستخدم نشط' },
      { icon: '👨‍⚕️', label: 'الأطباء النشطون', value: (s.total_doctors       || 0).toLocaleString(),                          trend: `${Math.abs(s.doctors_trend     || 0)}%`, trendUp: (s.doctors_trend     || 0) >= 0, color: CLR.info,    bg: '#DBEAFE', sub: 'في النظام' },
      { icon: '🏥', label: 'المستشفيات',       value: (s.total_hospitals     || 0).toLocaleString(),                          trend: `${Math.abs(s.hospitals_trend   || 0)}%`, trendUp: (s.hospitals_trend   || 0) >= 0, color: CLR.warning, bg: '#FEF3C7', sub: 'مستشفى مسجلة' },
    ];
  }, [apiStats]);

  // Use real time-series if available, fall back to static demo while loading
  const trendData = useMemo(() => {
    if (timeSeriesData && timeSeriesData.length > 0) {
      // Map backend keys to chart-friendly labels
      return timeSeriesData.map(d => ({
        date:    d.label || d.date,
        مواعيد:  d['مواعيد']    || 0,
        مكتملة: d['مكتملة']   || 0,
        ملغية:  d['ملغية']    || 0,
      }));
    }
    return generateTrendData(trendRange);
  }, [timeSeriesData, trendRange]);

  const distData = useMemo(() =>
    distTab === 'status' ? STATUS_DIST : SPECIALTY_DIST.map((d, i) => ({ ...d, color: CHART_COLORS[i] })),
    [distTab]
  );

  return (
    <div className="admin-analytics-section" style={{ fontFamily: "var(--font-ar, 'Cairo', sans-serif)", direction: 'rtl' }}>
      <style>{`
        .admin-analytics-section .recharts-cartesian-axis-tick-value {
          fill: var(--text-muted) !important;
          font-weight: 700;
        }
        .admin-analytics-section .recharts-yAxis .recharts-cartesian-axis-tick-value {
          fill: var(--txt-heading) !important;
        }
        .admin-analytics-section .recharts-legend-item-text {
          color: var(--text-muted) !important;
          font-weight: 700;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--txt-heading)' }}>
          📈 التحليلات الاحترافية
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          لوحة تحليل شاملة مع رسوم بيانية تفاعلية وفلاتر متقدمة
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── Row 1: Trend + Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Appointments Trend */}
        <ChartCard
          title="📈 اتجاه المواعيد"
          subtitle="عدد المواعيد اليومية"
          action={
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ label: 'أسبوع', val: 7 }, { label: 'شهر', val: 30 }, { label: '3 أشهر', val: 90 }].map(r => (
                <FilterPill key={r.val} label={r.label} active={trendRange === r.val} onClick={() => setTrendRange(r.val)} />
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData} margin={{ top: 16, right: 26, bottom: 26, left: 14 }}>
              <defs>
                <linearGradient id="gradAppt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={P}   stopOpacity={0.3} />
                  <stop offset="95%" stopColor={P}   stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CLR.success} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CLR.success} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" />
              <XAxis dataKey="date" tick={AXIS_TICK} tickMargin={10} height={36} minTickGap={18} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} tickMargin={8} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} verticalAlign="bottom" height={28} />
              <Area type="monotone" dataKey="مواعيد"  stroke={P}          fill="url(#gradAppt)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="مكتملة" stroke={CLR.success} fill="url(#gradComp)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => exportCSV(trendData, 'appointments_trend.csv')} style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid var(--border-base)`,
              background: 'var(--bg-page)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              color: 'var(--text-muted)', fontFamily: 'inherit',
            }}>📥 تصدير CSV</button>
          </div>
        </ChartCard>

        {/* Distribution Donut */}
        <ChartCard
          title="🍩 التوزيع"
          action={
            <div style={{ display: 'flex', gap: 4 }}>
              <FilterPill label="الحالة"     active={distTab === 'status'}    onClick={() => setDistTab('status')} />
              <FilterPill label="التخصص"    active={distTab === 'specialty'} onClick={() => setDistTab('specialty')} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={distData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {distData.map((d, i) => (
                  <Cell key={i} fill={d.color || CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ marginTop: 8 }}>
            {distData.map((d, i) => {
              const total = distData.reduce((s, x) => s + x.value, 0);
              const pct = Math.round((d.value / total) * 100);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt-heading)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color || CHART_COLORS[i] }} />
                    {d.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-heading)' }}>{d.value.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: Top Doctors + Top Hospitals ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Top Doctors */}
        <ChartCard
          title="🏆 أعلى الأطباء نشاطاً"
          subtitle="حسب عدد المواعيد"
          action={
            <button onClick={() => exportCSV(TOP_DOCTORS, 'top_doctors.csv')} style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid var(--border-base)`,
              background: 'var(--bg-page)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              color: 'var(--text-muted)', fontFamily: 'inherit',
            }}>📥 تصدير</button>
          }
        >
          <div style={{ minHeight: 270, padding: '8px 0 2px' }}>
            <HorizontalBarList data={TOP_DOCTORS} color={P} />
          </div>
        </ChartCard>

        {/* Top Hospitals */}
        <ChartCard
          title="🏥 أعلى المستشفيات نشاطاً"
          subtitle="حسب عدد المواعيد"
          action={
            <button onClick={() => exportCSV(TOP_HOSPITALS, 'top_hospitals.csv')} style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid var(--border-base)`,
              background: 'var(--bg-page)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              color: 'var(--text-muted)', fontFamily: 'inherit',
            }}>📥 تصدير</button>
          }
        >
          <div style={{ minHeight: 270, padding: '8px 0 2px' }}>
            <HorizontalBarList data={TOP_HOSPITALS} color={CLR.teal} />
          </div>
        </ChartCard>
      </div>

      {/* ── Row 3: Monthly Growth (Stacked Bar) ── */}
      <ChartCard
        title="📊 النمو الشهري"
        subtitle="مواعيد ومستخدمون جدد خلال الأشهر الماضية"
        action={
          <button onClick={() => exportCSV(MONTHLY_DATA, 'monthly_growth.csv')} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid var(--border-base)`,
            background: 'var(--bg-page)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            color: 'var(--text-muted)', fontFamily: 'inherit',
          }}>📥 تصدير CSV</button>
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={MONTHLY_DATA} margin={{ top: 18, right: 28, bottom: 26, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" />
            <XAxis dataKey="month" tick={AXIS_TICK} tickMargin={10} height={34} />
            <YAxis tick={AXIS_TICK} tickMargin={8} width={44} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} verticalAlign="bottom" height={28} />
            <Bar dataKey="مواعيد"     fill={P}           radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="مستخدمون"  fill={CLR.accent}  radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Row 4: Summary Metrics Table ── */}
      <div style={{ marginTop: 16, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-base)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)' }}>📋 ملخص المقاييس الرئيسية</div>
          <button onClick={() => exportCSV([
            { مقياس: 'معدل الإكمال', قيمة: '72%' },
            { مقياس: 'معدل الإلغاء', قيمة: '8%'  },
            { مقياس: 'متوسط وقت الانتظار', قيمة: '12 دقيقة' },
            { مقياس: 'متوسط التقييم', قيمة: '4.6 / 5' },
            { مقياس: 'نسبة الإشغال', قيمة: '84%' },
          ], 'metrics_summary.csv')} style={{
            padding: '6px 14px', borderRadius: 8, border: `1px solid ${P}`,
            background: PL, color: P, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}>📥 تصدير الكل</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
          {[
            { label: 'معدل الإكمال',          value: '72%',       color: CLR.success, icon: '✅' },
            { label: 'معدل الإلغاء',          value: '8%',        color: CLR.danger,  icon: '❌' },
            { label: 'متوسط وقت الانتظار',   value: '12 دقيقة',  color: CLR.warning, icon: '⏱️' },
            { label: 'متوسط التقييم',         value: '4.6 / 5',   color: CLR.info,    icon: '⭐' },
            { label: 'نسبة الإشغال',          value: '84%',       color: P,           icon: '📊' },
          ].map((m, i) => (
            <div key={i} style={{
              padding: '18px 16px', textAlign: 'center',
              borderLeft: i > 0 ? '1px solid var(--border-base)' : 'none',
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
