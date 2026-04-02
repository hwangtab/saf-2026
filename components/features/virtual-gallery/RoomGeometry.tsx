'use client';

import { useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoomPreset } from './roomPresets';
import {
  createFloorTexture,
  createPlasterTexture,
  createNoiseNormalMap,
  createWoodTexture,
  createEnvironmentMap,
} from './proceduralTextures';

interface RoomGeometryProps {
  preset: RoomPreset;
}

/** Sets up a procedural environment map on the scene so all PBR materials reflect it */
function EnvironmentSetup() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const envMap = createEnvironmentMap(gl);
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = envMap;
    return () => {
      scene.environment = null;
      envMap.dispose();
    };
  }, [gl, scene]);

  return null;
}

export default function RoomGeometry({ preset }: RoomGeometryProps) {
  const { wall, backWall, floor, ceiling, baseboard, roomWidth, roomHeight, roomDepth } = preset;

  // Procedural textures — memoized per preset
  const floorMap = useMemo(() => createFloorTexture(floor.color), [floor.color]);
  const wallNormal = useMemo(() => createNoiseNormalMap(0.15, 4, 4), []);
  const wallMap = useMemo(() => createPlasterTexture(wall.color, 4, 4), [wall.color]);
  const backWallMap = useMemo(() => createPlasterTexture(backWall.color, 4, 4), [backWall.color]);
  const baseboardMap = useMemo(
    () => createWoodTexture(baseboard.color, '#00000030', 4, 1),
    [baseboard.color]
  );

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      floorMap.dispose();
      wallNormal.dispose();
      wallMap.dispose();
      backWallMap.dispose();
      baseboardMap.dispose();
    };
  }, [floorMap, wallNormal, wallMap, backWallMap, baseboardMap]);

  const walls = useMemo(
    () => [
      {
        key: 'back',
        position: [0, roomHeight / 2, -roomDepth / 2] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        size: [roomWidth, roomHeight] as [number, number],
        map: backWallMap,
        mat: backWall,
      },
      {
        key: 'front',
        position: [0, roomHeight / 2, roomDepth / 2] as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number],
        size: [roomWidth, roomHeight] as [number, number],
        map: wallMap,
        mat: wall,
      },
      {
        key: 'left',
        position: [-roomWidth / 2, roomHeight / 2, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        size: [roomDepth, roomHeight] as [number, number],
        map: wallMap,
        mat: wall,
      },
      {
        key: 'right',
        position: [roomWidth / 2, roomHeight / 2, 0] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        size: [roomDepth, roomHeight] as [number, number],
        map: wallMap,
        mat: wall,
      },
    ],
    [roomWidth, roomHeight, roomDepth, wall, backWall, wallMap, backWallMap]
  );

  const baseboards = useMemo(
    () => [
      {
        key: 'bb-back',
        position: [0, baseboard.height / 2, -roomDepth / 2 + 0.005] as [number, number, number],
        size: [roomWidth, baseboard.height, 0.015] as [number, number, number],
      },
      {
        key: 'bb-front',
        position: [0, baseboard.height / 2, roomDepth / 2 - 0.005] as [number, number, number],
        size: [roomWidth, baseboard.height, 0.015] as [number, number, number],
      },
      {
        key: 'bb-left',
        position: [-roomWidth / 2 + 0.008, baseboard.height / 2, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        size: [roomDepth, baseboard.height, 0.015] as [number, number, number],
      },
      {
        key: 'bb-right',
        position: [roomWidth / 2 - 0.008, baseboard.height / 2, 0] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        size: [roomDepth, baseboard.height, 0.015] as [number, number, number],
      },
    ],
    [roomWidth, roomDepth, baseboard.height]
  );

  const crownMoldings = useMemo(
    () => [
      {
        key: 'cm-back',
        position: [0, roomHeight - 0.03, -roomDepth / 2 + 0.005] as [number, number, number],
        size: [roomWidth, 0.06, 0.02] as [number, number, number],
      },
      {
        key: 'cm-front',
        position: [0, roomHeight - 0.03, roomDepth / 2 - 0.005] as [number, number, number],
        size: [roomWidth, 0.06, 0.02] as [number, number, number],
      },
      {
        key: 'cm-left',
        position: [-roomWidth / 2 + 0.005, roomHeight - 0.03, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        size: [roomDepth, 0.06, 0.02] as [number, number, number],
      },
      {
        key: 'cm-right',
        position: [roomWidth / 2 - 0.005, roomHeight - 0.03, 0] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        size: [roomDepth, 0.06, 0.02] as [number, number, number],
      },
    ],
    [roomWidth, roomHeight, roomDepth]
  );

  return (
    <group>
      <EnvironmentSetup />

      {/* Floor — wood planks with env map reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          map={floorMap}
          roughness={floor.roughness}
          metalness={floor.metalness}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, roomHeight, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          color={ceiling.color}
          roughness={ceiling.roughness}
          metalness={ceiling.metalness}
        />
      </mesh>

      {/* Walls — plaster texture + subtle normal */}
      {walls.map(({ key, position, rotation, size, map, mat }) => (
        <mesh key={key} position={position} rotation={rotation} receiveShadow>
          <planeGeometry args={size} />
          <meshStandardMaterial
            map={map}
            normalMap={wallNormal}
            normalScale={new THREE.Vector2(0.15, 0.15)}
            roughness={mat.roughness}
            metalness={mat.metalness}
          />
        </mesh>
      ))}

      {/* Baseboards — wood texture */}
      {baseboards.map(({ key, position, rotation, size }) => (
        <mesh key={key} position={position} rotation={rotation} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial map={baseboardMap} roughness={0.5} metalness={0.02} />
        </mesh>
      ))}

      {/* Crown Moldings */}
      {crownMoldings.map(({ key, position, rotation, size }) => (
        <mesh key={key} position={position} rotation={rotation}>
          <boxGeometry args={size} />
          <meshStandardMaterial color={ceiling.color} roughness={0.6} metalness={0.01} />
        </mesh>
      ))}
    </group>
  );
}
