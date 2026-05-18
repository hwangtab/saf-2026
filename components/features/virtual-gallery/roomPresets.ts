import { BRAND_COLORS } from '@/lib/colors';
import { SCENE_COLORS } from './sceneColors';

export interface WallMaterial {
  color: string;
  roughness: number;
  metalness: number;
}

export interface FloorMaterial {
  color: string;
  roughness: number;
  metalness: number;
}

export interface RoomPreset {
  key: string;
  labelKo: string;
  labelEn: string;
  wall: WallMaterial;
  backWall: WallMaterial;
  floor: FloorMaterial;
  ceiling: WallMaterial;
  baseboard: { color: string; height: number };
  lights: {
    ambientIntensity: number;
    ambientColor: string;
    spotCount: number;
    spotIntensity: number;
    spotColor: string;
    spotAngle: number;
    spotPenumbra: number;
    fillIntensity: number;
    fillColor: string;
  };
  environment: 'apartment' | 'studio' | 'city' | 'warehouse' | 'lobby';
  environmentIntensity: number;
  fog?: { color: string; near: number; far: number };
  roomWidth: number;
  roomHeight: number;
  roomDepth: number;
}

export const ROOM_PRESETS: RoomPreset[] = [
  {
    key: 'living',
    labelKo: '거실',
    labelEn: 'Living Room',
    wall: { color: SCENE_COLORS.preset.living.wall, roughness: 0.85, metalness: 0 },
    backWall: { color: SCENE_COLORS.preset.living.backWall, roughness: 0.8, metalness: 0 },
    floor: { color: SCENE_COLORS.preset.living.floor, roughness: 0.35, metalness: 0.05 },
    ceiling: { color: SCENE_COLORS.preset.living.ceiling, roughness: 0.95, metalness: 0 },
    baseboard: { color: SCENE_COLORS.preset.living.baseboard, height: 0.12 },
    lights: {
      ambientIntensity: 0.3,
      ambientColor: SCENE_COLORS.preset.living.ambient,
      spotCount: 2,
      spotIntensity: 15,
      spotColor: SCENE_COLORS.preset.living.spot,
      spotAngle: 0.45,
      spotPenumbra: 0.7,
      fillIntensity: 0.4,
      fillColor: SCENE_COLORS.preset.living.fill,
    },
    environment: 'apartment',
    environmentIntensity: 0.15,
    fog: { color: BRAND_COLORS.charcoal.deep, near: 6, far: 12 },
    roomWidth: 6,
    roomHeight: 3,
    roomDepth: 5,
  },
  {
    key: 'bedroom',
    labelKo: '침실',
    labelEn: 'Bedroom',
    wall: { color: SCENE_COLORS.preset.bedroom.wall, roughness: 0.9, metalness: 0 },
    backWall: { color: SCENE_COLORS.preset.bedroom.backWall, roughness: 0.85, metalness: 0 },
    floor: { color: SCENE_COLORS.preset.bedroom.floor, roughness: 0.4, metalness: 0.03 },
    ceiling: { color: SCENE_COLORS.preset.bedroom.ceiling, roughness: 0.95, metalness: 0 },
    baseboard: { color: SCENE_COLORS.preset.bedroom.baseboard, height: 0.1 },
    lights: {
      ambientIntensity: 0.06,
      ambientColor: SCENE_COLORS.preset.bedroom.ambient,
      spotCount: 1,
      spotIntensity: 6,
      spotColor: SCENE_COLORS.preset.bedroom.spot,
      spotAngle: 0.5,
      spotPenumbra: 0.9,
      fillIntensity: 0.1,
      fillColor: SCENE_COLORS.preset.bedroom.fill,
    },
    environment: 'apartment',
    environmentIntensity: 0.05,
    fog: { color: SCENE_COLORS.preset.bedroom.fog, near: 5, far: 10 },
    roomWidth: 5,
    roomHeight: 2.8,
    roomDepth: 4.5,
  },
  {
    key: 'gallery',
    labelKo: '갤러리',
    labelEn: 'Gallery',
    wall: { color: SCENE_COLORS.preset.gallery.wall, roughness: 0.7, metalness: 0 },
    backWall: { color: BRAND_COLORS.canvas.DEFAULT, roughness: 0.65, metalness: 0 },
    floor: { color: SCENE_COLORS.preset.gallery.floor, roughness: 0.2, metalness: 0.08 },
    ceiling: { color: BRAND_COLORS.gallery.canvas, roughness: 0.95, metalness: 0 },
    baseboard: { color: SCENE_COLORS.preset.gallery.baseboard, height: 0.08 },
    lights: {
      ambientIntensity: 0.4,
      ambientColor: BRAND_COLORS.gallery.canvas,
      spotCount: 3,
      spotIntensity: 20,
      spotColor: BRAND_COLORS.gallery.canvas,
      spotAngle: 0.35,
      spotPenumbra: 0.5,
      fillIntensity: 0.3,
      fillColor: BRAND_COLORS.gallery.canvas,
    },
    environment: 'studio',
    environmentIntensity: 0.2,
    roomWidth: 7,
    roomHeight: 3.5,
    roomDepth: 6,
  },
  {
    key: 'cafe',
    labelKo: '카페',
    labelEn: 'Café',
    wall: { color: SCENE_COLORS.preset.cafe.wall, roughness: 0.8, metalness: 0 },
    backWall: { color: SCENE_COLORS.preset.cafe.backWall, roughness: 0.75, metalness: 0 },
    floor: { color: SCENE_COLORS.preset.cafe.floor, roughness: 0.35, metalness: 0.04 },
    ceiling: { color: SCENE_COLORS.preset.cafe.ceiling, roughness: 0.95, metalness: 0 },
    baseboard: { color: SCENE_COLORS.preset.cafe.baseboard, height: 0.1 },
    lights: {
      ambientIntensity: 0.25,
      ambientColor: SCENE_COLORS.preset.cafe.ambient,
      spotCount: 2,
      spotIntensity: 15,
      spotColor: SCENE_COLORS.preset.cafe.spot,
      spotAngle: 0.5,
      spotPenumbra: 0.7,
      fillIntensity: 0.35,
      fillColor: SCENE_COLORS.preset.cafe.fill,
    },
    environment: 'warehouse',
    environmentIntensity: 0.05,
    roomWidth: 5.5,
    roomHeight: 3,
    roomDepth: 5,
  },
];
