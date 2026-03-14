import React from 'react';
import {
  AbsoluteFill,
  Audio,
  spring,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { ListScene as ListSceneType } from '../types';
import { Background } from '../components/Background';
import { COLORS, GRADIENTS, KOREAN_TEXT } from '../utils/colors';

interface Props {
  scene: ListSceneType;
}

export const ListScene: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.6 },
  });

  return (
    <AbsoluteFill>
      <Background
        gradient={GRADIENTS.dark}
        glowColor={COLORS.primary}
        particles
        particleColor={COLORS.primarySoft}
      />

      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: '15%',
          bottom: '15%',
          width: 4,
          background: `linear-gradient(to bottom, ${COLORS.sun}00, ${COLORS.sun}, ${COLORS.sun}00)`,
          opacity: titleProgress * 0.5,
          borderRadius: 2,
        }}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 130px',
        }}
      >
        <h2
          style={{
            ...KOREAN_TEXT,
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 54,
            fontWeight: 800,
            color: COLORS.white,
            margin: 0,
            marginBottom: 44,
            letterSpacing: '-0.02em',
            opacity: titleProgress,
            transform: `translateX(${interpolate(titleProgress, [0, 1], [-30, 0])}px)`,
          }}
        >
          {scene.title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {scene.items.map((item, i) => {
            const itemProgress = spring({
              frame: frame - 18 - i * 10,
              fps,
              config: { damping: 16, stiffness: 120, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 20,
                  opacity: itemProgress,
                  transform: `translateX(${interpolate(itemProgress, [0, 1], [40, 0])}px)`,
                }}
              >
                {/* Numbered bullet */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.accent})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '"Noto Sans KR", sans-serif',
                    fontSize: 16,
                    fontWeight: 800,
                    color: COLORS.charcoal,
                    flexShrink: 0,
                    marginTop: 6,
                    boxShadow: `0 2px 12px ${COLORS.sun}30`,
                  }}
                >
                  {i + 1}
                </div>
                <p
                  style={{
                    ...KOREAN_TEXT,
                    fontFamily: '"Noto Sans KR", sans-serif',
                    fontSize: 32,
                    fontWeight: 400,
                    color: `${COLORS.white}DD`,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Pop SFX for first item */}
      <Audio src={staticFile('sfx/pop.mp3')} startFrom={0} volume={0.2} />
    </AbsoluteFill>
  );
};
