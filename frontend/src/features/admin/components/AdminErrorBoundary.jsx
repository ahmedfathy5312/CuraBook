/**
 * AdminErrorBoundary.jsx
 * Error boundary wrapper for admin sections.
 * Catches render errors in any admin section and shows a friendly fallback
 * instead of crashing the entire dashboard.
 */
import { Component } from 'react';

export default class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for debugging; swap for Sentry/etc. in production
    console.error('[AdminErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { sectionLabel = 'هذا القسم' } = this.props;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        gap: 16,
        padding: 32,
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-base)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 40 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt-heading)', margin: '0 0 6px' }}>
            حدث خطأ في {sectionLabel}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, maxWidth: 360 }}>
            {this.state.error?.message || 'خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            background: 'var(--primary, #0E7490)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-ar, 'Cairo', sans-serif)",
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
}
