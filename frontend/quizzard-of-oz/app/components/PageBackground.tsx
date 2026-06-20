'use client';

import { type CSSProperties, type ReactNode } from 'react';

export interface PageBackgroundOrb {
  id: string;
  width: string;
  height: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  background: string;
  animation: string;
  className?: string;
}

interface Props {
  readonly gridColor?: string;
  readonly scanColor?: string;
  readonly scanAnimation?: string;
  readonly orbs?: readonly PageBackgroundOrb[];
  readonly children?: ReactNode;
}

export default function PageBackground({
  gridColor = 'rgba(255,200,0,0.022)',
  scanColor = 'rgba(255,200,0,0.12)',
  scanAnimation = 'scanDown 10s linear 0.5s infinite',
  orbs = [],
  children,
}: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${scanColor} 40%, ${scanColor} 60%, transparent 100%)`,
          animation: scanAnimation,
        }}
      />
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={orb.className ? `absolute ${orb.className}` : 'absolute'}
          style={{
            width: orb.width,
            height: orb.height,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            bottom: orb.bottom,
            background: orb.background,
            animation: orb.animation,
          } as CSSProperties}
        />
      ))}
      {children}
    </div>
  );
}
