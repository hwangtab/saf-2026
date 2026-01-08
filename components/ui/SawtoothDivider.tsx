import React from 'react';
import { cn } from '@/lib/utils';

interface SawtoothDividerProps {
  /**
   * Position of the divider relative to the section it belongs to.
   * 'top': Points upwards (color eats into upper section)
   * 'bottom': Points upwards (color extends from bottom of upper section)
   * Basically, the pattern is always upward pointing triangles.
   * If 'top', it should normally be placed at the top of the element.
   * If 'bottom', it should be placed at the bottom of the element.
   */
  position?: 'top' | 'bottom';
  className?: string;
  colorClass?: string;
}

export default function SawtoothDivider({
  position = 'bottom',
  className,
  colorClass = 'text-canvas-soft',
}: SawtoothDividerProps) {
  return (
    <div
      className={cn(
        'w-full leading-none z-10 h-6 md:h-10 pointer-events-none absolute left-0',
        position === 'bottom' ? 'bottom-0' : 'top-0 -translate-y-full',
        className
      )}
      aria-hidden="true"
    >
      <svg
        className={cn('w-full h-full fill-current', colorClass)}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`sawtooth-mobile-${colorClass?.replace(/[^a-z0-9]/gi, '')}`}
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <polygon points="0,24 12,0 24,24" />
          </pattern>
          <pattern
            id={`sawtooth-desktop-${colorClass?.replace(/[^a-z0-9]/gi, '')}`}
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <polygon points="0,40 20,0 40,40" />
          </pattern>
        </defs>
        <style>
          {`
            .sawtooth-rect-${colorClass?.replace(/[^a-z0-9]/gi, '')} {
              fill: url(#sawtooth-mobile-${colorClass?.replace(/[^a-z0-9]/gi, '')});
            }
            @media (min-width: 768px) {
              .sawtooth-rect-${colorClass?.replace(/[^a-z0-9]/gi, '')} {
                fill: url(#sawtooth-desktop-${colorClass?.replace(/[^a-z0-9]/gi, '')});
              }
            }
          `}
        </style>
        <rect
          className={`sawtooth-rect-${colorClass?.replace(/[^a-z0-9]/gi, '')}`}
          x="0"
          y="0"
          width="100%"
          height="100%"
        />
      </svg>
    </div>
  );
}
