import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  phase: number;
}

function generateParticles(count: number, seed: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const hash = Math.sin(seed + i * 127.1) * 43758.5453;
    const h2 = Math.sin(seed + i * 269.5) * 18273.1632;
    const h3 = Math.sin(seed + i * 419.2) * 93847.2918;
    particles.push({
      x: (hash - Math.floor(hash)) * 100,
      y: (h2 - Math.floor(h2)) * 100,
      size: 2 + (h3 - Math.floor(h3)) * 6,
      speed: 0.3 + (hash - Math.floor(hash)) * 0.7,
      opacity: 0.1 + (h2 - Math.floor(h2)) * 0.25,
      phase: (h3 - Math.floor(h3)) * Math.PI * 2,
    });
  }
  return particles;
}

interface ParticlesProps {
  count?: number;
  color?: string;
  seed?: number;
}

export const Particles: React.FC<ParticlesProps> = ({
  count = 30,
  color = '#FFFFFF',
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const particles = React.useMemo(() => generateParticles(count, seed), [count, seed]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * 0.008 * p.speed + p.phase) * 8;
        const y = p.y + Math.cos(frame * 0.006 * p.speed + p.phase) * 6;
        const pulseOpacity =
          p.opacity * interpolate(Math.sin(frame * 0.02 * p.speed + p.phase), [-1, 1], [0.5, 1]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: pulseOpacity,
              filter: `blur(${p.size > 5 ? 1 : 0}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Floating geometric shapes for more dynamic backgrounds
interface FloatingShape {
  x: number;
  y: number;
  size: number;
  rotation: number;
  speed: number;
  type: 'circle' | 'ring' | 'diamond';
  opacity: number;
  phase: number;
}

function generateShapes(count: number, seed: number): FloatingShape[] {
  const shapes: FloatingShape[] = [];
  const types: FloatingShape['type'][] = ['circle', 'ring', 'diamond'];
  for (let i = 0; i < count; i++) {
    const h1 = Math.sin(seed + i * 127.1) * 43758.5453;
    const h2 = Math.sin(seed + i * 269.5) * 18273.1632;
    const h3 = Math.sin(seed + i * 419.2) * 93847.2918;
    const h4 = Math.sin(seed + i * 531.7) * 65432.1098;
    shapes.push({
      x: (h1 - Math.floor(h1)) * 100,
      y: (h2 - Math.floor(h2)) * 100,
      size: 20 + (h3 - Math.floor(h3)) * 60,
      rotation: (h4 - Math.floor(h4)) * 360,
      speed: 0.2 + (h1 - Math.floor(h1)) * 0.5,
      type: types[Math.floor((h3 - Math.floor(h3)) * 3)],
      opacity: 0.03 + (h2 - Math.floor(h2)) * 0.06,
      phase: (h4 - Math.floor(h4)) * Math.PI * 2,
    });
  }
  return shapes;
}

interface FloatingShapesProps {
  count?: number;
  color?: string;
  seed?: number;
}

export const FloatingShapes: React.FC<FloatingShapesProps> = ({
  count = 8,
  color = '#FFFFFF',
  seed = 99,
}) => {
  const frame = useCurrentFrame();
  const shapes = React.useMemo(() => generateShapes(count, seed), [count, seed]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {shapes.map((s, i) => {
        const x = s.x + Math.sin(frame * 0.005 * s.speed + s.phase) * 5;
        const y = s.y + Math.cos(frame * 0.004 * s.speed + s.phase) * 4;
        const rotation = s.rotation + frame * 0.1 * s.speed;

        const shapeStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: s.size,
          height: s.size,
          opacity: s.opacity,
          transform: `rotate(${rotation}deg)`,
        };

        if (s.type === 'circle') {
          return (
            <div key={i} style={{ ...shapeStyle, borderRadius: '50%', backgroundColor: color }} />
          );
        }
        if (s.type === 'ring') {
          return (
            <div
              key={i}
              style={{
                ...shapeStyle,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                backgroundColor: 'transparent',
              }}
            />
          );
        }
        // diamond
        return (
          <div
            key={i}
            style={{
              ...shapeStyle,
              backgroundColor: color,
              transform: `rotate(${rotation + 45}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
