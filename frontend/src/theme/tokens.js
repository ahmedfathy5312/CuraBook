export const tokens = {
  colors: {
    primary: {
      DEFAULT:  '#0E7490',
      light:    '#0891B2',
      pale:     '#E0F7FA',
      dark:     '#0C6478',
      darker:   '#083344',
      lighter:  '#E0F7FA',
      50:       '#F0FDFF',
      100:      '#E0F7FA',
      200:      '#A5F3FC',
      500:      '#0E7490',
      700:      '#0C6478',
      900:      '#083344',
    },
    success:  { DEFAULT: '#31A870', dark: '#269660', bg: '#D1FAE5', text: '#065F46', light: '#e8faf3' },
    danger:   { DEFAULT: '#E97D61', dark: '#d06548', bg: '#FEE2E2', text: '#991B1B', light: '#fef5f3' },
    warning:  { DEFAULT: '#F59E0B', dark: '#D97706', bg: '#FEF3C7', text: '#92400E', light: '#fffbeb' },
    info:     { DEFAULT: '#3B82F6', dark: '#2563EB', bg: '#DBEAFE', text: '#1E3A5F', light: '#eff6ff' },
    accent:   { DEFAULT: '#8B5CF6', dark: '#7C3AED', bg: '#F5F3FF', text: '#5B21B6', light: '#ede9fe' },
    gray: {
      50:  '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB',
      400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151',
      800: '#1F2937', 900: '#111827',
    },
    status: {
      pending:   { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B', dot: '#F59E0B', label: 'قيد الانتظار' },
      confirmed: { bg: '#D1FAE5', text: '#065F46', border: '#31A870', dot: '#10B981', label: 'مؤكد' },
      completed: { bg: '#DBEAFE', text: '#1E3A5F', border: '#3B82F6', dot: '#3B82F6', label: 'مكتمل' },
      cancelled: { bg: '#FEE2E2', text: '#991B1B', border: '#E97D61', dot: '#EF4444', label: 'ملغي' },
      rejected:  { bg: '#FEE2E2', text: '#991B1B', border: '#E97D61', dot: '#EF4444', label: 'مرفوض' },
      no_show:   { bg: '#FEF3C7', text: '#E67E22', border: '#E67E22', dot: '#E67E22', label: 'لم يحضر' },
      reschedule_requested: { bg: '#EDE9FE', text: '#6D28D9', border: '#8B5CF6', dot: '#8B5CF6', label: 'طلب تأجيل' },
      // ISSUE-007 FIX: active/inactive used in admin Badge for user/doctor/hospital/assistant status
      active:    { bg: '#D1FAE5', text: '#065F46', border: '#31A870', dot: '#10B981', label: 'نشط' },
      inactive:  { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF', dot: '#9CA3AF', label: 'غير نشط' },
    },
    border: '#E5E7EB',
    background: '#ffffff',
    text: '#111827',
  },
  shadows: {
    xs:    '0 1px 2px rgba(0,0,0,0.05)',
    sm:    '0 1px 3px rgba(0,0,0,0.08)',
    card:  '0 4px 20px rgba(0,0,0,0.06)',
    md:    '0 6px 24px rgba(0,0,0,0.08)',
    lg:    '0 8px 32px rgba(0,0,0,0.10)',
    xl:    '0 12px 48px rgba(0,0,0,0.12)',
    modal: '0 20px 60px rgba(0,0,0,0.20)',
    hover: '0 8px 32px rgba(14,116,144,0.18)',
    focus: '0 0 0 3px rgba(14,116,144,0.25)',
  },
  radius: {
    xs: '4px', sm: '8px', md: '12px', lg: '16px',
    xl: '20px', '2xl': '24px', '3xl': '32px', full: '9999px',
  },
  spacing: {
    page:    '40px',
    section: '28px',
    card:    '24px',
    gap:     '16px',
    sm:      '12px',
    xs:      '8px',
  },
  typography: {
    fontFamily: {
      ar: "'Cairo', 'Segoe UI', sans-serif",
      en: "'Poppins', 'Segoe UI', system-ui, sans-serif",
    },
    sizes: {
      xs: '11px', sm: '13px', base: '14px',
      md: '15px', lg: '18px', xl: '22px',
      '2xl': '28px', '3xl': '36px',
    },
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    lineHeights: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
  },
  transitions: {
    fast: 'all 0.15s ease',
    normal: 'all 0.3s ease',
    slow: 'all 0.5s ease',
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    toast: 1500,
    tooltip: 1600,
  },
};

// ── Sprint 3 P2-UX-5: CSS Variable Aliases ───────────────────────────────────
// Use these instead of hardcoded hex in component inline styles.
// They bridge tokens ↔ CSS custom properties set by the theme provider.
//
// Usage:
//   import { cssVar } from '../../../theme/tokens';
//   style={{ background: cssVar.primary }}
//
export const cssVar = {
  // Primary
  primary:        'var(--color-background-info, #0E7490)',
  primaryText:    'var(--color-text-info, #1E3A5F)',
  primaryBorder:  'var(--color-border-info, #3B82F6)',

  // Semantic
  danger:         'var(--color-background-danger, #FEE2E2)',
  dangerText:     'var(--color-text-danger, #991B1B)',
  success:        'var(--color-background-success, #D1FAE5)',
  successText:    'var(--color-text-success, #065F46)',
  warning:        'var(--color-background-warning, #FEF3C7)',
  warningText:    'var(--color-text-warning, #92400E)',

  // Surfaces
  bgCard:         'var(--bg-card, #ffffff)',
  bgPage:         'var(--bg-page, #F9FAFB)',
  bgSubtle:       'var(--bg-subtle, #F3F4F6)',
  bgHover:        'var(--bg-hover, #E5E7EB)',

  // Text
  textH:          'var(--text-h, #111827)',
  textBody:       'var(--text-body, #374151)',
  textMuted:      'var(--text-muted, #6B7280)',
  textHint:       'var(--text-hint, #9CA3AF)',

  // Border
  borderBase:     'var(--border-base, #E5E7EB)',
  borderStrong:   'var(--border-strong, #D1D5DB)',
};

// ── Semantic shorthand helpers ────────────────────────────────────────────────
// Replaces the common pattern `tokens?.colors?.X?.Y || '#fallback'`
export const color = {
  primary:  tokens.colors.primary.DEFAULT,
  primaryD: tokens.colors.primary.dark,
  primaryL: tokens.colors.primary.lighter,
  success:  tokens.colors.success.DEFAULT,
  successBg:tokens.colors.success.bg,
  danger:   tokens.colors.danger.DEFAULT,
  dangerBg: tokens.colors.danger.bg,
  warning:  tokens.colors.warning.DEFAULT,
  warningBg:tokens.colors.warning.bg,
  info:     tokens.colors.info.DEFAULT,
  infoBg:   tokens.colors.info.bg,
  accent:   tokens.colors.accent.DEFAULT,
  accentD:  tokens.colors.accent.dark,
};

export default tokens;