/**
 * DepartmentsPage.jsx — i18n fix (Sprint 3)
 * Header عربي/إنجليزي عبر useTranslation
 */
import DepartmentsManager from '../components/DepartmentsManager';
import { useTranslation } from '../../../i18n/useTranslation';

export default function DepartmentsPage() {
  const { t, isRTL } = useTranslation();
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: 0 }}>
          {t('departmentsPage.title')}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
          {t('departmentsPage.subtitle')}
        </p>
      </div>
      <DepartmentsManager />
    </div>
  );
}
