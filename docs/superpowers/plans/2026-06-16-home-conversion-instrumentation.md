# 홈 전환 최적화 구현 계획 (로드맵 항목 3·4·5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인페이지의 작품 판매 전환을 (3) Hero 카피 상품 우선화, (4) 랜딩→작품상세 퍼널 계측, (5) 측정 기반 A/B 실험으로 단계적으로 끌어올린다.

**Architecture:** 세 항목은 **엄격한 선후 의존**을 가진다 — #3(카피, 회귀 0)과 #4-A(이벤트 emit)는 즉시 착수 가능하고, #4-B(대시보드)는 emit 검증 후, **#5(A/B)는 #4가 최소 14일 baseline을 수집한 뒤에만** 착수한다(측정 없는 리디자인은 이 레포의 LCP/CLS 회귀 5종 재발 위험). 모든 신규 계측은 기존 `trackEvent()` 헬퍼와 Vercel Drain→`page_views` 파이프라인을 재사용한다.

**Tech Stack:** Next.js 16 App Router(force-static ISR), next-intl(`proxy.ts` 미들웨어), TypeScript strict, Supabase(SECURITY DEFINER RPC + `page_views` 테이블), `@vercel/analytics` track, Jest + React Testing Library, Tailwind(브랜드 토큰).

---

## 단계·의존성 요약

| Phase | 항목                                | 착수 조건                                  | 회귀 위험                                   |
| ----- | ----------------------------------- | ------------------------------------------ | ------------------------------------------- |
| **1** | #3 Hero 카피 + #4-A 이벤트 emit     | 즉시                                       | 0 (카피·client 이벤트만)                    |
| **2** | #4-B 대시보드(RPC + admin 패널)     | Phase 1 emit이 `page_views`에 적재 확인 후 | 낮음 (read-only RPC)                        |
| **3** | #5 Hero CTA solid + 섹션 재배열 A/B | **#4 emit ≥ 14일 baseline 수집 후**        | 높음 (force-static·LCP/CLS·A/B 인프라 신설) |

---

## 사전 사실 (이미 확인됨 — 재조사 불필요)

- `trackEvent(name, params)` — `lib/analytics/track.ts:28`. snake_case, params는 `string|number|boolean|null`만. SSR 안전(`typeof window` 가드). 이중 송신: Vercel Analytics→Drain→`page_views`, + GA4 gtag.
- Drain webhook: `app/api/webhooks/vercel-drain/route.ts` — **event_name allowlist 없음**, 모든 이벤트를 `page_views`에 적재. 포털 경로(/admin·/dashboard·/exhibitor) 필터아웃.
- `page_views` 컬럼: `event_type`('pageview'|'event'), `event_name`, `event_data`(jsonb), `route`, `path`, `device_id`, `session_id`, `event_timestamp`. (`20260310120000_create_page_views_table.sql`, `20260508110000_page_views_event_data.sql`)
- 기존 client 추적 패턴: `components/common/TrackedExternalLink.tsx`, `TrackedDonateButton.tsx`(`'use client'`, `trackEvent(name, { page_path, ...params })`). **내부 Link용 범용 추적 컴포넌트는 없음.**
- 기존 commerce 이벤트: `view_item`(`components/features/ArtworkPurchaseCTA.tsx:174`, useEffect 1회, params `{artwork_id, artwork_title, artist}`), `purchase_click`(같은 파일 + `ArtworkPurchaseStickyMobile.tsx`, params에 `mode`).
- admin 대시보드: `app/(portal)/admin/analytics/page.tsx`(server, force-dynamic) → `app/actions/admin-analytics.ts`의 `getAnalyticsData()`가 ~39개 RPC를 `Promise.all`로 호출 → 데이터 주입형 server 패널 렌더.
- 기존 RPC는 `WHERE event_name = '...'` 하드코딩 → **신규 이벤트는 신규 RPC 필요**. event_data jsonb는 `->>'key'`로 추출.
- 미들웨어: **`proxy.ts`** (next-intl `createMiddleware(routing)`). Next.js 16 미들웨어 rewrite가 default-locale query를 떨군 회귀 이력 있음(메모리) → A/B rewrite 시 주의.
- **A/B·feature-flag·실험 인프라 부재** — #5는 변이 전달(variant delivery) 인프라부터 신설해야 함.
- Hero fallback 슬라이드 카피 키(`messages/ko.json`·`en.json`, `home.nowShowing`): `allArtworksStatus`/`allArtworksTitle`(`\n` 포함, `whitespace-pre-line`)/`allArtworksDesc`(ICU `{artistCount}`)/`allArtworksCta`.
- 시각 검증은 **Playwright 금지**(메모리) — build + type-check + 코드검토 후 **사용자에게 화면 확인 요청**.

