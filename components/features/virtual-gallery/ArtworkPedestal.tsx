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
const SIDE_COLOR = '#e8e4de';

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

  // Compute 3D box dimensions for the sculpture
  const { boxW, boxD, boxH } = useMemo(() => {
    const { widthM, heightM, depthM } = dimensions;

    if (depthM) {
      // 3D size given (WxHxD or WxDxH) — use largest as height
      const vals = [widthM, heightM, depthM].sort((a, b) => b - a);
      return { boxH: vals[0], boxW: vals[1], boxD: vals[2] };
    }

    // 2D size only — infer depth as fraction of width
    return { boxW: widthM, boxH: heightM, boxD: Math.min(widthM, heightM) * 0.6 };
  }, [dimensions]);

  // Fit image aspect within front face (boxW x boxH)
  const { imgW, imgH } = useMemo(() => {
    if (!loaded) return { imgW: boxW, imgH: boxH };

    const faceAspect = boxW / boxH;
    const imgAspect = loaded.aspect;

    if (imgAspect > faceAspect) {
      return { imgW: boxW, imgH: boxW / imgAspect };
    } else {
      return { imgW: boxH * imgAspect, imgH: boxH };
    }
  }, [boxW, boxH, loaded]);

  // Pedestal height: position artwork center near eye level
  const pedestalH = useMemo(() => {
    const idealH = EYE_HEIGHT - boxH / 2;
    return Math.max(0.2, Math.min(1.2, idealH));
  }, [boxH]);

  // Pedestal dimensions: slightly larger than object footprint
  const pedestalW = Math.max(0.4, boxW + 0.15);
  const pedestalD = Math.max(0.35, boxD + 0.15);

  // Box material array: [+X, -X, +Y, -Y, +Z (front), -Z (back)]
  const materials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color: SIDE_COLOR,
      roughness: 0.7,
      metalness: 0,
    });
    const topMat = new THREE.MeshStandardMaterial({
      color: SIDE_COLOR,
      roughness: 0.8,
      metalness: 0,
    });

    if (loaded) {
      const frontMat = new THREE.MeshBasicMaterial({
        map: loaded.texture,
        toneMapped: false,
      });
      // Back shows same image
      const backTex = loaded.texture.clone();
      backTex.wrapS = THREE.RepeatWrapping;
      backTex.repeat.x = -1;
      const backMat = new THREE.MeshBasicMaterial({
        map: backTex,
        toneMapped: false,
      });
      return [sideMat, sideMat, topMat, topMat, frontMat, backMat];
    }

    const placeholderMat = new THREE.MeshStandardMaterial({
      color: '#e0d8cc',
      roughness: 0.8,
      metalness: 0,
    });
    return [sideMat, sideMat, topMat, topMat, placeholderMat, placeholderMat];
  }, [loaded]);

  // Dispose materials on unmount
  useEffect(() => {
    return () => {
      materials.forEach((m) => m.dispose());
    };
  }, [materials]);

  return (
    <group position={[0, 0, 0]}>
      <object3D ref={targetRef} position={[0, pedestalH + boxH / 2, 0]} />

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

      {/* Sculpture body — 3D box with image on front/back faces */}
      <mesh position={[0, pedestalH + 0.02 + boxH / 2, 0]} castShadow material={materials}>
        <boxGeometry args={[imgW, imgH, boxD]} />
      </mesh>

      {/* Info label on pedestal front */}
      <mesh position={[0, pedestalH * 0.55, pedestalD / 2 + 0.001]}>
        <planeGeometry args={[pedestalW * 0.6, 0.04]} />
        <meshStandardMaterial color="#d8d4ce" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}
