import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Particles, FloatingShapes } from './Particles';
import { GRADIENTS } from '../utils/colors';

interface BackgroundProps {
  gradient?: [string, string];
  animated?: boolean;
  particles?: boolean;
  particleColor?: string;
  shapes?: boolean;
  shapeColor?: string;
  glowColor?: string;
  vignette?: boolean;
}

export const Background: React.FC<BackgroundProps> = ({
  gradient = GRADIENTS.dark,
  animated = true,
  particles = true,
  particleColor = '#FFFFFF',
  shapes = true,
  shapeColor = '#FFFFFF',
  glowColor,
  vignette = true,
}) => {
  const frame = useCurrentFrame();
  const angle = animated ? interpolate(frame, [0, 600], [135, 155]) : 135;

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${angle}deg, ${gradient[0]}, ${gradient[1]})`,
        }}
      />

      {/* Subtle moving glow */}
      {glowColor && (
        <AbsoluteFill>
          <div
            style={{
              position: 'absolute',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}15, transparent 70%)`,
              left: `${30 + Math.sin(frame * 0.005) * 10}%`,
              top: `${20 + Math.cos(frame * 0.004) * 10}%`,
              filter: 'blur(60px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '40%',
              height: '40%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor}10, transparent 70%)`,
              right: `${20 + Math.cos(frame * 0.006) * 8}%`,
              bottom: `${15 + Math.sin(frame * 0.005) * 8}%`,
              filter: 'blur(40px)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Floating shapes */}
      {shapes && <FloatingShapes color={shapeColor} count={6} />}

      {/* Particles */}
      {particles && <Particles color={particleColor} count={25} />}

      {/* Vignette overlay */}
      {vignette && (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      )}

      {/* Subtle noise texture */}
      <AbsoluteFill
        style={{
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />
    </AbsoluteFill>
  );
};
