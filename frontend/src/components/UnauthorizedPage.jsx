/**
 * UnauthorizedPage.jsx — 403 / access denied page
 */
import { Link } from 'react-router-dom';
import { tokens } from '../theme/tokens';

export default function UnauthorizedPage() {
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
      <div style={{ fontSize: '72px', lineHeight: 1 }}>🔒</div>

      <p style={{
        margin: 0,
        fontSize: '11px',
        fontWeight: tokens.typography.weights.bold,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: tokens?.colors?.danger?.DEFAULT || '#E97D61',
        background: tokens.colors.danger.bg,
        padding: '4px 14px',
        borderRadius: tokens.radius.full,
      }}>
        403 — Access Denied
      </p>

      <h1 style={{
        margin: 0,
        fontSize: tokens.typography.sizes['3xl'],
        fontWeight: tokens.typography.weights.extrabold,
        color: tokens.colors.gray[800],
      }}>
        You don't have permission to view this page.
      </h1>

      <p style={{
        margin: 0,
        fontSize: tokens.typography.sizes.base,
        color: tokens.colors.gray[500],
        maxWidth: '300px',
      }}>
        Please log in with the correct account or contact your administrator.
      </p>

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
          marginTop: '8px',
        }}
      >
        ← Go Home
      </Link>
    </div>
  );
}
