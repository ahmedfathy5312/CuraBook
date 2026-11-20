/**
 * OverviewSection.jsx â€” Admin Dashboard Overview
 *
 * Sprint 1 â€” UX Design Report ط¥طµظ„ط§ط­ Dashboard:
 *  â€¢ Real KPIs with trend arrows (â–² / â–¼) and percentage
 *  â€¢ Animated StatCards (count-up on mount)
 *  â€¢ Animated charts with transitions
 *  â€¢ Quick Actions bar
 *  â€¢ Recent hospitals + recent audit log tables
 */
import { useEffect, useRef, useState } from 'react';
import StatCard from '../../../components/shared/StatCard';
import { Table } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import { DonutChart, TrendLine } from '../../../components/shared/DashboardCharts';
import { tokens } from '../../../theme/tokens';
import { formatDate, formatDateTime } from '../../../utils/formatters';
import useTranslation from '../../../i18n/useTranslation';

const PRIMARY      = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const CLR_SUCCESS  = tokens?.colors?.success?.DEFAULT  || '#31A870';
const CLR_WARNING  = tokens?.colors?.warning?.DEFAULT  || '#F59E0B';
const CLR_INFO     = tokens?.colors?.info?.DEFAULT     || '#3B82F6';
const CLR_DANGER   = tokens?.colors?.danger?.DEFAULT   || '#E97D61';
const CLR_ORANGE   = tokens?.colors?.warning?.dark     || '#D97706';
const CLR_MUTED    = tokens?.colors?.primary?.lighter  || '#E0F7FA';

