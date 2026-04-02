'use client';

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import RoomGeometry from './RoomGeometry';
import RoomFurniture from './RoomFurniture';
import ArtworkPlane from './ArtworkPlane';
import ArtworkPedestal from './ArtworkPedestal';
import type { RoomPreset } from './roomPresets';
import type { ArtworkDimensions } from '@/lib/utils/parseArtworkSize';
import type { DisplayMode } from './VirtualGalleryPortal';

interface VirtualRoomProps {
  preset: RoomPreset;
  imageUrl: string;
  dimensions: ArtworkDimensions;
  displayMode?: DisplayMode;
  isMobile: boolean;
}

function ArtworkSpot({
  position,
  targetPos,
  angle,
  penumbra,
  intensity,
  color,
  distance,
  castShadow,
}: {
  position: [number, number, number];
  targetPos: [number, number, number];
  angle: number;
  penumbra: number;
  intensity: number;
  color: string;
  distance: number;
  castShadow: boolean;
}) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <object3D ref={targetRef} position={targetPos} />
      <spotLight
        ref={spotRef}
        position={position}
        angle={angle}
        penumbra={penumbra}
        intensity={intensity}
        color={color}
        distance={distance}
        decay={2}
        castShadow={castShadow}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

function Lighting({ preset, isMobile }: { preset: RoomPreset; isMobile: boolean }) {
  const { lights, roomHeight, roomDepth } = preset;

  const artworkTarget: [number, number, number] = useMemo(
    () => [0, 1.5, -roomDepth / 2 + 0.05],
    [roomDepth]
  );

  const spotPositions = useMemo(() => {
    if (lights.spotCount === 1) {
      return [[0, roomHeight - 0.15, -roomDepth / 2 + 2.5] as [number, number, number]];
    }
    if (lights.spotCount === 2) {
      return [
        [-0.6, roomHeight - 0.15, -roomDepth / 2 + 2.2] as [number, number, number],
        [0.6, roomHeight - 0.15, -roomDepth / 2 + 2.2] as [number, number, number],
      ];
    }
    return [
      [-1.2, roomHeight - 0.15, -roomDepth / 2 + 2] as [number, number, number],
      [0, roomHeight - 0.15, -roomDepth / 2 + 2] as [number, number, number],
      [1.2, roomHeight - 0.15, -roomDepth / 2 + 2] as [number, number, number],
    ];
  }, [lights.spotCount, roomHeight, roomDepth]);

  return (
    <>
      <ambientLight intensity={lights.ambientIntensity} color={lights.ambientColor} />

      {spotPositions.map((pos, i) => (
        <ArtworkSpot
          key={i}
          position={pos}
          targetPos={artworkTarget}
          angle={lights.spotAngle}
          penumbra={lights.spotPenumbra}
          intensity={lights.spotIntensity}
          color={lights.spotColor}
          distance={roomDepth + 2}
          castShadow={!isMobile}
        />
      ))}

      <pointLight
        position={[0, roomHeight - 0.1, 0]}
        intensity={lights.fillIntensity}
        color={lights.fillColor}
        decay={2}
      />

      <pointLight
        position={[0, roomHeight * 0.7, roomDepth / 2 - 0.5]}
        intensity={lights.fillIntensity * 0.3}
        color={lights.fillColor}
        decay={2}
      />
    </>
  );
}

function FogSetup({ fog }: { fog?: RoomPreset['fog'] }) {
  const { scene } = useThree();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    scene.fog = fog ? new THREE.Fog(fog.color, fog.near, fog.far) : null;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  return null;
}

function LoadingPlaceholder() {
  return (
    <mesh position={[0, 1.5, -2]}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial color="#333333" />
    </mesh>
  );
}

function Scene({ preset, imageUrl, dimensions, displayMode = 'wall', isMobile }: VirtualRoomProps) {
  const { roomHeight, roomDepth } = preset;
  const artworkZ = -roomDepth / 2 + 0.05;
  const isPedestal = displayMode === 'pedestal';

  const cameraTarget = useMemo(
    () => (isPedestal ? [0, 1.2, 0] : [0, 1.5, artworkZ]) as [number, number, number],
    [artworkZ, isPedestal]
  );

  return (
    <>
      <Lighting preset={preset} isMobile={isMobile} />

      <FogSetup fog={preset.fog} />

      <RoomGeometry preset={preset} />

      {!isPedestal && <RoomFurniture preset={preset} />}

      {!isMobile && (
        <ContactShadows
          position={isPedestal ? [0, 0.001, 0] : [0, 0.001, artworkZ]}
          opacity={0.3}
          scale={isPedestal ? 6 : 4}
          blur={2.5}
          far={3}
        />
      )}

      {isPedestal ? (
        <Suspense fallback={<LoadingPlaceholder />}>
          <ArtworkPedestal imageUrl={imageUrl} dimensions={dimensions} />
        </Suspense>
      ) : (
        <group position={[0, 0, artworkZ]}>
          <Suspense fallback={<LoadingPlaceholder />}>
            <ArtworkPlane imageUrl={imageUrl} dimensions={dimensions} wallY={roomHeight} />
          </Suspense>
        </group>
      )}

      <OrbitControls
        target={cameraTarget}
        minDistance={0.8}
        maxDistance={isPedestal ? 5.0 : 4.5}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.72}
        minAzimuthAngle={isPedestal ? -Math.PI : -Math.PI * 0.45}
        maxAzimuthAngle={isPedestal ? Math.PI : Math.PI * 0.45}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  );
}

export default function VirtualRoom({
  preset,
  imageUrl,
  dimensions,
  displayMode = 'wall',
  isMobile,
}: VirtualRoomProps) {
  const isPedestal = displayMode === 'pedestal';
  const cameraPosition = useMemo(
    () =>
      isPedestal
        ? ([2.5, 1.6, 2.5] as [number, number, number])
        : ([0, 1.5, preset.roomDepth / 2 - 0.5] as [number, number, number]),
    [preset.roomDepth, isPedestal]
  );

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 55, near: 0.1, far: 50 }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{
        antialias: !isMobile,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
      shadows={!isMobile}
      style={{ width: '100%', height: '100%' }}
    >
      <Scene
        preset={preset}
        imageUrl={imageUrl}
        dimensions={dimensions}
        displayMode={displayMode}
        isMobile={isMobile}
      />
    </Canvas>
  );
}
