/**
 * CuraBook — Billing Success Page
 * تظهر بعد الدفع الناجح (Stripe أو Paymob)
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import useTranslation from '../../../i18n/useTranslation';

export default function BillingSuccessPage() {
  const { t, isRTL } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    // Invalidate subscription cache so dashboard shows updated plan
    qc.invalidateQueries({ queryKey: ['subscription'] });
    const timer = setTimeout(() => navigate('/dashboard'), 5000);
    return () => clearTimeout(timer);
  }, []);

  const isMock = params.get('mock') === '1';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span style={{ fontSize: 40 }}>✅</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          {t('billingSuccess.title')}
        </h1>
        <p className="text-gray-500 mb-6">
          {t('billingSuccess.subtitle')}
        </p>
        {isMock && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
            {t('billingSuccess.devMode')}
          </p>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors"
        >
          {t('billingSuccess.goToDashboard')}
        </button>
      </div>
    </div>
  );
}
