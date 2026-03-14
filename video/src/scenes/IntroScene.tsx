import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Particles } from '../components/Particles';
import { COLORS } from '../utils/colors';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Seed icon animation
  const seedScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 8, stiffness: 80, mass: 0.8 },
  });

  const seedRotation = interpolate(frame, [10, 50], [-20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // SAF text reveal
  const safProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  // 2026 text
  const yearProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  // Underline
  const lineWidth = spring({
    frame: frame - 50,
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.5 },
  });

  // Subtitle
  const subtitleProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.7 },
  });

  // Background glow pulse
  const glowSize = 400 + Math.sin(frame * 0.015) * 50;

  return (
    <AbsoluteFill style={{ backgroundColor: '#111418' }}>
      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, #1a2332 0%, #111418 70%)`,
        }}
      />

      {/* Moving glow behind logo */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '45%',
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}20, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          filter: 'blur(40px)',
          opacity: seedScale,
        }}
      />

      <Particles color={COLORS.sun} count={20} seed={7} />

      {/* Center content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Seed emoji */}
        <div
          style={{
            fontSize: 100,
            marginBottom: 24,
            opacity: seedScale,
            transform: `scale(${seedScale}) rotate(${seedRotation}deg)`,
          }}
        >
          🌱
        </div>

        {/* SAF text */}
        <div
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 120,
            fontWeight: 900,
            color: COLORS.white,
            letterSpacing: '0.15em',
            opacity: safProgress,
            transform: `translateY(${interpolate(safProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          SAF
        </div>

        {/* 2026 */}
        <div
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 48,
            fontWeight: 300,
            color: COLORS.sun,
            letterSpacing: '0.3em',
            marginTop: -8,
            opacity: yearProgress,
            transform: `translateY(${interpolate(yearProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          2 0 2 6
        </div>

        {/* Underline */}
        <div
          style={{
            width: interpolate(lineWidth, [0, 1], [0, 200]),
            height: 3,
            backgroundColor: COLORS.sun,
            marginTop: 24,
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 28,
            fontWeight: 400,
            color: COLORS.gray300,
            marginTop: 28,
            letterSpacing: '0.08em',
            opacity: subtitleProgress,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          씨앗예술제 · Seed Art Festival
        </div>
      </AbsoluteFill>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
