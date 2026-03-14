import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  spring,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { GridScene as GridSceneType } from '../types';
import { Background } from '../components/Background';
import { COLORS, GRADIENTS } from '../utils/colors';

interface Props {
  scene: GridSceneType;
}

export const GridScene: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.6 },
  });

  const columns = scene.cards.length <= 3 ? scene.cards.length : Math.min(3, scene.cards.length);

  return (
    <AbsoluteFill>
      <Background
        gradient={GRADIENTS.dark}
        glowColor={COLORS.primary}
        particles
        particleColor={COLORS.primarySoft}
        shapes
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '50px 100px',
        }}
      >
        <h2
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 50,
            fontWeight: 800,
            color: COLORS.white,
            margin: 0,
            marginBottom: 44,
            letterSpacing: '-0.02em',
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          {scene.title}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 24,
          }}
        >
          {scene.cards.map((card, i) => {
            const cardProgress = spring({
              frame: frame - 15 - i * 8,
              fps,
              config: { damping: 14, stiffness: 100, mass: 0.7 },
            });

            const hasImage = card.image;

            return (
              <div
                key={i}
                style={{
                  background: `linear-gradient(145deg, ${COLORS.white}0A, ${COLORS.white}04)`,
                  border: `1px solid ${COLORS.white}12`,
                  borderRadius: 20,
                  overflow: 'hidden',
                  opacity: cardProgress,
                  transform: `translateY(${interpolate(cardProgress, [0, 1], [40, 0])}px) scale(${interpolate(cardProgress, [0, 1], [0.95, 1])})`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                {/* Image with Ken Burns */}
                {hasImage && (
                  <div style={{ overflow: 'hidden', height: 280 }}>
                    <Img
                      src={staticFile(card.image!)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: `scale(${interpolate(frame, [0, 300], [1, 1.15])}) translateY(${interpolate(frame, [0, 300], [0, -10])}px)`,
                      }}
                    />
                  </div>
                )}

                <div style={{ padding: hasImage ? '20px 28px' : '34px 30px' }}>
                  <div
                    style={{
                      fontFamily: '"Noto Sans KR", sans-serif',
                      fontSize: 18,
                      fontWeight: 600,
                      color: COLORS.primarySoft,
                      marginBottom: 8,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontFamily: '"Noto Sans KR", sans-serif',
                      fontSize: hasImage ? 28 : 36,
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.accent})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: card.description ? 12 : 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {card.value}
                  </div>
                  {card.description && (
                    <div
                      style={{
                        fontFamily: '"Noto Sans KR", sans-serif',
                        fontSize: 20,
                        fontWeight: 400,
                        color: `${COLORS.white}AA`,
                        lineHeight: 1.5,
                      }}
                    >
                      {card.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('sfx/pop.mp3')} startFrom={0} volume={0.15} />
    </AbsoluteFill>
  );
};
