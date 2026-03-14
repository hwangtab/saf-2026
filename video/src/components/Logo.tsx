import React from 'react';
import { COLORS } from '../utils/colors';

interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 80 }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${COLORS.sun}, ${COLORS.accent})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
        }}
      >
        🌱
      </div>
      <div
        style={{
          fontFamily: '"Noto Sans KR", sans-serif',
          fontWeight: 900,
          fontSize: size * 0.45,
          color: COLORS.white,
          letterSpacing: '-0.02em',
        }}
      >
        SAF 2026
      </div>
    </div>
  );
};
