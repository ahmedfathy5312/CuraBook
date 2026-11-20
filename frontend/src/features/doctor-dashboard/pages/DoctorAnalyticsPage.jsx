/**
 * DoctorAnalyticsPage.jsx — HIGH PRIORITY FIXES
 * ================================================
 * ✅ HP-7:  API failure shows clear banner (not silent mock)
 * ✅ HP-8:  CSV Export of analytics data
 * ✅ HP-9:  KPI cards show vs previous period comparison
 * ✅ HP-10: Responsive bottom grid (1-col on mobile, not breaking 3x1)
 * ✅ HP-11: Hardcoded '#EF4444' replaced with MOD_DANGER token
 * ✅ HP-12: Revenue KPI shows currency symbol
 * ✅ HP-13: "Top Patients" cards now navigate to patient record on click
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { useNavigate } from 'react-router-dom';
import tokens from '../../../theme/tokens';
import apiClient from '../../../services/apiClient';
import {
  StatCardWithTrend,
  DonutChart
} from '../../../components/shared/DashboardCharts';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

const MOD_P       = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark     || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT  || '#10B981';
const MOD_ACCENT  = tokens?.colors?.accent?.DEFAULT   || '#8B5CF6';
const MOD_WARNING = tokens?.colors?.warning?.DEFAULT  || '#F59E0B';
// HP-11 FIX: Use token instead of hardcoded '#EF4444'
const MOD_DANGER  = tokens?.colors?.danger?.DEFAULT   || '#EF4444';
const MOD_SM      = tokens?.shadows?.sm               || '0 1px 3px rgba(0,0,0,0.08)';
const MOD_MD      = tokens?.shadows?.md               || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg               || '0 8px 32px rgba(0,0,0,0.10)';

const RANGES = [
  { id: 'week',    fallback: 'This Week',     arFallback: 'هذا الأسبوع' },
  { id: 'month',   fallback: 'This Month',    arFallback: 'هذا الشهر' },
  { id: '3months', fallback: 'Last 3 Months', arFallback: 'آخر 3 أشهر' },
  { id: 'year',    fallback: 'This Year',     arFallback: 'هذا العام' },
];

// HP-8: CSV Export helper
function exportCSV(data, isRTL) {
  if (!data) return;
  const rows = [
    isRTL ? ['المؤشر', 'القيمة'] : ['Metric', 'Value'],
    [isRTL ? 'إجمالي الأرباح' : 'Total Revenue',          data.stats?.revenue ?? 0],
    [isRTL ? 'الحجوزات المكتملة' : 'Completed Appointments', data.stats?.appointments ?? 0],
    [isRTL ? 'المرضى الجدد' : 'New Patients',              data.stats?.newPatients ?? 0],
    [isRTL ? 'التقييم' : 'Rating',                         data.stats?.rating ?? 0],
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DoctorAnalyticsPage() {
  const { t, language } = useTranslation();
  const navigate         = useNavigate();
  const isRTL            = language === 'ar';
  const [timeRange, setTimeRange] = useState('month');
  const [loading,   setLoading]   = useState(true);
  const [data,      setData]      = useState(null);
  // HP-7 FIX: Track whether data is real vs fallback
  const [dataSource, setDataSource] = useState('loading'); // 'api' | 'mock' | 'loading'

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setDataSource('loading');
      try {
        const response = await apiClient.get('/doctor/analytics/', { params: { range: timeRange } });
        setData(response.data);
        setDataSource('api');
      } catch (err) {
        console.error('Error fetching analytics', err);
        setData(getMockData(timeRange, isRTL));
        setDataSource('mock');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange, isRTL]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Premium Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)`,
        borderRadius: 24, padding: '36px 40px', color: '#fff',
        position: 'relative', overflow: 'hidden', marginBottom: 24,
        boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 24
      }}>
        <div style={{ position: 'absolute', top: -100, right: isRTL ? 'auto' : -20, left: isRTL ? -20 : 'auto', width: 250, height: 250, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 150, height: 150, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px' }}>
            📊 {t('analytics.title', isRTL ? 'تحليلات الأداء' : 'Analytics & Performance')}
          </h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6 }}>
            {isRTL ? 'تابع أداء عيادتك، وتيرة النمو، والتقارير المالية بشكل لحظي.' : 'Track your clinical performance, growth pace, and financial reports in real-time.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* HP-8: Export CSV Button */}
          <button onClick={() => exportCSV(data, isRTL)}
            disabled={!data}
            style={{
              padding: '10px 18px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: data ? 'pointer' : 'not-allowed', backdropFilter: 'blur(8px)',
              opacity: data ? 1 : 0.5, transition: 'all 0.2s', fontFamily: 'inherit'
            }}
            onMouseEnter={e => { if (data) e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            📥 {isRTL ? 'تصدير CSV' : 'Export CSV'}
          </button>

          <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 16, backdropFilter: 'blur(10px)' }}>
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setTimeRange(r.id)}
                style={{
                  padding: '8px 16px', borderRadius: 12, border: 'none',
                  background: timeRange === r.id ? '#fff' : 'transparent',
                  color: timeRange === r.id ? '#1D4ED8' : 'rgba(255,255,255,0.7)',
                  fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.3s',
                  fontFamily: 'inherit', boxShadow: timeRange === r.id ? MOD_SM : 'none'
                }}>
                {isRTL ? r.arFallback : r.fallback}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HP-7 FIX: Clear API failure banner — not silent */}
      {dataSource === 'mock' && (
        <div style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 16,
          background: '#FEF3C715', border: `1px solid ${MOD_WARNING}`,
          display: 'flex', alignItems: 'center', gap: 12, color: '#92400E'
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>
              {isRTL ? 'البيانات المعروضة تجريبية' : 'Demo Data — API Unavailable'}
            </p>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
              {isRTL ? 'تعذّر الاتصال بالـ API. الأرقام المعروضة للتوضيح فقط وليست بياناتك الفعلية.' : 'Could not reach the server. Numbers shown are sample data, not your real stats.'}
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Row — HP-9: Comparison with previous period ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        <StatCardWithTrend
          label={isRTL ? 'إجمالي الأرباح' : 'Total Revenue'}
          // HP-12 FIX: Show currency symbol
          value={data?.stats?.revenue ? `$${data.stats.revenue.toLocaleString()}` : '—'}
          icon="💰" color={MOD_SUCCESS} trend={data?.trends?.revenue} loading={loading} lang={language}
          // HP-9: comparison
          compareLabel={isRTL ? 'الفترة السابقة' : 'vs prev period'}
          compareDelta={data?.comparison?.revenue_delta}
        />
        <StatCardWithTrend
          label={isRTL ? 'الحجوزات المكتملة' : 'Completed Appointments'}
          value={data?.stats?.appointments ?? 0}
          icon="📅" color={MOD_P} trend={data?.trends?.appointments} loading={loading} lang={language}
          compareLabel={isRTL ? 'الفترة السابقة' : 'vs prev period'}
          compareDelta={data?.comparison?.appointments_delta}
        />
        <StatCardWithTrend
          label={isRTL ? 'المرضى الجدد' : 'New Patients'}
          value={data?.stats?.newPatients ?? 0}
          icon="👥" color={MOD_ACCENT} trend={data?.trends?.patients} loading={loading} lang={language}
          compareLabel={isRTL ? 'الفترة السابقة' : 'vs prev period'}
          compareDelta={data?.comparison?.patients_delta}
        />
        <StatCardWithTrend
          label={isRTL ? 'التقييم العام' : 'Overall Rating'}
          value={(data?.stats?.rating || 4.8).toFixed(1)}
          icon="⭐" color={MOD_WARNING} trend={[]} loading={loading} lang={language}
        />
      </div>

      {/* ── Charts Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <ChartContainer title={isRTL ? 'ملخص الأرباح والنمو' : 'Revenue & Growth Summary'}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.revenueChart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={MOD_P} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={MOD_P} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-base)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-hint)', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-hint)', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip color={MOD_P} />} cursor={{ stroke: MOD_P, strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="value" stroke={MOD_P} strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 8, fill: MOD_P, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title={isRTL ? 'حالة الحجوزات' : 'Appointments Status'}>
          <DonutChart data={data?.statusDistribution || []} size={220} isRTL={isRTL} />
        </ChartContainer>
      </div>

      {/* HP-10 FIX: Responsive bottom grid — auto-fit with minmax prevents breaking on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <ChartContainer title={isRTL ? 'نمو عدد المرضى' : 'Patient Growth'}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.patientGrowth || []} margin={{ top: 10 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-hint)', fontWeight: 600 }} dy={10} />
              <Tooltip content={<CustomTooltip color={MOD_ACCENT} />} cursor={{ fill: 'var(--bg-subtle)' }} />
              <Bar dataKey="value" fill={MOD_ACCENT} radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title={isRTL ? 'طرق الحجز' : 'Booking Methods'}>
          <DonutChart data={data?.visitTypes || []} size={180} isRTL={isRTL} />
        </ChartContainer>
      </div>

      {/* ── Top Patients — HP-13: clickable and navigates to record ── */}
      <div style={{ marginTop: 24 }}>
        <ChartContainer title={isRTL ? 'أكثر المرضى زيارة' : 'Top Patients by Visits'}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data?.topPatients || [
              { name: isRTL ? 'محمد عبدالله' : 'Mohamed Abdallah', visits: 12, id: null },
              { name: isRTL ? 'سارة محمود' : 'Sarah Mahmoud',      visits: 9,  id: null },
              { name: isRTL ? 'أحمد خالد'  : 'Ahmed Khaled',       visits: 7,  id: null },
              { name: isRTL ? 'ليلى أمين'  : 'Laila Amin',         visits: 5,  id: null },
            ]).map((p, i) => (
              <div key={i}
                onClick={() => p.id && navigate(`/patient-record-details/${p.id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px', background: 'var(--bg-subtle)', borderRadius: 16,
                  border: '1px solid var(--border-base)', transition: 'all 0.2s',
                  cursor: p.id ? 'pointer' : 'default'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = MOD_P; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-base)'; }}
              >
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: MOD_P, fontWeight: 900 }}>#{i + 1}</span> {p.name}
                </span>
                <span style={{ color: MOD_PD, fontWeight: 800, fontSize: 14, background: MOD_PL, padding: '4px 12px', borderRadius: 20 }}>
                  {p.visits} {isRTL ? 'زيارات' : 'visits'}
                </span>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChartContainer({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 24, padding: 28,
      boxShadow: MOD_SM, border: '1px solid var(--border-base)',
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = MOD_MD}
    onMouseLeave={e => e.currentTarget.style.boxShadow = MOD_SM}
    >
      <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 24px', color: 'var(--text-h)' }}>{title}</h3>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, color }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 16, border: '1px solid var(--border-base)', boxShadow: MOD_MD }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: 'var(--text-hint)' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: color }}>{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

function getMockData(range, isAr) {
  // MP-4 FIX: Dynamic X-Axis labels based on timeRange
  const revenueChart = [];
  if (range === 'week') {
    const days = isAr ? ['سبت','أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة'] : ['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
    days.forEach(d => revenueChart.push({ name: d, value: 800 + Math.random() * 500 }));
  } else if (range === 'month') {
    for (let i = 1; i <= 30; i += 4) { revenueChart.push({ name: `${i} ${isAr ? 'مايو' : 'May'}`, value: 1000 + Math.random() * 2000 }); }
  } else {
    const months = isAr ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
    months.forEach(m => revenueChart.push({ name: m, value: 4000 + Math.random() * 3000 }));
  }

  return {
    stats: { revenue: 14500, appointments: 216, newPatients: 42, rating: 4.9 },
    comparison: { revenue_delta: 12.4, appointments_delta: 8.1, patients_delta: -3.2 },
    trends: {
      revenue:      [12000, 13500, 14500, 14200, 14800, 15500, 14500],
      appointments: [180, 200, 195, 210, 220, 205, 216],
      patients:     [30, 35, 32, 40, 45, 38, 42],
    },
    statusDistribution: [
      { label: isAr ? 'مكتمل' : 'Completed', value: 142, color: MOD_P },
      { label: isAr ? 'مؤكد' : 'Confirmed', value: 38, color: MOD_SUCCESS },
      { label: isAr ? 'ملغي' : 'Cancelled', value: 12, color: MOD_DANGER },
      { label: isAr ? 'في الانتظار': 'Pending', value: 24, color: MOD_WARNING },
    ],
    visitTypes: [
      { label: isAr ? 'حضوري' : 'In-Person', value: 85, color: MOD_P },
      { label: isAr ? 'أونلاين': 'Online', value: 15, color: MOD_ACCENT },
    ],
    revenueChart,
    patientGrowth: [
      { name: isAr ? 'أسبوع ١': 'Week 1', value: 12 },
      { name: isAr ? 'أسبوع ٢': 'Week 2', value: 18 },
      { name: isAr ? 'أسبوع ٣': 'Week 3', value: 15 },
      { name: isAr ? 'أسبوع ٤': 'Week 4', value: 22 },
    ],
  };
}
