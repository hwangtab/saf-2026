#!/usr/bin/env node
/**
 * Next.js 16.2.6 segment-cache 키 인코딩 버그 패치 (postinstall).
 *
 * 근본원인: next/dist/.../segment-cache/segment-value-encoding.js 의
 * encodeToFilesystemAndURLSafeString()이 비-ASCII 라우트 세그먼트(한글 카테고리명·작가명)에
 * btoa(value)를 raw 호출 → DOMException 'Invalid character'. 정적 prerender의 segment
 * prefetch 데이터 생성 시 throw되어 한글 /artworks/category/*, /artworks/artist/* 가
 * 200이지만 error 로깅되고 client prefetch가 깨졌다.
 *
 * 수정: btoa(value) → btoa(unescape(encodeURIComponent(value)))로 UTF-8을 Latin1 byte
 * string으로 먼저 변환(ByteString-safe). segment-cache 키는 단방향 식별자라 round-trip 무관.
 *
 * patch-package 대신 자체 스크립트인 이유: Vercel 빌드는 .vercelignore로 .git을 제외하는데,
 * patch-package는 git 없는 환경에서 멀티-파일 patch 적용에 실패한다(CJS는 성공해도 ESM 사본
 * 추가 시 ERROR). 이 스크립트는 git 불필요·멱등이라 환경 무관하게 동작한다.
 *
 * Next 업그레이드 시: 패턴이 안 맞으면 경고를 출력하고 통과한다. 그 경우 'Invalid character'가
 * 재발할 수 있으니 경고가 보이면 이 스크립트를 새 Next 소스에 맞게 갱신할 것.
 */
const fs = require('fs');
const path = require('path');

const TARGETS = [
  'node_modules/next/dist/shared/lib/segment-cache/segment-value-encoding.js', // CJS
  'node_modules/next/dist/esm/shared/lib/segment-cache/segment-value-encoding.js', // ESM (Turbopack 런타임)
];

const FROM = "const base64url = btoa(value).replace(/\\+/g, '-')";
const TO =
  "const base64url = btoa(unescape(encodeURIComponent(value))).replace(/\\+/g, '-') /* PATCH(saf2026): non-Latin1(한글) ByteString-safe */";
const ALREADY = 'btoa(unescape(encodeURIComponent(value)))';

let patched = 0;
let missing = 0;
let appliedThisRun = 0;

for (const rel of TARGETS) {
  const file = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(file)) {
    console.warn(`[patch-next] 파일 없음(스킵): ${rel}`);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(ALREADY)) {
    patched++;
    continue; // 멱등: 이미 패치됨
  }
  if (!src.includes(FROM)) {
    missing++;
    console.warn(
      `[patch-next] ⚠ 패치 대상 패턴 미발견: ${rel} — Next 버전이 바뀌었을 수 있음. 스크립트 갱신 필요.`
    );
    continue;
  }
  fs.writeFileSync(file, src.replace(FROM, TO), 'utf8');
  patched++;
  appliedThisRun++;
  console.log(`[patch-next] ✔ 패치 적용: ${rel}`);
}

if (missing > 0) {
  console.warn(
    `[patch-next] 경고: ${missing}개 사본에서 패턴 미발견. 한글 라우트 'Invalid character' 회귀 위험.`
  );
}

// Turbopack 빌드 캐시 무효화 — Turbopack/webpack은 node_modules를 불변으로 간주해
// 소스를 패치해도 캐시된 번들을 재사용한다. 그 결과 빌드 prerender는 패치된 소스를 쓰지만
// 런타임 lambda 번들에는 패치가 반영되지 않아 한글 라우트가 여전히 throw한다.
// 패치 사본이 존재하면(이미 패치된 멱등 재실행 포함) 항상 .next/cache를 비운다 —
// Vercel은 'Restored build cache'로 *패치된 node_modules*까지 복원하므로 postinstall이
// ALREADY로 인식(appliedThisRun=0)해도 .next/cache의 Turbopack 번들은 stale일 수 있다.
// 무조건 무효화해야 다음 next build가 패치된 소스로 재번들한다(런타임 반영 보장).
// 트레이드오프: 매 빌드 Turbopack 캐시 미사용으로 컴파일 시간 소폭 증가.
// (회귀 사고: 2026-06-16 조건부 무효화가 node_modules 캐시로 skip되어 category throw 잔존)
void appliedThisRun;
if (patched > 0) {
  const cacheDir = path.resolve(process.cwd(), '.next', 'cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('[patch-next] .next/cache 무효화 (Turbopack stale 번들 제거)');
  } else {
    console.log('[patch-next] .next/cache 없음 (첫 빌드 — 무효화 불필요)');
  }
}

console.log(`[patch-next] 완료 — 패치/확인된 사본 ${patched}개`);
