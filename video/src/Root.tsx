import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './Video';
import type { VideoConfig, SceneTiming } from './types';

import videoConfig from '../video-config.json';
import timingsData from '../public/voices/timings.json';

const config = videoConfig as VideoConfig;
const timings = timingsData as SceneTiming[];

const TRANSITION_FRAMES = 20;

function getTotalDurationInFrames(fps: number): number {
  let totalFrames = 0;

  for (const scene of config.scenes) {
    const timing = timings.find((t) => t.sceneId === scene.id);
    const durationMs = timing?.durationMs || (scene.durationInSeconds || 8) * 1000;
    totalFrames += Math.ceil((durationMs / 1000) * fps);
  }

  // Subtract transition overlaps (transitions overlap between scenes)
  const transitionCount = Math.max(0, config.scenes.length - 1);
  totalFrames -= transitionCount * TRANSITION_FRAMES;

  return Math.max(totalFrames, 1);
}

export const RemotionRoot: React.FC = () => {
  const fps = config.fps || 30;

  return (
    <>
      <Composition
        id="Video"
        component={VideoComposition}
        durationInFrames={getTotalDurationInFrames(fps)}
        fps={fps}
        width={config.width || 1920}
        height={config.height || 1080}
        defaultProps={{
          config,
          timings,
        }}
      />
    </>
  );
};
