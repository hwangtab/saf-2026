# Hero CSS-only Autoplay Crossfade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 hero를 3장(활성 NOW_SHOWING) CSS-only 크로스페이드 autoplay로 바꾸고, 텍스트는 범용 캠페인 메시지로 고정하며, fold-below NowShowing 그리드를 제거한다.

**Architecture:** 순수 server component 유지(`'use client'` 없음). 슬라이드를 `absolute inset-0`로 겹쳐 쌓고 `opacity`만 애니메이션하는 `@keyframes`(컴포지터 전용)로 자동 순환. 켄번스(transform)는 슬라이드 내부 이미지에 별도 적용. 첫 슬라이드는 `opacity:1` + `fetchPriority=high`로 LCP를 유지한다. JS 0 / hydration 0 → 과거 embla carousel PSI 회귀(메모리 `feedback_hero_server_island_regression`)를 카테고리째 회피.

**Tech Stack:** Next.js 16, TypeScript(strict), Tailwind CSS, next-intl, SafeImage(next/image wrapper).

## Global Constraints

- 색: `bg-primary` + `text-white` small text 금지. hero CTA는 `bg-primary-strong` 사용(현행 유지). Tailwind 기본 팔레트 금지, 브랜드 토큰만.
- 런타임 hex는 `BRAND_COLORS`(`@/lib/colors`) 참조. 리터럴 hex 금지.
- 이미지는 `SafeImage`만. `next/image` 직접 import 금지.
- 공개 라우트(`app/[locale]/**`) 사용자 노출 텍스트는 전부 next-intl 메시지. 한국어 리터럴 금지.
- i18n force-static: `getTranslations`에 `{ locale }` 명시 전달(현행 패턴 유지).
- 애니메이션은 `transform`/`opacity`만(컴포지터). `prefers-reduced-motion`은 전역 규칙(0.01ms)이 처리.
- 시각 검증은 Playwright 금지 — build/type-check/코드검토 + 사용자 시각 확인(메모리 `feedback_no_playwright`).
- 공개 페이지에 skeleton `loading.tsx` 추가 금지.

---

### Task 1: `getHeroSlides()` 순환 풀 셀렉터

**Files:**

- Modify: `lib/now-showing.ts` (기존 `getHeroSlide` 아래에 추가)
- Test: `__tests__/lib/now-showing-hero-slides.test.ts` (신규)

**Interfaces:**

- Consumes: 기존 `getActiveShowingItems(now)`, `NOW_SHOWING`, `NowShowingItem`.
- Produces: `getHeroSlides(now?: Date): NowShowingItem[]` — 활성 항목을 `heroPriority` 내림차순 정렬해 최대 3장 반환. 활성 0개면 `[NOW_SHOWING[0]]`.

- [ ] **Step 1: Write the failing test**

`__tests__/lib/now-showing-hero-slides.test.ts`:

```typescript
import { getHeroSlides } from '../../lib/now-showing';

describe('getHeroSlides', () => {
  it('활성 항목을 heroPriority 내림차순으로 반환 (2026-06-24: 강석태0·오윤0·박생광5)', () => {
    const slides = getHeroSlides(new Date('2026-06-24'));
    expect(slides.map((s) => s.slug)).toEqual([
      'park-saenggwang-drawings',
      'all-artworks',
      'oh-yoon-40th',
    ]);
  });

  it('최대 3장으로 제한', () => {
    const slides = getHeroSlides(new Date('2026-06-24'));
    expect(slides.length).toBeLessThanOrEqual(3);
  });

  it('활성 항목이 없으면 fallback 1장(강석태)만 반환', () => {
    // 박생광(6/28)·오윤(12/31) 모두 만료된 미래 시점
    const slides = getHeroSlides(new Date('2027-06-01'));
    expect(slides.map((s) => s.slug)).toEqual(['all-artworks']);
  });

  it('첫 슬라이드는 LCP 대상 — 항상 존재', () => {
    expect(getHeroSlides(new Date('2026-06-24'))[0]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- now-showing-hero-slides`
