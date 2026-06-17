# 홈 히어로 저해상도 이미지 자동 연출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 히어로 배경의 저해상도 작품 사진을 빌드 타임에 자동 탐지해, 노출은 유지하면서 자동으로 블러+짙은 오버레이 연출을 입혀 "의도된 soft-focus 배경"처럼 보이게 한다.

**Architecture:** 빌드 파이프라인에 측정 스크립트(`scripts/measure-hero-image-quality.js`)를 추가해 `NOW_SHOWING` 후보 이미지의 픽셀 해상도를 측정하고 `lib/hero-image-quality.generated.json`으로 출력한다. 런타임(SSG)에서 `HomeHero`가 이 JSON + 항목별 `heroTreatment` override를 순수 함수 `resolveHeroSoftTreatment()`로 합쳐 연출 여부를 결정한다. 정상 해상도 경로는 현행과 동일.

**Tech Stack:** Next.js 16 (RSC/SSG), TypeScript strict, `probe-image-size`(신규 의존성), Jest(`__tests__`), Tailwind, `clsx`.

## Global Constraints

- TypeScript strict: `noImplicitAny`, `noUnusedLocals`. `as any` / `@ts-ignore` 금지.
- 색상은 브랜드 토큰만 — `charcoal-deep` 등. Tailwind 기본 팔레트(`slate`/`blue` 등) 금지.
- 빌드 스크립트는 `.js` CommonJS, 실패 시 `process.exit(0)`로 빌드 비차단(기존 `sync-site-stats.js` 패턴).
- 측정 실패/네트워크 오류/JSON 부재 시 모든 slug는 `lowRes: false`(평소대로 렌더). 빌드 절대 실패 금지.
- 정상 해상도(연출 미적용) 렌더는 현재 `HomeHero.tsx`와 동일해야 함 — 블러/오버레이 분기는 `lowRes`/`'soft'`일 때만.
- 판정 임계: **long edge < 1920px → lowRes**. 단일 상수로 추출.
- 커밋 메시지 본문에 `요약:` 줄 필수(개발 이력 페이지 노출).

---

## File Structure

- `lib/now-showing.ts` (수정) — `NowShowingItem.heroTreatment` 필드 추가, `resolveHeroSoftTreatment()` 순수 함수 추가.
- `lib/hero-image-quality.generated.json` (생성, git 추적) — `{ [slug]: { width, height, lowRes } }`. 초기엔 `{}`.
- `scripts/measure-hero-image-quality.js` (생성) — 빌드 타임 측정 스크립트.
- `components/features/HomeHero.tsx` (수정) — JSON import + `resolveHeroSoftTreatment()` 호출 + 조건부 블러/오버레이.
- `package.json` (수정) — `build` 스크립트에 측정 단계 추가, `measure:hero-images` npm script, `probe-image-size` 의존성.
- `__tests__/lib/now-showing-hero-treatment.test.ts` (생성) — 결정 로직 단위 테스트.

---

## Task 1: 연출 결정 로직 + 데이터 모델 (순수 함수, TDD)

**Files:**

- Modify: `lib/now-showing.ts` (인터페이스 `NowShowingItem` ~L17-46, 파일 끝에 함수 추가)
- Create: `lib/hero-image-quality.generated.json`
- Test: `__tests__/lib/now-showing-hero-treatment.test.ts`

**Interfaces:**

- Produces:
  - `type HeroTreatment = 'auto' | 'soft' | 'sharp'`
  - `NowShowingItem.heroTreatment?: HeroTreatment`
  - `interface HeroImageQuality { width: number; height: number; lowRes: boolean }`
  - `type HeroImageQualityMap = Record<string, HeroImageQuality>`
  - `resolveHeroSoftTreatment(item: NowShowingItem, qualityMap: HeroImageQualityMap): boolean`
    - `'sharp'` → 항상 `false`
    - `'soft'` → 항상 `true`
    - `'auto'`/미지정 → `qualityMap[item.slug]?.lowRes === true`

- [ ] **Step 1: 초기 generated JSON 생성**

Create `lib/hero-image-quality.generated.json`:

