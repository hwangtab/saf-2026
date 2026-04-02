'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArtworkDimensions } from '@/lib/utils/parseArtworkSize';

interface ArtworkPedestalProps {
  imageUrl: string;
  dimensions: ArtworkDimensions;
}

interface LoadedTexture {
  texture: THREE.Texture;
  aspect: number;
}

const EYE_HEIGHT = 1.4;

export default function ArtworkPedestal({ imageUrl, dimensions }: ArtworkPedestalProps) {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { gl } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      setLoaded({ texture: tex, aspect: tex.image.width / tex.image.height });
    });

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

  // Artwork display size from physical dimensions
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

  // Pedestal height: artwork center near eye level
  const pedestalH = useMemo(() => {
    const idealH = EYE_HEIGHT - artH / 2;
    return Math.max(0.2, Math.min(1.2, idealH));
  }, [artH]);

  // Pedestal slightly larger than artwork footprint
  const pedestalW = Math.max(0.4, artW + 0.2);
  const pedestalD = Math.max(0.35, artW * 0.6 + 0.1);

  return (
    <group position={[0, 0, 0]}>
      <object3D ref={targetRef} position={[0, pedestalH + artH / 2, 0]} />

      {/* Overhead spotlight */}
      <spotLight
        ref={spotRef}
        position={[0.5, 3.2, 1.5]}
        angle={0.45}
        penumbra={0.8}
        intensity={15}
        color="#fff8f0"
        distance={6}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.001}
      />

      {/* Pedestal body */}
      <mesh position={[0, pedestalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[pedestalW, pedestalH, pedestalD]} />
        <meshStandardMaterial color="#f0ece6" roughness={0.6} metalness={0.02} />
      </mesh>

      {/* Pedestal top cap */}
      <mesh position={[0, pedestalH + 0.01, 0]} receiveShadow>
        <boxGeometry args={[pedestalW + 0.02, 0.02, pedestalD + 0.02]} />
        <meshStandardMaterial color="#e8e4de" roughness={0.5} metalness={0.03} />
      </mesh>

      {/* Artwork image — vertical plane on pedestal */}
      <mesh position={[0, pedestalH + 0.02 + artH / 2, 0]}>
        <planeGeometry args={[artW, artH]} />
        {loaded ? (
          <meshBasicMaterial map={loaded.texture} toneMapped={false} side={THREE.DoubleSide} />
        ) : (
          <meshStandardMaterial color="#e0d8cc" roughness={0.8} metalness={0} />
        )}
      </mesh>

      {/* Info label on pedestal front */}
      <mesh position={[0, pedestalH * 0.55, pedestalD / 2 + 0.001]}>
        <planeGeometry args={[pedestalW * 0.6, 0.04]} />
        <meshStandardMaterial color="#d8d4ce" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}