Expected: FAIL — `getHeroSlides is not a function`.

- [ ] **Step 3: Implement `getHeroSlides`**

`lib/now-showing.ts`, `getHeroSlide` 함수 정의 바로 아래에 추가:

```typescript
/**
 * Hero 크로스페이드 autoplay에 노출할 슬라이드 풀(최대 3장).
 *
 * `getHeroSlide()`(단일 LCP)의 다중 버전. 활성 항목(`getActiveShowingItems`)을
 * `heroPriority` 내림차순으로 정렬해 반환. 활성이 없으면 영구 fallback(강석태) 1장.
 *
 * - 1장이면 호출부에서 크로스페이드 없이 정적 단일 hero = 현행과 동일하게 degrade.
 * - slice(0, 3): hero는 최대 3장만 순환(payload 가드). 활성이 4개 이상으로 늘어도 안전.
 */
export function getHeroSlides(now: Date = new Date()): NowShowingItem[] {
  const active = getActiveShowingItems(now);
  const pool = active.length > 0 ? active : [NOW_SHOWING[0]];
  return [...pool].sort((a, b) => (b.heroPriority ?? 0) - (a.heroPriority ?? 0)).slice(0, 3);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- now-showing-hero-slides`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/now-showing.ts __tests__/lib/now-showing-hero-slides.test.ts
git commit -m "feat(home): add getHeroSlides selector for hero crossfade pool

요약: hero 크로스페이드용 활성 슬라이드 풀(최대 3장) 셀렉터 추가"
```

---

### Task 2: 크로스페이드 keyframes (tailwind.config.ts)

**Files:**

- Modify: `tailwind.config.ts` (`animation` 객체 ~line 67, `keyframes` 객체 ~line 104)

**Interfaces:**

- Produces: Tailwind 유틸 `animate-hero-crossfade-2`, `animate-hero-crossfade-3`. opacity-only, infinite. 호출부는 `animationDelay`(음수)로 슬라이드별 phase를 분리한다.

설계: 음수 `animation-delay`로 N장이 동시에 서로 다른 phase에서 진행. 각 슬라이드 동일 keyframe.

- 3장: 총 18s, delay step 6s → delay `0`, `-6s`, `-12s`. keyframe 0%가 `opacity:1`이라 첫 슬라이드(delay 0)는 첫 프레임에 보임(LCP 안전).
- 2장: 총 14s, delay step 7s → delay `0`, `-7s`.

- [ ] **Step 1: animation 유틸 추가**

`tailwind.config.ts` `animation: { ... }` 안, `'hero-reveal'` 줄 아래에 추가:

```typescript
        // Hero 크로스페이드 autoplay — opacity-only(컴포지터 전용), main thread 0, CLS 0.
        // 슬라이드별 음수 animation-delay(호출부 inline)로 phase 분리. 0% opacity:1이라
        // 첫 슬라이드(delay 0)는 첫 프레임에 paint → LCP 무영향. 2장/3장 전용 주기.
        'hero-crossfade-2': 'heroCrossfade2 14s ease-in-out infinite',
        'hero-crossfade-3': 'heroCrossfade3 18s ease-in-out infinite',
