/**
 * ScheduleTab.jsx — Schedule view tab
 * Extracted from AssistantProfilePage.jsx (Sprint 3 split)
 */
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useTranslation } from '../../../i18n/useTranslation';
import Skeleton from '../../../components/ui/Skeleton';
import { Calendar, Clock } from 'lucide-react';
import { SectionCard, COLORS, formatTime, EmptyState } from '../components/AssistantUI';

const getSchedule = () => apiClient.get(API.ASSISTANT.SCHEDULE).then(r => r.data);

const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

export default function ScheduleTab() {
  const { t } = useTranslation();

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['assistant', 'schedule'],
    queryFn: getSchedule,
  });

  const isActive = (dayEN) =>
    schedule.some(s => (s.day_name || '').toLowerCase() === dayEN.toLowerCase());

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: '0 24px 40px' }}>
      <SectionCard
        title={t('assistantProfilePage.schedule.title')}
        subtitle={t('assistantProfilePage.schedule.subtitle')}
        icon={<Calendar size={18} />}
      >
        {isLoading ? (
          <Skeleton.List count={3} />
        ) : schedule.length === 0 ? (
          <EmptyState
            emoji="📅"
            title={t('assistantProfilePage.schedule.empty')}
            description={t('assistantProfilePage.schedule.emptyHint')}
          />
        ) : (
          <>
            {/* Weekly indicator dots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 20 }}>
              {DAYS_EN.map((day, i) => {
                const on = isActive(day);
                return (
                  <div key={day} style={{
                    borderRadius: 'var(--radius-md)', padding: '12px 8px', textAlign: 'center',
                    background: on ? COLORS.primaryL : 'var(--bg-page)',
                    border: `1.5px solid ${on ? COLORS.primary : COLORS.border}`,
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: on ? COLORS.primary : COLORS.muted }}>
                      {DAYS_AR[i].slice(0, 3)}
                    </p>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: on ? COLORS.primary : COLORS.border, margin: '0 auto',
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Shift rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schedule.map((shift, i) => {
                const dayIdx  = DAYS_EN.findIndex(d => d.toLowerCase() === (shift.day_name || '').toLowerCase());
                const dayName = dayIdx >= 0 ? DAYS_AR[dayIdx] : (shift.day_name || `يوم ${shift.day}`);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 18px', background: 'var(--bg-page)',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: COLORS.primaryL, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: COLORS.primary, flexShrink: 0,
                    }}>
                      <Clock size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>{dayName}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                        {shift.start_time && shift.end_time
                          ? `${formatTime(shift.start_time)} — ${formatTime(shift.end_time)}`
                          : t('assistantProfilePage.schedule.allDay')}
                      </p>
                    </div>
                    {shift.workplace_name && (
                      <span style={{
                        background: COLORS.primaryL, color: COLORS.primary,
                        borderRadius: 'var(--radius-md)', padding: '4px 10px',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        🏥 {shift.workplace_name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
