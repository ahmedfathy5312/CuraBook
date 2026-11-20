import { useMemo } from 'react';

const COLORS = [
  'var(--primary)', '#31A870', '#3B82F6', '#8B5CF6',
  '#E97D61', '#F59E0B', '#10B981', '#EC4899',
];

function getColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

const SIZE_MAP = {
  'xs':  { box: 24,  font: 9  },
  'sm':  { box: 32,  font: 12 },
  'md':  { box: 40,  font: 14 },
  'lg':  { box: 48,  font: 16 },
  'xl':  { box: 56,  font: 18 },
  '2xl': { box: 72,  font: 22 },
  '3xl': { box: 96,  font: 28 },
};

export default function Avatar({ name, src, size = 'md', style = {}, className = '' }) {
  const safeName = name || '';
  const color    = useMemo(() => getColor(safeName), [safeName]);
  const initials = useMemo(() => getInitials(safeName), [safeName]);
  const { box, font } = SIZE_MAP[size] || SIZE_MAP['md'];

  const baseStyle = {
    width: box, height: box, borderRadius: '50%',
    background: color, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: font, fontWeight: 700,
    color: '#fff', flexShrink: 0, overflow: 'hidden',
    fontFamily: "'Cairo', sans-serif",
    ...style,
  };

  if (src) {
    return (
      <div style={baseStyle} className={className}>
        <img
          src={src}
          alt={name || 'Avatar'}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.style.background = color;
          }}
        />
      </div>
    );
  }

  return (
    <div style={baseStyle} className={className}>
      {initials || '?'}
    </div>
  );
}