```

- [ ] **Step 2: keyframes 추가**

`tailwind.config.ts` `keyframes: { ... }` 안, `heroReveal` 블록 아래에 추가:

```typescript
        // 2장 크로스페이드 — 한 장 ~5.5s 노출 + ~1.5s 페이드. delay step 7s.
        heroCrossfade2: {
          '0%': { opacity: '1' },
          '40%': { opacity: '1' },
          '50%': { opacity: '0' },
          '90%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // 3장 크로스페이드 — 한 장 ~5s 노출 + ~1s 페이드. delay step 6s.
        heroCrossfade3: {
          '0%': { opacity: '1' },
          '28%': { opacity: '1' },
          '33%': { opacity: '0' },
          '94%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
```

- [ ] **Step 3: 빌드로 유틸 생성 확인**

Run: `npm run type-check`
Expected: PASS (tailwind config 타입 OK).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(home): add hero crossfade keyframes (opacity-only autoplay)

요약: hero 자동 순환용 2장/3장 크로스페이드 keyframe 추가 (컴포지터 전용)"
```

---

### Task 3: 범용 캠페인 i18n 키 (home.hero)

**Files:**

- Modify: `messages/ko.json` (`home` 객체 안, `nowShowing` 블록 앞 또는 뒤)
- Modify: `messages/en.json` (동일 위치)

**Interfaces:**

- Produces: `home.hero.campaignStatus`, `home.hero.campaignTitle`, `home.hero.campaignDesc`, `home.hero.campaignCta`. `campaignTitle`/`campaignDesc`는 ICU 변수 `{artistCount}`, `{artworkCount}` 사용 가능.

캠페인 프레이밍 주의(CLAUDE.md): 출품 작가는 "불우한 작가"가 아니라 동료 예술인을 돕는 연대자. 숫자는 ICU 변수로.

- [ ] **Step 1: ko.json 키 추가**

`messages/ko.json` `"home": {` 안에 `"hero"` 블록 추가(기존 `"nowShowing"` 블록 바로 위):

```json
    "hero": {
      "campaignStatus": "원본 · 작가 직거래",
      "campaignTitle": "예술인 동료를 위해\n작가들이 내놓은 원본",
      "campaignDesc": "한국 작가 {artistCount}인이 동료 예술인의 금융 차별 해결을 위해 작품을 내놓았습니다. 구매 수익의 10%는 저금리 상호부조 기금이 됩니다.",
      "campaignCta": "전체 작품 보기"
    },
```

- [ ] **Step 2: en.json 키 추가**

`messages/en.json` `"home": {` 안 동일 위치:

```json
    "hero": {
      "campaignStatus": "Originals · Direct from artists",
      "campaignTitle": "Originals offered by artists\nfor their fellow creators",
      "campaignDesc": "{artistCount} Korean artists have contributed their work to help fellow artists facing financial discrimination. 10% of each sale funds a low-interest mutual-aid pool.",
      "campaignCta": "Browse all artworks"
    },
```

- [ ] **Step 3: i18n placeholder 정합 검증**

Run: `npm run verify:i18n-placeholders`
Expected: PASS — ko/en의 `{artistCount}` 플레이스홀더 일치.

- [ ] **Step 4: Commit**

```bash
git add messages/ko.json messages/en.json
git commit -m "feat(home): add universal campaign copy for hero (home.hero.*)

요약: hero 고정 캠페인 메시지 i18n 키 추가 (ko/en), 전체 작품 CTA"
```

---

### Task 4: HomeHero 다중 슬라이드 렌더 개조

**Files:**

- Modify: `components/features/HomeHero.tsx` (전체 재작성)

**Interfaces:**

- Consumes: `getHeroSlides`(Task 1), `animate-hero-crossfade-2/3`(Task 2), `home.hero.*`(Task 3), 기존 `resolveHeroSoftTreatment`, `getLiveStats`, `SafeImage`, `Link`, `SawtoothDivider`, `BRAND_COLORS`, `heroImageQuality`.
- Produces: `<HomeHero locale={locale} />` — 변경 없는 동일 props.

- [ ] **Step 1: HomeHero.tsx 전체 교체**

`components/features/HomeHero.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import SafeImage from '@/components/common/SafeImage';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import { BRAND_COLORS } from '@/lib/colors';
import { Link } from '@/i18n/navigation';
import { getHeroSlides, resolveHeroSoftTreatment } from '@/lib/now-showing';
import type { HeroImageQualityMap } from '@/lib/now-showing';
import heroImageQuality from '@/lib/hero-image-quality.generated.json';
import { getLiveStats } from '@/lib/live-stats';

/**
 * 홈 hero — CSS-only 크로스페이드 autoplay (최대 3장) + 고정 캠페인 메시지.
 *
 * **회귀 trauma 회피 (2026-06-24, HomeHero 단일→autoplay 복귀)**:
 * 과거 embla(JS carousel) hero에서 PSI mobile 4x throttle 회귀 5종 발생(LCP/TBT/reflow).
 * 본 구현은 그 원인(JS carousel + hydration + idleCallback + forced reflow)을 회피하는
 * **순수 CSS @keyframes autoplay** — `'use client'` 없음, hydration 0, opacity-only(컴포지터).
 *
 * - 슬라이드를 absolute로 겹쳐 쌓고 animate-hero-crossfade-{2,3} + 음수 animation-delay로 순환.
 * - 1번 슬라이드: opacity:1 시작 + fetchPriority="high" → 단일 확정 LCP element 유지.
 * - 2·3번: 기본 opacity:0(reduced-motion·첫 페인트 안전) + fetchPriority="low".
 * - 켄번스(transform)는 슬라이드 내부 이미지에 별도 적용(opacity와 분리).
 * - 텍스트·CTA는 getHeroSlides와 무관한 범용 캠페인 메시지로 고정(home.hero.*), CTA → /artworks.
 *
 * 활성 슬라이드가 1장이면 크로스페이드 클래스 없이 정적 = 폐기 전 단일 hero와 동일.
 */
export default async function HomeHero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  const slides = getHeroSlides();
  const { artistCount, artworkCount } = await getLiveStats();

  const status = t('campaignStatus');
  const title = t('campaignTitle', { artistCount, artworkCount });
  const desc = t('campaignDesc', { artistCount, artworkCount });
  const cta = t('campaignCta');

  const slideCount = slides.length;
  // 1장은 정적(크로스페이드 없음). 2장/3장만 autoplay. delay step은 keyframe 주기/장수.
  const crossfadeClass =
    slideCount >= 3
      ? 'animate-hero-crossfade-3'
      : slideCount === 2
        ? 'animate-hero-crossfade-2'
        : '';
  const delayStep = slideCount >= 3 ? 6 : 7; // seconds (Task 2 keyframe 주기와 일치)

  return (
    <section
      aria-label="Hero"
      className="relative min-h-[70svh] md:min-h-[85svh] overflow-hidden bg-charcoal-deep"
    >
      {/* Header 투명화 sentinel — PageHero와 동일 패턴(헤더 IntersectionObserver 관찰 대상). */}
      <div
        data-hero-sentinel="true"
        aria-hidden="true"
        className="absolute top-0 left-0 h-px w-px"
      />

      <Link href="/artworks" className="block h-full" aria-label={`${title} — ${cta}`}>
        {/* 슬라이드 레이어 — 겹쳐 쌓아 opacity 크로스페이드. 첫 장만 보이는 상태로 시작. */}
        {slides.map((slide, i) => {
          const soft = resolveHeroSoftTreatment(slide, heroImageQuality as HeroImageQualityMap);
          return (
            <div
              key={slide.slug}
              aria-hidden={i > 0 ? 'true' : undefined}
              className={clsx('absolute inset-0', crossfadeClass)}
              style={{
                // 기본 opacity: 첫 장 1, 나머지 0 → reduced-motion(애니 0.01ms)·첫 페인트에서도
                // 첫 장만 노출되어 LCP 안전. 애니메이션이 이 기본값을 override.
                opacity: i === 0 ? 1 : 0,
                animationDelay: crossfadeClass ? `-${i * delayStep}s` : undefined,
              }}
            >
              <SafeImage
                src={slide.imageUrl}
                alt={i === 0 ? title : ''}
                fill
                priority={i === 0}
                fetchPriority={i === 0 ? 'high' : 'low'}
                quality={60}
                sizes="100vw"
                className="object-cover animate-ken-burns"
              />
              {/* 저해상도 작품 비네팅(soft) — 가장자리를 radial로 묻고 중앙 작품은 살림. */}
              {soft && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse at center, transparent 38%, ${BRAND_COLORS.charcoal.deep}b3 100%)`,
                  }}
                />
              )}
            </div>
          );
        })}

        {/* 다크 그라디언트 — 전역 단일. 상/하단 텍스트 가독성 확보, 중앙은 옅게 작품 노출. */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/85 via-charcoal-deep/30 to-charcoal-deep/70" />

        {/* 텍스트 블록 — 고정 캠페인 메시지. */}
        <div className="relative z-10 flex h-full min-h-[70svh] md:min-h-[85svh] flex-col items-center justify-center px-4 pt-24 pb-32 md:pb-40 text-center text-white">
          <span className="animate-hero-reveal mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-white backdrop-blur-sm">
            {status}
          </span>
          {/* h1은 reveal 애니 제외 — 텍스트 LCP 후보가 opacity:0 시작이면 LCP 밀릴 수 있어 즉시 완성. */}
          <h1 className="text-hero text-white mb-5 drop-shadow-lg break-keep text-balance max-w-4xl whitespace-pre-line">
            {title}
          </h1>
          <p className="animate-hero-reveal [animation-delay:220ms] text-body-large text-white/90 mb-8 max-w-2xl break-keep text-balance">
            {desc}
          </p>
          {/* CTA — solid primary-strong(6.98:1 AA). CLAUDE.md 색 규칙 준수. */}
          <span className="animate-hero-reveal [animation-delay:330ms] inline-flex items-center gap-2 rounded-lg bg-primary-strong px-7 py-3 text-base md:text-lg font-bold text-white shadow-lg transition-colors hover:bg-white hover:text-primary-strong">
            {cta}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
      </Link>

      {/* Sawtooth — 다음 섹션(MasterArtists) 배경(canvas-soft)으로 톱니 채움. */}
      <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
    </section>
  );
}
```

- [ ] **Step 2: 타입·린트 검사**

Run: `npm run type-check && npm run lint`
Expected: PASS — 미사용 import 없음(`getCardStatus`, `getHeroSlide` 제거됨), 타입 OK.

- [ ] **Step 3: Commit**

```bash
git add components/features/HomeHero.tsx
git commit -m "feat(home): render hero as CSS-only crossfade autoplay (up to 3 slides)

