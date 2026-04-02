'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArtworkDimensions } from '@/lib/utils/parseArtworkSize';

interface ArtworkPlaneProps {
  imageUrl: string;
  dimensions: ArtworkDimensions;
  wallY: number;
}

const FRAME_WIDTH = 0.035;
const FRAME_DEPTH = 0.04;
const INNER_LIP = 0.008;
const MOUNT_PADDING = 0.045;
const EYE_HEIGHT = 1.5;

interface LoadedTexture {
  texture: THREE.Texture;
  aspect: number; // width / height
}

export default function ArtworkPlane({ imageUrl, dimensions, wallY }: ArtworkPlaneProps) {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { gl } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      imageUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        const aspect = tex.image.width / tex.image.height;
        setLoaded({ texture: tex, aspect });
      },
      undefined,
      () => {
        const fallbackLoader = new THREE.TextureLoader();
        fallbackLoader.load(
          imageUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const aspect = tex.image.width / tex.image.height;
            setLoaded({ texture: tex, aspect });
          },
          undefined,
          () => {}
        );
      }
    );

    return () => {
      setLoaded((prev) => {
        prev?.texture.dispose();
        return null;
      });
    };
  }, [imageUrl, gl.capabilities]);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  // Compute artwork plane size:
  // Use physical dimensions as the maximum bounding size,
  // then fit the actual image aspect ratio within that.
  const { artW, artH } = useMemo(() => {
    const { widthM, heightM } = dimensions;
    if (!loaded) return { artW: widthM, artH: heightM };

    const physAspect = widthM / heightM;
    const imgAspect = loaded.aspect;

    if (imgAspect > physAspect) {
      return { artW: widthM, artH: widthM / imgAspect };
    } else {
      return { artW: heightM * imgAspect, artH: heightM };
    }
  }, [dimensions, loaded]);

  const artworkY = useMemo(() => {
    return Math.min(EYE_HEIGHT, wallY - artH / 2 - 0.1);
  }, [wallY, artH]);

  const mountWidth = artW + MOUNT_PADDING * 2;
  const mountHeight = artH + MOUNT_PADDING * 2;
  const outerWidth = mountWidth + FRAME_WIDTH * 2;
  const outerHeight = mountHeight + FRAME_WIDTH * 2;

  return (
    <group position={[0, artworkY, 0]}>
      <object3D ref={targetRef} position={[0, 0, 0.01]} />

      <spotLight
        ref={spotRef}
        position={[0, outerHeight / 2 + 0.25, 0.3]}
        angle={0.6}
        penumbra={0.9}
        intensity={8}
        color="#fff6e8"
        distance={3}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.001}
      />

      {/* Frame */}
      <mesh position={[0, 0, -FRAME_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[outerWidth, outerHeight, FRAME_DEPTH]} />
        <meshStandardMaterial color="#2a2018" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Inner lip */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[mountWidth + INNER_LIP * 2, mountHeight + INNER_LIP * 2]} />
        <meshStandardMaterial color="#8b7d5e" roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Mount */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[mountWidth, mountHeight]} />
        <meshStandardMaterial color="#f5f3ee" roughness={0.95} metalness={0} />
      </mesh>

      {/* Artwork */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[artW, artH]} />
        {loaded ? (
          <meshBasicMaterial map={loaded.texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#e0d8cc" roughness={0.8} metalness={0} />
        )}
      </mesh>

      {/* Drop shadow */}
      <mesh position={[0.01, -0.015, -FRAME_DEPTH - 0.001]}>
        <planeGeometry args={[outerWidth + 0.02, outerHeight + 0.02]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}
