#!/usr/bin/env node
// PageHero(customBackgroundImage)용 정적 배경 후보의 픽셀 해상도를 측정한다.
// long edge < 1920px이면 lowRes:true → PageHero가 비네팅+짙은 오버레이 보정을 적용한다.
// 측정 실패/네트워크 오류는 빌드를 깨뜨리지 않고 lowRes:false로 안전 폴백한다.

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const probe = require('probe-image-size');
const sharp = require('sharp');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const LOW_RES_THRESHOLD = 1920;
const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'lib', 'page-hero-image-quality.generated.json');
const PUBLIC_DIR = path.join(ROOT, 'public');

const SOURCE_FILES = [
  'lib/hero-curation.ts',
  'app/[locale]/event/oh-yoon-memorial/page.tsx',
  'content/news.ts',
  'content/artist-articles.ts',
];

function classifyDimensions(width, height) {
  return {
    width,
    height,
    lowRes: Math.max(width, height) < LOW_RES_THRESHOLD,
  };
}

function walkImages(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      // nextImageExportOptimizer 산출물은 런타임 PageHero가 직접 참조하지 않는다.
      if (entry.name === 'nextImageExportOptimizer') return [];
      return walkImages(abs, rel);
    }
    if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(entry.name)) return [];
    return [rel];
  });
}

function extractImageCandidates(source) {
  const candidates = new Set();
  const imageStringRe =
    /['"`](\/images\/[^'"`]+\.(?:avif|gif|jpe?g|png|webp)|https?:\/\/[^'"`\s]+\.(?:avif|gif|jpe?g|png|webp)(?:\?[^'"`\s]*)?)['"`]/gi;
  let match;
  while ((match = imageStringRe.exec(source)) !== null) {
    candidates.add(match[1]);
  }
  return [...candidates];
}

function collectCandidates() {
  const candidates = new Set();

  for (const relPath of SOURCE_FILES) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) continue;
    for (const candidate of extractImageCandidates(fs.readFileSync(abs, 'utf8'))) {
      candidates.add(candidate);
    }
  }

  for (const rel of walkImages(path.join(PUBLIC_DIR, 'images', 'hero'), '/images/hero')) {
    candidates.add(rel);
  }

  return [...candidates].sort();
}

function localPublicPath(url) {
  if (!url.startsWith('/')) return null;
  const normalized = path.normalize(url).replace(/^(\.\.[/\\])+/, '');
  return path.join(PUBLIC_DIR, normalized);
}

async function measureCandidate(url) {
  const localPath = localPublicPath(url);
  if (localPath) {
    const metadata = await sharp(localPath).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('local image metadata missing width/height');
    }
    return classifyDimensions(metadata.width, metadata.height);
  }

  const result = await probe(url, { timeout: 8000 });
  return classifyDimensions(result.width, result.height);
}

async function main() {
  const candidates = collectCandidates();
  const out = {};

  for (const url of candidates) {
    try {
      out[url] = await measureCandidate(url);
      console.log(
        `[measure-page-hero-images] ${url}: ${out[url].width}x${out[url].height} lowRes=${out[url].lowRes}`
      );
    } catch (err) {
      out[url] = { width: 0, height: 0, lowRes: false };
      console.warn(
        `[measure-page-hero-images] ${url} 측정 실패 — lowRes:false 폴백:`,
        err.message
      );
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[measure-page-hero-images] 갱신 완료 — ${candidates.length}개 후보`);
}

if (require.main === module) {
  main().catch((err) => {
    console.warn('[measure-page-hero-images] 예기치 못한 오류 — 측정 건너뜀:', err.message);
    process.exit(0);
  });
}

module.exports = {
  classifyDimensions,
  collectCandidates,
  extractImageCandidates,
  localPublicPath,
  measureCandidate,
};
