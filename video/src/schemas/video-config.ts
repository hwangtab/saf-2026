import { z } from 'zod';

const heroSceneSchema = z.object({
  id: z.string(),
  type: z.literal('hero'),
  narration: z.string(),
  durationInSeconds: z.number().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  backgroundGradient: z.tuple([z.string(), z.string()]).optional(),
});

const listSceneSchema = z.object({
  id: z.string(),
  type: z.literal('list'),
  narration: z.string(),
  durationInSeconds: z.number().optional(),
  title: z.string(),
  items: z.array(z.string()),
});

const gridSceneSchema = z.object({
  id: z.string(),
  type: z.literal('grid'),
  narration: z.string(),
  durationInSeconds: z.number().optional(),
  title: z.string(),
  cards: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
    })
  ),
});

const statSceneSchema = z.object({
  id: z.string(),
  type: z.literal('stat'),
  narration: z.string(),
  durationInSeconds: z.number().optional(),
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

const flowSceneSchema = z.object({
  id: z.string(),
  type: z.literal('flow'),
  narration: z.string(),
  durationInSeconds: z.number().optional(),
  title: z.string(),
  steps: z.array(
    z.object({
      label: z.string(),
      description: z.string().optional(),
    })
  ),
});

const chatSceneSchema = z.object({
  id: z.string(),
  type: z.literal('chat'),
  narration: z.string(),
  durationInSeconds: z.number().optional(),
  title: z.string(),
  messages: z.array(
    z.object({
      text: z.string(),
      sender: z.string(),
      role: z.string().optional(),
    })
  ),
});

const sceneSchema = z.discriminatedUnion('type', [
  heroSceneSchema,
  listSceneSchema,
  gridSceneSchema,
  statSceneSchema,
  flowSceneSchema,
  chatSceneSchema,
]);

export const videoConfigSchema = z.object({
  title: z.string(),
  fps: z.number().default(30),
  width: z.number().default(1920),
  height: z.number().default(1080),
  scenes: z.array(sceneSchema),
});

export type VideoConfigSchema = z.infer<typeof videoConfigSchema>;
