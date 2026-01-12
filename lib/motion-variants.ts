import type { Variants, Transition } from 'framer-motion';

// === Fade Variants ===
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

// === Stagger Container ===
export const staggerContainer = (staggerDelay = 0.1): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

// === Scale Variants ===
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
};

// === Spinner Animation ===
export const spinnerTransition: Transition = {
  duration: 1,
  repeat: Infinity,
  ease: 'linear',
};

// === Duration Constants ===
export const DURATIONS = {
  FAST: 0.15,
  DEFAULT: 0.3,
  SLOW: 0.5,
  FADE_IN: 0.6,
  SLIDER: 1.5,
  KEN_BURNS: 20,
} as const;
