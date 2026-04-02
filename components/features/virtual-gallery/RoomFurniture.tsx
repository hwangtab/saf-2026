'use client';

import * as THREE from 'three';
import type { RoomPreset } from './roomPresets';

interface RoomFurnitureProps {
  preset: RoomPreset;
}

/* ───────────────────────── primitive helpers ───────────────────────── */

function Box({
  size,
  position,
  rotation,
  color,
  roughness = 0.8,
  metalness = 0,
  castShadow = true,
  receiveShadow = true,
}: {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

function Cylinder({
  args,
  position,
  color,
  roughness = 0.6,
  metalness = 0.1,
  castShadow = true,
}: {
  args: [number, number, number, number?];
  position: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  castShadow?: boolean;
}) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/* ───────────────────────── reusable furniture pieces ───────────────── */

/** Rectangular rug on the floor */
function Rug({
  width,
  depth,
  position,
  color,
}: {
  width: number;
  depth: number;
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** Simple potted plant — cylinder pot + sphere canopy */
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cylinder
        args={[0.1, 0.12, 0.22, 12]}
        position={[0, 0.11, 0]}
        color="#6b5344"
        roughness={0.9}
      />
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color="#3a6b35" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0.06, 0.42, 0.05]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#4a7d43" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

/** Table lamp — cylinder base + truncated cone shade + point light */
function TableLamp({
  position,
  shadeColor = '#f5f0e0',
}: {
  position: [number, number, number];
  shadeColor?: string;
}) {
  return (
    <group position={position}>
      <Cylinder
        args={[0.06, 0.06, 0.02, 16]}
        position={[0, 0.01, 0]}
        color="#8b7d6b"
        roughness={0.4}
        metalness={0.3}
      />
      <Cylinder
        args={[0.015, 0.015, 0.2, 8]}
        position={[0, 0.11, 0]}
        color="#8b7d6b"
        roughness={0.4}
        metalness={0.3}
      />
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.1, 0.14, 16, 1, true]} />
        <meshStandardMaterial
          color={shadeColor}
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, 0.24, 0]} intensity={1.2} color="#fff3e0" distance={2} decay={2} />
    </group>
  );
}

/** Floor lamp — tall cylinder + shade + light */
function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cylinder
        args={[0.12, 0.12, 0.02, 16]}
        position={[0, 0.01, 0]}
        color="#2a2a2a"
        roughness={0.5}
        metalness={0.2}
      />
      <Cylinder
        args={[0.015, 0.015, 1.3, 8]}
        position={[0, 0.66, 0]}
        color="#2a2a2a"
        roughness={0.5}
        metalness={0.2}
      />
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 0.25, 16, 1, true]} />
        <meshStandardMaterial
          color="#f0ebe0"
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, 1.35, 0]} intensity={2} color="#fff3e0" distance={3} decay={2} />
    </group>
  );
}

