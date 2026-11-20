/**
 * EmptyState.jsx — Design System v18
 * Every empty state: icon + title + description + CTA button
 * Rules: Use i18n via useTranslation for seamless localization
 */
import { cn } from '../../utils/cn';
import useTranslation from '../../i18n/useTranslation';

export function EmptyState({
  preset, icon, title, message, action, actionLabel, actionHref,
  onAction, className, compact = false,
}) {
  const { t, language } = useTranslation();

  const getPresets = (t) => ({
    appointments: {
      icon: '📅',
      title: t('emptyState.appointmentsTitle', 'No upcoming appointments'),
      message: t('emptyState.appointmentsMsg', 'When you book an appointment, it will appear here with instructions.'),
      actionLabel: t('emptyState.appointmentsBtn', 'Find a Doctor'),
      actionHref: '/doctors',
    },
    doctors: {
      icon: '👨‍⚕️',
      title: t('emptyState.doctorsTitle', 'No matching doctors'),
      message: t('emptyState.doctorsMsg', 'Try altering your filters to find suitable doctors.'),
      actionLabel: t('emptyState.clearFilters', 'Clear Filters'),
    },
    notifications: {
      icon: '🔔',
      title: t('emptyState.notificationsTitle', 'No notifications yet'),
      message: t('emptyState.notificationsMsg', 'When something happens on your account, you will find it here.'),
    },
    search: {
      icon: '🔍',
      title: t('emptyState.searchTitle', 'No results found'),
      message: t('emptyState.searchMsg', 'Try different search keywords or fewer filters.'),
    },
    error: {
      icon: '⚠️',
      title: t('emptyState.errorTitle', 'Something went wrong'),
      message: t('emptyState.errorMsg', 'An error occurred — please try again.'),
      actionLabel: t('emptyState.tryAgain', 'Try Again'),
    },
    patients: {
      icon: '👥',
      title: t('emptyState.patientsTitle', 'No patients right now'),
      message: t('emptyState.patientsMsg', 'Patients who book with you will appear here.'),
    },
    prescriptions: {
      icon: '💊',
      title: t('emptyState.prescriptionsTitle', 'No prescriptions available'),
      message: t('emptyState.prescriptionsMsg', 'Electronic prescriptions written by your doctor will show up here.'),
    },
    hospitals: {
      icon: '🏥',
      title: t('emptyState.hospitalsTitle', 'No hospitals available'),
      message: t('emptyState.hospitalsMsg', 'There are no hospitals registered at this moment.'),
    },
    messages: {
      icon: '💬',
      title: t('emptyState.messagesTitle', 'No ongoing conversations'),
      message: t('emptyState.messagesMsg', 'You can initiate chat with your doctor from the appointment page.'),
    },
    schedule: {
      icon: '🗓',
      title: t('emptyState.scheduleTitle', 'Empty schedule'),
      message: t('emptyState.scheduleMsg', 'You have no scheduled tasks in this period.'),
    },
  });

  const PRESETS = getPresets(t);
  const p = preset ? PRESETS[preset] : {};

  const finalIcon        = icon        || p.icon        || '📭';
  const finalTitle       = title       || p.title       || t('emptyState.defaultTitle', 'No data found');
  const finalMessage     = message     ?? p.message     ?? '';
  const finalActionLabel = actionLabel || p.actionLabel;
  const finalActionHref  = actionHref  || p.actionHref;

  const handleAction = () => {
    if (onAction) onAction();
    else if (finalActionHref) window.location.href = finalActionHref;
  };

  return (
    <div
      role="status"
      aria-label={finalTitle}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-8',
        className,
      )}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Icon */}
      <div
        aria-hidden="true"
        style={{
          width: compact ? '56px' : '72px',
          height: compact ? '56px' : '72px',
          borderRadius: '50%',
          background: 'var(--primary-lighter)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? '28px' : '36px',
          marginBottom: '16px',
        }}
      >
        {finalIcon}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: compact ? '15px' : '17px',
        fontWeight: 700,
        color: 'var(--text-h)',
        marginBottom: '8px',
        fontFamily: "'Cairo', sans-serif",
      }}>
        {finalTitle}
      </h3>

      {/* Description */}
      {finalMessage && (
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          maxWidth: '300px',
          lineHeight: 1.8,
          fontFamily: "'Cairo', sans-serif",
          margin: 0
        }}>
          {finalMessage}
        </p>
      )}

      {/* CTA
          BUG#9 FIX: Distinguish between action=undefined (use preset default)
          and action=null (explicitly suppress the button).
          Previously, action={null} fell through to the preset's actionLabel/actionHref
          and rendered the default "Find a Doctor" button even for filtered views. */}
      {action !== null && (action || (finalActionLabel && (finalActionHref || onAction))) && (
        <div style={{ marginTop: '24px' }}>
          {action || (
            <button
              onClick={handleAction}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.18s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'var(--primary-dark)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {finalActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
