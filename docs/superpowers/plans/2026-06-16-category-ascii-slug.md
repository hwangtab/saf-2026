# Category ASCII Slug 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한글 카테고리 라우트(`/artworks/category/회화`)를 ASCII slug(`/artworks/category/painting`)로 전환해, Next.js 16 segment-cache의 `btoa()` 버그를 우회하지 않고 **위험 경로 진입 자체를 제거**하면서 category 페이지의 force-static(CDN 캐시·낮은 TTFB·SEO)을 복원한다.

**Architecture:** DB의 `category` 값은 한글 그대로 유지한다. 라우트 레이어에서만 slug↔한글을 `lib/artwork-category.ts`의 단일 출처 함수(`categorySlug` / `categoryFromSlug`)로 변환한다. 페이지는 slug를 받아 한글로 역매핑한 뒤 기존 Supabase 조회를 그대로 사용한다. 기존 한글 인코딩 URL은 `next.config.js` redirects()의 308로 slug URL에 흡수시킨다. 내부 링크·sitemap·canonical을 모두 slug로 동시 전환해 self-canonical 일관성을 보장한다.

**Tech Stack:** Next.js 16 App Router, TypeScript(strict), Jest, Supabase, Vercel.

**근본원인 (검증됨):** Next의 `encodeToFilesystemAndURLSafeString()`가 `simpleParamValueRegex = /^[a-zA-Z0-9\-_@]+$/`를 통과하지 못한 라우트 세그먼트에 `btoa(value)`를 raw 호출 → 한글에서 `DOMException: Invalid character`. 정적 prerender의 segment-prefetch(`collectSegmentData`, `isStaticGeneration`이면 무조건 실행 — config 플래그로 끌 수 없음)에서만 발생. 실제 런타임 코드는 `dist/compiled/next-server/app-page*.runtime.prod.js`(소스 패치 안 닿음). ASCII slug는 regex를 통과해 `btoa` 분기에 **진입하지 않으므로** Next 버전과 무관하게 영구 안전. 업스트림 추적: https://github.com/vercel/next.js/issues/94840

**범위:** category 페이지만. artist 페이지(`/artworks/artist/[artist]`)는 트래픽 1% 미만이라 force-dynamic 유지(합의됨, 이 플랜 범위 외). 단 artist 페이지가 **emit하는 category 링크 2곳**은 이 플랜에서 함께 교체한다.

---

## File Structure

| 파일                                                 | 책임                            | 변경                                                                        |
| ---------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `lib/artwork-category.ts`                            | 카테고리 매핑 단일 출처         | `CATEGORY_SLUG_MAP`(KO→slug) + `categorySlug`/`categoryFromSlug` 추가       |
| `app/[locale]/artworks/category/[category]/page.tsx` | 카테고리 페이지 렌더            | force-dynamic 제거 → force-static 복원, slug 역매핑, `generateStaticParams` |
| `app/[locale]/page.tsx`                              | 홈 — 카테고리 viewAllHref 4건   | 하드코딩 `%XX` → slug 리터럴                                                |
| `app/[locale]/artworks/page.tsx`                     | 작품 목록 — 카테고리 카드 2건   | `encodeURIComponent` → `categorySlug`                                       |
| `app/[locale]/artworks/[id]/page.tsx`                | 작품 상세 — 카테고리 링크 3건   | `encodeURIComponent` → `categorySlug`                                       |
| `app/[locale]/artworks/artist/[artist]/page.tsx`     | 작가 페이지 — 카테고리 링크 2건 | `encodeURIComponent` → `categorySlug`                                       |
| `components/features/ArtworkPurchaseCTA.tsx`         | 구매 CTA — 카테고리 링크 1건    | `encodeURIComponent` → `categorySlug`                                       |
| `app/sitemap.ts`                                     | 사이트맵 — 카테고리 URL         | `encodeURIComponent` → `categorySlug`                                       |
| `next.config.js`                                     | redirects                       | 한글 인코딩 URL → slug 308 (빌드타임 자동 생성)                             |
| `__tests__/lib/artwork-category.test.ts`             | 매핑 회귀 가드                  | round-trip + 커버리지 + 소스 grep 가드                                      |

