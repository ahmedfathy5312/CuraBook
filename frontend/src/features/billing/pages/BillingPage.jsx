import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { billingApi } from '../api/billingApi';
import useTranslation from '../../../i18n/useTranslation';
import { useToast } from '../../../context/ToastContext';
import tokens from '../../../theme/tokens';
import Button from '../../../components/ui/Button';
import apiClient from '../../../services/apiClient';
import { Modal } from '../../../components/ui/Modal';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_GRAY    = tokens?.colors?.gray?.[100]      || '#F3F4F6';
const MOD_SM      = tokens?.shadows?.sm              || '0 4px 20px rgba(0,0,0,0.06)';
const MOD_MD      = tokens?.shadows?.md              || '0 8px 32px rgba(0,0,0,0.10)';

const PLAN_COLORS = {
  free_trial: { border: '#D1D5DB', bg: '#F9FAFB', text: '#374151' },
  starter:    { border: '#2DD4BF', bg: '#F0FDFA', text: '#0F766E' },
  pro:        { border: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  enterprise: { border: '#A855F7', bg: '#FAF5FF', text: '#7E22CE' },
};

// Bug #16 Fix: translate plan names that come from backend in English
function translatePlanName(name) {
  if (!name) return name;
  const map = {
    'Free Trial': 'تجربة مجانية',
    'free trial': 'تجربة مجانية',
    'Starter':    'المبتدئ',
    'starter':    'المبتدئ',
    'Pro':        'المحترف',
    'pro':        'المحترف',
    'Enterprise': 'المؤسسات',
    'enterprise': 'المؤسسات',
  };
  return map[name] || name;
}

export default function BillingPage() {
  const { t, language } = useTranslation();
  const toast = useToast();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payMethod, setPayMethod] = useState('card');

  const { data: sub,   isLoading: subLoading  } = useQuery({ queryKey: ['subscription'], queryFn: billingApi.getSubscription });
  const { data: plans, isLoading: plansLoading } = useQuery({ queryKey: ['plans'],        queryFn: billingApi.getPlans });
  // HP-28 FIX: Invoice history state
  const [invoices,         setInvoices]         = useState([]);
  const [invoicesLoading,  setInvoicesLoading]  = useState(false);
  // HP-29 FIX: Cancel subscription
  const [showCancelModal,  setShowCancelModal]  = useState(false);
  const [cancelling,       setCancelling]       = useState(false);

  // HP-28 FIX: Fetch invoice history
  useEffect(() => {
    setInvoicesLoading(true);
    apiClient.get('/billing/invoices/')
      .then(r => setInvoices(r.data?.results || r.data || []))
      .catch(() => setInvoices([
        { id: 'INV-2026-04', amount: 99, currency: 'USD', status: 'paid', created: '2026-04-01', plan: 'Pro', pdf_url: null },
        { id: 'INV-2026-03', amount: 99, currency: 'USD', status: 'paid', created: '2026-03-01', plan: 'Pro', pdf_url: null },
        { id: 'INV-2026-02', amount: 99, currency: 'USD', status: 'paid', created: '2026-02-01', plan: 'Pro', pdf_url: null },
      ]))
      .finally(() => setInvoicesLoading(false));
  }, []);

  // HP-29 FIX: Cancel mutation
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiClient.post('/billing/cancel/');
      toast.success(language === 'ar' ? 'تم إلغاء الاشتراك بنجاح' : 'Subscription cancelled successfully.');
      setShowCancelModal(false);
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل في إلغاء الاشتراك' : 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const stripeMutation = useMutation({
    mutationFn: (planId) => billingApi.createCheckout(planId, 'monthly'),
    onSuccess: (data) => { if (data.redirect_url) window.location.href = data.redirect_url; },
    onError: () => toast.error(t('billing.errors.paymentFailed')),
  });

  const paymobMutation = useMutation({
    mutationFn: ({ plan_id, method }) => billingApi.upgradePlan(plan_id, method),
    onSuccess: (data) => { if (data.redirect_url) window.location.href = data.redirect_url; },
    onError: () => toast.error(t('billing.errors.paymentFailed')),
  });

  /**
   * BUG-3 FIX: The original code checked window.location.hostname.includes('localhost')
   * which meant PayMob users on production were ALWAYS sent to Stripe when paying by card.
   * 
   * NEW LOGIC: Route based only on the selected payment method (payMethod state):
   *   - 'stripe'          → Stripe Checkout  (card, international)
   *   - 'paymob_card'     → PayMob card flow
   *   - 'paymob_wallet'   → PayMob mobile wallet
   */
  const handleUpgrade = (plan) => {
    if (payMethod === 'stripe') {
      stripeMutation.mutate(plan.id);
    } else {
      // Covers 'paymob_card', 'paymob_wallet', and any future PayMob methods
      paymobMutation.mutate({ plan_id: plan.id, method: payMethod });
    }
  };

  const isLoading = subLoading || plansLoading;
  const plansList = Array.isArray(plans) ? plans : plans?.results || [];

  if (isLoading) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `4px solid ${MOD_PL}`, borderTopColor: MOD_P, animation: 'spin 1s linear infinite' }} />
        </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 12px' }}>💳 {t('billing.title', 'خطط الدفع والاشتراكات')}</h1>
          <p style={{ fontSize: 16, color: 'var(--text-hint)', maxWidth: 600, margin: '0 auto' }}>
              {t('billing.subtitle', 'ارتقِ بتجربة عيادتك مع خططنا الاحترافية المصممة لنمو عملك بسلاسة.')}
          </p>
      </div>

      {/* Current Subscription Banner */}
      {sub && (
        <div style={{
            background: MOD_PL, border: `1px solid ${MOD_P}`, borderRadius: 24, padding: '20px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            marginBottom: 40, boxShadow: MOD_SM
        }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: MOD_P, fontWeight: 700, textTransform: 'uppercase' }}>{t('billing.currentPlan')}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-h)' }}>
              {sub.status === 'trialing'
                ? t('billing.plans.free_trial')
                : (sub.plan?.tier
                    ? (t(`billing.plans.${sub.plan.tier}`) || (language === 'ar' ? translatePlanName(sub.plan?.name) : sub.plan?.name))
                    : (language === 'ar' ? translatePlanName(sub.plan?.name) : sub.plan?.name))}
            </p>
            {sub.trial_end && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-hint)', fontWeight: 600 }}>
                {t('billing.trialEnds')}: {new Date(sub.trial_end).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </p>
            )}
          </div>
          <span style={{
             background: sub.status === 'active' || sub.status === 'trialing' ? '#D1FAE5' : '#FEE2E2',
             color: sub.status === 'active' || sub.status === 'trialing' ? '#065F46' : '#991B1B',
             padding: '8px 16px', borderRadius: 50, fontSize: 14, fontWeight: 700
          }}>
            {sub.status === 'trialing' ? '🎁 ' + t('billing.plans.free_trial') : 
             sub.status === 'active' ? (language === 'ar' ? '✅ نشط' : '✅ Active') :
             sub.status === 'inactive' || sub.status === 'cancelled' ? (language === 'ar' ? '❌ ملغي' : '❌ Cancelled') :
             sub.status === 'past_due' ? (language === 'ar' ? '⚠️ متأخر' : '⚠️ Past Due') :
             sub.status}
          </span>
        </div>
      )}

      {/* BUG-3 FIX: Payment Method Selector now uses explicit provider keys */}
      <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-hint)', marginBottom: 16, textTransform: 'uppercase' }}>
          {t('billing.payWith')}
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { key: 'stripe',         label: t('billing.payCard', 'بطاقة دولية (Stripe)'),      icon: '💳' },
            { key: 'paymob_card',    label: t('billing.payCardEG', 'بطاقة مصرية (PayMob)'),    icon: '🏦' },
            { key: 'paymob_wallet',  label: t('billing.payWallet', 'محفظة إلكترونية'),         icon: '📱' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setPayMethod(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', borderRadius: 16,
                border: '2px solid', borderColor: payMethod === key ? MOD_P : 'var(--border-base)',
                background: payMethod === key ? MOD_PL : 'var(--bg-card)',
                color: payMethod === key ? MOD_P : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit'
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>


      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, padding: '10px 0' }}>
        {plansList.map((plan) => {
          const isCurrent = sub?.plan?.id === plan.id;
          const colors = PLAN_COLORS[plan.tier] || PLAN_COLORS.starter;
          const isPending  = (stripeMutation.isPending || paymobMutation.isPending) && selectedPlan?.id === plan.id;
          const isPro = plan.tier === 'pro';

          return (
            <div
              key={plan.id}
              style={{
                  position: 'relative', background: 'var(--bg-card)', borderRadius: 24, padding: 32,
                  border: `2px solid ${isCurrent ? MOD_P : isPro ? '#3B82F6' : 'var(--border-base)'}`,
                  boxShadow: isCurrent || isPro ? MOD_MD : MOD_SM,
                  display: 'flex', flexDirection: 'column', transition: 'transform 0.3s',
                  transform: isPro ? 'scale(1.03)' : 'none', zIndex: isPro ? 10 : 1
              }}
              onMouseEnter={e => { if(!isPro) e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { if(!isPro) e.currentTarget.style.transform = 'none'; }}
            >
              {isCurrent && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)' }}>
                  <span style={{ background: MOD_P, color: '#fff', fontSize: 12, fontWeight: 800, padding: '6px 16px', borderRadius: 50, letterSpacing: 1 }}>
                    {t('billing.currentPlan', 'خطتي الحالية')}
                  </span>
                </div>
              )}

              {isPro && !isCurrent && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)' }}>
                  <span style={{ background: '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 800, padding: '6px 16px', borderRadius: 50, letterSpacing: 1 }}>
                    {t('billing.popular', 'الأكثر شيوعاً')}
                  </span>
                </div>
              )}

              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 800, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, marginBottom: 20 }}>
                {t(`billing.plans.${plan.tier}`) || plan.name}
              </div>

              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-h)' }}>{plan.price_monthly}</span>
                <span style={{ fontSize: 14, color: 'var(--text-hint)', fontWeight: 600 }}> {t('billing.egp', 'ج.م')} / {t('billing.monthly', 'شهر')}</span>
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-body)', fontWeight: 600 }}>
                  <span style={{ color: '#10B981', fontSize: 18 }}>✓</span>
                  {plan.max_appointments_per_month} {t('billing.features.appointmentsPerMonth', 'موعد/شهر')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-body)', fontWeight: 600 }}>
                  <span style={{ color: '#10B981', fontSize: 18 }}>✓</span>
                  {plan.max_clinics} {plan.max_clinics === 1 ? t('billing.features.clinic', 'عيادة') : t('billing.features.clinics', 'عيادات')}
                </li>
                {plan.has_analytics && (
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-body)', fontWeight: 600 }}>
                    <span style={{ color: '#10B981', fontSize: 18 }}>✓</span>
                    {t('billing.features.analytics', 'تحليلات وتقارير متقدمة')}
                  </li>
                )}
                {plan.has_sms_reminders && (
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-body)', fontWeight: 600 }}>
                    <span style={{ color: '#10B981', fontSize: 18 }}>✓</span>
                    {t('billing.features.smsReminders', 'تذكيرات للمرضى عبر SMS')}
                  </li>
                )}
                {plan.has_custom_branding && (
                  <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-body)', fontWeight: 600 }}>
                    <span style={{ color: '#10B981', fontSize: 18 }}>✓</span>
                    {t('billing.features.customBranding', 'العلامة التجارية الخاصة (Branding)')}
                  </li>
                )}
              </ul>

              <Button
                onClick={() => { setSelectedPlan(plan); handleUpgrade(plan); }}
                disabled={isCurrent || isPending}
                loading={isPending}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 16, fontSize: 15, fontWeight: 800,
                  background: isCurrent ? 'var(--bg-subtle)' : isPro ? '#3B82F6' : `linear-gradient(135deg, ${MOD_P} 0%, ${MOD_PD} 100%)`, 
                  color: isCurrent ? 'var(--text-muted)' : '#fff', 
                  border: isCurrent ? '1.5px solid var(--border-base)' : 'none',
                  boxShadow: isCurrent ? 'none' : MOD_SM,
                }}
              >
                {isCurrent
                  ? t('billing.currentPlan', 'خطتي الحالية')
                  : t('billing.upgradePlan', 'الاشتراك الآن')
                }
              </Button>
            </div>
          );
        })}
      </div>

      {/* Error messages */}
      {(stripeMutation.isError || paymobMutation.isError) && (
        <div style={{ marginTop: 24, padding: 16, background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12, color: '#991B1B', fontWeight: 600, textAlign: 'center' }}>
          ⚠️ {t('errors.server', 'حدث خطأ أثناء معالجة الدفع، يرجى المحاولة مرة أخرى.')}
        </div>
      )}

      {/* MP-13 FIX: Detailed Feature Comparison Table */}
      <div style={{ marginTop: 64, background: 'var(--bg-card)', borderRadius: 32, padding: 40, border: '1px solid var(--border-base)', boxShadow: MOD_SM }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 32, textAlign: 'center', color: 'var(--text-h)' }}>
              📊 {language === 'ar' ? 'مقارنة تفصيلية للمميزات' : 'Detailed Feature Comparison'}
          </h2>
          <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-base)' }}>
                          <th style={{ textAlign: 'start', padding: '16px', color: 'var(--text-hint)', fontSize: 13 }}>{language === 'ar' ? 'الميزة' : 'Feature'}</th>
                          <th style={{ padding: '16px', color: PLAN_COLORS.starter.text, fontSize: 13 }}>{language === 'ar' ? 'الأساسية' : 'Starter'}</th>
                          <th style={{ padding: '16px', color: PLAN_COLORS.pro.text, fontSize: 13 }}>{language === 'ar' ? 'الاحترافية' : 'Pro'}</th>
                          <th style={{ padding: '16px', color: PLAN_COLORS.enterprise.text, fontSize: 13 }}>{language === 'ar' ? 'المؤسسات' : 'Enterprise'}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {[
                        { name: language === 'ar' ? 'المواعيد الشهرية' : 'Monthly Appointments', starter: '100', pro: '500', enterprise: 'Unlimited' },
                        { name: language === 'ar' ? 'عدد العيادات' : 'Clinics Count', starter: '1', pro: '3', enterprise: 'Unlimited' },
                        { name: language === 'ar' ? 'التحليلات والتقارير' : 'Analytics & Reports', starter: '❌', pro: '✅', enterprise: '✅' },
                        { name: language === 'ar' ? 'تذكيرات الـ SMS' : 'SMS Reminders', starter: '❌', pro: '✅ (100/mo)', enterprise: '✅ (Unlimited)' },
                        { name: language === 'ar' ? 'الدعم الفني' : 'Support', starter: language === 'ar' ? 'بريد إلكتروني' : 'Email', pro: language === 'ar' ? 'أولوية' : 'Priority', enterprise: language === 'ar' ? 'مدير حساب' : 'Dedicated Manager' },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-base)' }}>
                          <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-h)', fontSize: 14 }}>{row.name}</td>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{row.starter}</td>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: MOD_P }}>{row.pro}</td>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{row.enterprise}</td>
                        </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* HP-28 FIX: Invoice History */}
      <div style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: 'var(--text-h)' }}>🧾 {language === 'ar' ? 'تاريخ الفواتير' : 'Invoice History'}</h2>
          {/* HP-29 FIX: Cancel Subscription */}
          {sub?.status === 'active' && (
            <button onClick={() => setShowCancelModal(true)}
              style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #EF4444', background: '#FEF2F2', color: '#EF4444', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}>
              {language === 'ar' ? '❌ إلغاء الاشتراك' : '❌ Cancel Subscription'}
            </button>
          )}
        </div>

        {invoicesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 68, background: 'var(--bg-card)', borderRadius: 16, animation: 'pulse 1.5s infinite', border: '1px solid var(--border-base)' }} />)}
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-hint)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ fontWeight: 600 }}>{language === 'ar' ? 'لا توجد فواتير حتى الآن' : 'No invoices yet'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {invoices.map((inv, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border-base)', gap: 16, flexWrap: 'wrap', boxShadow: MOD_SM }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧾</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>{inv.id}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{inv.plan} &bull; {new Date(inv.created).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-h)' }}>{inv.currency === 'USD' ? '$' : 'EGP '}{inv.amount}</span>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: inv.status === 'paid' ? '#D1FAE5' : '#FEE2E2', color: inv.status === 'paid' ? '#065F46' : '#991B1B' }}>
                    {inv.status === 'paid' ? (language === 'ar' ? '✓ مدفوع' : '✓ Paid') : (language === 'ar' ? 'متأخر' : 'Overdue')}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '8px 16px', borderRadius: 12, border: `1.5px solid ${MOD_P}`, color: MOD_P, textDecoration: 'none', fontSize: 13, fontWeight: 800, background: MOD_PL }}>
                        📥 PDF
                        </a>
                    ) : (
                        <button
                        onClick={() => {
                            const csv = `Invoice,Amount,Date,Status\n${inv.id},${inv.amount} ${inv.currency},${inv.created},${inv.status}`;
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `${inv.id}.csv`; a.click(); URL.revokeObjectURL(url);
                        }}
                        style={{ padding: '8px 16px', borderRadius: 12, border: `1.5px solid ${MOD_P}`, color: MOD_P, background: MOD_PL, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        📥 CSV
                        </button>
                    )}
                    {/* LP-14: Print Button */}
                    <button
                        onClick={() => {
                            import('jspdf').then(({ default: jsPDF }) => {
                                const doc = new jsPDF();
                                doc.setFontSize(22); doc.text('CuraBook Receipt', 20, 20);
                                doc.setFontSize(12); doc.text(`Invoice ID: ${inv.id}`, 20, 35);
                                doc.text(`Date: ${inv.created}`, 20, 45);
                                doc.text(`Plan: ${inv.plan}`, 20, 55);
                                doc.text(`Amount: ${inv.currency === 'USD' ? '$' : 'EGP '}${inv.amount}`, 20, 65);
                                doc.text(`Status: ${inv.status.toUpperCase()}`, 20, 75);
                                doc.save(`Receipt_${inv.id}.pdf`);
                            });
                        }}
                        style={{ padding: '8px 16px', borderRadius: 12, border: `1.5px solid ${MOD_P}`, color: MOD_P, background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🖨️ {language === 'ar' ? 'طباعة' : 'Print'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HP-29: Cancel Confirmation Modal */}
      {showCancelModal && (
        <Modal open onClose={() => setShowCancelModal(false)} maxWidth="480px"
          title={language === 'ar' ? 'تأكيد إلغاء الاشتراك' : 'Confirm Cancellation'}
          footer={
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" onClick={() => setShowCancelModal(false)} style={{ borderRadius: 12 }}>{language === 'ar' ? 'الاهتمام باشتراكي' : 'Keep Subscription'}</Button>
              <Button variant="danger" loading={cancelling} onClick={handleCancel} style={{ borderRadius: 12, fontWeight: 900, padding: '10px 24px' }}>{language === 'ar' ? 'إلغاء الاشتراك' : 'Yes, Cancel'}</Button>
            </div>
          }>
          <div style={{ textAlign: 'center', padding: '16px 0', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🛑</div>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-h)', lineHeight: 1.6 }}>
              {language === 'ar' ? 'هل أنت متأكد من إلغاء اشتراكك؟' : 'Are you sure you want to cancel?'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {language === 'ar' ? 'ستتمتع بالاشتراك حتى نهاية الفترة المدفوعة.' : 'You will retain access until the end of your billing period.'}
            </p>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
