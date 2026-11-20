/**
 * designSystem.js — CuraBook Phase 4 Polish
 * ==========================================
 * Centralised style-helper functions so every component reads from
 * ONE source of truth instead of repeating inline style literals.
 *
 * Usage:
 *   import { ds } from '../theme/designSystem';
 *
 *   <div style={ds.card()}>…</div>
 *   <div style={ds.hero()}>…</div>
 *   <button style={ds.btn('primary')}>…</button>
 */

import tokens from './tokens';

// ── Safe token aliases ─────────────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PD  = tokens?.colors?.primary?.dark     || '#0C6478';
const PL  = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const S   = tokens?.colors?.success?.DEFAULT  || '#1A8A5A';
const D   = tokens?.colors?.danger?.DEFAULT   || '#D93025';
const W   = tokens?.colors?.warning?.DEFAULT  || '#E97A2F';
const A   = tokens?.colors?.accent?.DEFAULT   || '#8B5CF6';

const shadow = (key) => tokens?.shadows?.[key] || {
  sm:    '0 1px 3px rgba(0,0,0,0.08)',
  md:    '0 6px 24px rgba(0,0,0,0.08)',
  lg:    '0 8px 32px rgba(0,0,0,0.10)',
  xl:    '0 12px 48px rgba(0,0,0,0.12)',
  card:  '0 1px 3px rgba(0,0,0,0.05)',
  hover: `0 8px 30px rgba(14,116,144,0.12)`,
  modal: '0 20px 50px rgba(15,23,42,0.15)',
}[key] || '0 2px 8px rgba(0,0,0,0.06)';