**카테고리 11종 → slug 확정 매핑:**
| 한글(DB) | slug |
|---|---|
| 회화 | `painting` |
| 한국화 | `korean-painting` |
| 판화 | `printmaking` |
| 사후판화 | `posthumous-print` |
| 드로잉 | `drawing` |
| 조각 | `sculpture` |
| 도자공예 | `ceramics-craft` |
| 사진 | `photography` |
| 아트프린트 | `art-print` |
| 혼합매체 | `mixed-media` |
| 디지털아트 | `digital-art` |

---

## Task 1: 카테고리 slug 단일 출처 매핑

**Files:**

- Modify: `lib/artwork-category.ts` (append, after `CATEGORY_EN_MAP`)
- Test: `__tests__/lib/artwork-category.test.ts` (create)

- [ ] **Step 1: 실패하는 테스트 작성**

Create `__tests__/lib/artwork-category.test.ts`:

```typescript
import {
  CATEGORY_EN_MAP,
  CATEGORY_SLUG_MAP,
  categorySlug,
  categoryFromSlug,
} from '@/lib/artwork-category';

describe('category slug 매핑', () => {
  it('CATEGORY_EN_MAP의 모든 한글 카테고리에 slug가 있다', () => {
    for (const ko of Object.keys(CATEGORY_EN_MAP)) {
      expect(typeof CATEGORY_SLUG_MAP[ko]).toBe('string');
      expect(CATEGORY_SLUG_MAP[ko].length).toBeGreaterThan(0);
    }
  });

  it('slug는 모두 ASCII(simpleParamValueRegex 통과)라 btoa를 안 탄다', () => {
    const regex = /^[a-zA-Z0-9\-_@]+$/; // Next encodeToFilesystemAndURLSafeString과 동일
    for (const slug of Object.values(CATEGORY_SLUG_MAP)) {
      expect(slug).toMatch(regex);
    }
  });

  it('slug는 유일하다 (충돌 없음)', () => {
    const slugs = Object.values(CATEGORY_SLUG_MAP);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('round-trip: categoryFromSlug(categorySlug(ko)) === ko', () => {
    for (const ko of Object.keys(CATEGORY_EN_MAP)) {
      expect(categoryFromSlug(categorySlug(ko))).toBe(ko);
    }
  });

  it('categoryFromSlug는 미지의 slug에 undefined를 반환', () => {
    expect(categoryFromSlug('nonexistent-slug')).toBeUndefined();
  });

  it('categorySlug는 매핑 없는 값에 입력을 그대로 반환(방어)', () => {
    expect(categorySlug('unknowncat')).toBe('unknowncat');
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx jest __tests__/lib/artwork-category.test.ts`
Expected: FAIL — `CATEGORY_SLUG_MAP`, `categorySlug`, `categoryFromSlug`가 export되지 않음.

- [ ] **Step 3: 매핑·함수 구현**

`lib/artwork-category.ts`의 `CATEGORY_EN_MAP` 정의 **직후**에 추가:

```typescript
/**
 * 한글 카테고리(DB 값) → URL ASCII slug 단일 출처.
 *
 * Next.js segment-cache 키 인코딩은 비-ASCII 라우트 세그먼트에 btoa()를 raw 호출해
 * 'Invalid character'로 throw한다(force-static prerender). slug는 simpleParamValueRegex
 * (/^[a-zA-Z0-9\-_@]+$/)를 통과해 btoa 분기에 진입하지 않으므로 throw를 구조적으로 제거한다.
 * DB의 category 값은 한글 유지 — 이 맵은 라우트 레이어 변환 전용.
 * 업스트림 추적: https://github.com/vercel/next.js/issues/94840
 *
 * ⚠ CATEGORY_EN_MAP에 카테고리를 추가하면 여기에도 반드시 slug를 추가할 것
 * (artwork-category.test.ts가 커버리지를 강제).
 */
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  회화: 'painting',
  한국화: 'korean-painting',
  판화: 'printmaking',
  사후판화: 'posthumous-print',
  드로잉: 'drawing',
  조각: 'sculpture',
  도자공예: 'ceramics-craft',
  사진: 'photography',
  아트프린트: 'art-print',
  혼합매체: 'mixed-media',
  디지털아트: 'digital-art',
};

const CATEGORY_SLUG_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUG_MAP).map(([ko, slug]) => [slug, ko])
);

/** 한글 카테고리 → URL slug. 매핑이 없으면 입력을 그대로 반환(방어적). */
export function categorySlug(category: string): string {
  return CATEGORY_SLUG_MAP[category] ?? category;
}

/** URL slug → 한글 카테고리. 미지의 slug는 undefined(호출부에서 NotFound 처리). */
export function categoryFromSlug(slug: string): string | undefined {
  return CATEGORY_SLUG_REVERSE[slug];
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx jest __tests__/lib/artwork-category.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: 커밋**

```bash
git add lib/artwork-category.ts __tests__/lib/artwork-category.test.ts
git commit -m "feat(category): ASCII slug 단일 출처 매핑(categorySlug/categoryFromSlug)

요약: 한글 카테고리→영문 URL slug 변환 함수 추가(라우트 레이어 전용, DB는 한글 유지)"
```

---

## Task 2: category 페이지 force-static 복원 + slug 역매핑

**Files:**

- Modify: `app/[locale]/artworks/category/[category]/page.tsx`

현재 상태: `export const dynamic = 'force-dynamic'`, `export const revalidate = 0`, `generateStaticParams` 없음(PR #125에서 제거). `generateMetadata`와 `renderCategoryPage`가 `decodeURIComponent(rawCategory)`로 한글 category를 직접 받음.

- [ ] **Step 1: import에 slug 헬퍼 추가**

`page.tsx` 상단 import 블록에서 `lib/artwork-category` import를 수정:

```typescript
import {
  CATEGORY_EN_MAP,
  CATEGORY_SLUG_MAP,
  categoryFromSlug,
  categorySlug,
  getCategoryDisplayName,
} from '@/lib/artwork-category';
```

- [ ] **Step 2: 라우트 config를 force-static으로 복원 + generateStaticParams 추가**

현재의 force-dynamic 블록(주석 포함 `export const dynamic = 'force-dynamic'` ~ `export const revalidate = 0`)을 다음으로 **교체**:

```typescript
// force-static — 카테고리 라우트 세그먼트는 ASCII slug(painting 등)라
// simpleParamValueRegex를 통과해 Next segment-cache btoa 경로에 진입하지 않는다.
// 한글 세그먼트의 'Invalid character' throw를 구조적으로 제거하면서 정적 생성·CDN 캐시·
// 낮은 TTFB·CollectionPage JSON-LD를 모두 유지한다. (업스트림: vercel/next.js#94840)
// DB의 category는 한글 유지 — slug↔한글 변환은 lib/artwork-category.ts 단일 출처.
export const dynamic = 'force-static';
export const revalidate = 600;
// CATEGORY_SLUG_MAP에 등록된 11개 slug만 prerender. 그 외(한글 raw 포함)는 404 →
// next.config.js redirects가 기존 한글 URL을 slug로 308 흡수.
export const dynamicParams = false;

