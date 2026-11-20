/**
 * NotFoundPage.jsx — 404 page using design tokens
 * Used for any unknown route via <Route path="*" element={<NotFoundPage />} />
 */
import { Link } from 'react-router-dom';
import { tokens } from '../theme/tokens';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: tokens.spacing.gap,
        background: tokens.colors.background,
        fontFamily: tokens.typography.fontFamily,
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {/* Animated icon */}
      <div style={{ fontSize: '80px', lineHeight: 1, animation: 'nf-bounce 2s ease infinite' }}>
        🔍
      </div>

      {/* Error code */}
      <p style={{
        margin: 0,
        fontSize: '11px',
        fontWeight: tokens.typography.weights.bold,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: tokens?.colors?.primary?.DEFAULT || '#0E7490',
        background: tokens?.colors?.primary?.lighter || '#E0F7FA',
        padding: '4px 14px',
        borderRadius: tokens.radius.full,
      }}>
        404 — Page Not Found
      </p>

      {/* Headline */}
      <h1 style={{
        margin: 0,
        fontSize: tokens.typography.sizes['3xl'],
        fontWeight: tokens.typography.weights.extrabold,
        color: tokens.colors.gray[800],
        maxWidth: '360px',
        lineHeight: tokens.typography.lineHeights.tight,
      }}>
        Oops! This page doesn't exist.
      </h1>

      {/* Sub-text */}
      <p style={{
        margin: 0,
        fontSize: tokens.typography.sizes.base,
        color: tokens.colors.gray[500],
        maxWidth: '320px',
        lineHeight: tokens.typography.lineHeights.normal,
      }}>
        The page you're looking for may have been moved, deleted, or never existed.
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: tokens.spacing.gap, flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
        <Link
          to="/"
          style={{
            background: tokens?.colors?.primary?.DEFAULT || '#0E7490',
            color: '#fff',
            padding: '12px 32px',
            borderRadius: tokens.radius.full,
            fontWeight: tokens.typography.weights.semibold,
            fontSize: tokens.typography.sizes.base,
            textDecoration: 'none',
            transition: tokens.transitions.fast,
            boxShadow: tokens.shadows.hover,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = tokens?.colors?.primary?.dark || '#0C6478'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = tokens?.colors?.primary?.DEFAULT || '#0E7490'; }}
        >
          ← Go Home
        </Link>

        <button
          onClick={() => window.history.back()}
          style={{
            background: 'transparent',
            color: tokens?.colors?.primary?.DEFAULT || '#0E7490',
            padding: '12px 32px',
            borderRadius: tokens.radius.full,
            fontWeight: tokens.typography.weights.semibold,
            fontSize: tokens.typography.sizes.base,
            border: `2px solid ${tokens?.colors?.primary?.DEFAULT || '#0E7490'}`,
            cursor: 'pointer',
            fontFamily: tokens.typography.fontFamily,
            transition: tokens.transitions.fast,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = tokens?.colors?.primary?.lighter || '#E0F7FA'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          ← Go Back
        </button>
      </div>

      <style>{`
        @keyframes nf-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