---

## File Structure

**신규 파일**

- `components/features/HomeTrackedSection.tsx` — `'use client'`. 홈 섹션을 감싸 (a) IntersectionObserver로 `home_section_view` 1회 emit, (b) 내부 `<a>` 클릭 위임으로 `hero_cta_click`/`home_artwork_card_click`/`home_cta_click` emit. **#4의 유일한 신규 client 컴포넌트(범용 재사용).**
- `__tests__/components/HomeTrackedSection.test.tsx` — 위 컴포넌트 단위 테스트.
- `supabase/migrations/20260617090000_home_funnel_analytics.sql` — 신규 RPC 3종(`get_home_section_view_summary`, `get_home_cta_click_summary`, `get_home_entry_funnel`).
- `components/features/admin/HomeFunnelPanel.tsx` — admin 분석 패널(데이터 주입형 server 컴포넌트).
- `docs/experiments/2026-home-reorder-ab.md` — #5 실험 설계 명세(코드 아님, 의사결정 게이트 문서).

**수정 파일**

- `messages/ko.json` · `messages/en.json` — #3 Hero 카피 키 값 교체.
- `app/[locale]/page.tsx` — 홈 섹션들을 `HomeTrackedSection`으로 감싸기(#4-A).
- `app/actions/admin-analytics.ts` — 신규 RPC 3종 호출 + `AnalyticsData` 타입 확장(#4-B).
- `app/(portal)/admin/analytics/page.tsx` — `HomeFunnelPanel` 렌더(#4-B).

---

# PHASE 1 — 즉시 착수 (회귀 0)

## Task 1: Hero fallback 카피 상품 우선화 (#3)

**Files:**

- Modify: `messages/ko.json` (`home.nowShowing.allArtworks*`)
- Modify: `messages/en.json` (`home.nowShowing.allArtworks*`)

**채택 카피 (상품 우선, 명분은 둘째 문장 보조). ICU `{artistCount}` 유지, 제목 `\n` 1개 유지(`whitespace-pre-line` 렌더).**

- [ ] **Step 1: ko.json 카피 교체**

`messages/ko.json`의 `home.nowShowing` 안 4개 키를 아래로 교체:

```json
      "allArtworksStatus": "원본 · 작가 직거래",
      "allArtworksTitle": "작가에게서 직접 만나는\n한국 현대미술 원본",
      "allArtworksDesc": "한국 작가 {artistCount}인의 원본을 합리적인 가격에. 구매 수익의 10%는 동료 예술인의 저금리 대출 기금이 됩니다.",
      "allArtworksCta": "작품 둘러보기",
```

- [ ] **Step 2: en.json 동일 위치 교체**

`messages/en.json`의 `home.nowShowing`:

```json
      "allArtworksStatus": "Originals · Direct from Artists",
      "allArtworksTitle": "Korean Contemporary Art,\nDirect from the Artist",
      "allArtworksDesc": "Original works by {artistCount} Korean artists at fair prices. 10% of every purchase becomes a low-interest loan fund for fellow artists.",
      "allArtworksCta": "Browse the collection",
```

- [ ] **Step 3: JSON 유효성 + i18n 플레이스홀더 검증**

Run: `node -e "require('./messages/ko.json');require('./messages/en.json');console.log('ok')" && npm run verify:i18n-placeholders`
Expected: `ok` 출력 + `[verify-i18n-placeholders] OK`.

- [ ] **Step 4: 빌드로 ICU·force-static 정합 확인**

Run: `npm run build 2>&1 | tail -20`
Expected: 빌드 성공(홈 `/` prerender). ICU `{artistCount}` 미해결 경고 없음.

- [ ] **Step 5: 시각 확인 요청 (Playwright 금지)**

사용자에게 요청: "로컬 `npm run dev` 또는 프리뷰에서 홈 Hero h1이 '작가에게서 직접 만나는 / 한국 현대미술 원본' 2줄로, 명분 문장이 보조로 보이는지 확인 부탁드립니다." 확인 후 다음 단계.

- [ ] **Step 6: Commit**

```bash
git add messages/ko.json messages/en.json
git commit -m "feat(home): Hero 카피 상품 우선으로 미세조정

요약: 홈 Hero 제목을 '예술가의 산소' 명분형에서 '작가 직거래 원본' 상품형으로 교체, 명분은 둘째 문장 보조로 강등 (구조 동결, 카피만)

- allArtworksTitle/Desc/Status/Cta 상품 우선 재작성 (ko/en)
- ICU {artistCount}·speakable h1 selector·whitespace-pre-line 유지"
```

---

## Task 2: HomeTrackedSection 컴포넌트 — section_view + 클릭 위임 (#4-A 코어)

**Files:**

- Create: `components/features/HomeTrackedSection.tsx`
- Test: `__tests__/components/HomeTrackedSection.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/components/HomeTrackedSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import HomeTrackedSection from '@/components/features/HomeTrackedSection';

const mockTrack = jest.fn();
jest.mock('@/lib/analytics/track', () => ({
  trackEvent: (...args: unknown[]) => mockTrack(...args),
}));

// IntersectionObserver mock — observe 시 즉시 교차 콜백 1회 호출
class IO {
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
  }
  observe() {
    this.cb(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  mockTrack.mockClear();
  window.sessionStorage.clear();
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
});

describe('HomeTrackedSection', () => {
  it('교차 시 home_section_view를 section 파라미터와 함께 1회 emit', () => {
    render(
      <HomeTrackedSection section="master">
        <a href="/artworks/123">art</a>
      </HomeTrackedSection>
    );
    const viewCalls = mockTrack.mock.calls.filter((c) => c[0] === 'home_section_view');
    expect(viewCalls).toHaveLength(1);
    expect(viewCalls[0][1]).toMatchObject({ section: 'master' });
  });

  it('같은 세션에서 같은 섹션의 section_view는 중복 emit하지 않음', () => {
    const { unmount } = render(
      <HomeTrackedSection section="master">
        <a href="/artworks/1">a</a>
      </HomeTrackedSection>
    );
    unmount();
    render(
      <HomeTrackedSection section="master">
        <a href="/artworks/1">a</a>
      </HomeTrackedSection>
    );
    expect(mockTrack.mock.calls.filter((c) => c[0] === 'home_section_view')).toHaveLength(1);
  });

  it('작품 링크 클릭 시 home_artwork_card_click(artwork_id, position) emit', () => {
    render(
      <HomeTrackedSection section="painting">
        <a href="/ko/artworks/777" data-testid="card">
          work
        </a>
        <a href="/ko/artworks/888">work2</a>
      </HomeTrackedSection>
    );
    fireEvent.click(screen.getByTestId('card'));
    const click = mockTrack.mock.calls.find((c) => c[0] === 'home_artwork_card_click');
    expect(click).toBeTruthy();
    expect(click![1]).toMatchObject({ section: 'painting', artwork_id: '777', position: 0 });
  });

  it('section="hero"에서 링크 클릭 시 hero_cta_click emit', () => {
    render(
      <HomeTrackedSection section="hero">
        <a href="/artworks" data-testid="hero">
          go
        </a>
      </HomeTrackedSection>
    );
    fireEvent.click(screen.getByTestId('hero'));
    expect(mockTrack.mock.calls.find((c) => c[0] === 'hero_cta_click')).toBeTruthy();
  });

  it('비-작품 링크(전체보기 등) 클릭 시 home_cta_click(destination) emit', () => {
    render(
      <HomeTrackedSection section="master">
        <a href="/artworks" data-testid="viewall">
          전체
        </a>
      </HomeTrackedSection>
    );
    fireEvent.click(screen.getByTestId('viewall'));
    const c = mockTrack.mock.calls.find((x) => x[0] === 'home_cta_click');
    expect(c).toBeTruthy();
    expect(c![1]).toMatchObject({ section: 'master', destination: '/artworks' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest __tests__/components/HomeTrackedSection.test.tsx`
Expected: FAIL — `Cannot find module '@/components/features/HomeTrackedSection'`.

- [ ] **Step 3: 컴포넌트 구현**

`components/features/HomeTrackedSection.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics/track';

/**
 * 홈 섹션 계측 래퍼 (#4 랜딩→작품상세 퍼널 계측).
 *
 * 1) IntersectionObserver로 섹션이 처음 viewport에 들어오면 `home_section_view` 1회 emit.
 *    sessionStorage로 세션당 섹션 1회만(스크롤 왕복 중복 방지).
 * 2) 내부 `<a>` 클릭을 위임 추적 — 카드 컴포넌트(server)를 건드리지 않고 wrapping div 한 곳에서 처리:
 *    - section==='hero'           → `hero_cta_click`
 *    - href가 /artworks/{id}       → `home_artwork_card_click` (artwork_id + position)
 *    - 그 외(전체보기·컬렉션 등)    → `home_cta_click` (destination)
 *
 * server 컴포넌트인 홈 섹션을 children으로 받아 그대로 통과시킨다(RSC children 패턴).
 */
export default function HomeTrackedSection({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const key = `home_section_view:${section}`;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(key)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          try {
            window.sessionStorage.setItem(key, '1');
          } catch {
            /* storage 비활성 환경 무시 */
          }
          trackEvent('home_section_view', { section });
          io.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [section]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor || !ref.current?.contains(anchor)) return;

    const href = anchor.getAttribute('href') ?? '';
    const page_path = typeof window !== 'undefined' ? window.location.pathname : null;

    if (section === 'hero') {
      trackEvent('hero_cta_click', { section, destination: href, page_path });
      return;
    }

    // locale prefix 포함 가능: /ko/artworks/123 또는 /artworks/123
    const match = href.match(/\/artworks\/([^/?#]+)/);
    // /artworks (목록)·/artworks/category/... 는 id가 아니므로 카드로 보지 않음
    const isCard = Boolean(match) && match![1] !== 'category' && match![1] !== 'artist';

    if (isCard) {
      const anchors = Array.from(
        ref.current!.querySelectorAll<HTMLAnchorElement>('a[href*="/artworks/"]')
      ).filter((a) => {
        const m = (a.getAttribute('href') ?? '').match(/\/artworks\/([^/?#]+)/);
        return m && m[1] !== 'category' && m[1] !== 'artist';
      });
      const position = anchors.indexOf(anchor);
      trackEvent('home_artwork_card_click', {
        section,
        artwork_id: match![1],
        position,
        page_path,
      });
    } else {
      trackEvent('home_cta_click', { section, destination: href, page_path });
    }
  }

  return (
    <div ref={ref} onClickCapture={handleClick}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest __tests__/components/HomeTrackedSection.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add components/features/HomeTrackedSection.tsx __tests__/components/HomeTrackedSection.test.tsx
git commit -m "feat(analytics): 홈 섹션 계측 래퍼 HomeTrackedSection 추가

요약: 홈 섹션 노출(section_view)과 내부 링크 클릭(hero/카드/CTA)을 위임 추적하는 client 래퍼 — 작품상세 진입 전 퍼널을 측정 가능하게

- IntersectionObserver section_view 세션당 1회
- 클릭 위임으로 hero_cta_click·home_artwork_card_click(artwork_id,position)·home_cta_click 분기
- 카드 server 컴포넌트 무수정(RSC children 통과)"
```

---

## Task 3: 홈 페이지에 HomeTrackedSection 배선 (#4-A 적용)

**Files:**

- Modify: `app/[locale]/page.tsx`

- [ ] **Step 1: import 추가**

`app/[locale]/page.tsx` 상단 import 블록(다른 `@/components/features/*` import 옆)에 추가:

```tsx
import HomeTrackedSection from '@/components/features/HomeTrackedSection';
```

- [ ] **Step 2: 추적 대상 섹션을 래핑**

`Home` 컴포넌트 return의 JSX에서 아래 섹션들을 `HomeTrackedSection`으로 감싼다. **레이아웃·순서·DOM 구조는 그대로** 두고 wrapping div만 추가(force-static·CLS 영향 없음 — div는 display:block 기본, 섹션 내부 margin 유지). 예:

```tsx
      <HomeTrackedSection section="hero">
        <HomeHero locale={locale} />
      </HomeTrackedSection>

      <AboutIdentity locale={locale} />

      <MechanismSection locale={locale} />

      <HomeTrackedSection section="now-showing">
        <NowShowing locale={locale} />
      </HomeTrackedSection>

      <HomeTrackedSection section="master">
        <MasterArtists locale={locale} />
      </HomeTrackedSection>

      <HomeTrackedSection section="entry-level">
        <EntryLevelArtworks locale={locale} />
      </HomeTrackedSection>

      <HomeTrackedSection section="category">
        <CategorySections locale={locale} />
      </HomeTrackedSection>

      <HomeTrackedSection section="emerging">
        <EmergingArtists locale={locale} />
      </HomeTrackedSection>
```

> 주의: `AboutIdentity`·`MechanismSection`은 작품 클릭이 없어 래핑 불필요(원하면 section_view용으로 감싸도 무방하나 클릭 이벤트는 발생 안 함). `MagazineSection`·`JoinCommunityCTA`·`FAQ`는 퍼널 범위 밖이라 제외.

- [ ] **Step 3: 타입체크 + 빌드**

Run: `npm run type-check 2>&1 | grep -E "error TS" | head; npm run build 2>&1 | tail -15`
Expected: 에러 0, 홈 `/` prerender 성공. (Wrapping div가 server/client 경계를 만들지만 children은 server 렌더 유지 — hydration은 wrapper만.)

- [ ] **Step 4: 이벤트 emit 수동 검증**

Run: `npm run dev` 후 사용자에게 요청 — 브라우저 DevTools Network에서 `/_vercel/insights/event`(또는 GA4 `gtag`) 요청에 `home_section_view`(스크롤 시)·`hero_cta_click`(Hero 클릭)·`home_artwork_card_click`(카드 클릭)이 잡히는지 확인. (프로덕션 Drain 적재는 배포 후 `page_views`에서 확인.)

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/page.tsx
git commit -m "feat(home): 퍼널 계측 — 홈 섹션을 HomeTrackedSection으로 래핑

요약: Hero·NowShowing·거장·입문가·카테고리·신진 섹션에 노출/클릭 계측 적용 (랜딩→작품상세 퍼널 측정 시작)

- 레이아웃/순서/DOM 불변, wrapping div만 추가 (CLS 0)"
```

> **Phase 1 종료 게이트:** 배포 후 프로덕션 `page_views`에 `home_section_view`·`hero_cta_click`·`home_artwork_card_click`이 적재되는지 SQL로 확인(`SELECT event_name, count(*) FROM page_views WHERE event_name LIKE 'home_%' OR event_name='hero_cta_click' GROUP BY 1`). **여기서부터 14일 baseline 카운트 시작 — #5의 착수 조건.**

---

# PHASE 2 — 퍼널 대시보드 (#4-B)

## Task 4: 홈 퍼널 집계 RPC 마이그레이션

**Files:**

- Create: `supabase/migrations/20260617090000_home_funnel_analytics.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260617090000_home_funnel_analytics.sql`:

```sql
-- 홈 랜딩→작품상세 퍼널 계측 집계 RPC.
-- 신규 이벤트: home_section_view, hero_cta_click, home_artwork_card_click, home_cta_click.
-- 기존 commerce 이벤트(view_item·purchase_click)와 device_id로 단계 연결.

-- 1) 섹션별 노출 요약
CREATE OR REPLACE FUNCTION public.get_home_section_view_summary(since_ts timestamptz)
RETURNS TABLE(section text, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    pv.event_data->>'section' AS section,
    count(*)::bigint AS views,
    count(DISTINCT pv.device_id)::bigint AS visitors
  FROM public.page_views pv
  WHERE pv.event_timestamp >= since_ts
    AND pv.event_type = 'event'
    AND pv.event_name = 'home_section_view'
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

-- 2) 홈 CTA·카드 클릭 요약 (이벤트별 + 섹션별)
CREATE OR REPLACE FUNCTION public.get_home_cta_click_summary(since_ts timestamptz)
RETURNS TABLE(event_name text, section text, clicks bigint, clickers bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    pv.event_name,
    pv.event_data->>'section' AS section,
    count(*)::bigint AS clicks,
    count(DISTINCT pv.device_id)::bigint AS clickers
  FROM public.page_views pv
  WHERE pv.event_timestamp >= since_ts
    AND pv.event_type = 'event'
    AND pv.event_name IN ('hero_cta_click', 'home_artwork_card_click', 'home_cta_click')
  GROUP BY 1, 2
  ORDER BY 3 DESC;
$$;

-- 3) 진입 퍼널: 홈 노출 → 홈 클릭(hero/카드) → 작품상세(view_item) → 구매클릭(purchase_click).
--    device_id 단위 단계별 도달자 수(고유 방문자). 단계 통과는 "해당 이벤트를 한 번이라도 발생"으로 정의.
CREATE OR REPLACE FUNCTION public.get_home_entry_funnel(since_ts timestamptz)
RETURNS TABLE(
  home_visitors bigint,
  home_clickers bigint,
  detail_viewers bigint,
  purchase_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH ev AS (
    SELECT device_id, event_name
    FROM public.page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'event'
      AND device_id IS NOT NULL
  )
  SELECT
    count(DISTINCT device_id) FILTER (WHERE event_name = 'home_section_view')::bigint,
    count(DISTINCT device_id) FILTER (WHERE event_name IN ('hero_cta_click', 'home_artwork_card_click'))::bigint,
    count(DISTINCT device_id) FILTER (WHERE event_name = 'view_item')::bigint,
    count(DISTINCT device_id) FILTER (WHERE event_name = 'purchase_click')::bigint
  FROM ev;
$$;

REVOKE ALL ON FUNCTION public.get_home_section_view_summary(timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_home_cta_click_summary(timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_home_entry_funnel(timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_section_view_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_home_cta_click_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_home_entry_funnel(timestamptz) TO service_role;
```

- [ ] **Step 2: MCP로 production 적용 (사용자 컨펌)**

CLAUDE.md 정책: `mcp__claude_ai_Supabase__apply_migration`(project_id `khtunrybrzntlnowlahb`), `name: "home_funnel_analytics"`, `query`에 위 SQL 본문. 사용자 컨펌 필수. (read-only 집계 함수라 위험 낮음.)

- [ ] **Step 3: 적용 검증 + 타입 재생성**

Run(검증): MCP `execute_sql`로 `SELECT * FROM get_home_entry_funnel(now() - interval '30 days')` 호출 → 0 또는 양수 행 반환(에러 없음).
그 후 `mcp__claude_ai_Supabase__generate_typescript_types` → `types/supabase.ts` 갱신 → `npx prettier --write types/supabase.ts`.
Expected: `npm run type-check` 에러 0.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617090000_home_funnel_analytics.sql types/supabase.ts
git commit -m "feat(analytics): 홈 진입 퍼널 집계 RPC 3종 추가

요약: 홈 노출→클릭→작품상세→구매클릭 단계별 도달자를 집계하는 RPC (대시보드용)

- get_home_section_view_summary / get_home_cta_click_summary / get_home_entry_funnel
- SECURITY DEFINER + service_role 한정 grant (프로젝트 컨벤션)"
```

---

## Task 5: admin 분석에 홈 퍼널 패널 추가

**Files:**

- Modify: `app/actions/admin-analytics.ts`
- Create: `components/features/admin/HomeFunnelPanel.tsx`
- Modify: `app/(portal)/admin/analytics/page.tsx`

- [ ] **Step 1: action에 RPC 3종 호출 추가**

`app/actions/admin-analytics.ts`의 `getAnalyticsData` 내부 `Promise.all` 배열에 추가(기존 RPC 호출과 동일 패턴, `since_ts` 인자는 기존 `period` 계산값 재사용):

```ts
    supabase.rpc('get_home_entry_funnel', { since_ts: sinceTs }),
    supabase.rpc('get_home_section_view_summary', { since_ts: sinceTs }),
    supabase.rpc('get_home_cta_click_summary', { since_ts: sinceTs }),
```

반환 구조 조합부에 `homeFunnel: { funnel, sectionViews, ctaClicks }` 추가하고 `AnalyticsData` 타입에 동일 필드 추가. (정확한 변수명 `sinceTs`/period 계산은 기존 코드 컨벤션을 따를 것 — 파일 상단 다른 RPC 호출 줄을 복제.)

- [ ] **Step 2: 패널 컴포넌트 작성**

`components/features/admin/HomeFunnelPanel.tsx` (admin은 한국어 고정·i18n 비스코프, CLAUDE.md):

```tsx
import type { ReactNode } from 'react';

interface HomeFunnelData {
  funnel: {
    home_visitors: number;
    home_clickers: number;
    detail_viewers: number;
    purchase_clickers: number;
  } | null;
  sectionViews: Array<{ section: string; views: number; visitors: number }>;
  ctaClicks: Array<{
    event_name: string;
    section: string | null;
    clicks: number;
    clickers: number;
  }>;
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-charcoal-muted">{label}</p>
      <p className="text-2xl font-bold text-charcoal-deep tabular-nums">{value}</p>
      {sub && <p className="text-xs text-charcoal-soft">{sub}</p>}
    </div>
  );
}

function rate(n: number, d: number): string {
  if (!d) return '—';
  return `${((n / d) * 100).toFixed(1)}%`;
}

export default function HomeFunnelPanel({ data }: { data: HomeFunnelData }) {
  const f = data.funnel;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-charcoal-deep">홈 진입 퍼널</h2>
      {f ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="홈 노출(고유)" value={f.home_visitors.toLocaleString()} />
          <Stat
            label="홈 클릭(고유)"
            value={f.home_clickers.toLocaleString()}
            sub={`전환 ${rate(f.home_clickers, f.home_visitors)}`}
          />
          <Stat
            label="작품상세 도달"
            value={f.detail_viewers.toLocaleString()}
            sub={`클릭→상세 ${rate(f.detail_viewers, f.home_clickers)}`}
          />
          <Stat
            label="구매 클릭"
            value={f.purchase_clickers.toLocaleString()}
            sub={`상세→구매 ${rate(f.purchase_clickers, f.detail_viewers)}`}
          />
        </div>
      ) : (
        <p className="text-sm text-charcoal-muted">데이터 없음</p>
      )}

      <h3 className="text-sm font-bold text-charcoal-deep mt-4">섹션별 노출/클릭</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-charcoal-muted">
              <th className="py-1">섹션</th>
              <th className="py-1">노출(고유)</th>
              <th className="py-1">클릭(이벤트별)</th>
            </tr>
          </thead>
          <tbody>
            {data.sectionViews.map((s) => {
              const clicks = data.ctaClicks
                .filter((c) => c.section === s.section)
                .map((c) => `${c.event_name}:${c.clicks}`)
                .join(', ');
              return (
                <tr key={s.section} className="border-t border-gray-100">
                  <td className="py-1 font-medium text-charcoal-deep">{s.section}</td>
                  <td className="py-1 tabular-nums">{s.visitors.toLocaleString()}</td>
                  <td className="py-1 text-charcoal-muted">{clicks || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 분석 페이지에 렌더**

`app/(portal)/admin/analytics/page.tsx`에서 기존 패널들 옆에 추가:

```tsx
<HomeFunnelPanel data={data.homeFunnel} />
```

(import 추가: `import HomeFunnelPanel from '@/components/features/admin/HomeFunnelPanel';`)

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npm run type-check 2>&1 | grep -E "error TS" | head; npm run build 2>&1 | tail -10`
Expected: 에러 0, 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add app/actions/admin-analytics.ts components/features/admin/HomeFunnelPanel.tsx "app/(portal)/admin/analytics/page.tsx"
git commit -m "feat(admin): 홈 진입 퍼널 분석 패널 추가

요약: /admin/analytics에 홈 노출→클릭→작품상세→구매클릭 단계별 전환율 + 섹션별 노출/클릭 표 추가"
```

---

# PHASE 3 — Hero CTA solid + 섹션 재배열 A/B (#5, 게이트)

> **착수 금지 조건:** Phase 1 이벤트가 프로덕션 `page_views`에 **≥ 14일** 적재되어 baseline(홈 방문자 수, 홈→상세 CTR, 상세→구매 CTR)이 산출 가능해야 한다. 이 데이터로 MDE·필요 표본·실험 기간을 계산한다. baseline 없이 착수하면 결과를 증명할 수 없다(실행 PM 패널 반대표).

## Task 6: 실험 설계 명세 작성 (코드 아님 — 의사결정 게이트)

**Files:**

- Create: `docs/experiments/2026-home-reorder-ab.md`

- [ ] **Step 1: 설계 문서에 아래 항목을 채워 작성**

```markdown
# 실험: 홈 상품 우선 재배열 + Hero solid CTA

## 가설

Hero CTA를 ghost→solid(primary-strong)로 바꾸고 명분 섹션(AboutIdentity·MechanismSection)을
쇼핑 그리드(NowShowing/MasterArtists/EntryLevel) 아래로 내리면, 홈→작품상세 CTR이 상승한다.

## 변이

- A (대조): 현행 홈.
- B (처치): (1) Hero CTA = `<Button variant="primary">`(button-base가 bg-primary-strong 강제, CLAUDE.md AA 규칙).
  (2) page.tsx 섹션 순서에서 AboutIdentity·MechanismSection을 NowShowing/MasterArtists/EntryLevel 아래로 이동.
  (3) AboutIdentity는 1줄 압축 리본으로 축약(정체성 인지 유지).

## 1차 지표 (primary)

홈 방문자 대비 `view_item` 도달률(get_home_entry_funnel: detail_viewers / home_visitors).

## 가드레일 지표 (regression 시 실험 중단)

- 결제: purchase_clickers / detail_viewers, 실매출.
- 이탈: 홈 bounce, 세션 깊이.
- 성능: 홈 CLS p75, LCP p75 (RUM — admin WebVitalsPanel). B가 A 대비 악화 금지.

## 표본·기간

Phase 1 baseline의 홈 일일 방문자 V, 현 CTR p로부터 MDE +X%(상대) 검출에 필요한 표본을
양측 z-test로 계산 → 기간 = 필요표본 / (V × 0.5). [Phase 1 데이터 입력 후 확정.]

## 의사결정 규칙

기간 종료 시 1차 지표가 95% 유의수준에서 +양(positive) & 가드레일 무악화 → B를 100% 채택(영구 반영).
그렇지 않으면 A 유지, 학습 기록.
```

- [ ] **Step 2: Commit**

```bash
git add docs/experiments/2026-home-reorder-ab.md
git commit -m "docs(experiment): 홈 재배열 A/B 실험 설계 명세"
```

## Task 7: A/B 변이 전달 인프라 — 결정 필요 (인프라 부재)

> 이 레포에 A/B·flag 인프라가 **없다**. force-static + LCP/CLS 트라우마 때문에 **client-side 변이 스왑 금지**(레이아웃 점프 → CLS 회귀). 아래 중 택1을 사용자와 확정한 뒤 구현한다.

**옵션 1 (권장) — proxy.ts 쿠키 버킷팅 + 정적 변이 2벌:**

- `proxy.ts`(next-intl createMiddleware 전/후)에서 `ab_home` 쿠키 없으면 50/50 배정·set-cookie, 값이 B면 내부 경로 `/(home-b)/...` 로 **rewrite**(URL 불변). A·B 각각 **force-static prerender** 유지 → 변이별 LCP/CLS 보존.
- 주의: 메모리 회귀(미들웨어 rewrite가 default-locale query 떨굼) — rewrite 시 query·locale 보존 e2e 필수.

**옵션 2 — `@vercel/flags` + Edge Config:**

- Vercel-native flag로 배정, 미들웨어에서 변이 결정. 운영 토글·점진 롤아웃 용이하나 의존성·설정 추가.

**옵션 3 — 실험 보류, B를 직접 출시 후 전후 비교(pre/post):**

- A/B 인프라 없이 B를 전량 출시하고 Phase 1 baseline 대비 전후 비교. 통계적 엄밀성 낮음(외부 요인 혼입). 트래픽이 A/B 표본에 못 미치면 현실적 대안.

- [ ] **Step 1: 사용자와 변이 전달 방식 확정** (AskUserQuestion)
- [ ] **Step 2: 확정안에 따른 세부 구현 계획을 본 문서에 추가** (변이 B의 page.tsx/HomeHero 변경 + e2e-a11y(bg-primary-strong AA) + CLS/LCP 가드 + rewrite locale 보존 테스트)

> Phase 3의 코드 태스크는 옵션 확정 후 별도 plan으로 분기(브레인스토밍 → 본 스킬 재실행). 측정·게이트가 핵심이므로 현 시점에선 설계·인프라 결정까지만 명세.

---

## Self-Review 체크

- **Spec 커버리지:** #3=Task 1, #4(emit)=Task 2–3, #4(대시보드)=Task 4–5, #5=Task 6–7. 누락 없음.
- **Placeholder 스캔:** 코드 스텝은 전부 실제 코드 포함. Phase 3 Task 7만 의도적으로 "옵션 결정 후 분기"(인프라 부재로 단정 불가) — 게이트 명시.
- **타입 일관성:** `HomeTrackedSection` props `{section, children}`, 이벤트명 `home_section_view`/`hero_cta_click`/`home_artwork_card_click`/`home_cta_click`이 컴포넌트·RPC·패널 전반 일치. RPC 반환 필드(`home_visitors` 등)와 패널 `HomeFunnelData` 일치.
- **의존성:** #5는 #4 baseline 14일을 명시적 선행 조건으로 못박음.

```

```
