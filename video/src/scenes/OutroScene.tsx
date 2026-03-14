import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Particles } from '../components/Particles';
import { COLORS } from '../utils/colors';

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.7 },
  });

  const urlProgress = spring({
    frame: frame - 35,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.6 },
  });

  const ctaProgress = spring({
    frame: frame - 55,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });

  const buttonPulse = 1 + Math.sin(frame * 0.06) * 0.03;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0E4ECF' }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(145deg, #0E4ECF, #2176FF)`,
        }}
      />

      <Particles color={COLORS.white} count={30} seed={13} />

      {/* Decorative large ring */}
      <div
        style={{
          position: 'absolute',
          right: -150,
          top: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: `2px solid ${COLORS.white}15`,
          opacity: titleProgress,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -100,
          bottom: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          border: `2px solid ${COLORS.white}10`,
          opacity: titleProgress,
        }}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 70,
            opacity: titleProgress,
            transform: `scale(${titleProgress})`,
            marginBottom: 16,
          }}
        >
          🌱
        </div>

        {/* Main CTA */}
        <h1
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 64,
            fontWeight: 900,
            color: COLORS.white,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [40, 0])}px)`,
          }}
        >
          지금 함께해 주세요
        </h1>

        {/* URL */}
        <div
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.sunSoft,
            marginTop: 16,
            letterSpacing: '0.05em',
            opacity: urlProgress,
            transform: `translateY(${interpolate(urlProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          saf2026.com
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 40,
            opacity: ctaProgress,
            transform: `translateY(${interpolate(ctaProgress, [0, 1], [30, 0])}px) scale(${buttonPulse})`,
          }}
        >
          {['작품 구매', '후원하기', '공유하기'].map((label, i) => (
            <div
              key={i}
              style={{
                fontFamily: '"Noto Sans KR", sans-serif',
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.primary,
                backgroundColor: COLORS.white,
                padding: '14px 32px',
                borderRadius: 50,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Subscribe hint */}
        <div
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 20,
            fontWeight: 400,
            color: `${COLORS.white}90`,
            marginTop: 50,
            opacity: ctaProgress,
          }}
        >
          구독과 좋아요로 예술인을 응원해 주세요
        </div>
      </AbsoluteFill>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