/** A simple framed picture on the wall (small colored rectangle) */
function WallFrame({
  position,
  rotation,
  width = 0.4,
  height = 0.3,
  frameColor = '#3a3028',
  canvasColor,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  frameColor?: string;
  canvasColor: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Box
        size={[width + 0.04, height + 0.04, 0.025]}
        position={[0, 0, -0.012]}
        color={frameColor}
        roughness={0.4}
      />
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={canvasColor} roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── LIVING ROOM ─────────────────────────────── */

function LivingRoomFurniture({ preset }: { preset: RoomPreset }) {
  const { roomWidth, roomDepth } = preset;
  const backZ = -roomDepth / 2;
  const frontZ = roomDepth / 2;
  const rightX = roomWidth / 2;
  const leftX = -roomWidth / 2;

  return (
    <group>
      {/* ── Back wall: TV console below artwork ── */}
      <group position={[0, 0, backZ + 0.2]}>
        {/* TV console / media unit */}
        <Box size={[1.6, 0.45, 0.4]} position={[0, 0.225, 0]} color="#5c4a3a" roughness={0.6} />
        {/* Drawer faces */}
        <Box
          size={[0.45, 0.16, 0.01]}
          position={[-0.4, 0.25, 0.2]}
          color="#6b5a4a"
          roughness={0.5}
        />
        <Box
          size={[0.45, 0.16, 0.01]}
          position={[0.4, 0.25, 0.2]}
          color="#6b5a4a"
          roughness={0.5}
        />
        {/* Decorative items on console */}
        <Cylinder
          args={[0.04, 0.05, 0.12, 10]}
          position={[-0.55, 0.51, 0]}
          color="#c8b8a0"
          roughness={0.7}
        />
        <Box size={[0.2, 0.04, 0.12]} position={[0.55, 0.47, 0]} color="#8b7060" roughness={0.9} />
        <Box size={[0.18, 0.03, 0.11]} position={[0.55, 0.5, 0]} color="#6a5040" roughness={0.9} />
      </group>

      {/* ── Rug — centered between sofa and wall ── */}
      <Rug width={2.6} depth={1.8} position={[0, 0.003, 0.2]} color="#8b7355" />

      {/* ── Sofa — facing TV (back rest toward artwork wall) ── */}
      <group position={[0, 0, 1.0]}>
        {/* Seat */}
        <Box size={[1.8, 0.35, 0.7]} position={[0, 0.25, 0]} color="#6b6054" roughness={0.9} />
        {/* Back rest — toward artwork wall (negative z) */}
        <Box size={[1.8, 0.4, 0.15]} position={[0, 0.55, -0.28]} color="#5e5549" roughness={0.9} />
        {/* Left arm */}
        <Box size={[0.15, 0.25, 0.7]} position={[-0.83, 0.42, 0]} color="#5e5549" roughness={0.9} />
        {/* Right arm */}
        <Box size={[0.15, 0.25, 0.7]} position={[0.83, 0.42, 0]} color="#5e5549" roughness={0.9} />
        {/* Legs */}
        <Box size={[0.06, 0.08, 0.06]} position={[-0.75, 0.04, 0.25]} color="#3a3028" />
        <Box size={[0.06, 0.08, 0.06]} position={[0.75, 0.04, 0.25]} color="#3a3028" />
        <Box size={[0.06, 0.08, 0.06]} position={[-0.75, 0.04, -0.25]} color="#3a3028" />
        <Box size={[0.06, 0.08, 0.06]} position={[0.75, 0.04, -0.25]} color="#3a3028" />
        {/* Throw cushions — leaning against backrest */}
        <Box
          size={[0.4, 0.14, 0.1]}
          position={[-0.5, 0.52, -0.1]}
          color="#b8a088"
          roughness={0.95}
        />
        <Box
          size={[0.35, 0.12, 0.1]}
          position={[0.55, 0.5, -0.12]}
          color="#9aaa90"
          roughness={0.95}
        />
        {/* Throw blanket draped over arm */}
        <Box
          size={[0.18, 0.35, 0.5]}
          position={[0.82, 0.48, -0.05]}
          color="#c8b8a0"
          roughness={0.95}
        />
      </group>

      {/* ── Coffee table — between sofa and artwork wall ── */}
      <group position={[0, 0, 0.2]}>
        <Box
          size={[0.9, 0.04, 0.5]}
          position={[0, 0.38, 0]}
          color="#5c4a3a"
          roughness={0.5}
          metalness={0.02}
        />
        <Box size={[0.06, 0.36, 0.06]} position={[-0.38, 0.18, -0.18]} color="#4a3a2c" />
        <Box size={[0.06, 0.36, 0.06]} position={[0.38, 0.18, -0.18]} color="#4a3a2c" />
        <Box size={[0.06, 0.36, 0.06]} position={[-0.38, 0.18, 0.18]} color="#4a3a2c" />
        <Box size={[0.06, 0.36, 0.06]} position={[0.38, 0.18, 0.18]} color="#4a3a2c" />
        {/* Coffee table items */}
        <Box
          size={[0.22, 0.04, 0.16]}
          position={[-0.15, 0.42, 0.05]}
          color="#c4a882"
          roughness={0.95}
        />
        <Box
          size={[0.2, 0.03, 0.15]}
          position={[-0.15, 0.455, 0.05]}
          color="#7a5c4a"
          roughness={0.95}
        />
        {/* Small plant/vase */}
        <Cylinder
          args={[0.035, 0.04, 0.08, 10]}
          position={[0.25, 0.44, -0.08]}
          color="#e0d4c0"
          roughness={0.7}
        />
        <mesh position={[0.25, 0.52, -0.08]} castShadow>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#4a8044" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* ── Side table + lamp — left of sofa ── */}
      <group position={[leftX + 0.45, 0, 0.9]}>
        <Box size={[0.35, 0.48, 0.35]} position={[0, 0.24, 0]} color="#5c4a3a" roughness={0.6} />
        <TableLamp position={[0, 0.48, 0]} />
      </group>

      {/* ── Floor lamp — right corner near artwork ── */}
      <FloorLamp position={[rightX - 0.4, 0, backZ + 0.5]} />

      {/* ── Plant — left corner near front wall ── */}
      <Plant position={[leftX + 0.4, 0, frontZ - 0.5]} />

      {/* ── Bookshelf on right wall ── */}
      <group position={[rightX - 0.16, 0, 0.4]} rotation={[0, -Math.PI / 2, 0]}>
        <Box size={[0.8, 1.4, 0.28]} position={[0, 0.7, 0]} color="#5c4a3a" roughness={0.6} />
        {[0.3, 0.6, 0.9, 1.2].map((y) => (
          <Box
            key={y}
            size={[0.74, 0.02, 0.24]}
            position={[0, y, 0.01]}
            color="#6b5a4a"
            roughness={0.6}
          />
        ))}
        <Box
          size={[0.12, 0.2, 0.14]}
          position={[-0.25, 0.4, 0.01]}
          color="#8b4040"
          roughness={0.9}
        />
        <Box
          size={[0.1, 0.18, 0.14]}
          position={[-0.1, 0.39, 0.01]}
          color="#3a5a7a"
          roughness={0.9}
        />
        <Box
          size={[0.14, 0.22, 0.14]}
          position={[0.08, 0.41, 0.01]}
          color="#5a7a5a"
          roughness={0.9}
        />
        <Box
          size={[0.08, 0.16, 0.14]}
          position={[0.25, 0.38, 0.01]}
          color="#9a8a5a"
          roughness={0.9}
        />
        <Box
          size={[0.1, 0.18, 0.14]}
          position={[-0.2, 0.69, 0.01]}
          color="#6a5a8a"
          roughness={0.9}
        />
        <Box size={[0.14, 0.2, 0.14]} position={[0.0, 0.7, 0.01]} color="#c49a6a" roughness={0.9} />
        <Box
          size={[0.12, 0.17, 0.14]}
          position={[0.2, 0.69, 0.01]}
          color="#5a6a5a"
          roughness={0.9}
        />
        <Box
          size={[0.11, 0.19, 0.14]}
          position={[-0.15, 0.99, 0.01]}
          color="#7a6050"
          roughness={0.9}
        />
        <Box
          size={[0.13, 0.21, 0.14]}
          position={[0.1, 1.0, 0.01]}
          color="#4a6a7a"
          roughness={0.9}
        />
      </group>

      {/* ── Side frames on left wall ── */}
      <WallFrame
        position={[leftX + 0.01, 1.6, -0.3]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.35}
        height={0.25}
        canvasColor="#c8b8a0"
      />
      <WallFrame
        position={[leftX + 0.01, 1.55, 0.5]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.25}
        height={0.35}
        canvasColor="#a0b0a8"
      />

      {/* ── Front wall: TV mounted + low cabinet ── */}
      <group position={[0, 0, frontZ - 0.15]}>
        {/* TV screen — mounted on front wall */}
        <mesh position={[0, 1.15, 0]}>
          <planeGeometry args={[1.1, 0.65]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* TV bezel */}
        <Box
          size={[1.14, 0.69, 0.04]}
          position={[0, 1.15, -0.02]}
          color="#1a1a1a"
          roughness={0.4}
          metalness={0.2}
        />
        {/* TV stand / low cabinet */}
        <Box size={[1.4, 0.35, 0.35]} position={[0, 0.175, 0]} color="#5c4a3a" roughness={0.6} />
        {/* Cabinet door faces */}
        <Box
          size={[0.4, 0.25, 0.01]}
          position={[-0.35, 0.2, 0.175]}
          color="#6b5a4a"
          roughness={0.5}
        />
        <Box
          size={[0.4, 0.25, 0.01]}
          position={[0.35, 0.2, 0.175]}
          color="#6b5a4a"
          roughness={0.5}
        />
        {/* Items on TV stand */}
        <Box
          size={[0.08, 0.1, 0.08]}
          position={[-0.5, 0.4, 0.05]}
          color="#2a2a2a"
          roughness={0.5}
          metalness={0.3}
        />
        <Cylinder
          args={[0.03, 0.04, 0.06, 8]}
          position={[0.5, 0.38, 0.05]}
          color="#c0a880"
          roughness={0.7}
        />
      </group>

      {/* ── Accent chair — right side, angled toward center ── */}
      <group position={[rightX - 0.7, 0, 1.5]} rotation={[0, -Math.PI * 0.25, 0]}>
        <Box size={[0.6, 0.3, 0.6]} position={[0, 0.22, 0]} color="#8a7a68" roughness={0.9} />
        <Box size={[0.6, 0.35, 0.1]} position={[0, 0.48, -0.25]} color="#7a6a58" roughness={0.9} />
        <Box size={[0.05, 0.14, 0.05]} position={[-0.25, 0.07, 0.22]} color="#3a3028" />
        <Box size={[0.05, 0.14, 0.05]} position={[0.25, 0.07, 0.22]} color="#3a3028" />
        <Box size={[0.05, 0.14, 0.05]} position={[-0.25, 0.07, -0.22]} color="#3a3028" />
        <Box size={[0.05, 0.14, 0.05]} position={[0.25, 0.07, -0.22]} color="#3a3028" />
      </group>
    </group>
  );
}

/* ───────────────────────── BEDROOM ─────────────────────────────────── */

function BedroomFurniture({ preset }: { preset: RoomPreset }) {
  const { roomWidth, roomDepth } = preset;
  const frontZ = roomDepth / 2;
  const rightX = roomWidth / 2;
  const leftX = -roomWidth / 2;

  // Bed pushed into right-front corner: right side ~5cm from right wall
  const bedCenterX = rightX - 0.82; // 1.68 for 5m room
  // Bed left edge at bedCenterX - 0.75 = 0.93 → accessible left side

  return (
    <group>
      {/* ── Bed — right-front corner, headboard flush with front wall ── */}
      <group position={[bedCenterX, 0, frontZ - 1.05]}>
        {/* Bed frame base */}
        <Box size={[1.5, 0.28, 2.0]} position={[0, 0.14, 0]} color="#6b5a48" roughness={0.7} />
        {/* Mattress */}
        <Box size={[1.4, 0.16, 1.9]} position={[0, 0.36, 0]} color="#f0ece4" roughness={0.95} />
        {/* Headboard — flush against front wall */}
        <Box size={[1.5, 0.9, 0.06]} position={[0, 0.73, 0.97]} color="#5c4a3a" roughness={0.6} />
        {/* Pillows against headboard */}
        <Box
          size={[0.45, 0.1, 0.25]}
          position={[-0.3, 0.48, 0.7]}
          color="#e8e4dc"
          roughness={0.95}
        />
        <Box
          size={[0.45, 0.1, 0.25]}
          position={[0.3, 0.48, 0.7]}
          color="#e8e4dc"
          roughness={0.95}
        />
        {/* Duvet — matte fabric, no shine */}
        <Box
          size={[1.35, 0.08, 1.2]}
          position={[0, 0.46, -0.15]}
          color="#c8bfb0"
          roughness={1}
          metalness={0}
        />
        {/* Folded blanket at foot */}
        <Box
          size={[1.0, 0.05, 0.35]}
          position={[0, 0.44, -0.75]}
          color="#a89880"
          roughness={1}
          metalness={0}
        />
        {/* Bed legs (only left side visible, right is against wall) */}
        <Box size={[0.06, 0.06, 0.06]} position={[-0.68, 0.03, -0.9]} color="#5c4a3a" />
        <Box size={[0.06, 0.06, 0.06]} position={[-0.68, 0.03, 0.9]} color="#5c4a3a" />
      </group>

      {/* ── Rug — left/foot side of bed (step-out zone) ── */}
      <Rug
        width={1.1}
        depth={1.6}
        position={[bedCenterX - 1.15, 0.003, frontZ - 1.2]}
        color="#b0a090"
      />

      {/* ── Nightstand — left of bed only (accessible side) ── */}
      <group position={[bedCenterX - 1.08, 0, frontZ - 0.55]}>
        <Box size={[0.38, 0.48, 0.35]} position={[0, 0.24, 0]} color="#6b5a48" roughness={0.6} />
        <Box size={[0.32, 0.12, 0.01]} position={[0, 0.3, 0.175]} color="#7a6a58" roughness={0.5} />
        <TableLamp position={[0, 0.48, 0]} shadeColor="#f5eee0" />
        {/* Small stack of books */}
        <Box
          size={[0.14, 0.04, 0.1]}
          position={[0.05, 0.5, -0.05]}
          color="#8b6050"
          roughness={0.9}
        />
        <Box
          size={[0.12, 0.03, 0.09]}
          position={[0.05, 0.535, -0.05]}
          color="#506880"
          roughness={0.9}
        />
      </group>

      {/* ── Dresser — along left wall ── */}
      <group position={[leftX + 0.3, 0, 0.3]}>
        <Box size={[0.5, 0.8, 0.9]} position={[0, 0.4, 0]} color="#6b5a48" roughness={0.6} />
        <Box size={[0.42, 0.18, 0.01]} position={[0, 0.2, 0.45]} color="#7a6a58" roughness={0.5} />
        <Box size={[0.42, 0.18, 0.01]} position={[0, 0.42, 0.45]} color="#7a6a58" roughness={0.5} />
        <Box size={[0.42, 0.18, 0.01]} position={[0, 0.64, 0.45]} color="#7a6a58" roughness={0.5} />
      </group>

      {/* ── Small plant on dresser ── */}
      <group position={[leftX + 0.3, 0.8, 0.3]}>
        <Cylinder
          args={[0.05, 0.06, 0.1, 10]}
          position={[0, 0.05, 0]}
          color="#c8b8a0"
          roughness={0.9}
        />
        <mesh position={[0, 0.14, 0]} castShadow>
          <sphereGeometry args={[0.08, 8, 7]} />
          <meshStandardMaterial color="#4a7a44" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* ── Tall plant — left corner near artwork wall ── */}
      <Plant position={[leftX + 0.45, 0, -roomDepth / 2 + 0.5]} />

      {/* ── Small chair / reading nook — left wall, mid-room ── */}
      <group position={[leftX + 0.55, 0, -0.8]}>
        <Box
          size={[0.5, 0.3, 0.5]}
          position={[0, 0.2, 0]}
          color="#b0a090"
          roughness={0.9}
          metalness={0}
        />
        <Box
          size={[0.5, 0.3, 0.08]}
          position={[0, 0.45, -0.21]}
          color="#a09080"
          roughness={0.9}
          metalness={0}
        />
        <Box size={[0.04, 0.14, 0.04]} position={[-0.2, 0.07, 0.2]} color="#5c4a3a" />
        <Box size={[0.04, 0.14, 0.04]} position={[0.2, 0.07, 0.2]} color="#5c4a3a" />
        <Box size={[0.04, 0.14, 0.04]} position={[-0.2, 0.07, -0.2]} color="#5c4a3a" />
        <Box size={[0.04, 0.14, 0.04]} position={[0.2, 0.07, -0.2]} color="#5c4a3a" />
      </group>

      {/* ── Floor lamp — beside nightstand ── */}
      <FloorLamp position={[bedCenterX - 1.5, 0, frontZ - 1.4]} />

      {/* ── Frames on left wall ── */}
      <WallFrame
        position={[leftX + 0.01, 1.5, 0.8]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.3}
        height={0.2}
        canvasColor="#d0c4b0"
      />
      <WallFrame
        position={[leftX + 0.01, 1.45, -0.5]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.2}
        height={0.28}
        canvasColor="#b8c8b8"
      />

      {/* ── Window on front wall — centered (away from bed corner) ── */}
      <group position={[-0.8, 1.75, frontZ - 0.01]} rotation={[0, Math.PI, 0]}>
        <Box size={[0.9, 0.55, 0.04]} position={[0, 0, 0]} color="#e0d8cc" roughness={0.5} />
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.82, 0.47]} />
          <meshBasicMaterial color="#c8d8e8" />
        </mesh>
        <Box size={[0.82, 0.025, 0.01]} position={[0, 0, 0.025]} color="#e0d8cc" roughness={0.5} />
        <Box size={[0.025, 0.47, 0.01]} position={[0, 0, 0.025]} color="#e0d8cc" roughness={0.5} />
      </group>
    </group>
  );
}

