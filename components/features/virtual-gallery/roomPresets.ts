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
    wall: { color: '#e8e0d4', roughness: 0.85, metalness: 0 },
    backWall: { color: '#ede6dc', roughness: 0.8, metalness: 0 },
    floor: { color: '#b8956a', roughness: 0.35, metalness: 0.05 },
    ceiling: { color: '#f5f0eb', roughness: 0.95, metalness: 0 },
    baseboard: { color: '#f0ebe5', height: 0.12 },
    lights: {
      ambientIntensity: 0.3,
      ambientColor: '#fff5e6',
      spotCount: 2,
      spotIntensity: 15,
      spotColor: '#fff2dc',
      spotAngle: 0.45,
      spotPenumbra: 0.7,
      fillIntensity: 0.4,
      fillColor: '#d4e5ff',
    },
    environment: 'apartment',
    environmentIntensity: 0.15,
    fog: { color: '#1a1a1a', near: 6, far: 12 },
    roomWidth: 6,
    roomHeight: 3,
    roomDepth: 5,
  },
  {
    key: 'bedroom',
    labelKo: '침실',
    labelEn: 'Bedroom',
    wall: { color: '#ddd8d0', roughness: 0.9, metalness: 0 },
    backWall: { color: '#e2ddd6', roughness: 0.85, metalness: 0 },
    floor: { color: '#b89868', roughness: 0.4, metalness: 0.03 },
    ceiling: { color: '#e8e4de', roughness: 0.95, metalness: 0 },
    baseboard: { color: '#d0c8c0', height: 0.1 },
    lights: {
      ambientIntensity: 0.15,
      ambientColor: '#ffe8c0',
      spotCount: 1,
      spotIntensity: 10,
      spotColor: '#ffdcb0',
      spotAngle: 0.5,
      spotPenumbra: 0.8,
      fillIntensity: 0.3,
      fillColor: '#ffe0c0',
    },
    environment: 'apartment',
    environmentIntensity: 0.1,
    fog: { color: '#1a1a18', near: 5, far: 10 },
    roomWidth: 5,
    roomHeight: 2.8,
    roomDepth: 4.5,
  },
  {
    key: 'gallery',
    labelKo: '갤러리',
    labelEn: 'Gallery',
    wall: { color: '#f6f6f6', roughness: 0.7, metalness: 0 },
    backWall: { color: '#fafafa', roughness: 0.65, metalness: 0 },
    floor: { color: '#d8d8d8', roughness: 0.2, metalness: 0.08 },
    ceiling: { color: '#ffffff', roughness: 0.95, metalness: 0 },
    baseboard: { color: '#eeeeee', height: 0.08 },
    lights: {
      ambientIntensity: 0.4,
      ambientColor: '#ffffff',
      spotCount: 3,
      spotIntensity: 20,
      spotColor: '#ffffff',
      spotAngle: 0.35,
      spotPenumbra: 0.5,
      fillIntensity: 0.3,
      fillColor: '#ffffff',
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
    wall: { color: '#bfb09a', roughness: 0.8, metalness: 0 },
    backWall: { color: '#c8b8a0', roughness: 0.75, metalness: 0 },
    floor: { color: '#8a6a4a', roughness: 0.35, metalness: 0.04 },
    ceiling: { color: '#d8d0c0', roughness: 0.95, metalness: 0 },
    baseboard: { color: '#5a4a38', height: 0.1 },
    lights: {
      ambientIntensity: 0.25,
      ambientColor: '#ffe8b0',
      spotCount: 2,
      spotIntensity: 15,
      spotColor: '#ffdfa0',
      spotAngle: 0.5,
      spotPenumbra: 0.7,
      fillIntensity: 0.35,
      fillColor: '#ffd898',
    },
    environment: 'warehouse',
    environmentIntensity: 0.05,
    roomWidth: 5.5,
    roomHeight: 3,
    roomDepth: 5,
  },
];