요약: hero를 3장 CSS 크로스페이드 자동순환으로 개조, 캠페인 텍스트 고정"
```

---

### Task 5: NowShowing 그리드 제거 + 정리

**Files:**

- Modify: `app/[locale]/page.tsx` (import + `<HomeTrackedSection section="now-showing">` 블록 제거)
- Modify: `lib/now-showing.ts` (`getNowShowingCards` 제거 — dead code)
- Delete: `components/features/NowShowing.tsx`

**Interfaces:**

- Consumes: 없음(제거 작업).
- Produces: hero 직후 첫 섹션이 `MasterArtists`가 됨.

먼저 `getNowShowingCards` 잔여 참조 확인:

- [ ] **Step 1: 잔여 참조 검색**

Run: `grep -rn "getNowShowingCards\|features/NowShowing\|section=\"now-showing\"" app components lib __tests__`
Expected: `app/[locale]/page.tsx`(import+사용), `components/features/NowShowing.tsx`(정의 소비)만. 그 외 참조 있으면 본 task 범위 확장 필요 — STOP & 재평가.

- [ ] **Step 2: page.tsx에서 NowShowing 제거**

`app/[locale]/page.tsx` 상단 import 줄 삭제:

```typescript
import NowShowing from '@/components/features/NowShowing';
```

그리고 [page.tsx:120-126](app/[locale]/page.tsx#L120-L126) 블록 전체 삭제(주석 포함):

```tsx
{
  /* Now Showing 그리드 — ... 주석 ... */
}
<HomeTrackedSection section="now-showing" className="reveal-on-scroll">
  <NowShowing locale={locale} />
