/**
 * CuraBook — Language Switcher Component
 * يظهر زر تبديل اللغة بين العربية والإنجليزية
 */
import useTranslation from './useTranslation';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useTranslation();

  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
        transition-colors ${className}`}
      title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
      aria-label="Toggle language"
    >
      <span style={{ fontSize: 16 }}>{lang === 'ar' ? '🌐' : '🌐'}</span>
      <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
}