export async function generateStaticParams() {
  return Object.values(CATEGORY_SLUG_MAP).map((category) => ({ category }));
}
```

- [ ] **Step 3: `generateMetadata`에서 slug → 한글 역매핑**

`generateMetadata` 시작부의 `const category = decodeURIComponent(rawCategory);`를 교체:

```typescript
const slug = decodeURIComponent(rawCategory);
const category = categoryFromSlug(slug);
if (!category || !SUPPORTED_CATEGORIES.includes(category)) {
  return { title: 'Not Found' };
}
```

그리고 같은 함수 내 `const categoryPath = `/artworks/category/${encodeURIComponent(category)}`;`를 교체:

```typescript
const categoryPath = `/artworks/category/${categorySlug(category)}`;
```

(주의: 기존 `if (!SUPPORTED_CATEGORIES.includes(category)) { return { title: 'Not Found' }; }` 라인은 위 Step에서 통합했으므로 **중복 제거**.)

- [ ] **Step 4: `renderCategoryPage`에서 slug → 한글 역매핑**

`renderCategoryPage`의 `const category = decodeURIComponent(rawCategory);`를 교체:

```typescript
  const slug = decodeURIComponent(rawCategory);
  const category = categoryFromSlug(slug);
  if (!category || !SUPPORTED_CATEGORIES.includes(category)) {
    return <CategoryNotFoundView />;
  }
```

(기존 `if (!SUPPORTED_CATEGORIES.includes(category)) { return <CategoryNotFoundView />; }` 중복 제거.)

같은 함수 내 두 곳의 카테고리 경로를 slug로:

```typescript
// categoryPath 정의
const categoryPath = `/artworks/category/${categorySlug(category)}`;
```

```typescript
// 관련 카테고리 목록(categoryCounts)의 path
const categoryCounts = SUPPORTED_CATEGORIES.filter((cat) => cat !== category).map((cat) => ({
  category: cat,
  displayName: getCategoryDisplayName(cat, locale),
  count: 0,
  path: `/artworks/category/${categorySlug(cat)}`,
}));
```

`getHeroOverride(`artworks/category/${category}`)` 호출은 매핑이 없어 항상 undefined이나, 일관성을 위해 slug로 변경:

```typescript
          customBackgroundImage={
            getHeroOverride(`artworks/category/${categorySlug(category)}`) ??
            pickListingHeroImage(categoryArtworks, (a) => (!a.sold && a.images?.[0]) || undefined)
          }
```

- [ ] **Step 5: 타입체크 + 빌드로 검증 (거짓음성 방지)**

Run: `npm run type-check`
Expected: ✓ Types generated successfully (에러 0).

Run: `npm run build 2>&1 | grep -iE "category-page.*render failed|Invalid character" || echo "throw 0 — OK"`
Expected: `throw 0 — OK`. 추가로 빌드 Route 출력에서 `/[locale]/artworks/category/[category]`가 `●(SSG)` 또는 정적으로 표기되는지 확인(force-dynamic의 `ƒ`가 아님).

- [ ] **Step 6: 커밋**

```bash
git add "app/[locale]/artworks/category/[category]/page.tsx"
git commit -m "fix(category): force-static 복원 + ASCII slug 역매핑

