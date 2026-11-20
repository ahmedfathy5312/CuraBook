/**
 * SubscriptionBanner — FIX P13: All messages now support Arabic/English
 * Shows a sticky top banner when:
 *  - Trial has ≤ 7 days left
 *  - Subscription is past_due or expired
 *  - Subscription cancels at period end
 */
import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useBilling';
import { useAuth } from '../../../context/AuthContext';
import useTranslation from '../../../i18n/useTranslation';

export function SubscriptionBanner() {
  const { user }          = useAuth();
  const { data: sub }     = useSubscription();
  const { language }      = useTranslation();
  const isRTL             = language === 'ar';

  if (!user || (!user.is_doctor && !user.hospital_admin)) return null;
  if (!sub) return null;

  const { status, days_remaining, is_trial, cancel_at_period_end } = sub;

  let msg    = null;
  let bg     = '#FEF3C7';
  let color  = '#92400E';
  let urgent = false;
  let btnLabel = isRTL ? 'ترقية الآن' : 'Upgrade Now';

  if (status === 'expired' || status === 'cancelled') {
    msg    = isRTL
      ? '⛔ انتهى اشتراكك. قم بالترقية لاستعادة الوصول الكامل.'
      : '⛔ Your subscription has ended. Upgrade to restore full access.';
    bg     = '#FEE2E2'; color = '#991B1B'; urgent = true;
  } else if (status === 'past_due') {
    msg    = isRTL
      ? '⚠️ فشل الدفع. يرجى تحديث طريقة الدفع لتجنب الانقطاع.'
      : '⚠️ Payment failed. Please update your payment method to avoid interruption.';
    bg     = '#FEF3C7'; color = '#92400E'; urgent = true;
    btnLabel = isRTL ? 'إصلاح الدفع' : 'Fix Payment';
  } else if (is_trial && days_remaining <= 7) {
    const daysText = isRTL
      ? `${days_remaining} ${days_remaining === 1 ? 'يوم' : 'أيام'}`
      : `${days_remaining} day${days_remaining !== 1 ? 's' : ''}`;
    msg    = isRTL
      ? `🕐 تنتهي تجربتك المجانية خلال ${daysText}. قم بالترقية للاستمرار.`
      : `🕐 Your free trial ends in ${daysText}. Upgrade to keep access.`;
    bg     = days_remaining <= 2 ? '#FEE2E2' : '#FEF3C7';
    color  = days_remaining <= 2 ? '#991B1B' : '#92400E';
    urgent = days_remaining <= 2;
  } else if (cancel_at_period_end) {
    msg    = isRTL
      ? '📋 سينتهي اشتراكك في نهاية الفترة الحالية. اضغط لإعادة التفعيل.'
      : '📋 Your subscription cancels at end of period. Click to reactivate.';
    bg     = '#DBEAFE'; color = '#1E3A5F';
    btnLabel = isRTL ? 'إعادة التفعيل' : 'Reactivate';
  }

  if (!msg) return null;

  return (
    <div style={{
      background: bg,
      borderBottom: `1px solid ${urgent ? '#FECACA' : '#FCD34D'}`,
      padding: '9px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      direction: isRTL ? 'rtl' : 'ltr',
      fontFamily: "'Cairo', sans-serif",
    }}>
      <span style={{ fontSize: 13, color, fontWeight: 500 }}>{msg}</span>
      <Link to="/billing" style={{
        background: color,
        color: '#fff',
        padding: '5px 16px',
        borderRadius: 'var(--radius-full)',
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        {btnLabel}
      </Link>
    </div>
  );
}
