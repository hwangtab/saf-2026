import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { StatScene as StatSceneType } from '../types';
import { Background } from '../components/Background';
import { COLORS, GRADIENTS, KOREAN_TEXT } from '../utils/colors';

interface Props {
  scene: StatSceneType;
}

export const StatScene: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Parse numeric value
  const numericMatch = scene.value.match(/([\d.]+)/);
  const targetNumber = numericMatch ? parseFloat(numericMatch[1]) : 0;
  const prefix = scene.value.slice(0, scene.value.indexOf(numericMatch?.[0] || ''));
  const suffix = scene.value.slice(
    scene.value.indexOf(numericMatch?.[0] || '') + (numericMatch?.[0]?.length || 0)
  );

  // Count-up with spring
  const countProgress = spring({
    frame: frame - 12,
    fps,
    config: { damping: 40, stiffness: 60, mass: 1.2 },
  });

  const currentValue = interpolate(countProgress, [0, 1], [0, targetNumber]);
  const displayValue =
    targetNumber % 1 !== 0 ? currentValue.toFixed(1) : Math.round(currentValue).toString();

  const labelProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.6 },
  });

  const descProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.7 },
  });

  // Pulsing ring
  const ringScale = 1 + Math.sin(frame * 0.02) * 0.03;
  const ringOpacity = interpolate(countProgress, [0, 0.5, 1], [0, 0.3, 0.15]);

  return (
    <AbsoluteFill>
      <Background
        gradient={GRADIENTS.warm}
        glowColor={COLORS.sun}
        particles
        particleColor={COLORS.sun}
      />

      {/* Pulsing ring behind stat */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 520,
            height: 520,
            borderRadius: '50%',
            border: `2px solid ${COLORS.sun}`,
            opacity: ringOpacity,
            transform: `scale(${ringScale})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: '50%',
            border: `1px solid ${COLORS.primary}40`,
            opacity: ringOpacity * 0.5,
            transform: `scale(${1 + Math.sin(frame * 0.025 + 1) * 0.02})`,
          }}
        />
      </AbsoluteFill>

      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 120px',
        }}
      >
        <p
          style={{
            ...KOREAN_TEXT,
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.primarySoft,
            textAlign: 'center',
            margin: 0,
            marginBottom: 16,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: labelProgress,
            transform: `translateY(${interpolate(labelProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {scene.label}
        </p>

        <div
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 150,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.accent})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            opacity: countProgress,
            transform: `scale(${interpolate(countProgress, [0, 1], [0.6, 1])})`,
            textShadow: 'none',
            filter: `drop-shadow(0 4px 30px ${COLORS.sun}30)`,
          }}
        >
          {prefix}
          {displayValue}
          {suffix}
        </div>

        {scene.description && (
          <p
            style={{
              ...KOREAN_TEXT,
              fontFamily: '"Noto Sans KR", sans-serif',
              fontSize: 28,
              fontWeight: 400,
              color: `${COLORS.white}BB`,
              textAlign: 'center',
              lineHeight: 1.6,
              margin: 0,
              marginTop: 28,
              maxWidth: 750,
              opacity: descProgress,
              transform: `translateY(${interpolate(descProgress, [0, 1], [20, 0])}px)`,
            }}
          >
            {scene.description}
          </p>
        )}
      </AbsoluteFill>

      {/* Tick SFX at count start */}
      <Audio src={staticFile('sfx/tick.mp3')} startFrom={0} volume={0.3} />
    </AbsoluteFill>
  );
};
