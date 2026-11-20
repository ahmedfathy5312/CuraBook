/**
 * ErrorBoundary.jsx — Phase 4 Polish
 * ====================================
 * ✅ Bilingual (Arabic/English) — reads lang from localStorage
 * ✅ Retry counter (max 3) — handles transient errors
 * ✅ Chunk-load error detection (lazy import network failures)
 * ✅ Copy diagnostics button for support
 * ✅ Sentry / GA4 integration hooks
 * ✅ Full CSS-variable theming
 */
import React from 'react';

function getLang() {
  try { return localStorage.getItem('cura_lang') || 'ar'; } catch { return 'ar'; }
}

const MSGS = {
  ar: {
    heading: 'حدث خطأ غير متوقع',
    sub:     'لا تقلق — لم تتأثر بيانات المرضى. حاول تحديث الصفحة.',
    refresh: 'تحديث الصفحة',
    home:    'الصفحة الرئيسية',
    retry:   'إعادة المحاولة',
    diag:    'التفاصيل التقنية',
    copy:    'نسخ',
    copied:  'تم النسخ ✓',
    chunk:   'تعذّر تحميل جزء من التطبيق. تحقق من اتصالك بالإنترنت.',
    left:    (n) => `محاولات متبقية: ${n}`,
    maxed:   'تجاوزت الحد الأقصى. الرجاء تحديث الصفحة.',
  },
  en: {
    heading: 'Something went wrong',
    sub:     "Don't worry — no patient data was affected. Try refreshing.",
    refresh: 'Refresh Page',
    home:    'Go Home',
    retry:   'Retry',
    diag:    'Diagnostic Information',
    copy:    'Copy',
    copied:  'Copied ✓',
    chunk:   'A page chunk failed to load. Check your internet connection.',
    left:    (n) => `Retries remaining: ${n}`,
    maxed:   'Max retries exceeded. Please refresh the page.',
  },
};
const MAX = 3;

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null, retries: 0, copied: false };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ errorInfo: info });
    if (import.meta.env.PROD) {
      console.error('[ErrorBoundary] Caught error:', error, info);
      if (window.Sentry) window.Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
      if (window.gtag) window.gtag('event', 'exception', { description: error?.message || 'unknown', fatal: false });
    }
  }

  handleRetry = () => {
    if (this.state.retries >= MAX) return;
    this.setState(s => ({ hasError: false, error: null, errorInfo: null, retries: s.retries + 1 }));
  };

  handleCopy = () => {
    const text = [this.state.error?.toString(), this.state.errorInfo?.componentStack].filter(Boolean).join('\n\n');
    navigator.clipboard?.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const { error, errorInfo, retries, copied } = this.state;
    const lang  = getLang();
    const m     = MSGS[lang] || MSGS.en;
    const isRTL = lang === 'ar';
    const isChunk = error?.message?.includes('Failed to fetch dynamically imported') ||
                    error?.message?.includes('Loading chunk') ||
                    error?.name === 'ChunkLoadError';
    const canRetry = retries < MAX;

    const btnBase = {
      borderRadius: '999px', padding: '11px 26px', fontSize: '14px',
      fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
    };

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-page, #F5F8FA)', fontFamily: isRTL ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif",
        padding: '20px', direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: '540px', width: '100%', padding: '48px 36px',
          background: 'var(--bg-card, #fff)', borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(15,23,42,0.12)', border: '1px solid var(--border, #E2E8F0)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{isChunk ? '📡' : '🩺'}</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h, #101D2D)', margin: '0 0 10px' }}>{m.heading}</h1>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '14px', margin: '0 0 6px', lineHeight: 1.6 }}>
            {isChunk ? m.chunk : m.sub}
          </p>
          {retries > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-hint)', margin: '0 0 16px' }}>
              {canRetry ? m.left(MAX - retries) : m.maxed}
            </p>
          )}

          <details style={{ marginBottom: 24, textAlign: 'start' }}>
            <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#E97A2F', fontWeight: 700, marginBottom: 8 }}>
              ⚠️ {m.diag}
            </summary>
            <div style={{ position: 'relative' }}>
              <pre style={{
                background: '#FFF7ED', color: '#9A3412', borderRadius: '10px', padding: '12px 14px',
                fontSize: '11px', overflow: 'auto', maxHeight: '220px', whiteSpace: 'pre-wrap',
                textAlign: 'start', border: '1px solid #FED7AA', margin: 0,
              }}>
                {error?.toString()}{'\n\n'}{errorInfo?.componentStack}
              </pre>
              <button onClick={this.handleCopy} style={{
                position: 'absolute', top: 8, [isRTL ? 'left' : 'right']: 8,
                padding: '4px 10px', background: copied ? '#1A8A5A' : '#fff',
                color: copied ? '#fff' : '#9A3412', border: '1px solid currentColor',
                borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
                {copied ? m.copied : m.copy}
              </button>
            </div>
          </details>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {canRetry && (
              <button onClick={this.handleRetry} style={{ ...btnBase, background: 'var(--primary, #0E7490)', color: '#fff', border: 'none' }}
                onMouseOver={e => e.target.style.opacity = '0.85'} onMouseOut={e => e.target.style.opacity = '1'}>
                {m.retry} ↺
              </button>
            )}
            <button onClick={() => window.location.reload()} style={{
              ...btnBase, background: 'transparent', color: 'var(--primary, #0E7490)',
              border: '2px solid var(--primary, #0E7490)',
            }}>
              {m.refresh}
            </button>
            <button onClick={() => window.location.href = '/'} style={{
              ...btnBase, background: 'transparent', color: 'var(--text-muted, #64748B)',
              border: '1.5px solid var(--border, #E2E8F0)',
            }}>
              {m.home}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
