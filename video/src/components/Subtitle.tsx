import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SubtitleEntry } from '../types';
import { COLORS, KOREAN_TEXT } from '../utils/colors';

interface SubtitleProps {
  subtitles: SubtitleEntry[];
  offsetMs?: number;
  keywords?: string[];
}

function highlightKeywords(text: string, keywords: string[]): React.ReactNode[] {
  if (!keywords || keywords.length === 0) return [text];

  const pattern = new RegExp(
    `(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g'
  );
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isKeyword = keywords.some((k) => k === part);
    if (isKeyword) {
      return (
        <span
          key={i}
          style={{
            color: COLORS.sun,
            fontWeight: 700,
          }}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const Subtitle: React.FC<SubtitleProps> = ({ subtitles, offsetMs = 0, keywords = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeMs = (frame / fps) * 1000 + offsetMs;

  const currentSubtitle = subtitles.find(
    (s) => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs
  );

  if (!currentSubtitle) return null;

  const entryProgress = spring({
    frame: Math.max(0, frame - Math.floor((currentSubtitle.startMs / 1000) * fps)),
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.5 },
  });

  const exitTime = currentSubtitle.endMs - 200;
  const exitOpacity =
    currentTimeMs > exitTime
      ? interpolate(currentTimeMs, [exitTime, currentSubtitle.endMs], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 100px',
      }}
    >
      <div
        style={{
          ...KOREAN_TEXT,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.82), rgba(0,0,0,0.68))',
          color: COLORS.white,
          padding: '16px 36px',
          borderRadius: 14,
          fontSize: 34,
          fontFamily: '"Noto Sans KR", sans-serif',
          fontWeight: 500,
          lineHeight: 1.6,
          textAlign: 'center',
          maxWidth: '78%',
          opacity: entryProgress * exitOpacity,
          transform: `translateY(${interpolate(entryProgress, [0, 1], [12, 0])}px)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `2px solid ${COLORS.sun}40`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          letterSpacing: '-0.01em',
        }}
      >
        {highlightKeywords(currentSubtitle.text, keywords)}
      </div>
    </div>
  );
};