```json
{}
```

(빈 객체 = 모든 slug 미측정 = lowRes false = 평소대로. measure 스크립트가 이후 갱신.)

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/now-showing-hero-treatment.test.ts`:

```ts
import { resolveHeroSoftTreatment } from '@/lib/now-showing';
import type { NowShowingItem } from '@/lib/now-showing';

const base: NowShowingItem = {
  slug: 'x',
  i18nKey: 'x',
  href: '/x',
  imageUrl: 'https://example.com/x.webp',
  startDate: '2026-01-01',
};

const lowResMap = { x: { width: 1200, height: 900, lowRes: true } };
const hiResMap = { x: { width: 2400, height: 1600, lowRes: false } };

describe('resolveHeroSoftTreatment', () => {
  it('auto + lowRes → 연출 적용', () => {
    expect(resolveHeroSoftTreatment(base, lowResMap)).toBe(true);
  });

  it('auto + 정상 해상도 → 연출 미적용', () => {
    expect(resolveHeroSoftTreatment(base, hiResMap)).toBe(false);
  });

  it('auto + 측정값 없음(미측정 slug) → 연출 미적용(안전 폴백)', () => {
    expect(resolveHeroSoftTreatment(base, {})).toBe(false);
  });

  it("'soft' → 측정 무시하고 항상 연출 적용", () => {
    expect(resolveHeroSoftTreatment({ ...base, heroTreatment: 'soft' }, hiResMap)).toBe(true);
  });

  it("'sharp' → lowRes여도 항상 연출 미적용(오탐 탈출구)", () => {
    expect(resolveHeroSoftTreatment({ ...base, heroTreatment: 'sharp' }, lowResMap)).toBe(false);
  });

  it("heroTreatment 미지정은 'auto'와 동일", () => {
    expect(resolveHeroSoftTreatment(base, lowResMap)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- now-showing-hero-treatment`
Expected: FAIL — `resolveHeroSoftTreatment is not a function` / export 없음.

- [ ] **Step 4: 타입·필드·함수 구현**

`lib/now-showing.ts`에서 `NowShowingItem` 인터페이스에 필드 추가 (heroPriority 다음, L45 근처):

```ts
  heroPriority?: number;
  /**
   * 히어로 배경 연출 모드.
   * - 'auto'(기본/미지정): 빌드 타임 해상도 측정 결과대로. lowRes면 자동 블러 연출.
   * - 'soft': 측정 무시하고 강제 연출. 해상도는 충분하나 초점이 나간 사진 등 자동이 못 잡는 케이스.
   * - 'sharp': 측정 무시하고 연출 off. 자동 판정 오탐 시 탈출구.
   */
  heroTreatment?: HeroTreatment;
```

인터페이스 위에 타입 추가 (L16 `export type NowShowingStatus` 근처):

```ts
export type HeroTreatment = 'auto' | 'soft' | 'sharp';

export interface HeroImageQuality {
  width: number;
  height: number;
  lowRes: boolean;
}

export type HeroImageQualityMap = Record<string, HeroImageQuality>;
```

파일 끝에 순수 함수 추가:

```ts
/**
 * 히어로 배경에 soft 연출(블러+짙은 오버레이)을 적용할지 결정.
 *
 * - heroTreatment 'sharp' → 항상 false (자동 오탐 탈출구)
 * - heroTreatment 'soft' → 항상 true (자동이 못 잡는 초점 흐림 등 수동 강제)
 * - 'auto'/미지정 → 빌드 타임 측정 결과(qualityMap[slug].lowRes)를 따른다.
 *   측정값이 없으면(미측정/측정 실패) false = 평소대로 렌더(안전 폴백).
 */
export function resolveHeroSoftTreatment(
  item: NowShowingItem,
  qualityMap: HeroImageQualityMap
): boolean {
  const treatment = item.heroTreatment ?? 'auto';
  if (treatment === 'sharp') return false;
  if (treatment === 'soft') return true;
  return qualityMap[item.slug]?.lowRes === true;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- now-showing-hero-treatment`
Expected: PASS (6 tests).

- [ ] **Step 6: type-check**

Run: `npm run type-check`
Expected: 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add lib/now-showing.ts lib/hero-image-quality.generated.json __tests__/lib/now-showing-hero-treatment.test.ts
git commit -m "feat(hero): 저해상도 연출 결정 로직·데이터 모델

요약: 히어로 soft 연출 여부 결정 순수함수와 heroTreatment 필드 추가

- NowShowingItem.heroTreatment(auto/soft/sharp) 필드
- resolveHeroSoftTreatment() 순수함수 + 단위 테스트 6종
- 초기 빈 generated.json(import 안전)"
```

---

## Task 2: 빌드 타임 해상도 측정 스크립트

**Files:**

- Create: `scripts/measure-hero-image-quality.js`
- Modify: `package.json` (scripts.build, scripts.measure:hero-images, dependencies)
- Output: `lib/hero-image-quality.generated.json` (스크립트가 갱신)

**Interfaces:**

- Consumes: `lib/now-showing.ts` 텍스트(regex로 slug+imageUrl 추출), `NEXT_PUBLIC_SUPABASE_URL` env, `probe-image-size`.
- Produces: `lib/hero-image-quality.generated.json` = `{ [slug]: { width, height, lowRes } }` (Task 1의 `HeroImageQualityMap` 형태).

- [ ] **Step 1: probe-image-size 의존성 설치**

Run: `npm install probe-image-size`
Expected: `package.json` dependencies에 `probe-image-size` 추가. (webp 지원, 원격 URL 헤더 스트림 측정 — `image-size`는 버퍼 필요해 부적합.)

- [ ] **Step 2: 측정 스크립트 작성**

Create `scripts/measure-hero-image-quality.js`:

```js
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

main();
```

- [ ] **Step 3: package.json 스크립트 등록**

`package.json` scripts에 추가:

```json
    "measure:hero-images": "node scripts/measure-hero-image-quality.js",
```

`build` 스크립트를 측정 단계 포함하도록 수정 (`sync-site-stats` 다음):

```json
    "build": "npm run generate-changelog && node scripts/sync-site-stats.js && node scripts/measure-hero-image-quality.js && NODE_OPTIONS=--max-old-space-size=8192 next build && npm run verify:i18n-placeholders",
```

- [ ] **Step 4: 스크립트 실행 검증 (실제 측정)**

Run: `npm run measure:hero-images`
Expected: 콘솔에 각 slug의 `WxH lowRes=...` 출력. `lib/hero-image-quality.generated.json`에 `all-artworks`/`oh-yoon-40th`/`park-saenggwang-drawings` 3개 키가 실제 해상도로 채워짐. (env 없으면 "측정 건너뜀" 출력 — 그 경우 `.env.local` 확인.)

- [ ] **Step 5: 측정 실패 폴백 검증**

`NEXT_PUBLIC_SUPABASE_URL`을 일시적으로 잘못된 값으로 두고 실행하거나, 존재하지 않는 URL이 섞이도록 한 뒤:
Run: `npm run measure:hero-images`
Expected: 실패 slug가 `{ "width": 0, "height": 0, "lowRes": false }`로 기록, 프로세스 exit code 0(비차단). 확인 후 env 원복.

- [ ] **Step 6: Commit**

```bash
git add scripts/measure-hero-image-quality.js package.json package-lock.json lib/hero-image-quality.generated.json
git commit -m "feat(hero): 히어로 이미지 해상도 빌드 타임 측정 스크립트

요약: NOW_SHOWING 후보 해상도 측정해 저해상도 자동 탐지

- scripts/measure-hero-image-quality.js (probe-image-size, long edge<1920px=lowRes)
- build 파이프라인 sync-site-stats 다음에 단계 추가
- 측정 실패는 lowRes:false 폴백, 빌드 비차단"
```

---

## Task 3: HomeHero 연출 통합

**Files:**

- Modify: `components/features/HomeHero.tsx`

**Interfaces:**

- Consumes: `resolveHeroSoftTreatment`, `HeroImageQualityMap` (Task 1), `lib/hero-image-quality.generated.json` (Task 2).

- [ ] **Step 1: import 추가**

`components/features/HomeHero.tsx` 상단 import 블록 수정:

```ts
import { getCardStatus, getHeroSlide, resolveHeroSoftTreatment } from '@/lib/now-showing';
import type { HeroImageQualityMap } from '@/lib/now-showing';
import heroImageQuality from '@/lib/hero-image-quality.generated.json';
```

- [ ] **Step 2: 연출 여부 계산**

`getHeroSlide()` 호출 직후(`const slide = getHeroSlide();` 다음 줄)에 추가:

```ts
const softTreatment = resolveHeroSoftTreatment(slide, heroImageQuality as HeroImageQualityMap);
```

- [ ] **Step 3: SafeImage에 조건부 블러 적용**

`SafeImage`의 `className`을 수정 (현재 `className="object-cover"`):

```tsx
<SafeImage
  src={slide.imageUrl}
  alt={title}
  fill
  priority
  fetchPriority="high"
  quality={60}
  sizes="100vw"
  className={clsx('object-cover', softTreatment && 'scale-110 blur-[10px]')}
/>
```

파일 상단에 `import clsx from 'clsx';` 추가(이미 없으면 — 2번 external import 그룹).

- [ ] **Step 4: 그라디언트 중앙 농도 조건부 강화**

그라디언트 div(현재 `via-charcoal-deep/30`)를 수정:

```tsx
<div
  className={clsx(
    'absolute inset-0 bg-gradient-to-b from-charcoal-deep/85 to-charcoal-deep/70',
    softTreatment ? 'via-charcoal-deep/55' : 'via-charcoal-deep/30'
  )}
/>
```

- [ ] **Step 5: type-check + build**

Run: `npm run type-check`
Expected: 에러 없음(JSON import는 Next.js `resolveJsonModule` 기본 활성).

Run: `npm run build`
Expected: 측정 단계 실행 → next build 성공. (RSC라 단위 테스트 대신 빌드로 검증.)

- [ ] **Step 6: Commit**

```bash
git add components/features/HomeHero.tsx
git commit -m "feat(hero): 저해상도 히어로 자동 블러·오버레이 연출 적용

요약: lowRes 판정 시 히어로 배경에 블러+짙은 오버레이 자동 적용

- resolveHeroSoftTreatment 결과로 scale-110 blur-[10px] 조건부
- 그라디언트 중앙 농도 lowRes 시 /30→/55 강화
- 정상 해상도는 현행 렌더 100% 유지"
```

---

## 검증 (전체)

- `npm test -- now-showing-hero-treatment` — 결정 로직 6 PASS.
- `npm run type-check` — 통과.
- `npm run build` — 측정 스크립트 동작 + JSON 생성 + next build 성공.
- 시각 확인: 메모리 정책상 Playwright 미사용. 빌드 후 사용자에게 홈 스크린샷 요청 →
  블러(10px)/오버레이(55%) 강도 조정. 필요 시 `LOW_RES_THRESHOLD`(1920)·`blur-[10px]`·`/55` 튜닝.
- 회귀 확인: 현재 3개 후보가 모두 정상 해상도라면 `softTreatment`는 전부 false →
  홈 히어로 렌더가 변경 전과 동일해야 함.

## Self-Review 결과

- **Spec 커버리지**: 측정(Task 2)·판정 기준 1920px(Task 2 상수)·연출(Task 3)·heroTreatment override(Task 1)·안전 폴백(Task 1 함수 + Task 2 스크립트)·테스트(Task 1) 모두 매핑됨.
- **Placeholder 스캔**: 없음 — 모든 코드 블록이 실제 구현.
- **타입 일관성**: `HeroImageQualityMap`/`resolveHeroSoftTreatment`/`HeroTreatment` 명칭이 Task 1 정의와 Task 2·3 소비처에서 일치.
- **결정 사항**: `generated.json`은 git 추적(초기 `{}` 커밋 → import 안전, sync-site-stats 산출물과 동일 정책). `probe-image-size`로 결정(webp + 원격 URL 스트림 측정).
