import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { MontageScene as MontageSceneType } from '../types';
import { COLORS, KOREAN_TEXT } from '../utils/colors';

interface Props {
  scene: MontageSceneType;
}

export const MontageScene: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const images = scene.images;
  const captions = scene.captions || [];
  const count = images.length;

  // Each image gets equal share of the total duration
  const framesPerImage = durationInFrames / count;
  const crossfadeDuration = Math.min(fps * 0.5, framesPerImage * 0.3); // 0.5s or 30% of image time

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0C0F' }}>
      {images.map((imagePath, i) => {
        const imageStart = i * framesPerImage;
        const imageEnd = (i + 1) * framesPerImage;

        // Only render nearby images for performance
        if (frame < imageStart - crossfadeDuration || frame > imageEnd + crossfadeDuration) {
          return null;
        }

        // Opacity: fade in and fade out
        let opacity = 1;
        if (i > 0) {
          // Fade in (except first image which starts at full)
          opacity = interpolate(frame, [imageStart - crossfadeDuration, imageStart], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
        }
        if (i < count - 1) {
          // Fade out (except last image)
          const fadeOutOpacity = interpolate(
            frame,
            [imageEnd - crossfadeDuration, imageEnd],
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          opacity = Math.min(opacity, fadeOutOpacity);
        } else {
          // Last image: hold then fade out at very end
          const fadeOutOpacity = interpolate(
            frame,
            [durationInFrames - fps * 0.5, durationInFrames],
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          opacity = Math.min(opacity, fadeOutOpacity);
        }

        // Ken Burns: slow zoom in + subtle pan
        const localFrame = frame - imageStart;
        const localProgress = localFrame / framesPerImage;
        const scale = 1 + localProgress * 0.12; // 1.0 → 1.12
        const panX = (i % 2 === 0 ? -1 : 1) * localProgress * 15; // alternate pan direction
        const panY = localProgress * -8;

        const caption = captions[i];

        // Caption entrance spring
        const captionProgress = spring({
          frame: localFrame - 8,
          fps,
          config: { damping: 16, stiffness: 120, mass: 0.5 },
        });

        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            {/* Full-screen image with Ken Burns */}
            <Img
              src={staticFile(imagePath)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
              }}
            />

            {/* Dark gradient overlay for readability */}
            <AbsoluteFill
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.3) 100%)',
              }}
            />

            {/* Caption overlay */}
            {caption && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 140,
                  left: 100,
                  right: 100,
                  opacity: captionProgress,
                  transform: `translateY(${interpolate(captionProgress, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    ...KOREAN_TEXT,
                    fontFamily: '"Noto Sans KR", sans-serif',
                    fontSize: 28,
                    fontWeight: 400,
                    color: `${COLORS.white}CC`,
                    letterSpacing: '0.05em',
                  }}
                >
                  {caption}
                </div>
              </div>
            )}
          </AbsoluteFill>
        );
      })}

      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
