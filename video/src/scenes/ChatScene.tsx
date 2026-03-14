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
import type { ChatScene as ChatSceneType } from '../types';
import { Background } from '../components/Background';
import { COLORS, GRADIENTS } from '../utils/colors';

interface Props {
  scene: ChatSceneType;
}

export const ChatScene: React.FC<Props> = ({ scene }) => {
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
        gradient={GRADIENTS.warm}
        glowColor={COLORS.danger}
        particles
        particleColor={COLORS.sun}
        shapeColor={COLORS.sun}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '50px 120px',
        }}
      >
        <h2
          style={{
            fontFamily: '"Noto Sans KR", sans-serif',
            fontSize: 46,
            fontWeight: 800,
            color: COLORS.white,
            margin: 0,
            marginBottom: 36,
            letterSpacing: '-0.02em',
            opacity: titleProgress,
            transform: `translateX(${interpolate(titleProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          {scene.title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {scene.messages.map((msg, i) => {
            const msgProgress = spring({
              frame: frame - 15 - i * 18,
              fps,
              config: { damping: 14, stiffness: 80, mass: 0.8 },
            });

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '88%',
                  opacity: msgProgress,
                  transform: `translateX(${interpolate(msgProgress, [0, 1], [-30, 0])}px)`,
                }}
              >
                {/* Chat bubble */}
                <div
                  style={{
                    background: `linear-gradient(145deg, ${COLORS.white}0D, ${COLORS.white}06)`,
                    border: `1px solid ${COLORS.white}10`,
                    borderRadius: '20px 20px 20px 4px',
                    padding: '22px 30px',
                    backdropFilter: 'blur(8px)',
                    position: 'relative',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Quote mark */}
                  <span
                    style={{
                      position: 'absolute',
                      top: -8,
                      left: 16,
                      fontSize: 40,
                      color: COLORS.sun,
                      opacity: 0.6,
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1,
                    }}
                  >
                    &ldquo;
                  </span>

                  <p
                    style={{
                      fontFamily: '"Noto Sans KR", sans-serif',
                      fontSize: 26,
                      fontWeight: 400,
                      color: `${COLORS.white}EE`,
                      margin: 0,
                      lineHeight: 1.6,
                      paddingLeft: 4,
                    }}
                  >
                    {msg.text}
                  </p>
                </div>

                {/* Sender info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                    marginLeft: 12,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.accent})`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: '"Noto Sans KR", sans-serif',
                      fontSize: 18,
                      fontWeight: 500,
                      color: `${COLORS.white}80`,
                    }}
                  >
                    {msg.sender}
                    {msg.role && (
                      <span style={{ color: `${COLORS.white}50`, marginLeft: 8 }}>
                        · {msg.role}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