// â”€â”€ Animated KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KPICard({ label, value, icon, color, trend, trendLabel, loading }) {
  const { lang } = useTranslation();
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (loading || !value) return;
    const target = Number(value);
    if (isNaN(target)) return;
    const duration = 900;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      setDisplayValue(Math.round(eased * target));
      if (p < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [value, loading]);

  const isPositive = trend > 0;
  const isNeutral  = trend === 0 || trend == null;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg, 16px)',
      padding: '20px 22px',
      boxShadow: 'var(--shadow-md)',
      display: 'flex', flexDirection: 'column', gap: 8,
      borderTop: `3px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.12)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    >
      {/* Icon + trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{icon}</div>
        {!isNeutral && (
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: isPositive ? CLR_SUCCESS : CLR_DANGER,
            background: isPositive ? `${CLR_SUCCESS}18` : `${CLR_DANGER}18`,
            padding: '3px 8px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {isPositive ? '\u25b2' : '\u25bc'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div style={{ height: 36, width: '60%', background: 'var(--bg-subtle, #f3f4f6)', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
      ) : (
        <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--txt-heading)', lineHeight: 1 }}>
          {displayValue.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
        </p>
      )}

      {/* Label */}
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>

      {/* Trend description */}
      {trendLabel && (
        <p style={{ margin: 0, fontSize: 11, color: isPositive ? CLR_SUCCESS : isNeutral ? 'var(--text-hint)' : CLR_DANGER }}>
          {trendLabel}
        </p>
      )}
    </div>
  );
}

// â”€â”€ Quick Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QuickActions({ onNavigate }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const actions = [
    { icon: '\u{1f468}\u200d\u2695\ufe0f', label: isAr ? '\u0639\u0631\u0636 \u0627\u0644\u0623\u0637\u0628\u0627\u0621' : 'View Doctors', section: 'doctors' },
    { icon: '\u{1f3e5}', label: isAr ? '\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u062a\u0634\u0641\u064a\u0627\u062a' : 'View Hospitals', section: 'hospitals' },
    { icon: '\u{1f91d}', label: isAr ? '\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0648\u0646' : 'Assistants', section: 'assistants' },
    { icon: '\u{1f4c5}', label: isAr ? '\u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f' : 'Appointments', section: 'appointments' },
    { icon: '\u{1f4c8}', label: isAr ? '\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a' : 'Analytics', section: 'analytics' },
    { icon: '\u{1f465}', label: isAr ? '\u0627\u0644\u0645\u0631\u0636\u0649' : 'Patients', section: 'patients' },
    { icon: '\u{1f4cb}', label: isAr ? '\u0633\u062c\u0644 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629' : 'Audit Log', section: 'audit' },
    { icon: '\u{1f5a5}\ufe0f', label: isAr ? '\u0635\u062d\u0629 \u0627\u0644\u0646\u0638\u0627\u0645' : 'System Health', section: 'monitoring' },
  ];
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
      padding: '16px 20px', boxShadow: 'var(--shadow-md)',
    }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--txt-heading)' }}>
        {"\u26a1"} {isAr ? '\u0648\u0635\u0648\u0644 \u0633\u0631\u064a\u0639' : 'Quick Access'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {actions.map(a => (
          <button key={a.section}
            onClick={() => onNavigate?.(a.section)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20,
              background: 'var(--bg-subtle, #F3F4F6)',
              border: '1px solid var(--border-base)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: 'var(--txt-body)', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${PRIMARY}15`; e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle, #F3F4F6)'; e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--txt-body)'; }}
          >
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlatformOverviewBars({ data = [], isAr }) {
  const totalMax = Math.max(...data.map(item => Number(item.value) || 0), 1);
  const numberLocale = isAr ? 'ar-EG' : 'en-US';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 18,
      minHeight: 258,
      padding: '12px 4px 4px',
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      {data.map(item => {
        const value = Number(item.value) || 0;
        const width = `${Math.max((value / totalMax) * 100, value > 0 ? 4 : 0)}%`;

        return (
          <div
            key={item.label}
            style={{
              display: 'grid',
              gridTemplateColumns: isAr ? '132px minmax(0, 1fr) 58px' : '132px minmax(0, 1fr) 58px',
              alignItems: 'center',
              gap: 14,
              minHeight: 42,
            }}
          >
            <div style={{
              color: 'var(--txt-heading)',
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.35,
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              textAlign: isAr ? 'right' : 'left',
            }}>
              {item.label}
            </div>

            <div style={{
              position: 'relative',
              height: 34,
              borderRadius: 999,
              background: 'rgba(148, 163, 184, 0.10)',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                insetBlock: 0,
                [isAr ? 'right' : 'left']: 0,
                width,
                minWidth: value > 0 ? 18 : 0,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #22d3ee, #0e7490)',
                boxShadow: '0 8px 20px rgba(34, 211, 238, 0.20)',
                transition: 'width 0.35s ease',
              }} />
            </div>

            <div style={{
              color: 'var(--txt-heading)',
              fontSize: 13,
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              textAlign: isAr ? 'left' : 'right',
            }}>
              {value.toLocaleString(numberLocale)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// â”€â”€ Main OverviewSection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function OverviewSection({
  stats, statsLoading,
  hospitals, hLoading,
  appointments, aLoading,
  auditLogs, audLoading,
  timeSeriesData, tsLoading,
  onNavigate,
}) {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  // Use backend stats for accurate counts (avoids page-1 only counting)
  const donutData = stats ? [
    { label: isAr ? '\u0645\u0624\u0643\u062f' : 'Confirmed', value: stats.appointments_confirmed ?? 0, color: CLR_SUCCESS },
    { label: isAr ? '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' : 'Pending', value: stats.appointments_pending ?? 0, color: CLR_WARNING },
    { label: isAr ? '\u0645\u0644\u063a\u064a' : 'Cancelled', value: stats.appointments_cancelled ?? 0, color: CLR_DANGER },
    { label: isAr ? '\u0645\u0643\u062a\u0645\u0644' : 'Completed', value: stats.appointments_completed ?? 0, color: CLR_INFO },
    { label: isAr ? '\u0645\u0631\u0641\u0648\u0636' : 'Rejected', value: stats.appointments_rejected ?? 0, color: CLR_MUTED },
  ].filter(d => d.value > 0) : [
    // Fallback: count from the page-1 sample
    { label: isAr ? '\u0645\u0624\u0643\u062f' : 'Confirmed', value: appointments.filter(a => (a.status||'').toLowerCase() === 'confirmed').length, color: CLR_SUCCESS },
    { label: isAr ? '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631' : 'Pending', value: appointments.filter(a => (a.status||'').toLowerCase() === 'pending').length, color: CLR_WARNING },
    { label: isAr ? '\u0645\u0644\u063a\u064a' : 'Cancelled', value: appointments.filter(a => (a.status||'').toLowerCase() === 'cancelled').length, color: CLR_DANGER },
    { label: isAr ? '\u0645\u0643\u062a\u0645\u0644' : 'Completed', value: appointments.filter(a => (a.status||'').toLowerCase() === 'completed').length, color: CLR_INFO },
  ].filter(d => d.value > 0);

  // Last 7 days trend using real timeSeriesData
  const trendCounts = timeSeriesData ? timeSeriesData.map(d => d['مواعيد'] || d['Appointments'] || d.appointments || d.value || 0) : [];
  const trendLabels = timeSeriesData ? timeSeriesData.map(d => d.label) : [];

  // Platform overview bar
  const barData = [
    { label: isAr ? '\u0627\u0644\u0645\u0633\u062a\u0634\u0641\u064a\u0627\u062a' : 'Hospitals', value: stats?.total_hospitals ?? hospitals.length },
    { label: isAr ? '\u0627\u0644\u0623\u0637\u0628\u0627\u0621' : 'Doctors', value: stats?.total_doctors ?? 0 },
    { label: isAr ? '\u0627\u0644\u0645\u0631\u0636\u0649' : 'Patients', value: stats?.total_patients ?? 0 },
    { label: isAr ? '\u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f' : 'Appointments', value: stats?.appointments_total ?? appointments.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
        <KPICard
          label={t('adminStats.hospitals')}
          value={stats?.total_hospitals ?? hospitals.length}
          icon={"\u{1f3e5}"}
          color={PRIMARY}
          trend={stats?.hospitals_trend ?? null}
          trendLabel={stats?.hospitals_trend ? (isAr ? '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0645\u0627\u0636\u064a' : 'vs last month') : null}
          loading={statsLoading}
        />
        <KPICard
          label={t('adminStats.doctors')}
          value={stats?.total_doctors ?? 0}
          icon={"\u{1f468}\u200d\u2695\ufe0f"}
          color={CLR_INFO}
          trend={stats?.doctors_trend ?? null}
          trendLabel={stats?.doctors_trend ? (isAr ? '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0645\u0627\u0636\u064a' : 'vs last month') : null}
          loading={statsLoading}
        />
        <KPICard
          label={t('adminStats.patients')}
          value={stats?.total_patients ?? 0}
          icon={"\u{1f465}"}
          color={CLR_WARNING}
          trend={stats?.patients_trend ?? null}
          trendLabel={stats?.patients_trend ? (isAr ? '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0645\u0627\u0636\u064a' : 'vs last month') : null}
          loading={statsLoading}
        />
        <KPICard
          label={t('adminStats.appointments')}
          value={stats?.appointments_total ?? appointments.length}
          icon={"\u{1f4c5}"}
          color={CLR_SUCCESS}
          trend={stats?.appointments_trend ?? null}
          trendLabel={stats?.appointments_trend ? (isAr ? '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0645\u0627\u0636\u064a' : 'vs last month') : null}
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Charts row */}
      {/* ISSUE-004 FIX: overflow:hidden on each chart card prevents recharts labels from overflowing container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 22, alignItems: 'stretch' }}>

        {/* Donut â€” Appointment Status Breakdown */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
          padding: '26px', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
          minHeight: 340, display: 'flex', flexDirection: 'column',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)' }}>
            {t('adminStats.charts.appointmentBreakdown')}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-hint)' }}>
            {isAr ? '\u062a\u0648\u0632\u064a\u0639 \u062d\u0627\u0644\u0627\u062a \u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f' : 'Appointment status distribution'}
          </p>
          {donutData.length > 0 ? (
            <>
              <DonutChart title="" size={220} data={donutData} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                {donutData.map(d => (
                  <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--txt-body)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    {d.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-hint)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u{1f4c5}"}</div>
              <p style={{ margin: 0, fontSize: 13 }}>{isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u0639\u064a\u062f \u0628\u0639\u062f' : 'No appointments yet'}</p>
            </div>
          )}
        </div>

        {/* Bar â€” Platform Overview */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
          padding: '28px 30px', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
          gridColumn: 'span 2', minHeight: 360, display: 'flex', flexDirection: 'column',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)' }}>
            {t('adminStats.charts.platformOverview')}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-hint)' }}>
            {isAr ? '\u0625\u062c\u0645\u0627\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629' : 'Platform totals'}
          </p>
          <PlatformOverviewBars data={barData} isAr={isAr} />
        </div>

        {/* TrendLine â€” Last 7 Days */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
          padding: '26px', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
          minHeight: 340, display: 'flex', flexDirection: 'column',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)' }}>
            {t('adminStats.charts.appointmentTrend')}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-hint)' }}>
            {t('adminStats.charts.last7Days')}
          </p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 180 }}>
            <TrendLine data={trendCounts} width="100%" height={150} color={PRIMARY} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {trendLabels.map((l, i) => (
              <span key={i} style={{ fontSize: 10, color: 'var(--text-hint)', textAlign: 'center' }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: 20 }}>
        {/* Recent Hospitals */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
          padding: '24px', boxShadow: 'var(--shadow-md)', minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)', margin: 0 }}>
              {t('adminStats.sections.recentHospitals')}
            </h3>
            <button
              onClick={() => onNavigate?.('hospitals')}
              style={{ fontSize: 12, color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
            >
              {isAr ? '\u0639\u0631\u0636 \u0627\u0644\u0643\u0644' : 'View all'} {"\u2190"}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={[
                { header: t('adminCols.name'),   key: 'name',      render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
                { header: t('adminCols.city'),   key: 'city',      render: v => {
                  // ISSUE-004+009 FIX: translate English city key to Arabic name
                  if (!v) return '\u2014';
                  const CITIES = {
                    cairo: isAr ? '\u0627\u0644\u0642\u0627\u0647\u0631\u0629' : 'Cairo',
                    alexandria: isAr ? '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629' : 'Alexandria',
                    giza: isAr ? '\u0627\u0644\u062c\u064a\u0632\u0629' : 'Giza',
                    asyut: isAr ? '\u0623\u0633\u064a\u0648\u0637' : 'Asyut',
                    luxor: isAr ? '\u0627\u0644\u0623\u0642\u0635\u0631' : 'Luxor',
                    aswan: isAr ? '\u0623\u0633\u0648\u0627\u0646' : 'Aswan',
                    minya: isAr ? '\u0627\u0644\u0645\u0646\u064a\u0627' : 'Minya',
                    suez: isAr ? '\u0627\u0644\u0633\u0648\u064a\u0633' : 'Suez',
                    fayyum: isAr ? '\u0627\u0644\u0641\u064a\u0648\u0645' : 'Fayyum',
                    tanta: isAr ? '\u0637\u0646\u0637\u0627' : 'Tanta',
                    port_said: isAr ? '\u0628\u0648\u0631\u0633\u0639\u064a\u062f' : 'Port Said',
                  };
                  return CITIES[v] || v;
                }},
                { header: t('adminCols.status'), key: 'is_active', render: v => <Badge status={v ? 'active' : 'inactive'} /> },
              ]}
              data={hospitals.slice(0, 5)}
              loading={hLoading}
              emptyTitle={t('adminStats.empty.hospitals')}
            />
          </div>
        </div>

        {/* Recent Audit */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg, 16px)',
          padding: '24px', boxShadow: 'var(--shadow-md)', minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-heading)', margin: 0 }}>
              {t('adminStats.sections.recentAudit')}
            </h3>
            <button
              onClick={() => onNavigate?.('audit')}
              style={{ fontSize: 12, color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
            >
              {isAr ? '\u0639\u0631\u0636 \u0627\u0644\u0643\u0644' : 'View all'} {"\u2190"}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={[
                { header: t('adminCols.user'),   key: 'user',      render: v => <span style={{ fontWeight: 600 }}>{v || '\u2014'}</span> },
                { header: t('adminCols.action'), key: 'action' },
                { header: t('adminCols.time'),   key: 'timestamp', render: v => formatDateTime(v) },
              ]}
              data={auditLogs.slice(0, 5)}
              loading={audLoading}
              emptyTitle={t('adminStats.empty.logs')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