// ── Base style blocks ──────────────────────────────────────────────────────
export const ds = {

  // ── Cards ──────────────────────────────────────────────────────────────
  card: (overrides = {}) => ({
    background:   'var(--bg-card)',
    borderRadius: 'var(--radius-2xl)',
    padding:      '28px 32px',
    boxShadow:    shadow('card'),
    border:       '1px solid var(--border)',
    ...overrides,
  }),

  cardHover: (overrides = {}) => ({
    ...ds.card(),
    cursor:     'pointer',
    transition: 'var(--transition)',
    ...overrides,
  }),

  sectionCard: (overrides = {}) => ({
    ...ds.card(),
    marginBottom: 'var(--space-section, 28px)',
    ...overrides,
  }),

  // ── Hero gradient header ───────────────────────────────────────────────
  hero: (overrides = {}) => ({
    background:   `linear-gradient(135deg, ${P} 0%, ${PD} 100%)`,
    borderRadius: 'var(--radius-2xl)',
    padding:      '40px',
    color:        '#fff',
    boxShadow:    shadow('lg'),
    position:     'relative',
    overflow:     'hidden',
    marginBottom: '28px',
    ...overrides,
  }),

  // ── Stat pills (inside hero) ───────────────────────────────────────────
  statPill: (overrides = {}) => ({
    display:        'flex',
    gap:            12,
    background:     'rgba(255,255,255,0.12)',
    padding:        '20px 28px',
    borderRadius:   'var(--radius-xl)',
    backdropFilter: 'blur(10px)',
    border:         '1px solid rgba(255,255,255,0.2)',
    flexWrap:       'wrap',
    ...overrides,
  }),

  // ── Section header row ─────────────────────────────────────────────────
  sectionHeader: (overrides = {}) => ({
    display:       'flex',
    justifyContent:'space-between',
    alignItems:    'center',
    marginBottom:  '20px',
    ...overrides,
  }),

  sectionTitle: (overrides = {}) => ({
    fontSize:   '20px',
    fontWeight: 800,
    color:      'var(--text-h)',
    margin:     0,
    ...overrides,
  }),

  sectionSubtitle: (overrides = {}) => ({
    fontSize:   '13px',
    color:      'var(--text-hint)',
    margin:     '4px 0 0',
    ...overrides,
  }),

  // ── Buttons ────────────────────────────────────────────────────────────
  btn: (variant = 'primary', size = 'md', overrides = {}) => {
    const sizes = {
      xs: { padding: '6px 14px',  fontSize: '12px', borderRadius: 'var(--radius-pill)' },
      sm: { padding: '8px 18px',  fontSize: '13px', borderRadius: 'var(--radius-pill)' },
      md: { padding: '10px 24px', fontSize: '14px', borderRadius: 'var(--radius-pill)' },
      lg: { padding: '13px 32px', fontSize: '15px', borderRadius: 'var(--radius-pill)' },
    };
    const variants = {
      primary:   { background: P,                            color: '#fff', border: 'none' },
      secondary: { background: PL,                           color: P,     border: 'none' },
      ghost:     { background: 'transparent',                color: P,     border: `1px solid var(--border)` },
      danger:    { background: D,                            color: '#fff', border: 'none' },
      success:   { background: S,                            color: '#fff', border: 'none' },
      warning:   { background: W,                            color: '#fff', border: 'none' },
      accent:    { background: A,                            color: '#fff', border: 'none' },
    };
    return {
      ...sizes[size]  || sizes.md,
      ...variants[variant] || variants.primary,
      cursor:     'pointer',
      fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'var(--transition)',
      display:    'inline-flex',
      alignItems: 'center',
      gap:        '8px',
      ...overrides,
    };
  },

  // ── Link-style pill (view-all, etc.) ──────────────────────────────────
  linkPill: (overrides = {}) => ({
    padding:        '8px 20px',
    background:     PL,
    borderRadius:   'var(--radius-pill)',
    color:          P,
    textDecoration: 'none',
    fontSize:       '14px',
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'var(--transition)',
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '6px',
    ...overrides,
  }),

  // ── Alert / notice banner ──────────────────────────────────────────────
  alertBanner: (variant = 'warning', overrides = {}) => {
    const map = {
      warning: { bg: `${W}15`, border: `${W}40`, icon: '⚠️' },
      danger:  { bg: `${D}12`, border: `${D}35`, icon: '🚨' },
      info:    { bg: `${P}10`, border: `${P}30`, icon: 'ℹ️' },
      success: { bg: `${S}12`, border: `${S}35`, icon: '✅' },
    };
    const t = map[variant] || map.info;
    return {
      background:   t.bg,
      border:       `2px solid ${t.border}`,
      borderRadius: 'var(--radius-xl)',
      padding:      '20px 28px',
      marginBottom: '28px',
      ...overrides,
    };
  },

  // ── Grid layouts ───────────────────────────────────────────────────────
  grid: {
    quickAccess: {
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap:                 '16px',
      marginBottom:        '32px',
    },
    dashboardMain: {
      display:             'grid',
      gridTemplateColumns: '3fr 1fr',
      gap:                 '24px',
      alignItems:          'start',
    },
    twoCol: {
      display:             'grid',
      gridTemplateColumns: '1fr 1fr',
      gap:                 '20px',
    },
    threeCol: {
      display:             'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap:                 '20px',
    },
    kpiCards: {
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap:                 '20px',
      marginBottom:        '28px',
    },
  },

  // ── Input / form fields ────────────────────────────────────────────────
  input: (overrides = {}) => ({
    width:        '100%',
    padding:      '12px 16px',
    border:       '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize:     '14px',
    color:        'var(--text-h)',
    background:   'var(--bg-card)',
    outline:      'none',
    fontFamily:   'inherit',
    transition:   'border-color 0.2s',
    ...overrides,
  }),

  label: (overrides = {}) => ({
    display:     'block',
    fontSize:    '13px',
    fontWeight:  700,
    color:       'var(--text-muted)',
    marginBottom:'6px',
    ...overrides,
  }),

  formGroup: (overrides = {}) => ({
    marginBottom: '20px',
    ...overrides,
  }),

  // ── Table ──────────────────────────────────────────────────────────────
  tableHeader: (overrides = {}) => ({
    background:  'var(--bg-page)',
    padding:     '14px 16px',
    textAlign:   'start',
    fontWeight:  700,
    fontSize:    '12px',
    color:       'var(--text-muted)',
    textTransform:'uppercase',
    letterSpacing:'0.5px',
    borderBottom: '1px solid var(--border)',
    ...overrides,
  }),

  tableCell: (overrides = {}) => ({
    padding:     '14px 16px',
    fontSize:    '14px',
    color:       'var(--text-body)',
    borderBottom: '1px solid var(--border)',
    verticalAlign:'middle',
    ...overrides,
  }),

  // ── Modal ──────────────────────────────────────────────────────────────
  modalOverlay: (overrides = {}) => ({
    position:       'fixed',
    inset:          0,
    background:     'rgba(15,23,42,0.55)',
    backdropFilter: 'blur(4px)',
    zIndex:         9000,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '20px',
    ...overrides,
  }),

  modalBox: (overrides = {}) => ({
    background:   'var(--bg-card)',
    borderRadius: 'var(--radius-2xl)',
    boxShadow:    shadow('modal'),
    padding:      '40px',
    width:        '100%',
    maxWidth:     '520px',
    position:     'relative',
    maxHeight:    '90vh',
    overflowY:    'auto',
    ...overrides,
  }),

  // ── Badge / tag ────────────────────────────────────────────────────────
  badge: (color = P, overrides = {}) => ({
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '5px',
    padding:      '4px 12px',
    borderRadius: 'var(--radius-pill)',
    fontSize:     '12px',
    fontWeight:   700,
    background:   color + '18',
    color:        color,
    border:       `1px solid ${color}30`,
    ...overrides,
  }),

  // ── Divider ────────────────────────────────────────────────────────────
  divider: (overrides = {}) => ({
    height:     '1px',
    background: 'var(--border)',
    margin:     '20px 0',
    border:     'none',
    ...overrides,
  }),

  // ── Timeline dot ───────────────────────────────────────────────────────
  timelineDot: (color = P, overrides = {}) => ({
    width:        '12px',
    height:       '12px',
    borderRadius: '50%',
    background:   color,
    flexShrink:   0,
    marginTop:    '4px',
    boxShadow:    `0 0 0 3px ${color}25`,
    ...overrides,
  }),

  // ── Page container (wraps entire page content) ─────────────────────────
  page: (overrides = {}) => ({
    maxWidth:      '1280px',
    margin:        '0 auto',
    padding:       '0 24px 60px',
    ...overrides,
  }),

  // ── Empty state ────────────────────────────────────────────────────────
  emptyState: (overrides = {}) => ({
    textAlign:  'center',
    padding:    '60px 24px',
    color:      'var(--text-muted)',
    ...overrides,
  }),

  // ── Skeleton pulse ─────────────────────────────────────────────────────
  skeleton: (w = '100%', h = '16px', radius = 'var(--radius-sm)', overrides = {}) => ({
    width:       w,
    height:      h,
    borderRadius:radius,
    background:  'linear-gradient(90deg, var(--border) 25%, #f0f4f8 50%, var(--border) 75%)',
    backgroundSize: '200% 100%',
    animation:   'ds-shimmer 1.4s ease-in-out infinite',
    ...overrides,
  }),
};

export default ds;