</HomeTrackedSection>;
```

- [ ] **Step 3: NowShowing 컴포넌트 삭제**

Run: `git rm components/features/NowShowing.tsx`

- [ ] **Step 4: getNowShowingCards 제거**

`lib/now-showing.ts`에서 `getNowShowingCards` 함수 정의(JSDoc 포함, 약 line 153-171) 삭제. `getActiveShowingItems`·`getCardStatus`·`getHeroSlide`·`getHeroSlides`는 유지.

- [ ] **Step 5: 타입·린트·테스트**

Run: `npm run type-check && npm run lint && npm test -- now-showing`
Expected: PASS — NowShowing 참조 없음, 기존 now-showing 테스트(treatment 등) 통과.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/page.tsx lib/now-showing.ts
git commit -m "refactor(home): remove NowShowing grid (folded into hero autoplay)

요약: hero가 3장 순환으로 흡수 — 하단 NowShowing 그리드·getNowShowingCards 제거"
```

---

### Task 6: 전체 검증 & 프리뷰 배포

**Files:** 없음(검증 전용).

- [ ] **Step 1: 전체 빌드(SSG 호환)**

Run: `npm run build`
Expected: PASS — generate-changelog → sync-site-stats → next build → verify:i18n-placeholders 전부 통과. 홈(`/`, `/en`) 정적 생성 성공.

