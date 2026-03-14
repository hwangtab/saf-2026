import type React from 'react';

// SAF brand colors for video
export const COLORS = {
  primary: '#2176FF',
  primaryStrong: '#0E4ECF',
  primarySoft: '#D2E1FF',
  primarySurface: '#EDF3FF',
  sun: '#FDCA40',
  sunSoft: '#FEE9A3',
  accent: '#F79824',
  accentStrong: '#D97800',
  canvas: '#FFF6DD',
  canvasSoft: '#FFF9E8',
  charcoal: '#31393C',
  charcoalMuted: '#555E67',
  white: '#FFFFFF',
  success: '#2E9F7B',
  danger: '#D94F45',
  gray100: '#E6EAF0',
  gray300: '#B3BAC7',
  gray700: '#3D464D',
  gray900: '#1F2428',
};

// Korean text needs keep-all to prevent breaking in the middle of words
export const KOREAN_TEXT: React.CSSProperties = {
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
};

export const GRADIENTS = {
  dark: ['#1F2428', '#31393C'] as [string, string],
  primary: ['#0E4ECF', '#2176FF'] as [string, string],
  warm: ['#31393C', '#3D464D'] as [string, string],
  accent: ['#D97800', '#F79824'] as [string, string],
  canvas: ['#FFF6DD', '#FFF9E8'] as [string, string],
};
