/**
 * PageWrapper.jsx — Phase 4 Polish
 * ==================================
 * Drop-in wrapper for every doctor/patient/hospital page.
 *
 * Features:
 *  - Consistent max-width + padding
 *  - RTL-aware direction
 *  - Optional page title + subtitle header
 *  - Optional "back" button
 *  - Smooth page-enter animation
 *  - Breadcrumb trail support
 *
 * Usage:
 *   <PageWrapper title="المواعيد" subtitle="إدارة حجوزاتك اليومية" isRTL={isRTL}>
 *     {children}
 *   </PageWrapper>
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PageWrapper({
  children,
  title,
  subtitle,
  isRTL = false,
  actions,          // optional React node (buttons top-right)
  backTo,           // optional back path
  backLabel,
  maxWidth = 1280,
  paddingX = 24,
  paddingBottom = 60,
  className = '',
  style = {},
}) {
  const navigate = useNavigate();

  return (
    <div
      className={`page-wrapper ${className}`}
      style={{
        maxWidth,
        margin:        '0 auto',
        padding:       `0 ${paddingX}px ${paddingBottom}px`,
        direction:     isRTL ? 'rtl' : 'ltr',
        animation:     'pw-enter 0.25s ease both',
        ...style,
      }}
    >
      {/* ── Page header ─────────────────────────────────────────────── */}
      {(title || backTo || actions) && (
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   28,
          gap:            16,
          flexWrap:       'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                aria-label={backLabel || (isRTL ? 'رجوع' : 'Back')}
                style={{
                  width:        40,
                  height:       40,
                  borderRadius: 'var(--radius-full)',
                  background:   'var(--bg-card)',
                  border:       '1px solid var(--border)',
                  boxShadow:    'var(--shadow-sm)',
                  cursor:       'pointer',
                  fontSize:     18,
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent:'center',
                  flexShrink:   0,
                  transition:   'var(--transition)',
                  color:        'var(--text-h)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-pale)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)';      e.currentTarget.style.color = 'var(--text-h)'; }}
              >
                {isRTL ? '→' : '←'}
              </button>
            )}
            <div>
              {title && (
                <h1 style={{
                  margin:     0,
                  fontSize:   '26px',
                  fontWeight: 900,
                  color:      'var(--text-h)',
                  lineHeight: 1.2,
                }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{
                  margin:     '5px 0 0',
                  fontSize:   '14px',
                  color:      'var(--text-hint)',
                  fontWeight: 500,
                }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div style={{
              display:    'flex',
              gap:        10,
              flexWrap:   'wrap',
              alignItems: 'center',
            }}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* ── Page content ────────────────────────────────────────────── */}
      {children}

      {/* ── Animation keyframes ─────────────────────────────────────── */}
      <style>{`
        @keyframes pw-enter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