요약: 카테고리 페이지를 force-static으로 되돌리고 slug→한글 역매핑으로 Supabase 조회 유지"
```

---

## Task 3: 내부 링크 emitter 전수 slug 교체

**Files (정확한 위치):**

- Modify: `app/[locale]/page.tsx:290,296,302,308`
- Modify: `app/[locale]/artworks/page.tsx:274,321`
- Modify: `app/[locale]/artworks/[id]/page.tsx:326,599,865`
- Modify: `app/[locale]/artworks/artist/[artist]/page.tsx:970,1178`
- Modify: `components/features/ArtworkPurchaseCTA.tsx:218`

- [ ] **Step 1: 홈 viewAllHref 4건 (하드코딩 %XX → slug 리터럴)**

`app/[locale]/page.tsx`에서:

- L290 `viewAllHref: '/artworks/category/%ED%9A%8C%ED%99%94',` → `viewAllHref: '/artworks/category/painting',` (회화)
- L296 `viewAllHref: '/artworks/category/%ED%8C%90%ED%99%94',` → `viewAllHref: '/artworks/category/printmaking',` (판화)
- L302 `viewAllHref: '/artworks/category/%EC%82%AC%EC%A7%84',` → `viewAllHref: '/artworks/category/photography',` (사진)
- L308 `viewAllHref: '/artworks/category/%EC%A1%B0%EA%B0%81',` → `viewAllHref: '/artworks/category/sculpture',` (조각)

- [ ] **Step 2: 나머지 emitter는 `categorySlug()` 호출로 교체**

각 파일 상단에 `import { categorySlug } from '@/lib/artwork-category';`가 있는지 확인하고 없으면 추가(기존 `@/lib/artwork-category` import에 합류). 그리고:

- `app/[locale]/artworks/page.tsx`
  - L274 `` `/artworks/category/${encodeURIComponent(cat.category)}` `` → `` `/artworks/category/${categorySlug(cat.category)}` ``
  - L321 `` `/artworks/category/${encodeURIComponent(cat.key)}` `` → `` `/artworks/category/${categorySlug(cat.key)}` ``
- `app/[locale]/artworks/[id]/page.tsx`
  - L326 `` `/artworks/category/${encodeURIComponent(artwork.category)}` `` → `` `/artworks/category/${categorySlug(artwork.category)}` ``
  - L599 동일 패턴 → `categorySlug(artwork.category)`
  - L865 동일 패턴 → `categorySlug(artwork.category)`
- `app/[locale]/artworks/artist/[artist]/page.tsx`
  - L970 `buildLocaleUrl(`/artworks/category/${encodeURIComponent(dominantCategory)}`, locale)` → `buildLocaleUrl(`/artworks/category/${categorySlug(dominantCategory)}`, locale)`
  - L1178 `` path: `/artworks/category/${encodeURIComponent(cat)}` `` → `` path: `/artworks/category/${categorySlug(cat)}` ``
- `components/features/ArtworkPurchaseCTA.tsx`
  - L218 `` `/artworks/category/${encodeURIComponent(category)}` `` → `` `/artworks/category/${categorySlug(category)}` ``

- [ ] **Step 3: 누락 없는지 grep 확인**

Run:

```bash
grep -rn "artworks/category/\${encodeURIComponent\|artworks/category/%" app/ components/ --include="*.ts" --include="*.tsx" | grep -v "category/\[category\]"
```

Expected: 출력 없음(모든 emitter가 slug로 전환됨). 출력이 있으면 그 위치를 마저 교체.

- [ ] **Step 4: 타입체크**

Run: `npm run type-check`
Expected: 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add "app/[locale]/page.tsx" "app/[locale]/artworks/page.tsx" "app/[locale]/artworks/[id]/page.tsx" "app/[locale]/artworks/artist/[artist]/page.tsx" components/features/ArtworkPurchaseCTA.tsx
git commit -m "refactor(category): 내부 카테고리 링크를 ASCII slug로 전환

요약: 홈·작품목록·작품상세·작가·구매CTA의 카테고리 링크 12건을 categorySlug()로 통일"
```

---

## Task 4: sitemap slug 전환

**Files:**

- Modify: `app/sitemap.ts:378-380`

- [ ] **Step 1: sitemap import에 `categorySlug` 추가**

`app/sitemap.ts`의 `@/lib/artwork-category` import(기존 `CATEGORY_EN_MAP`)에 `categorySlug` 합류:

```typescript
import { CATEGORY_EN_MAP, categorySlug } from '@/lib/artwork-category';
```

- [ ] **Step 2: categoryPath를 slug로**

L378-380의 `encodedCategory` 정의를 교체:

```typescript
  const categoryPages: MetadataRoute.Sitemap = Object.keys(CATEGORY_EN_MAP).map((category) => {
    const categoryPath = `/artworks/category/${categorySlug(category)}`;
```

(`const encodedCategory = encodeURIComponent(category);` 라인 삭제, 아래에서 `encodedCategory`를 쓰던 곳이 `categorySlug(category)` 결과를 쓰도록 `categoryPath`만 사용.)