/* ───────────────────────── GALLERY ─────────────────────────────────── */

function GalleryFurniture({ preset }: { preset: RoomPreset }) {
  const { roomWidth, roomDepth } = preset;
  const rightX = roomWidth / 2;
  const leftX = -roomWidth / 2;

  return (
    <group>
      {/* Center bench — minimal gallery seating */}
      <group position={[0, 0, 0.8]}>
        {/* Seat (leather/upholstered top) */}
        <Box
          size={[1.2, 0.06, 0.4]}
          position={[0, 0.42, 0]}
          color="#2a2a2a"
          roughness={0.85}
          metalness={0.05}
        />
        {/* Metal frame */}
        <Box
          size={[1.1, 0.02, 0.35]}
          position={[0, 0.38, 0]}
          color="#707070"
          roughness={0.3}
          metalness={0.6}
        />
        {/* Legs — metal X-frame style */}
        <Box
          size={[0.03, 0.38, 0.03]}
          position={[-0.5, 0.19, -0.15]}
          color="#707070"
          roughness={0.3}
          metalness={0.6}
        />
        <Box
          size={[0.03, 0.38, 0.03]}
          position={[-0.5, 0.19, 0.15]}
          color="#707070"
          roughness={0.3}
          metalness={0.6}
        />
        <Box
          size={[0.03, 0.38, 0.03]}
          position={[0.5, 0.19, -0.15]}
          color="#707070"
          roughness={0.3}
          metalness={0.6}
        />
        <Box
          size={[0.03, 0.38, 0.03]}
          position={[0.5, 0.19, 0.15]}
          color="#707070"
          roughness={0.3}
          metalness={0.6}
        />
        {/* Cross bar */}
        <Box
          size={[1.1, 0.02, 0.02]}
          position={[0, 0.12, 0]}
          color="#707070"
          roughness={0.3}
          metalness={0.6}
        />
      </group>

      {/* Pedestal — left side */}
      <group position={[leftX + 1.0, 0, -0.5]}>
        <Box
          size={[0.4, 1.0, 0.4]}
          position={[0, 0.5, 0]}
          color="#f0ece6"
          roughness={0.7}
          metalness={0}
        />
        {/* Abstract sculpture on pedestal */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color="#404040" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0.05, 1.35, 0.02]} castShadow>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshStandardMaterial color="#505050" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>

      {/* Pedestal — right side */}
      <group position={[rightX - 1.0, 0, -0.5]}>
        <Box
          size={[0.35, 0.9, 0.35]}
          position={[0, 0.45, 0]}
          color="#f0ece6"
          roughness={0.7}
          metalness={0}
        />
        {/* Vase on pedestal */}
        <Cylinder
          args={[0.05, 0.08, 0.25, 16]}
          position={[0, 1.03, 0]}
          color="#3a3a3a"
          roughness={0.15}
          metalness={0.7}
        />
      </group>

      {/* Small frames on side walls — gallery style */}
      <WallFrame
        position={[leftX + 0.01, 1.6, 0.5]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.5}
        height={0.4}
        canvasColor="#e8e0d0"
        frameColor="#1a1a1a"
      />
      <WallFrame
        position={[leftX + 0.01, 1.55, -1.0]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.35}
        height={0.5}
        canvasColor="#d0d8d4"
        frameColor="#1a1a1a"
      />
      <WallFrame
        position={[rightX - 0.01, 1.6, 0.3]}
        rotation={[0, -Math.PI / 2, 0]}
        width={0.45}
        height={0.35}
        canvasColor="#d8d0c4"
        frameColor="#1a1a1a"
      />
      <WallFrame
        position={[rightX - 0.01, 1.5, -0.8]}
        rotation={[0, -Math.PI / 2, 0]}
        width={0.3}
        height={0.45}
        canvasColor="#c8d0c8"
        frameColor="#1a1a1a"
      />

      {/* Track lighting rail on ceiling — decorative */}
      <Box
        size={[0.04, 0.03, roomDepth * 0.7]}
        position={[leftX + 1.2, preset.roomHeight - 0.04, 0]}
        color="#2a2a2a"
        roughness={0.3}
        metalness={0.5}
      />
      <Box
        size={[0.04, 0.03, roomDepth * 0.7]}
        position={[rightX - 1.2, preset.roomHeight - 0.04, 0]}
        color="#2a2a2a"
        roughness={0.3}
        metalness={0.5}
      />
    </group>
  );
}

