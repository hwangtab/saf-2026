export const BREAKPOINTS = {
  MOBILE_SM: 480,
  MOBILE: 768, // Tailwind md
  TABLET: 1024, // Tailwind lg
  DESKTOP: 1280, // Tailwind xl
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
