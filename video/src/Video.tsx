import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import type { VideoConfig, Scene, SceneTiming } from './types';
import { HeroScene } from './scenes/HeroScene';
import { StatScene } from './scenes/StatScene';
import { ListScene } from './scenes/ListScene';
import { GridScene } from './scenes/GridScene';
import { FlowScene } from './scenes/FlowScene';
import { ChatScene } from './scenes/ChatScene';
import { IntroScene } from './scenes/IntroScene';
import { OutroScene } from './scenes/OutroScene';
import { Subtitle } from './components/Subtitle';

interface Props {
  config: VideoConfig;
  timings: SceneTiming[];
}

const TRANSITION_FRAMES = 20; // ~0.67s at 30fps

function renderScene(scene: Scene) {
  switch (scene.type) {
    case 'hero':
      return <HeroScene scene={scene} />;
    case 'stat':
      return <StatScene scene={scene} />;
    case 'list':
      return <ListScene scene={scene} />;
    case 'grid':
      return <GridScene scene={scene} />;
    case 'flow':
      return <FlowScene scene={scene} />;
    case 'chat':
      return <ChatScene scene={scene} />;
    case 'intro':
      return <IntroScene />;
    case 'outro':
      return <OutroScene />;
    default:
      return null;
  }
}

// Alternate between fade and slide transitions
function getTransition(index: number) {
  const transitions = [
    fade(),
    slide({ direction: 'from-right' }),
    fade(),
    slide({ direction: 'from-bottom' }),
  ];
  return transitions[index % transitions.length];
}

export const VideoComposition: React.FC<Props> = ({ config, timings }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Build scene durations
  const sceneDurations = config.scenes.map((scene) => {
    const timing = timings.find((t) => t.sceneId === scene.id);
    const durationMs = timing?.durationMs || (scene.durationInSeconds || 8) * 1000;
    return Math.ceil((durationMs / 1000) * fps);
  });

  // Calculate cumulative offsets for subtitle timing
  const sceneOffsets: number[] = [];
  let cumulativeFrames = 0;
  for (const dur of sceneDurations) {
    sceneOffsets.push(cumulativeFrames);
    cumulativeFrames += dur;
  }

  // BGM volume: duck when narration plays (always, since every scene has narration)
  const bgmVolume = 0.08;

  return (
    <AbsoluteFill style={{ backgroundColor: '#111418' }}>
      {/* Google Fonts */}
      <AbsoluteFill>
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');`}
        </style>
      </AbsoluteFill>

      {/* Background Music */}
      {config.bgm && (
        <Audio
          src={staticFile(config.bgm)}
          volume={(f) => {
            // Fade in first 3 seconds, fade out last 3 seconds
            const fadeInEnd = fps * 3;
            const fadeOutStart = durationInFrames - fps * 3;
            let vol = bgmVolume;
            if (f < fadeInEnd) {
              vol = interpolate(f, [0, fadeInEnd], [0, bgmVolume]);
            } else if (f > fadeOutStart) {
              vol = interpolate(f, [fadeOutStart, durationInFrames], [bgmVolume, 0]);
            }
            return vol;
          }}
          loop
        />
      )}

      {/* Scene transitions */}
      <TransitionSeries>
        {config.scenes.map((scene, i) => {
          const timing = timings.find((t) => t.sceneId === scene.id);
          const durationFrames = sceneDurations[i];

          return (
            <React.Fragment key={scene.id}>
              <TransitionSeries.Sequence durationInFrames={durationFrames}>
                <AbsoluteFill>
                  {/* Scene visual */}
                  {renderScene(scene)}

                  {/* Scene audio (narration) */}
                  {timing?.audioFile && <Audio src={staticFile(timing.audioFile)} volume={1} />}

                  {/* Subtitles with keyword highlighting */}
                  {timing?.subtitles && timing.subtitles.length > 0 && (
                    <Subtitle subtitles={timing.subtitles} keywords={scene.keywords || []} />
                  )}
                </AbsoluteFill>
              </TransitionSeries.Sequence>

              {/* Add transition between scenes (not after last) */}
              {i < config.scenes.length - 1 && (
                <TransitionSeries.Transition
                  presentation={getTransition(i)}
                  timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
