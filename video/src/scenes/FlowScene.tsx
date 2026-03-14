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
import type { FlowScene as FlowSceneType } from '../types';
import { Background } from '../components/Background';
import { COLORS, GRADIENTS, KOREAN_TEXT } from '../utils/colors';

interface Props {
  scene: FlowSceneType;
}

export const FlowScene: React.FC<Props> = ({ scene }) => {
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
        gradient={GRADIENTS.primary}
        glowColor={COLORS.sun}
        particles
        particleColor={COLORS.white}
        shapeColor={COLORS.white}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '50px 80px',
        }}
      >
        <h2
          style={{
            ...KOREAN_TEXT,
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 50,
            fontWeight: 800,
            color: COLORS.white,
            margin: 0,
            marginBottom: 60,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          {scene.title}
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 0,
          }}
        >
          {scene.steps.map((step, i) => {
            const isLast = i === scene.steps.length - 1;

            const stepProgress = spring({
              frame: frame - 18 - i * 14,
              fps,
              config: { damping: 12, stiffness: 90, mass: 0.7 },
            });

            const arrowProgress = spring({
              frame: frame - 28 - i * 14,
              fps,
              config: { damping: 20, stiffness: 150, mass: 0.4 },
            });

            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 200,
                    opacity: stepProgress,
                    transform: `translateY(${interpolate(stepProgress, [0, 1], [30, 0])}px) scale(${interpolate(stepProgress, [0, 1], [0.9, 1])})`,
                  }}
                >
                  {/* Circle with number */}
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.accent})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: '"Noto Sans KR", sans-serif',
                      fontSize: 30,
                      fontWeight: 900,
                      color: COLORS.charcoal,
                      marginBottom: 18,
                      boxShadow: `0 4px 20px ${COLORS.sun}40`,
                    }}
                  >
                    {i + 1}
                  </div>

                  <div
                    style={{
                      ...KOREAN_TEXT,
                      fontFamily: '"Noto Sans KR", sans-serif',
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.white,
                      textAlign: 'center',
                      marginBottom: 8,
                      lineHeight: 1.4,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {step.label}
                  </div>

                  {step.description && (
                    <div
                      style={{
                        ...KOREAN_TEXT,
                        fontFamily: '"Noto Sans KR", sans-serif',
                        fontSize: 16,
                        fontWeight: 400,
                        color: `${COLORS.white}BB`,
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      {step.description}
                    </div>
                  )}
                </div>

                {/* Arrow connector */}
                {!isLast && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: 26,
                      opacity: arrowProgress,
                      transform: `scaleX(${arrowProgress})`,
                    }}
                  >
                    <div
                      style={{
                        width: 50,
                        height: 2,
                        background: `linear-gradient(90deg, ${COLORS.white}60, ${COLORS.sun}80)`,
                      }}
                    />
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderTop: '7px solid transparent',
                        borderBottom: '7px solid transparent',
                        borderLeft: `10px solid ${COLORS.sun}80`,
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('sfx/pop.mp3')} startFrom={0} volume={0.15} />
    </AbsoluteFill>
  );
};
