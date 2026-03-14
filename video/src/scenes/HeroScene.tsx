import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { HeroScene as HeroSceneType } from '../types';
import { Background } from '../components/Background';
import { COLORS, GRADIENTS } from '../utils/colors';

interface Props {
  scene: HeroSceneType;
}

export const HeroScene: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.7 },
  });

  const lineProgress = spring({
    frame: frame - 22,
    fps,
    config: { damping: 20, stiffness: 150, mass: 0.4 },
  });

  const subtitleProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.7 },
  });

  const gradient = scene.backgroundGradient || GRADIENTS.dark;
  const isLight = gradient[0] === COLORS.primaryStrong || gradient[0] === COLORS.primary;

  return (
    <AbsoluteFill>
      <Background
        gradient={gradient}
        particles
        particleColor={isLight ? COLORS.white : COLORS.primarySoft}
        shapes
        shapeColor={isLight ? `${COLORS.white}` : COLORS.primary}
        glowColor={isLight ? COLORS.sun : COLORS.primary}
      />

      {/* Center content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 140px',
        }}
      >
        <h1
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: scene.title.length > 15 ? 72 : 88,
            fontWeight: 900,
            color: COLORS.white,
            textAlign: 'center',
            lineHeight: 1.25,
            letterSpacing: '-0.03em',
            margin: 0,
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [50, 0])}px)`,
            textShadow: '0 4px 30px rgba(0,0,0,0.3)',
            whiteSpace: 'pre-line',
          }}
        >
          {scene.title}
        </h1>

        {/* Accent line */}
        <div
          style={{
            width: interpolate(lineProgress, [0, 1], [0, 120]),
            height: 4,
            background: `linear-gradient(90deg, ${COLORS.sun}, ${COLORS.accent})`,
            borderRadius: 2,
            margin: '28px 0',
            boxShadow: `0 0 20px ${COLORS.sun}40`,
          }}
        />

        {scene.subtitle && (
          <p
            style={{
              fontFamily: '"Noto Sans KR", sans-serif',
              fontSize: 34,
              fontWeight: 400,
              color: `${COLORS.white}CC`,
              textAlign: 'center',
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 850,
              opacity: subtitleProgress,
              transform: `translateY(${interpolate(subtitleProgress, [0, 1], [25, 0])}px)`,
              whiteSpace: 'pre-line',
            }}
          >
            {scene.subtitle}
          </p>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