- [ ] **Step 2: 전체 테스트**

Run: `npm test`
Expected: PASS — 신규 `getHeroSlides` 테스트 포함 전부 통과.

- [ ] **Step 3: 잔여 trauma 가드 확인 (수동 코드검토)**

확인 항목:

- [ ] `HomeHero.tsx`에 `'use client'` 없음.
- [ ] 애니메이션은 `opacity`/`transform`만(레이아웃 프로퍼티 애니 없음).
- [ ] 첫 슬라이드 `opacity:1` + `priority` + `fetchPriority="high"`, 나머지 `fetchPriority="low"`.
- [ ] `loading="lazy"` 미사용(opacity:0 슬라이드의 lazy 미트리거 위험 회피).

- [ ] **Step 4: 프리뷰 배포 & PSI 안내**

- 현재 브랜치 push → Vercel 프리뷰 SHA로 매칭(메모리 `feedback_sha_match_vercel_preview`): push한 커밋 SHA의 deployments API `environment_url` + curl 검증 후 URL 확보.
- 사용자에게 전달: 프리뷰 URL + "mobile PSI **3회** 측정 + admin/analytics RUM 확인 요청"(메모리 `feedback_psi_variance` — 단일 lab 판단 금지). 시각 확인(autoplay 동작·LCP 첫 장)도 사용자에게 요청(`feedback_no_playwright`).
- ⚠ **머지 전 PM 게이트**: NowShowing 제거 = Variant B 전환 실험(~2026-07-01 평가) 변수 변경. spec §리스크 2 참조 — 적용 타이밍은 사용자 확인 후 결정.

- [ ] **Step 5: 검증 결과 커밋(필요 시) & 종료**

빌드/테스트 통과 시 추가 커밋 불필요. 결과를 사용자에게 보고.

---

## Self-Review

**Spec coverage:**

- 순환 풀 셀렉터 → Task 1 ✓
- CSS keyframe autoplay(opacity-only) → Task 2 ✓
- LCP 안전(첫 장 high/opacity1, 나머지 low) → Task 4 Step1 ✓
- 켄번스+크로스페이드 → Task 2(crossfade)+Task 4(ken-burns 유지) ✓
- 이미지만 순환·텍스트 고정·범용 캠페인 → Task 3+Task 4 ✓
- NowShowing 그리드 제거 → Task 5 ✓
- 리스크(payload 실측, Variant B, reduced-motion) → Task 6 Step4 + Task 4 기본 opacity ✓

**Placeholder scan:** 없음 — 모든 코드 블록 실제 내용.

**Type consistency:** `getHeroSlides`(Task 1) 시그니처가 Task 4 호출과 일치. `animate-hero-crossfade-2/3`·`delayStep`(6/7s) Task 2 keyframe 주기와 Task 4 일치. `home.hero.campaign*` 키 Task 3 정의 = Task 4 소비 일치.
