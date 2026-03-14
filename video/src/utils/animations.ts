import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export function useFadeIn(delay = 0, duration = 15) {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function useSlideUp(delay = 0, distance = 40) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.8 },
  });

  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
}

export function useScale(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.6 },
  });

  return {
    opacity: progress,
    transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
  };
}

export function useCountUp(target: number, delay = 0, duration = 45) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return Math.round(target * progress);
}

export function useStaggeredReveal(itemCount: number, staggerDelay = 8, initialDelay = 15) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return Array.from({ length: itemCount }, (_, i) => {
    const delay = initialDelay + i * staggerDelay;
    const progress = spring({
      frame: frame - delay,
      fps,
      config: { damping: 15, stiffness: 120, mass: 0.8 },
    });
    return {
      opacity: progress,
      transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
    };
  });
}
