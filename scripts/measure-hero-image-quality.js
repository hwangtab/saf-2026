#!/usr/bin/env node
// NOW_SHOWING 히어로 후보 이미지의 픽셀 해상도를 측정해 lib/hero-image-quality.generated.json 갱신.
// long edge < 1920px이면 lowRes:true → HomeHero가 자동 블러+짙은 오버레이 연출 적용.
// 빌드 전(build 파이프라인)에 자동 실행. 측정 실패/네트워크 오류는 빌드를 깨뜨리지 않는다.
// Usage: node scripts/measure-hero-image-quality.js

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const probe = require('probe-image-size');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const LOW_RES_THRESHOLD = 1920; // hero preset 폭. long edge가 이 미만이면 풀스크린 업스케일 = 흐림.

const NOW_SHOWING_PATH = path.join(__dirname, '..', 'lib', 'now-showing.ts');
const OUT_PATH = path.join(__dirname, '..', 'lib', 'hero-image-quality.generated.json');

// lib/now-showing.ts 텍스트에서 각 항목의 slug + imageUrl 추출 (sync-site-stats.js의 regex 패턴 준용).
// imageUrl은 `${STORAGE}/artworks/.../82__original.webp` 템플릿 리터럴 → ${STORAGE}를 실제 URL로 치환.
function extractCandidates(source) {
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;
  const candidates = [];
  // slug: '...' 와 그 뒤에 오는 imageUrl: `...` 를 객체 블록 단위로 매칭.
  const blockRe = /slug:\s*'([^']+)'[\s\S]*?imageUrl:\s*`([^`]+)`/g;
  let m;
  while ((m = blockRe.exec(source)) !== null) {
    const slug = m[1];
    const rawUrl = m[2].replace('${STORAGE}', storageBase);
    candidates.push({ slug, url: rawUrl });
  }
  return candidates;
}

async function measure(url) {
  // probe는 헤더만 스트림으로 읽어 dimension 파악 — 전체 다운로드 안 함.
  const result = await probe(url, { timeout: 8000 });
  return { width: result.width, height: result.height };
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn(
      '[measure-hero-images] NEXT_PUBLIC_SUPABASE_URL 없음 — 측정 건너뜀(기존 JSON 유지)'
    );
    process.exit(0);
  }

  const source = fs.readFileSync(NOW_SHOWING_PATH, 'utf8');
  const candidates = extractCandidates(source);

  // 기존 JSON을 시작점으로 — 이번에 측정 실패한 slug는 기존 값 보존.
  let out = {};
  try {
    out = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  } catch {
    out = {};
  }

  for (const { slug, url } of candidates) {
    try {
      const { width, height } = await measure(url);
      const lowRes = Math.max(width, height) < LOW_RES_THRESHOLD;
      out[slug] = { width, height, lowRes };
      console.log(`[measure-hero-images] ${slug}: ${width}x${height} lowRes=${lowRes}`);
    } catch (err) {
      // 안전 폴백: 측정 실패 slug는 lowRes:false로 기록(평소대로 렌더). 빌드 비차단.
      out[slug] = { width: 0, height: 0, lowRes: false };
      console.warn(`[measure-hero-images] ${slug} 측정 실패 — lowRes:false 폴백:`, err.message);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[measure-hero-images] 갱신 완료 — ${candidates.length}개 후보`);
}

main().catch((err) => {
  console.warn('[measure-hero-images] 예기치 못한 오류 — 측정 건너뜀(빌드 비차단):', err.message);
  process.exit(0);
});
