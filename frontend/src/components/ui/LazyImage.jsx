/**
 * LazyImage.jsx — Phase 4 Performance
 * =====================================
 * Progressive image loader:
 *  1. Shows a skeleton placeholder while loading
 *  2. Fades image in once loaded (blur-up effect)
 *  3. Uses native loading="lazy" + IntersectionObserver fallback
 *  4. Handles broken images with fallback UI
 *  5. Supports avatar-style circular mode
 *
 * Usage:
 *   <LazyImage src={url} alt="Photo" width={200} height={200} rounded />
 *   <LazyImage src={url} alt="Cover" aspectRatio="16/9" />
 */

import React, { useState, useRef, useEffect } from 'react';

export default function LazyImage({
  src,
  alt = '',
  width,
  height,
  aspectRatio,      // e.g. '16/9', '1/1', '4/3'
  rounded = false,  // full circle (avatar)
  radius,           // explicit border-radius value
  objectFit = 'cover',
  fallbackIcon = '🖼️',
  fallbackText,
  className = '',
  style = {},
  onLoad,
  onError,
  ...rest
}) {
  const [status, setStatus] = useState('loading');   // loading | loaded | error
  const [inView,  setInView]  = useState(false);
  const ref = useRef(null);

  // ── IntersectionObserver for browsers without native lazy ─────────────
  useEffect(() => {
    if (!src) { setStatus('error'); return; }
    if (!('IntersectionObserver' in window)) { setInView(true); return; }

    const el  = ref.current;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '200px' },
    );
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [src]);

  const borderRadius = rounded ? '50%' : (radius || undefined);

  const containerStyle = {
    position:   'relative',
    overflow:   'hidden',
    width,
    height,
    borderRadius,
    background: 'var(--border)',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(aspectRatio ? { aspectRatio, width: '100%' } : {}),
    ...style,
  };

  const imgStyle = {
    width:      '100%',
    height:     '100%',
    objectFit,
    borderRadius,
    display:    'block',
    transition: 'opacity 0.35s ease, filter 0.35s ease',
    opacity:    status === 'loaded' ? 1 : 0,
    filter:     status === 'loaded' ? 'blur(0px)' : 'blur(6px)',
  };

  return (
    <div ref={ref} className={`lazy-img-wrap ${className}`} style={containerStyle} {...rest}>
      {/* Skeleton shimmer while loading */}
      {status === 'loading' && (
        <div style={{
          position:       'absolute',
          inset:          0,
          background:     'linear-gradient(90deg, var(--border) 25%, #f0f4f8 50%, var(--border) 75%)',
          backgroundSize: '200% 100%',
          animation:      'lazy-shimmer 1.4s ease-in-out infinite',
          borderRadius,
        }} />
      )}

      {/* Error fallback */}
      {status === 'error' && (
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     'var(--bg-page)',
          borderRadius,
          gap:            6,
        }}>
          <span style={{ fontSize: Math.min((Number(width) || 60) * 0.4, 32), opacity: 0.5 }}>{fallbackIcon}</span>
          {fallbackText && (
            <span style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', padding: '0 8px' }}>{fallbackText}</span>
          )}
        </div>
      )}

      {/* Actual image — only request network once in viewport */}
      {inView && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={imgStyle}
          onLoad={() => { setStatus('loaded'); onLoad?.(); }}
          onError={() => { setStatus('error'); onError?.(); }}
        />
      )}

      <style>{`
        @keyframes lazy-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}
