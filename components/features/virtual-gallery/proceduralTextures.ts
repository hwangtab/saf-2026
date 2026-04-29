import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────
 *  Procedural texture utilities – Canvas2D → THREE.Texture
 *  No external assets needed; everything is generated at runtime.
 * ───────────────────────────────────────────────────────────────────── */

const TEX_SIZE = 512;

function createCanvas(w = TEX_SIZE, h = TEX_SIZE): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function toTexture(canvas: HTMLCanvasElement, repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/* ── Wood grain ──────────────────────────────────────────────────────── */

export function createWoodTexture(
  baseColor = '#9a7a5a',
  grainColor = '#7a5a3a',
  repeatX = 2,
  repeatY = 4
): THREE.CanvasTexture {
  const [c, ctx] = createCanvas();
  // Base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // Grain lines
  ctx.strokeStyle = grainColor;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 80; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * TEX_SIZE;
    ctx.moveTo(0, y + (Math.random() - 0.5) * 8);
    for (let x = 0; x < TEX_SIZE; x += 20) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 6);
    }
    ctx.stroke();
  }
  // Knots
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 3; i++) {
    const kx = Math.random() * TEX_SIZE;
    const ky = Math.random() * TEX_SIZE;
    const kr = 8 + Math.random() * 15;
    const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
    grad.addColorStop(0, grainColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
  }
  ctx.globalAlpha = 1;
  return toTexture(c, repeatX, repeatY);
}

/* ── Fabric / linen ──────────────────────────────────────────────────── */

export function createFabricTexture(
  baseColor = '#c8bfb0',
  repeatX = 4,
  repeatY = 4
): THREE.CanvasTexture {
  const [c, ctx] = createCanvas(256, 256);
  const S = 256;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, S, S);
  // Weave pattern
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < S; y += 3) {
    for (let x = 0; x < S; x += 3) {
      const bright = (x + y) % 6 < 3 ? '#ffffff' : '#000000';
      ctx.fillStyle = bright;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  // Subtle noise
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  return toTexture(c, repeatX, repeatY);
}

/* ── Wall / plaster ──────────────────────────────────────────────────── */

export function createPlasterTexture(
  baseColor = '#e8e0d4',
  repeatX = 3,
  repeatY = 3
): THREE.CanvasTexture {
  const [c, ctx] = createCanvas(256, 256);
  const S = 256;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, S, S);
  // Fine noise for subtle plaster texture
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const size = 1 + Math.random() * 2;
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
  return toTexture(c, repeatX, repeatY);
}

/* ── Floor wood (wider planks) ───────────────────────────────────────── */

export function createFloorTexture(
  baseColor = '#b8956a',
  repeatX = 3,
  repeatY = 6
): THREE.CanvasTexture {
  const [c, ctx] = createCanvas();
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Plank dividers
  const plankWidth = TEX_SIZE / 5;
  ctx.strokeStyle = '#00000020';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * plankWidth, 0);
    ctx.lineTo(i * plankWidth, TEX_SIZE);
    ctx.stroke();
  }

  // Grain per plank
  for (let p = 0; p < 5; p++) {
    const px = p * plankWidth;
    // Slight color variation per plank
    ctx.fillStyle = Math.random() > 0.5 ? '#00000008' : '#ffffff08';
    ctx.fillRect(px, 0, plankWidth, TEX_SIZE);

    ctx.strokeStyle = '#00000018';
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 20; i++) {
      ctx.lineWidth = 0.3 + Math.random() * 1;
      ctx.beginPath();
      const y = Math.random() * TEX_SIZE;
      ctx.moveTo(px + 2, y);
      for (let x = px + 2; x < px + plankWidth - 2; x += 15) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * 3);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  return toTexture(c, repeatX, repeatY);
}

/* ── Normal map from noise (general-purpose) ─────────────────────────── */

export function createNoiseNormalMap(
  intensity = 0.5,
  repeatX = 3,
  repeatY = 3
): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = createCanvas(S, S);
  const imgData = ctx.createImageData(S, S);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const nx = 128 + (Math.random() - 0.5) * 255 * intensity;
    const ny = 128 + (Math.random() - 0.5) * 255 * intensity;
    d[i] = nx; // R → X
    d[i + 1] = ny; // G → Y
    d[i + 2] = 255; // B → Z (pointing out)
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.type = THREE.UnsignedByteType;
  return tex;
}

/* ── Procedural environment map ──────────────────────────────────────── */

export function createEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();

  // Gallery White Cube sky dome — neutral cool gradient (no warm sand)
  const skyGeo = new THREE.SphereGeometry(10, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color('#FAFAFC') }, // Gallery Pearl
      midColor: { value: new THREE.Color('#FFFFFF') }, // Gallery Canvas
      bottomColor: { value: new THREE.Color('#F5F5F7') }, // Gallery Parchment
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = mix(bottomColor, midColor, smoothstep(-0.2, 0.0, h));
        col = mix(col, topColor, smoothstep(0.0, 0.6, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Soft area lights represented as bright emissive panels
  const panelGeo = new THREE.PlaneGeometry(4, 2);
  const panelMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide });
  const panel1 = new THREE.Mesh(panelGeo, panelMat);
  panel1.position.set(0, 6, -3);
  panel1.lookAt(0, 0, 0);
  scene.add(panel1);

  const panel2 = new THREE.Mesh(panelGeo, panelMat.clone());
  panel2.position.set(4, 4, 2);
  panel2.lookAt(0, 0, 0);
  scene.add(panel2);

  const pmremGen = new THREE.PMREMGenerator(renderer);
  pmremGen.compileCubemapShader();
  const envMap = pmremGen.fromScene(scene, 0, 0.1, 100).texture;
  pmremGen.dispose();

  skyMat.dispose();
  skyGeo.dispose();
  panelGeo.dispose();
  panelMat.dispose();

  return envMap;
}
