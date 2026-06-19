/**
 * Monochrome inline-SVG icon set.
 * All icons use currentColor — size/color via className or style on the parent.
 */

interface IconProps {
  readonly size?: number;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly strokeWidth?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  display: 'inline-block',
  flexShrink: 0,
});

export function IconTrophy({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a1 1 0 0 0-1 1v2a5 5 0 0 0 5 5h.5" />
      <path d="M17 4h3a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5h-.5" />
      <path d="M7 4a5 5 0 0 0 5 9 5 5 0 0 0 5-9H7z" />
    </svg>
  );
}

export function IconTarget({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconUser({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function IconSun({ size = 18, className, style, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function IconMoon({ size = 18, className, style, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconSword({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  );
}

export function IconCrossedSwords({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      {/* blade 1 top-left → bottom-right */}
      <line x1="4" y1="4" x2="20" y2="20" />
      {/* guard 1 */}
      <line x1="14" y1="22" x2="22" y2="14" />
      {/* blade 2 top-right → bottom-left */}
      <line x1="20" y1="4" x2="4" y2="20" />
      {/* guard 2 */}
      <line x1="2" y1="14" x2="10" y2="22" />
    </svg>
  );
}

export function IconBolt({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function IconFlag({ size = 18, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function IconShield({ size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconAlertTriangle({ size = 22, className, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconStar({ size = 18, filled = false, className, style, strokeWidth = 1.6 }: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...base(size)}
      strokeWidth={strokeWidth}
      fill={filled ? 'currentColor' : 'none'}
      className={className}
      style={style}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