/* ───────────────────────── CAFE ─────────────────────────────────────── */

function CafeFurniture({ preset }: { preset: RoomPreset }) {
  const { roomWidth, roomHeight } = preset;
  const rightX = roomWidth / 2;
  const leftX = -roomWidth / 2;

  return (
    <group>
      {/* Round table — center */}
      <group position={[-0.4, 0, 0.6]}>
        <Cylinder
          args={[0.35, 0.35, 0.03, 24]}
          position={[0, 0.72, 0]}
          color="#b8a080"
          roughness={0.5}
          metalness={0.02}
        />
        <Cylinder
          args={[0.03, 0.03, 0.7, 8]}
          position={[0, 0.36, 0]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.2, 0.2, 0.02, 16]}
          position={[0, 0.01, 0]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        {/* Coffee cup on table */}
        <Cylinder
          args={[0.035, 0.03, 0.07, 12]}
          position={[0.1, 0.77, 0.05]}
          color="#f5f0e8"
          roughness={0.4}
          metalness={0.1}
        />
        {/* Saucer */}
        <Cylinder
          args={[0.05, 0.05, 0.01, 12]}
          position={[0.1, 0.735, 0.05]}
          color="#f5f0e8"
          roughness={0.4}
        />
      </group>

      {/* Chair 1 — near table */}
      <group position={[-0.4, 0, 1.1]}>
        <Cylinder
          args={[0.18, 0.18, 0.04, 16]}
          position={[0, 0.44, 0]}
          color="#a08868"
          roughness={0.7}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[-0.1, 0.21, -0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[0.1, 0.21, -0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[-0.1, 0.21, 0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[0.1, 0.21, 0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Box
          size={[0.32, 0.35, 0.02]}
          position={[0, 0.62, -0.16]}
          color="#a08868"
          roughness={0.7}
        />
      </group>

      {/* Chair 2 — other side */}
      <group position={[-0.4, 0, 0.1]} rotation={[0, Math.PI, 0]}>
        <Cylinder
          args={[0.18, 0.18, 0.04, 16]}
          position={[0, 0.44, 0]}
          color="#a08868"
          roughness={0.7}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[-0.1, 0.21, -0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[0.1, 0.21, -0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[-0.1, 0.21, 0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Cylinder
          args={[0.012, 0.012, 0.42, 6]}
          position={[0.1, 0.21, 0.1]}
          color="#5a4a3a"
          roughness={0.4}
          metalness={0.2}
        />
        <Box
          size={[0.32, 0.35, 0.02]}
          position={[0, 0.62, -0.16]}
          color="#a08868"
          roughness={0.7}
        />
      </group>

      {/* Counter/bar along right wall */}
      <group position={[rightX - 0.25, 0, 0.3]}>
        <Box
          size={[0.5, 0.06, 1.8]}
          position={[0, 0.9, 0]}
          color="#9a8068"
          roughness={0.4}
          metalness={0.02}
        />
        <Box size={[0.45, 0.88, 1.75]} position={[0, 0.44, 0]} color="#b09878" roughness={0.7} />
        {/* Espresso machine */}
        <Box
          size={[0.22, 0.3, 0.25]}
          position={[0, 1.08, -0.5]}
          color="#c0c0c0"
          roughness={0.2}
          metalness={0.6}
        />
        {/* Cups/jars */}
        <Cylinder
          args={[0.04, 0.04, 0.15, 10]}
          position={[0, 1.0, 0.2]}
          color="#e8dcc8"
          roughness={0.6}
        />
        <Cylinder
          args={[0.05, 0.05, 0.2, 10]}
          position={[0, 1.03, 0.5]}
          color="#c0a888"
          roughness={0.6}
        />
      </group>

      {/* Pendant light above table */}
      <group position={[-0.4, roomHeight, 0.6]}>
        <Cylinder
          args={[0.005, 0.005, 0.5, 6]}
          position={[0, -0.25, 0]}
          color="#555555"
          roughness={0.3}
          metalness={0.4}
        />
        <mesh position={[0, -0.55, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.15, 0.12, 16, 1, true]} />
          <meshStandardMaterial
            color="#555555"
            roughness={0.4}
            metalness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight position={[0, -0.58, 0]} intensity={8} color="#fff0cc" distance={5} decay={2} />
      </group>

      {/* Second pendant light above counter */}
      <group position={[rightX - 0.25, roomHeight, 0.3]}>
        <Cylinder
          args={[0.005, 0.005, 0.4, 6]}
          position={[0, -0.2, 0]}
          color="#555555"
          roughness={0.3}
          metalness={0.4}
        />
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.12, 0.1, 16, 1, true]} />
          <meshStandardMaterial
            color="#555555"
            roughness={0.4}
            metalness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight position={[0, -0.48, 0]} intensity={5} color="#fff0cc" distance={4} decay={2} />
      </group>

      {/* Menu board on left wall — chalkboard style */}
      <group position={[leftX + 0.01, 1.5, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[0.6, 0.45, 0.03]} position={[0, 0, 0]} color="#5a4a3a" roughness={0.8} />
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.54, 0.39]} />
          <meshStandardMaterial color="#2a3a2a" roughness={0.95} metalness={0} />
        </mesh>
      </group>

      {/* Plant in corner */}
      <Plant position={[leftX + 0.35, 0, 1.6]} />

      {/* Wall shelf with items */}
      <Box
        size={[0.6, 0.03, 0.15]}
        position={[leftX + 0.08, 1.1, -0.5]}
        color="#9a8068"
        roughness={0.6}
      />
      <Cylinder
        args={[0.04, 0.04, 0.12, 10]}
        position={[leftX + 0.08, 1.18, -0.6]}
        color="#e0cca0"
        roughness={0.7}
      />
      <Cylinder
        args={[0.03, 0.03, 0.1, 10]}
        position={[leftX + 0.08, 1.17, -0.4]}
        color="#c0a070"
        roughness={0.7}
      />

      {/* Window frame on left wall — bright daylight feel */}
      <group position={[leftX + 0.01, 1.4, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[0.7, 0.9, 0.04]} position={[0, 0, 0]} color="#c8b8a0" roughness={0.5} />
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.62, 0.82]} />
          <meshBasicMaterial color="#d8e8f0" />
        </mesh>
        {/* Window cross */}
        <Box size={[0.62, 0.03, 0.01]} position={[0, 0, 0.025]} color="#c8b8a0" roughness={0.5} />
        <Box size={[0.03, 0.82, 0.01]} position={[0, 0, 0.025]} color="#c8b8a0" roughness={0.5} />
        {/* Daylight from window */}
        <pointLight position={[0, 0, 0.3]} intensity={4} color="#fff8e8" distance={4} decay={2} />
      </group>
    </group>
  );
}

/* ───────────────────────── MAIN EXPORT ─────────────────────────────── */

export default function RoomFurniture({ preset }: RoomFurnitureProps) {
  switch (preset.key) {
    case 'living':
      return <LivingRoomFurniture preset={preset} />;
    case 'bedroom':
      return <BedroomFurniture preset={preset} />;
    case 'gallery':
      return <GalleryFurniture preset={preset} />;
    case 'cafe':
      return <CafeFurniture preset={preset} />;
    default:
      return null;
  }
}
