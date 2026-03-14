export interface SceneBase {
  id: string;
  type: 'hero' | 'list' | 'grid' | 'stat' | 'flow' | 'chat' | 'intro' | 'outro';
  narration: string;
  durationInSeconds?: number; // auto-calculated from TTS if not set
  keywords?: string[]; // words to highlight in subtitles
}

export interface HeroScene extends SceneBase {
  type: 'hero';
  title: string;
  subtitle?: string;
  backgroundGradient?: [string, string];
}

export interface ListScene extends SceneBase {
  type: 'list';
  title: string;
  items: string[];
}

export interface GridScene extends SceneBase {
  type: 'grid';
  title: string;
  cards: { label: string; value: string; description?: string; image?: string }[];
}

export interface StatScene extends SceneBase {
  type: 'stat';
  value: string;
  label: string;
  description?: string;
}

export interface FlowScene extends SceneBase {
  type: 'flow';
  title: string;
  steps: { label: string; description?: string }[];
}

export interface ChatScene extends SceneBase {
  type: 'chat';
  title: string;
  messages: { text: string; sender: string; role?: string }[];
}

export interface IntroScene extends SceneBase {
  type: 'intro';
  durationInSeconds: number;
}

export interface OutroScene extends SceneBase {
  type: 'outro';
  durationInSeconds: number;
}

export type Scene =
  | HeroScene
  | ListScene
  | GridScene
  | StatScene
  | FlowScene
  | ChatScene
  | IntroScene
  | OutroScene;

export interface VideoConfig {
  title: string;
  fps: number;
  width: number;
  height: number;
  bgm?: string; // path to background music file
  scenes: Scene[];
}

export interface SubtitleEntry {
  text: string;
  startMs: number;
  endMs: number;
}

export interface SceneTiming {
  sceneId: string;
  audioFile: string;
  durationMs: number;
  subtitles: SubtitleEntry[];
}