- [ ] **Step 3: 빌드로 sitemap 생성 확인**

Run: `npm run build 2>&1 | grep -i sitemap || echo "build ok"`
Expected: 에러 없음. (sitemap은 빌드 시 생성.)

- [ ] **Step 4: 커밋**

```bash
git add app/sitemap.ts
git commit -m "fix(seo): sitemap 카테고리 URL을 ASCII slug로 전환

요약: canonical·내부링크·sitemap을 slug 단일 표면으로 통일(self-canonical 일관성)"
```

---

## Task 5: next.config.js — 한글 URL → slug 308 redirect

**Files:**

- Modify: `next.config.js:72` (`async redirects()` 배열)

- [ ] **Step 1: redirects() 상단에서 CATEGORY_SLUG_MAP 기반 308 자동 생성**

`next.config.js`는 CommonJS다. `lib/artwork-category.ts`(TS)를 직접 require할 수 없으므로, slug 맵을 `next.config.js` 안에 **인라인 상수로 복제**한다(11개 고정이라 안전, 주석으로 단일 출처 동기 의무 명시).

`async redirects() {` 직후, `return [` **앞**에 추가:

```javascript
  async redirects() {
    // ⚠ lib/artwork-category.ts의 CATEGORY_SLUG_MAP과 반드시 동기 유지.
    // next.config.js(CJS)는 TS 모듈 require 불가라 11개 고정 맵을 인라인 복제.
    // (artwork-category.test.ts가 lib 쪽 커버리지를 강제. 카테고리 추가 시 양쪽 갱신.)
    const CATEGORY_SLUG_MAP = {
      회화: 'painting',
      한국화: 'korean-painting',
      판화: 'printmaking',
      사후판화: 'posthumous-print',
      드로잉: 'drawing',
      조각: 'sculpture',
      도자공예: 'ceramics-craft',
      사진: 'photography',
      아트프린트: 'art-print',
      혼합매체: 'mixed-media',
      디지털아트: 'digital-art',
    };
    // 기존 한글 인코딩 카테고리 URL(ko/en) → ASCII slug 308 흡수 (색인 자산 보존).
    const categoryRedirects = Object.entries(CATEGORY_SLUG_MAP).flatMap(([ko, slug]) => {
      const enc = encodeURIComponent(ko);
      return [
        { source: `/artworks/category/${enc}`, destination: `/artworks/category/${slug}`, permanent: true },
        { source: `/en/artworks/category/${enc}`, destination: `/en/artworks/category/${slug}`, permanent: true },
      ];
    });
    return [
      ...categoryRedirects,
```

그리고 기존 `return [` 라인을 위의 `return [\n      ...categoryRedirects,`로 교체(기존 배열 항목들은 그대로 뒤에 유지).

- [ ] **Step 2: redirect 매핑 정확성 수동 확인**

Run:

```bash
node -e "
const enc = encodeURIComponent('회화');
console.log('source:', '/artworks/category/' + enc, '→ /artworks/category/painting');
console.log('회화 인코딩:', enc);
"
```

Expected: `회화 인코딩: %ED%9A%8C%ED%99%94` (홈 L290의 기존 하드코딩과 일치 확인).

- [ ] **Step 3: 커밋**

```bash
git add next.config.js
git commit -m "fix(seo): 한글 카테고리 URL → ASCII slug 308 redirect (색인 자산 보존)

요약: 기존 색인된 한글 인코딩 카테고리 URL 11종×(ko/en)을 slug로 영구 리다이렉트"
```

---

## Task 6: 소스 grep 가드 (회귀 차단)

**Files:**

- Modify: `__tests__/lib/artwork-category.test.ts` (append)

- [ ] **Step 1: 하드코딩 한글 카테고리 URL 패턴 차단 테스트 추가**

`__tests__/lib/artwork-category.test.ts`에 추가:

```typescript
import { execSync } from 'child_process';

describe('카테고리 링크 회귀 가드', () => {
  it('소스에 한글 인코딩(%ED..) 또는 encodeURIComponent(category) 카테고리 URL이 없다', () => {
    // [category] 라우트 파일 자체는 제외(역매핑 처리). emitter만 검사.
    const cmd =
      `grep -rn "artworks/category/\\\${encodeURIComponent\\|artworks/category/%" ` +
      `app components --include="*.ts" --include="*.tsx" | grep -v "category/\\[category\\]" || true`;
    const out = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' }).trim();
    expect(out).toBe('');
  });
});
```

- [ ] **Step 2: 테스트 실행 → 통과 확인**

Run: `npx jest __tests__/lib/artwork-category.test.ts`
Expected: PASS (전체 7 tests). 실패하면 출력된 위치의 emitter를 Task 3 패턴으로 마저 교체.

- [ ] **Step 3: 커밋**

```bash
git add __tests__/lib/artwork-category.test.ts
git commit -m "test(category): 한글 카테고리 URL 하드코딩 회귀 가드(grep)"
```

---

## Task 7: 전체 검증 + preview 배포 확인

- [ ] **Step 1: 전체 테스트 + 타입체크 + full build**

Run: `npm test -- artwork-category && npm run type-check && npm run build`
Expected: 테스트 PASS, 타입 에러 0, 빌드 성공. 빌드 로그에 `category-page render failed`/`Invalid character` 없음. Route 출력에서 category가 정적(`●`/`○`)으로 표기.

- [ ] **Step 2: 단일 PR로 push**

```bash
git push -u origin fix/category-ascii-slug
gh pr create --title "fix(category): ASCII slug 전환으로 force-static 복원" --body "$(cat <<'BODY'
한글 카테고리 'Invalid character'(Next segment-cache btoa 버그, vercel/next.js#94840)를 ASCII slug 라우트로 구조적 제거. force-static·CDN·SEO 복원. 한글 URL은 308 redirect로 자산 보존. DB는 한글 유지(라우트 레이어 변환).
BODY
)"
```

- [ ] **Step 3: Vercel preview에서 검증 (로컬 미재현 이슈라 preview 필수)**

preview 배포 READY 후:

```bash
PREVIEW="<preview-branch-alias-url>"
# 1) slug URL 200 + Invalid character 0
curl -sSL -o /dev/null -w "%{http_code}\n" "$PREVIEW/artworks/category/painting"   # 200
# 2) 한글 URL → slug 308
curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" "$PREVIEW/artworks/category/%ED%9A%8C%ED%99%94"  # 308 → /painting
# 3) 런타임 로그에서 throw 0 (prefetch 요청 후 Vercel get_runtime_logs로 'Invalid character' 0 확인)
```

Expected: slug 200, 한글 308→slug, 런타임 `Invalid character` 0. canonical이 slug URL인지 HTML `<link rel=canonical>` 확인.

- [ ] **Step 4: 검증 통과 시 main 머지**

```bash
gh pr merge --merge
```

머지 후 production에서 동일 검증(prefetch + `get_runtime_logs` throw 0) 반복.

---

## 자가 검토 결과

- **spec 커버리지:** 회의 7단계(매핑·page·링크·sitemap·redirect·테스트·검증) 전부 Task로 매핑됨.
- **타입 일관성:** `categorySlug`/`categoryFromSlug`/`CATEGORY_SLUG_MAP` 명칭이 Task 1 정의와 Task 2~6 사용에서 동일.
- **누락 위험 지점:** artist 페이지의 category 링크 2곳(L970·L1178)을 Task 3에 포함(artist 페이지 자체는 force-dynamic 유지하되 emit하는 category 링크는 slug여야 함). `next.config.js`는 CJS라 slug 맵 인라인 복제 + 동기 의무 주석.
- **롤백:** 단일 PR이라 `git revert` 1회. 최악 시 category page.tsx를 force-dynamic으로 즉시 복귀(검증된 안전판, 단 SEO/CWV 트레이드오프 재발).
