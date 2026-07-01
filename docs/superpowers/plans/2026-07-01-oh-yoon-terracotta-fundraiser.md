# 오윤 테라코타 기금마련전 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 씨앗페 상시 작가가 자기 작품 최대 3점을 오윤 테라코타 이전 기금마련전에 출품하고, 그 판매를 상시 판매와 분리해 집계할 수 있게 한다.

**Architecture:** `artworks`에 nullable `exhibition` 태그 컬럼 1개를 추가한다(접근법 A). 태그는 **기금마련전 참여 페이지(`/dashboard/fundraiser`)**를 단일 진입점으로만 설정한다 — 기존 작품은 `setFundraiserSelection` 액션으로, 새 작품은 이 화면에서 `?exhibition=` 파라미터로 표준 폼을 열어 `createArtwork`가 태그. 공개 노출은 상시 갤러리 + 전용 페이지(`/exhibition/oh-yoon-terracotta`) 양쪽. 집계는 정산 파이프라인 무수정, 기존 admin 화면(`revenue`·`artworks`)에 태그 필터로 흡수.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase(Postgres+RLS), next-intl, Jest(jsdom), Playwright(@axe-core) a11y.

## Global Constraints

- **설계 단일 출처:** `docs/superpowers/specs/2026-07-01-oh-yoon-terracotta-fundraiser-design.md`. 이견 시 스펙 우선. **합의된 설계를 임의 변경 금지.**
- **진입점은 `/dashboard/fundraiser` 하나.** `exhibition` 태그를 바꾸는 코드 경로는 `setFundraiserSelection`과 `createArtwork`(`?exhibition=` 경유)뿐. `updateArtwork`는 `exhibition`을 `.update()`에 포함하지 않아 자동 보존.
- **작가당 최대 3점**(`OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist`). 하드코딩 금지 — 상수 참조.
- **판매 후 잠금:** `status==='sold' || manual_sold_override===true`인 태그 작품은 태그 해제 불가.
- **컬러 토큰:** `slate-*`·Tailwind 기본 팔레트 금지. `primary-*`/`charcoal-*`/`gray-*`/`canvas-*`/`gallery-*`/`sun-*`/`success-*`/`danger-*`만. CTA/버튼은 `<Button variant="primary">`.
- **i18n:** 공개 라우트(`app/[locale]/**`)·작가 대시보드는 next-intl 메시지 필수(한국어 리터럴 금지). **admin 포털은 한국어 전용(i18n 비스코프).**
- **이미지:** `SafeImage`만. `next/image` 직접 import 금지.
- **Supabase:** 마이그레이션은 `supabase/migrations/`에 파일로 작성 후 `supabase db query --linked -f <file>`로 **단건 적용**. 여러 pending 상태에서 `db push` 금지. 프로덕션 DDL은 사용자 컨펌 필수.
- **커밋:** `type(scope): subject` + 본문 `요약:` 줄 필수. 커밋 후 push.
- **검증 금지사항:** UI 시각 검증에 Playwright 스크린샷/브라우저 자동화 사용 금지(a11y spec 실행은 예외). 시각 확인은 사용자에게 요청.
- **프로젝트 프레이밍:** 출품 작가는 "불우한 대출 거부 작가"가 아니라 **연대자**. 카피는 새로 쓰지 말고 기존 오윤 콘텐츠 재사용.

---

## File Structure

**신규**

- `supabase/migrations/<ts>_add_artwork_exhibition.sql` — 컬럼 + 인덱스
- `lib/exhibitions.ts` — 전시 상수·타입·슬러그 가드
- `app/actions/fundraiser.ts` — `setFundraiserSelection` server action (`'use server'`)
- `app/(portal)/dashboard/(artist)/fundraiser/page.tsx` — 참여 화면(서버)
- `app/(portal)/dashboard/(artist)/fundraiser/fundraiser-selection.tsx` — 선택 UI(클라이언트)
- `app/[locale]/exhibition/oh-yoon-terracotta/page.tsx` — 공개 전시 페이지
- `__tests__/actions/fundraiser-selection.test.ts` — 액션 단위 테스트
- `__tests__/actions/artwork-create-exhibition.test.ts` — createArtwork 태그 테스트
- `__tests__/lib/exhibitions.test.ts` — 슬러그 가드 테스트
- `e2e/a11y/exhibition-oh-yoon-terracotta.spec.ts` — a11y

**수정**

- `types/supabase.ts` — artworks Row/Insert/Update에 `exhibition`
- `types/index.ts` — `BaseArtwork.exhibition`
- `lib/supabase-data.ts` — `getArtworksByExhibition(slug)`
- `app/actions/artwork.ts` — `createArtwork`에 `?exhibition=` 태그 처리 + 한도 검증
- `app/(portal)/dashboard/(artist)/artworks/artwork-form.tsx` — `exhibition` prop → 확정 배지 + hidden input
- `app/(portal)/dashboard/(artist)/artworks/new/page.tsx` — `searchParams.exhibition` → 폼 prop
- `app/(portal)/dashboard/(artist)/dashboard-nav.tsx` — 참여 화면 nav 항목(활성 기간 한정)
- `lib/hero-routes.ts` + `__tests__/lib/hero-routes.test.ts` — 공개 페이지 hero 등록
- `messages/ko.json`, `messages/en.json` — 공개 페이지·참여 화면 메시지
- `app/(portal)/admin/artworks/*` — exhibition 뱃지·필터
- `app/(portal)/admin/revenue/*` — exhibition 필터 차원

---

## Task 1: DB 마이그레이션 + 타입

**Files:**

- Create: `supabase/migrations/<ts>_add_artwork_exhibition.sql`
- Modify: `types/supabase.ts` (artworks `Row`/`Insert`/`Update`)
- Modify: `types/index.ts` (`BaseArtwork`)

**Interfaces:**

- Produces: `artworks.exhibition: string | null` 컬럼. 값은 전시 슬러그 또는 NULL.

- [ ] **Step 1: 마이그레이션 파일 작성**

파일명의 `<ts>`는 기존 `supabase/migrations/` 최신 파일의 타임스탬프 규칙을 따라 그보다 큰 값으로 정한다(예: `20260701090000`).

```sql
-- supabase/migrations/20260701090000_add_artwork_exhibition.sql
-- 오윤 테라코타 기금마련전: 작품의 전시 귀속 태그.
-- NULL = 상시 판매작, 'oh-yoon-terracotta' = 기금마련전 출품작.
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS exhibition text;

CREATE INDEX IF NOT EXISTS idx_artworks_exhibition
  ON public.artworks (exhibition)
  WHERE exhibition IS NOT NULL;
```

- [ ] **Step 2: 프로덕션 단건 적용 (사용자 컨펌 후)**

사용자에게 DDL 적용 승인을 받은 뒤:

Run: `supabase db query --linked -f supabase/migrations/20260701090000_add_artwork_exhibition.sql`
Expected: 성공(에러 없음). `db push` 사용 금지.

- [ ] **Step 3: 타입 수동 반영**

`types/supabase.ts`의 `artworks` 정의에서 `Row`, `Insert`, `Update` 세 곳 모두에 `exhibition` 추가. `Row`는 `admin_product_name: string | null;` 바로 아래 알파벳 순 위치에 삽입:

```typescript
// Row
edition_type: Database['public']['Enums']['edition_type'] | null;
exhibition: string | null; // ← 추가
height_cm: number | null;
```

```typescript
// Insert (해당 블록에 옵셔널로)
        exhibition?: string | null;
```

```typescript
// Update (해당 블록에 옵셔널로)
        exhibition?: string | null;
```

`types/index.ts`의 `BaseArtwork`에 추가 (`admin_product_name?` 근처):

```typescript
  admin_product_name?: string | null;
  exhibition?: string | null;   // ← 추가: 전시 귀속 태그 슬러그
```

- [ ] **Step 4: 타입 체크**

Run: `npm run type-check`
Expected: PASS (에러 없음). `.eq('exhibition', ...)` 사용처가 생기기 전이라 이 단계는 타입 정의만 확인.

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260701090000_add_artwork_exhibition.sql types/supabase.ts types/index.ts
git commit -m "feat(fundraiser): artworks.exhibition 태그 컬럼 추가

요약: 기금마련전 작품 귀속용 exhibition 컬럼과 인덱스 추가"
```

---

## Task 2: 전시 상수 단일 출처

**Files:**

- Create: `lib/exhibitions.ts`
- Test: `__tests__/lib/exhibitions.test.ts`

**Interfaces:**

- Produces:
  - `OH_YOON_TERRACOTTA_EXHIBITION: { slug: 'oh-yoon-terracotta'; maxPerArtist: 3; active: boolean; labelKo: string; labelEn: string; fundingHref: string; petitionHref: string }`
  - `type ExhibitionSlug = 'oh-yoon-terracotta'`
  - `isExhibitionSlug(v: string | null | undefined): v is ExhibitionSlug`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/exhibitions.test.ts
import { isExhibitionSlug, OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';

describe('exhibitions 상수/가드', () => {
  it('알려진 슬러그를 통과시킨다', () => {
    expect(isExhibitionSlug('oh-yoon-terracotta')).toBe(true);
  });
  it('알 수 없는 값·null을 거른다', () => {
    expect(isExhibitionSlug('random')).toBe(false);
    expect(isExhibitionSlug(null)).toBe(false);
    expect(isExhibitionSlug(undefined)).toBe(false);
  });
  it('작가당 한도는 3', () => {
    expect(OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist).toBe(3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- exhibitions`
Expected: FAIL ("Cannot find module '@/lib/exhibitions'").

- [ ] **Step 3: 구현**

```typescript
// lib/exhibitions.ts
export const OH_YOON_TERRACOTTA_EXHIBITION = {
  slug: 'oh-yoon-terracotta',
  maxPerArtist: 3,
  /** 캠페인 종료 시 false → 참여 화면·nav·배너 숨김 */
  active: true,
  labelKo: '오윤 테라코타 기금마련전',
  labelEn: 'Oh Yoon Terracotta Relief Exhibition',
  /** 상호 연결: 크라우드펀딩 캠페인 */
  fundingHref: '/funding/oh-yoon-terracotta',
  /** 상호 연결: 벽화 지키기 청원 */
  petitionHref: '/petition/oh-yoon',
} as const;

export const EXHIBITION_SLUGS = [OH_YOON_TERRACOTTA_EXHIBITION.slug] as const;
export type ExhibitionSlug = (typeof EXHIBITION_SLUGS)[number];

export function isExhibitionSlug(value: string | null | undefined): value is ExhibitionSlug {
  return !!value && (EXHIBITION_SLUGS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- exhibitions`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/exhibitions.ts __tests__/lib/exhibitions.test.ts
git commit -m "feat(fundraiser): 전시 상수 단일 출처 lib/exhibitions.ts

요약: 기금마련전 슬러그·한도·라벨·연결 링크 상수와 슬러그 가드 추가"
```

---

## Task 3: `getArtworksByExhibition` 읽기 헬퍼

**Files:**

- Modify: `lib/supabase-data.ts` (기존 `getSupabaseArtworksByArtist` 3단 패턴 바로 아래에 추가)
- Test: `__tests__/lib/get-artworks-by-exhibition.test.ts`

**Interfaces:**

- Consumes: `ARTWORK_SELECT_COLUMNS`, `ARTIST_SELECT_COLUMNS`, `mapArtworkRow`, `pickArtist`, `ArtworkWithArtistRow`, `hasSupabaseConfig`, `supabase`, `unstable_cache`, `cache`, `ARTWORK_DATA_REVALIDATE_SECONDS` (모두 `lib/supabase-data.ts` 내부에 이미 존재).
- Produces: `getArtworksByExhibition(slug: string): Promise<Artwork[]>` — `is_hidden=false`인 해당 전시 작품, `created_at` 내림차순.

- [ ] **Step 1: 실패 테스트 작성**

Supabase 쿼리 체인을 mock한다(기존 테스트 mock 패턴 참고). `hasSupabaseConfig`가 false면 빈 배열을 반환하는 경로를 우선 검증:

```typescript
// __tests__/lib/get-artworks-by-exhibition.test.ts
describe('getArtworksByExhibition', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('Supabase 미구성 시 빈 배열을 반환한다', async () => {
    const { getArtworksByExhibition } = await import('@/lib/supabase-data');
    const result = await getArtworksByExhibition('oh-yoon-terracotta');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- get-artworks-by-exhibition`
Expected: FAIL ("getArtworksByExhibition is not a function").

- [ ] **Step 3: 구현 추가**

`lib/supabase-data.ts`에서 `getSupabaseArtworksByArtist` 정의 바로 아래에 3단 래핑을 그대로 미러링해 추가:

```typescript
const getArtworksByExhibitionUncached = async (slug: string): Promise<Artwork[]> => {
  if (!hasSupabaseConfig || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      ${ARTWORK_SELECT_COLUMNS},
      artists!inner (${ARTIST_SELECT_COLUMNS})
    `
    )
    .eq('exhibition', slug)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .returns<ArtworkWithArtistRow[]>();

  if (error) {
    console.error(`Error fetching artworks for exhibition ${slug}:`, error);
    return [];
  }

  return (data || []).map((item) => mapArtworkRow(item, pickArtist(item.artists)));
};

const getArtworksByExhibitionCached = unstable_cache(
  async (slug: string) => getArtworksByExhibitionUncached(slug),
  ['supabase-artworks-by-exhibition-v1'],
  {
    revalidate: ARTWORK_DATA_REVALIDATE_SECONDS,
    tags: ['artworks'],
  }
);

export const getArtworksByExhibition = cache(
  async (slug: string): Promise<Artwork[]> => getArtworksByExhibitionCached(slug)
);
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- get-artworks-by-exhibition`
Expected: PASS.

- [ ] **Step 5: 타입 체크**

Run: `npm run type-check`
Expected: PASS. `.eq('exhibition', slug)`가 Task 1의 타입 반영 덕에 통과.

- [ ] **Step 6: 커밋**

```bash
git add lib/supabase-data.ts __tests__/lib/get-artworks-by-exhibition.test.ts
git commit -m "feat(fundraiser): getArtworksByExhibition 읽기 헬퍼 추가

요약: 전시 슬러그로 공개 작품을 캐시 조회하는 헬퍼 추가"
```

---

## Task 4: `setFundraiserSelection` server action

**Files:**

- Create: `app/actions/fundraiser.ts` (`'use server'`)
- Test: `__tests__/actions/fundraiser-selection.test.ts`

**Interfaces:**

- Consumes: `requireArtistActive` (`@/lib/auth/guards`), `createSupabaseServerClient` (`@/lib/auth/server`), `OH_YOON_TERRACOTTA_EXHIBITION` (`@/lib/exhibitions`), `ActionState` (`@/types`).
- Produces: `setFundraiserSelection(selectedArtworkIds: string[]): Promise<ActionState>`.

**검증 순서(스펙 §4.2):** 인증 → 소유권 → 판매 잠금 유지 → 한도(≤3) → 반영(선택=slug / 해제 대상=NULL).

- [ ] **Step 1: 실패 테스트 작성**

`__tests__/actions/artwork-delete.test.ts`의 mock 스타일을 따른다. 헬퍼로 artist 조회, 작품 목록 조회, update 체인을 mock:

```typescript
// __tests__/actions/fundraiser-selection.test.ts
const mockRequireArtistActive = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireArtistActive: (...a: unknown[]) => mockRequireArtistActive(...a),
}));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: (...a: unknown[]) => mockCreateSupabaseServerClient(...a),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));

type Row = {
  id: string;
  status: string | null;
  manual_sold_override: boolean;
  exhibition: string | null;
};

function buildSupabase(artworks: Row[], updateSpy: jest.Mock) {
  const artistQuery = {
    select: jest.fn(() => artistQuery),
    eq: jest.fn(() => artistQuery),
    single: jest.fn(() =>
      Promise.resolve({ data: { id: 'artist-1', name_ko: '김작가' }, error: null })
    ),
  };
  const listQuery = {
    select: jest.fn(() => listQuery),
    eq: jest.fn(() => Promise.resolve({ data: artworks, error: null })),
  };
  const updateChain = {
    update: updateSpy,
  };
  return {
    from: jest.fn((table: string) => {
      if (table === 'artists') return artistQuery;
      // 첫 artworks 접근 = 목록 조회, 이후 = update
      if (table === 'artworks') {
        return {
          select: listQuery.select,
          update: (payload: unknown) => {
            updateSpy(payload);
            const chain = {
              eq: jest.fn(() => chain),
              in: jest.fn(() => Promise.resolve({ error: null })),
            };
            return chain;
          },
        };
      }
      return artistQuery;
    }),
  };
}

describe('setFundraiserSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireArtistActive.mockResolvedValue({ id: 'user-1' });
  });

  it('본인 소유가 아닌 작품이 선택되면 거부한다', async () => {
    const updateSpy = jest.fn();
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildSupabase(
        [{ id: 'a1', status: 'available', manual_sold_override: false, exhibition: null }],
        updateSpy
      )
    );
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection(['a1', 'not-mine']);
    expect(res.error).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('판매된 출품작을 선택에서 빼면 거부한다', async () => {
    const updateSpy = jest.fn();
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildSupabase(
        [
          {
            id: 'sold1',
            status: 'sold',
            manual_sold_override: false,
            exhibition: 'oh-yoon-terracotta',
          },
        ],
        updateSpy
      )
    );
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection([]); // sold1을 빼려 시도
    expect(res.error).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('4점 선택 시 한도 초과로 거부한다', async () => {
    const updateSpy = jest.fn();
    const rows: Row[] = ['a1', 'a2', 'a3', 'a4'].map((id) => ({
      id,
      status: 'available',
      manual_sold_override: false,
      exhibition: null,
    }));
    mockCreateSupabaseServerClient.mockResolvedValue(buildSupabase(rows, updateSpy));
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection(['a1', 'a2', 'a3', 'a4']);
    expect(res.error).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('유효한 선택은 태그를 적용한다', async () => {
    const updateSpy = jest.fn();
    const rows: Row[] = [
      { id: 'a1', status: 'available', manual_sold_override: false, exhibition: null },
      {
        id: 'a2',
        status: 'available',
        manual_sold_override: false,
        exhibition: 'oh-yoon-terracotta',
      },
    ];
    mockCreateSupabaseServerClient.mockResolvedValue(buildSupabase(rows, updateSpy));
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection(['a1']); // a1 태그, a2 해제
    expect(res.error).toBe(false);
    // 태그 적용(slug) + 해제(null) 각각 1회
    expect(updateSpy).toHaveBeenCalledWith({ exhibition: 'oh-yoon-terracotta' });
    expect(updateSpy).toHaveBeenCalledWith({ exhibition: null });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- fundraiser-selection`
Expected: FAIL ("Cannot find module '@/app/actions/fundraiser'").

- [ ] **Step 3: 구현**

```typescript
// app/actions/fundraiser.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import type { ActionState } from '@/types';

type SelectableArtwork = {
  id: string;
  status: string | null;
  manual_sold_override: boolean;
  exhibition: string | null;
};

const isSold = (a: SelectableArtwork) => a.status === 'sold' || a.manual_sold_override === true;

export async function setFundraiserSelection(selectedArtworkIds: string[]): Promise<ActionState> {
  const slug = OH_YOON_TERRACOTTA_EXHIBITION.slug;
  try {
    const user = await requireArtistActive();
    const supabase = await createSupabaseServerClient();

    const { data: artist } = await supabase
      .from('artists')
      .select('id, name_ko')
      .eq('user_id', user.id)
      .single();
    if (!artist) {
      return { message: '작가 프로필을 찾을 수 없습니다.', error: true };
    }

    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('id, status, manual_sold_override, exhibition')
      .eq('artist_id', artist.id);
    if (error) throw error;

    const rows = (artworks ?? []) as SelectableArtwork[];
    const owned = new Set(rows.map((a) => a.id));
    const selected = new Set(selectedArtworkIds);

    // 1. 소유권
    for (const id of selectedArtworkIds) {
      if (!owned.has(id)) {
        return { message: '본인 작품만 출품할 수 있습니다.', error: true };
      }
    }

    // 2. 판매 잠금: 판매된 출품작이 선택에서 빠지면 거부
    for (const a of rows) {
      if (a.exhibition === slug && isSold(a) && !selected.has(a.id)) {
        return { message: '이미 판매된 출품작은 출품을 해제할 수 없습니다.', error: true };
      }
    }

    // 3. 한도
    if (selected.size > OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist) {
      return {
        message: `기금마련전은 작가당 최대 ${OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist}점까지 출품할 수 있습니다.`,
        error: true,
      };
    }

    // 4. 반영
    const toTag = selectedArtworkIds;
    const toUntag = rows
      .filter((a) => a.exhibition === slug && !selected.has(a.id) && !isSold(a))
      .map((a) => a.id);

    if (toTag.length > 0) {
      const { error: e1 } = await supabase
        .from('artworks')
        .update({ exhibition: slug })
        .eq('artist_id', artist.id)
        .in('id', toTag);
      if (e1) throw e1;
    }
    if (toUntag.length > 0) {
      const { error: e2 } = await supabase
        .from('artworks')
        .update({ exhibition: null })
        .eq('artist_id', artist.id)
        .in('id', toUntag);
      if (e2) throw e2;
    }

    revalidatePath('/dashboard/fundraiser');
    revalidatePath('/dashboard/artworks');
    revalidateTag('artworks');
    return { message: '출품 작품이 저장되었습니다.', error: false };
  } catch {
    return { message: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', error: true };
  }
}
```

> 주의(메모리 `project_use_server_no_reexport`): 이 `'use server'` 파일은 **async 함수만** export한다. 상수·타입 re-export 금지.

- [ ] **Step 4: 통과 확인**

Run: `npm test -- fundraiser-selection`
Expected: PASS (4 케이스).

- [ ] **Step 5: 타입 체크 + 커밋**

Run: `npm run type-check` → PASS

```bash
git add app/actions/fundraiser.ts __tests__/actions/fundraiser-selection.test.ts
git commit -m "feat(fundraiser): setFundraiserSelection 액션(소유권·잠금·3점 한도)

요약: 기금마련전 출품 선택 저장 액션과 검증 로직 추가"
```

---

## Task 5: `createArtwork` `?exhibition=` 태그 처리

**Files:**

- Modify: `app/actions/artwork.ts` (`createArtwork` 내부)
- Test: `__tests__/actions/artwork-create-exhibition.test.ts`

**Interfaces:**

- Consumes: `isExhibitionSlug`, `OH_YOON_TERRACOTTA_EXHIBITION` (`@/lib/exhibitions`).
- Produces: `createArtwork`가 FormData의 `exhibition` 필드를 읽어 유효 슬러그일 때만 태그하며, 태그 시 작가당 3점 한도를 재검증하고, 성공 redirect를 참여 화면으로 보낸다.

> `updateArtwork`는 수정하지 않는다 — `.update({...})`에 `exhibition`이 없어 기존 값이 보존된다(스펙 §4.2·§6).

- [ ] **Step 1: 실패 테스트 작성**

한도 초과 시 거부를 검증(태그 + 이미 3점 존재):

```typescript
// __tests__/actions/artwork-create-exhibition.test.ts
const mockRequireArtistActive = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireArtistActive: (...a: unknown[]) => mockRequireArtistActive(...a),
}));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: (...a: unknown[]) => mockCreateSupabaseServerClient(...a),
  createSupabaseAdminClient: () => ({ from: jest.fn() }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/app/actions/activity-log-writer', () => ({
  logArtistAction: jest.fn(async () => {}),
}));

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('createArtwork exhibition 태그', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireArtistActive.mockResolvedValue({ id: 'user-1' });
  });

  it('이미 3점 출품한 작가가 태그된 새 작품을 만들면 거부한다', async () => {
    const artistQuery = {
      select: jest.fn(() => artistQuery),
      eq: jest.fn(() => artistQuery),
      single: jest.fn(() =>
        Promise.resolve({ data: { id: 'artist-1', name_ko: '김작가' }, error: null })
      ),
    };
    // count 쿼리: head:true → { count: 3 }
    const countQuery = {
      select: jest.fn(() => countQuery),
      eq: jest.fn(() => Promise.resolve({ count: 3, error: null })),
    };
    let artworksCalls = 0;
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return artistQuery;
        if (table === 'artworks') {
          artworksCalls += 1;
          return countQuery; // 첫 접근이 count
        }
        return artistQuery;
      }),
    };
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const { createArtwork } = await import('@/app/actions/artwork');
    const res = await createArtwork(
      { message: '', error: false },
      fd({
        title: '새 작품',
        price: '1000000',
        images: JSON.stringify(['https://example.com/a.jpg']),
        new_uploads: JSON.stringify([]),
        exhibition: 'oh-yoon-terracotta',
      })
    );
    expect(res.error).toBe(true);
    expect(res.message).toContain('3점');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- artwork-create-exhibition`
Expected: FAIL (현재 createArtwork는 exhibition을 무시하고 insert까지 진행 → 거부 안 함).

- [ ] **Step 3: 구현**

`app/actions/artwork.ts` 상단 import에 추가:

```typescript
import { isExhibitionSlug, OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
```

`createArtwork`에서 FormData 파싱부(예: `category` 파싱 직후)에 추가:

```typescript
const rawExhibition = getString(formData, 'exhibition') || null;
const exhibition = isExhibitionSlug(rawExhibition) ? rawExhibition : null;
```

이미지/필수값 검증 통과 후, `insert` **직전**에 한도 재검증 추가:

```typescript
if (exhibition) {
  const { count } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artist.id)
    .eq('exhibition', exhibition);
  if ((count ?? 0) >= OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist) {
    return {
      message: `기금마련전은 작가당 최대 ${OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist}점까지 출품할 수 있습니다.`,
      error: true,
    };
  }
}
```

`insert({...})` 객체에 `exhibition` 추가:

```typescript
      .insert({
        artist_id: artist.id,
        title,
        // ... 기존 필드 ...
        is_hidden: false,
        shop_url: null,
        exhibition,   // ← 추가
      })
```

성공 시 태그된 작품은 참여 화면으로 복귀시키도록, 함수 상단의 `redirectPath` 결정부를 조정:

```typescript
// 기존: let redirectPath = buildRedirectPath('created');
// exhibition 태그가 있으면 참여 화면으로 복귀
```

파싱 후 `exhibition`이 확정된 뒤에 재설정:

```typescript
if (exhibition) {
  redirectPath = '/dashboard/fundraiser?result=created';
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- artwork-create-exhibition`
Expected: PASS.

- [ ] **Step 5: 회귀 확인 (기존 artwork 액션 테스트)**

Run: `npm test -- artwork`
Expected: 기존 테스트 모두 PASS(비태그 경로 불변).

- [ ] **Step 6: 커밋**

```bash
git add app/actions/artwork.ts __tests__/actions/artwork-create-exhibition.test.ts
git commit -m "feat(fundraiser): createArtwork ?exhibition= 태그 + 3점 한도 재검증

요약: 참여 화면 경유 신규 작품 등록 시 기금마련전 태그와 한도 검증 추가"
```

---

## Task 6: 등록 폼 `exhibition` 확정 배지

**Files:**

- Modify: `app/(portal)/dashboard/(artist)/artworks/artwork-form.tsx`
- Modify: `app/(portal)/dashboard/(artist)/artworks/new/page.tsx`

**Interfaces:**

- Consumes: `OH_YOON_TERRACOTTA_EXHIBITION` (라벨). `new/page.tsx`의 `searchParams.exhibition`.
- Produces: 폼이 `exhibition` prop을 받으면 hidden input `name="exhibition"`을 렌더하고 상단에 "이 작품은 {labelKo}에 출품됩니다" 확정 배지를 노출. prop 없으면 기존과 완전히 동일.

- [ ] **Step 1: `new/page.tsx`에서 searchParams 전달**

`app/(portal)/dashboard/(artist)/artworks/new/page.tsx`가 `searchParams`를 받아 `exhibition`을 슬러그 가드로 정제 후 `ArtworkForm`에 전달:

```typescript
import { isExhibitionSlug } from '@/lib/exhibitions';

type NewArtworkPageProps = {
  searchParams: Promise<{ exhibition?: string }>;
};

export default async function NewArtworkPage({ searchParams }: NewArtworkPageProps) {
  const { artist } = await getArtistDashboardContext();
  const params = await searchParams;
  const exhibition = isExhibitionSlug(params.exhibition) ? params.exhibition : undefined;
  return <ArtworkForm artistId={artist.id} exhibition={exhibition} />;
}
```

> 기존 `new/page.tsx`가 `artistId`를 어떻게 얻는지 확인 후 동일 패턴 유지. `getArtistDashboardContext`가 이미 사용 중이면 그대로.

- [ ] **Step 2: 폼 prop 타입 + hidden input + 배지 추가**

`artwork-form.tsx`의 `ArtworkFormProps`에 추가:

```typescript
type ArtworkFormProps = {
  artwork?: Partial<ArtworkData>;
  artistId: string;
  exhibition?: string; // ← 추가: 신규 등록을 기금마련전에 귀속
};
```

컴포넌트 시그니처와 폼 내부:

```typescript
export function ArtworkForm({ artwork, artistId, exhibition }: ArtworkFormProps) {
```

`<form>` 최상단(제목 `<h3>` 위)에 배지 + hidden input(오직 exhibition이 있을 때만):

```typescript
        {exhibition && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-charcoal-deep">
              🌱 {t('fundraiserBadgeTitle')}
            </p>
            <p className="mt-1 text-sm text-charcoal-muted">{t('fundraiserBadgeHint')}</p>
            <input type="hidden" name="exhibition" value={exhibition} />
          </div>
        )}
```

메시지 키 `dashboard.artworkForm.fundraiserBadgeTitle`, `fundraiserBadgeHint`를 `messages/ko.json`·`messages/en.json`의 해당 네임스페이스에 추가:

```json
"fundraiserBadgeTitle": "이 작품은 오윤 테라코타 기금마련전에 출품됩니다",
"fundraiserBadgeHint": "등록하면 참여 페이지로 돌아갑니다. 판매 수익은 오윤 테라코타 이전 기금으로 별도 집계됩니다."
```

(en.json은 동일 키에 영어 문구)

- [ ] **Step 3: 타입 체크**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: i18n placeholder 검증**

Run: `npm run build` 또는 `node scripts/verify-i18n-placeholders`(존재 시). 최소 `npm run type-check` + 수동으로 ko/en 키 쌍 존재 확인.
Expected: ko/en 키 누락 없음.

- [ ] **Step 5: 커밋**

```bash
git add app/(portal)/dashboard/(artist)/artworks/artwork-form.tsx "app/(portal)/dashboard/(artist)/artworks/new/page.tsx" messages/ko.json messages/en.json
git commit -m "feat(fundraiser): 등록 폼 기금마련전 확정 배지(?exhibition= 진입 한정)

요약: 참여 화면 경유 신규 등록 시 폼에 출품 확정 배지와 hidden input 노출"
```

---

## Task 7: 기금마련전 참여 화면 `/dashboard/fundraiser`

**Files:**

- Create: `app/(portal)/dashboard/(artist)/fundraiser/page.tsx` (서버)
- Create: `app/(portal)/dashboard/(artist)/fundraiser/fundraiser-selection.tsx` (클라이언트)
- Modify: `app/(portal)/dashboard/(artist)/dashboard-nav.tsx` (nav 항목)

**Interfaces:**

- Consumes: `getArtistDashboardContext` (`@/lib/auth/dashboard-context`), `createSupabaseServerClient`, `OH_YOON_TERRACOTTA_EXHIBITION`, `setFundraiserSelection` (`@/app/actions/fundraiser`), `useActionState`, `Button`.
- Produces: 스토리 헤더(기존 오윤 콘텐츠 재사용·`/petition/oh-yoon` 링크) + 작품 선택 UI(3점 카운터, 판매 잠금 표시) + 저장.

- [ ] **Step 1: 서버 페이지 — 데이터 로드**

`OH_YOON_TERRACOTTA_EXHIBITION.active`가 false면 "종료" 안내. active면 작가 작품(태그·판매 상태 포함)을 로드해 클라이언트 컴포넌트에 전달:

```typescript
// app/(portal)/dashboard/(artist)/fundraiser/page.tsx
import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { FundraiserSelection } from './fundraiser-selection';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import LinkButton from '@/components/ui/LinkButton';

export default async function FundraiserPage() {
  const { artist } = await getArtistDashboardContext();

  if (!OH_YOON_TERRACOTTA_EXHIBITION.active) {
    return (
      <div className="space-y-4">
        <AdminPageHeader>
          <AdminPageTitle>{OH_YOON_TERRACOTTA_EXHIBITION.labelKo}</AdminPageTitle>
          <AdminPageDescription>기금마련전 출품 접수가 종료되었습니다.</AdminPageDescription>
        </AdminPageHeader>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, images, price, status, manual_sold_override, exhibition, created_at')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* 스토리 헤더 — 기존 오윤 콘텐츠 재사용·요약 + 청원 링크 */}
      <section className="rounded-2xl border border-gallery-hairline bg-canvas-strong p-6">
        <p className="text-eyebrow">{OH_YOON_TERRACOTTA_EXHIBITION.labelKo}</p>
        <h1 className="mt-2 text-2xl font-bold text-charcoal-deep">
          동료 작가들의 연대로 오윤 테라코타를 지킵니다
        </h1>
        <p className="mt-3 text-charcoal-muted leading-relaxed">
          1974년 옛 상업은행 구의동지점에 새겨진 오윤의 테라코타 양면 부조가 멸실 위기에 놓였습니다.
          작가들이 자기 작품을 내놓아, 판매 수익을 오윤 테라코타 이전 기금으로 잇습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
            벽화 지키기 청원 보기
          </LinkButton>
        </div>
      </section>

      <FundraiserSelection
        artworks={(artworks ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          image: a.images?.[0] ?? null,
          price: a.price,
          isTagged: a.exhibition === OH_YOON_TERRACOTTA_EXHIBITION.slug,
          isSold: a.status === 'sold' || a.manual_sold_override === true,
        }))}
        maxPerArtist={OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist}
      />
    </div>
  );
}
```

> 스토리 문구는 새 창작이 아니라 `petition/oh-yoon` 기존 서사의 요약이다. 카피가 더 필요하면 그 페이지 문구를 재사용한다.

- [ ] **Step 2: 클라이언트 선택 컴포넌트**

3점 카운터, 판매 잠금(체크 불가), 저장 버튼(`setFundraiserSelection`), "새 작품 등록하고 출품" 링크(`?exhibition=` 부착):

```typescript
// app/(portal)/dashboard/(artist)/fundraiser/fundraiser-selection.tsx
'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import Button from '@/components/ui/Button';
import LinkButton from '@/components/ui/LinkButton';
import SafeImage from '@/components/common/SafeImage';
import { setFundraiserSelection } from '@/app/actions/fundraiser';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import type { ActionState } from '@/types';

type Item = {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  isTagged: boolean;
  isSold: boolean;
};

const initialState: ActionState = { message: '', error: false };

export function FundraiserSelection({
  artworks,
  maxPerArtist,
}: {
  artworks: Item[];
  maxPerArtist: number;
}) {
  const initialSelected = useMemo(
    () => new Set(artworks.filter((a) => a.isTagged).map((a) => a.id)),
    [artworks]
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionState) => setFundraiserSelection([...selected]),
    initialState
  );

  const count = selected.size;
  const atLimit = count >= maxPerArtist;

  const toggle = (item: Item) => {
    if (item.isSold && item.isTagged) return; // 잠금
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else {
        if (next.size >= maxPerArtist) return prev;
        next.add(item.id);
      }
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal-deep">
          기금마련전 출품 {count}/{maxPerArtist}
        </p>
        <LinkButton
          href={`/dashboard/artworks/new?exhibition=${OH_YOON_TERRACOTTA_EXHIBITION.slug}`}
          variant="secondary"
        >
          새 작품 등록하고 출품
        </LinkButton>
      </div>

      {state.message && (
        <p className={state.error ? 'text-sm text-danger' : 'text-sm text-success'}>
          {state.message}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {artworks.map((item) => {
          const isChecked = selected.has(item.id);
          const locked = item.isSold && item.isTagged;
          const disabled = locked || (!isChecked && atLimit);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={disabled}
                aria-pressed={isChecked}
                className={
                  'block w-full rounded-xl border p-2 text-left transition ' +
                  (isChecked
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-gallery-hairline') +
                  (disabled ? ' opacity-50' : '')
                }
              >
                {item.image && (
                  <SafeImage
                    src={item.image}
                    alt={item.title}
                    width={300}
                    height={300}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <p className="mt-2 truncate text-sm text-charcoal">{item.title}</p>
                {locked && <p className="text-xs text-charcoal-soft">판매됨 · 출품 확정</p>}
              </button>
            </li>
          );
        })}
      </ul>

      <Button type="submit" variant="primary" loading={isPending} disabled={isPending}>
        출품 작품 저장
      </Button>
    </form>
  );
}
```

> `SafeImage`/`Button`/`LinkButton`의 실제 prop 시그니처를 확인해 맞춘다(특히 `SafeImage`의 width/height 필수 여부). `Button`은 `loading`/`variant` 지원(기존 폼에서 사용 확인됨).

- [ ] **Step 3: nav 항목 추가**

`dashboard-nav.tsx`의 `navItemsByLocale`에 활성 기간 한정으로 추가(상수 `active` 참조). ko/en 배열 각각:

```typescript
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
// ...
const navItemsByLocale = {
  ko: [
    { href: '/dashboard/artworks', label: '작품 관리' },
    ...(OH_YOON_TERRACOTTA_EXHIBITION.active
      ? [{ href: '/dashboard/fundraiser', label: '기금마련전 출품' }]
      : []),
    { href: '/dashboard/profile', label: '프로필 설정' },
    { href: '/mypage', label: '내 주문' },
  ],
  en: [
    { href: '/dashboard/artworks', label: 'Artworks' },
    ...(OH_YOON_TERRACOTTA_EXHIBITION.active
      ? [{ href: '/dashboard/fundraiser', label: 'Fundraiser' }]
      : []),
    { href: '/dashboard/profile', label: 'Profile Settings' },
    { href: '/mypage', label: 'My Orders' },
  ],
} as const;
```

> `as const`가 spread와 충돌하면 `as const` 제거하고 명시 타입 부여. 기존 사용처 타입 확인.

- [ ] **Step 4: 타입 체크 + 빌드 확인**

Run: `npm run type-check`
Expected: PASS.

Run: `npm run build`
Expected: SSG/라우트 빌드 성공(`'use server'` 재-export 회귀 없음).

- [ ] **Step 5: 커밋**

```bash
git add "app/(portal)/dashboard/(artist)/fundraiser" "app/(portal)/dashboard/(artist)/dashboard-nav.tsx"
git commit -m "feat(fundraiser): 작가 기금마련전 참여 화면 + nav

요약: 최대 3점 출품 선택·판매 잠금·스토리 헤더 참여 페이지와 대시보드 nav 추가"
```

---

## Task 8: 공개 전시 페이지 `/exhibition/oh-yoon-terracotta`

**Files:**

- Create: `app/[locale]/exhibition/oh-yoon-terracotta/page.tsx`
- Modify: `lib/hero-routes.ts` (`HERO_EXACT`)
- Modify: `__tests__/lib/hero-routes.test.ts`
- Modify: `messages/ko.json`, `messages/en.json`
- Create: `e2e/a11y/exhibition-oh-yoon-terracotta.spec.ts`

**Interfaces:**

- Consumes: `getArtworksByExhibition` (Task 3), `PageHero`, 갤러리 컴포넌트, `getTranslations`, `OH_YOON_TERRACOTTA_EXHIBITION`.
- Produces: 공개 SSG/SSR 페이지 — 스토리 히어로(+청원·펀딩 상호 링크) + 전 작가 출품작 그리드.

- [ ] **Step 1: hero-routes 등록 + 테스트**

`lib/hero-routes.ts`의 `HERO_EXACT` Set에 추가:

```typescript
  '/collections',
  '/exhibition/oh-yoon-terracotta',   // ← 추가
```

`__tests__/lib/hero-routes.test.ts`의 "정확 매칭 페이지" `it.each` 목록에 `'/exhibition/oh-yoon-terracotta'` 추가.

Run: `npm test -- hero-routes`
Expected: PASS(추가 케이스 포함).

- [ ] **Step 2: i18n 메시지 추가**

`messages/ko.json`에 네임스페이스 `exhibitionOhYoonTerracotta` 추가(en.json 동일 키 영문):

```json
"exhibitionOhYoonTerracotta": {
  "heroTitle": "오윤 테라코타 기금마련전",
  "heroDescription": "동료 작가들이 작품을 내놓아 오윤 테라코타 이전을 잇습니다.",
  "petitionCta": "벽화 지키기 청원",
  "fundingCta": "직접 후원하기",
  "emptyState": "곧 출품작이 공개됩니다.",
  "breadcrumb": "오윤 테라코타 기금마련전"
}
```

- [ ] **Step 3: 페이지 구현**

`app/[locale]/artworks/artist/[artist]/page.tsx`의 구조(PageHero + 갤러리 + `getTranslations({locale})` + JSON-LD)를 미러링하되, 데이터는 `getArtworksByExhibition`로. 갤러리는 기존 `MasterArtistGallery`(props: `{ artworks: ArtworkListItem[]; returnTo: string }`)를 재사용하고, `Artwork → ArtworkListItem` 매핑은 `OhYoonFeature.tsx`(라인 143-149)의 매핑을 그대로 따른다.

```typescript
// app/[locale]/exhibition/oh-yoon-terracotta/page.tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import LinkButton from '@/components/ui/LinkButton';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
import { getArtworksByExhibition } from '@/lib/supabase-data';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { resolveLocale } from '@/lib/i18n/resolve-locale'; // 실제 헬퍼명 확인 후 맞춤

export const dynamic = 'force-static';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });
  return { title: t('heroTitle'), description: t('heroDescription') };
}

export default async function ExhibitionPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });

  const artworks = await getArtworksByExhibition(OH_YOON_TERRACOTTA_EXHIBITION.slug);

  // OhYoonFeature.tsx:143-149의 매핑을 그대로 따른다.
  const listArtworks = artworks.map((artwork) => ({
    id: artwork.id,
    artist: artwork.artist,
    title: artwork.title,
    price: artwork.price,
    images: artwork.images,
    size: artwork.size,
    sold: artwork.sold,
    reserved: artwork.reserved,
    // ArtworkListItem이 요구하는 나머지 필드는 OhYoonFeature 매핑과 동일하게 채운다.
  }));

  return (
    <>
      <PageHero title={t('heroTitle')} description={t('heroDescription')}>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.fundingHref} variant="primary">
            {t('fundingCta')}
          </LinkButton>
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
            {t('petitionCta')}
          </LinkButton>
        </div>
      </PageHero>

      <Section>
        {listArtworks.length === 0 ? (
          <p className="text-center text-charcoal-muted">{t('emptyState')}</p>
        ) : (
          <MasterArtistGallery artworks={listArtworks} returnTo="%2Fexhibition%2Foh-yoon-terracotta" />
        )}
      </Section>
    </>
  );
}
```

> `resolveLocale`·`ArtworkListItem`의 정확한 import 경로와 필드는 `OhYoonFeature.tsx`/`artworks/artist/[artist]/page.tsx`에서 확인해 그대로 맞춘다. `force-static` + `getTranslations({locale})` 명시는 메모리 `project_i18n_force_static_locale` 준수.

- [ ] **Step 4: a11y spec**

```typescript
// e2e/a11y/exhibition-oh-yoon-terracotta.spec.ts
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/exhibition/oh-yoon-terracotta — WCAG AA a11y 위반 없음`, async ({ page }) => {
    await page.goto(`/${locale}/exhibition/oh-yoon-terracotta`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

- [ ] **Step 5: 빌드 + 타입 체크**

Run: `npm run build`
Expected: 새 라우트 SSG 생성 성공, i18n placeholder 검증 통과.

- [ ] **Step 6: 커밋**

```bash
git add "app/[locale]/exhibition" lib/hero-routes.ts __tests__/lib/hero-routes.test.ts messages/ko.json messages/en.json e2e/a11y/exhibition-oh-yoon-terracotta.spec.ts
git commit -m "feat(fundraiser): 공개 전시 페이지 /exhibition/oh-yoon-terracotta

요약: 기금마련전 공개 페이지(히어로·출품작 그리드·펀딩/청원 상호링크)와 hero-routes·a11y 추가"
```

---

## Task 9: Admin 작품 관리 — exhibition 뱃지·필터

**Files:**

- Modify: `app/(portal)/admin/artworks/page.tsx` (select에 `exhibition` 포함, 필터 파라미터)
- Modify: `app/(portal)/admin/artworks/*` 목록 컴포넌트(`AdminArtworkList`) — 뱃지·필터 UI

**Interfaces:**

- Consumes: `OH_YOON_TERRACOTTA_EXHIBITION`.
- Produces: admin 작품 목록에서 출품작을 뱃지로 표시하고 `exhibition` searchParam으로 필터.

- [ ] **Step 1: select에 exhibition 추가**

`admin/artworks/page.tsx`의 `.select('id, title, admin_product_name, status, is_hidden, images, created_at, category, artists(...), artwork_admin_tags(...)')` 문자열에 `exhibition` 추가:

```typescript
      .select(
        'id, title, admin_product_name, status, is_hidden, images, created_at, category, exhibition, artists(name_ko), artwork_admin_tags(tag_id, admin_tags(id, name, slug, color, description, archived_at))'
      )
```

`AdminArtworkRow` 타입의 `Pick<Tables<'artworks'>, ...>`에 `'exhibition'` 추가.

- [ ] **Step 2: searchParams 필터 + 목록 반영**

`Props`의 searchParams에 `exhibition?: string` 추가, `initialFilters`에 전달. `AdminArtworkList` 내부에서 `exhibition` 필터(전체/기금마련전/상시)와 각 행에 뱃지 렌더:

```typescript
// 각 행: artwork.exhibition === OH_YOON_TERRACOTTA_EXHIBITION.slug 이면
<AdminBadge tone="info">기금마련전</AdminBadge>
```

필터 적용은 기존 status/visibility 필터와 동일 패턴(클라이언트 필터 or searchParam 쿼리)을 따른다 — `AdminArtworkList`의 기존 필터 구현을 읽고 같은 방식으로 `exhibition` 차원 추가.

- [ ] **Step 3: 타입 체크 + 빌드**

Run: `npm run type-check && npm run build`
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add "app/(portal)/admin/artworks"
git commit -m "feat(fundraiser): admin 작품 관리에 기금마련전 뱃지·필터

요약: 관리자 작품 목록에서 출품작 뱃지 표시와 전시 필터 추가"
```

---

## Task 10: Admin 매출 — exhibition 필터 차원

**Files:**

- Modify: `app/(portal)/admin/revenue/page.tsx` (searchParams + `getRevenueAnalytics` 호출에 `exhibition` 전달)
- Modify: `app/(portal)/admin/revenue/_components/RevenueFilterBar.tsx` (전시 선택 UI)
- Modify: `getRevenueAnalytics` 정의 파일(매출 집계 쿼리에 exhibition 필터 추가)

**Interfaces:**

- Consumes: `OH_YOON_TERRACOTTA_EXHIBITION`.
- Produces: revenue 화면에서 "전체 / 상시 / 오윤 테라코타 기금마련전" 선택 시 해당 매출만 집계·차트.

- [ ] **Step 1: `getRevenueAnalytics` 소스 확인**

`getRevenueAnalytics`의 정의 파일을 찾아(예: `lib/admin/revenue*.ts`) 매출 집계가 `order_items`/`artworks`를 어떻게 조인하는지 읽는다. exhibition 필터는 이 조인의 `artworks.exhibition` 조건으로 들어간다.

Run: `grep -rn "export async function getRevenueAnalytics" lib app`
Expected: 정의 위치 확인.

- [ ] **Step 2: 집계 함수에 exhibition 파라미터 추가**

`getRevenueAnalytics`의 인자 타입에 `exhibition?: string` 추가하고, 판매 매출 쿼리(artworks 조인 지점)에 조건을 건다. `exhibition === 'oh-yoon-terracotta'`면 `.eq('exhibition', 'oh-yoon-terracotta')`, `'regular'`(상시)면 `.is('exhibition', null)`, 미지정이면 필터 없음. 정확한 쿼리 빌더 형태는 Step 1에서 읽은 구조에 맞춘다.

- [ ] **Step 3: page.tsx에서 파라미터 전달**

`admin/revenue/page.tsx`의 `Props.searchParams`에 `exhibition?: string` 추가하고 `getRevenueAnalytics({ ..., exhibition: params.exhibition })`로 전달.

- [ ] **Step 4: RevenueFilterBar에 전시 선택 추가**

기존 `year`/`month` `updateFilters` 패턴을 그대로 따라 `exhibition` 선택 드롭다운을 추가하고 `params.set('exhibition', value)`로 URL 반영. 옵션 라벨은 한국어("전체"/"상시"/"오윤 테라코타 기금마련전").

- [ ] **Step 5: 타입 체크 + 빌드**

Run: `npm run type-check && npm run build`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add "app/(portal)/admin/revenue" lib
git commit -m "feat(fundraiser): admin 매출에 전시 필터 차원

요약: 관리자 매출 화면에서 기금마련전 매출을 별도 집계·필터"
```

---

## Task 11: 최종 통합 검증 + PR

**Files:** 없음(검증·머지)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전체 PASS.

- [ ] **Step 2: 타입·린트·빌드**

Run: `npm run type-check && npm run lint && npm run build`
Expected: 전부 PASS(빌드에서 i18n placeholder·SSG 회귀 없음).

- [ ] **Step 3: a11y (선택, 로컬 dev 필요)**

Run: `npx playwright test e2e/a11y/exhibition-oh-yoon-terracotta.spec.ts`
Expected: 위반 0.

- [ ] **Step 4: 시각 확인은 사용자에게 요청**

참여 화면·공개 페이지 스크린샷을 사용자에게 요청(메모리 `feedback_no_playwright`: 시각 검증 자동화 금지).

- [ ] **Step 5: push + PR + 머지**

```bash
git push -u origin feat/oh-yoon-terracotta-fundraiser
gh pr create --fill --base main
gh pr merge --merge
```

(메모리 `feedback_always_push`: 커밋 후 push, PR 만들면 머지까지.) **단, 프로덕션 DB 마이그레이션(Task 1)이 적용됐는지 확인 후 머지.**

---

## Self-Review (작성자 체크)

- **스펙 커버리지:** §3 데이터모델→T1·T2 / §3.2 상수→T2 / §5.1 공개페이지·§5.3 상호링크→T8 / §4 참여동선→T7 / §4.2 액션→T4·T5 / §4.3 nav·배너→T7(nav). ⚠️ **배너(대시보드 상단 dismiss 배너)는 T7에서 nav만 다룸** — 배너까지 원하면 T7에 스텝 추가 필요(현재 nav 항목으로 진입 보장, 배너는 선택). §6 잠금→T4·T5 / §7 admin→T9·T10. 커버리지 OK(배너는 선택 확장).
- **플레이스홀더:** UI 재사용 태스크(T7·T8·T9·T10)는 "기존 컴포넌트 미러링 + 정확한 참조 파일/라인" 형태 — `resolveLocale`, `ArtworkListItem` 필드, `AdminArtworkList` 필터, `getRevenueAnalytics` 쿼리는 구현자가 참조 파일에서 정확 시그니처를 확인해 맞춘다(명시함).
- **타입 일관성:** `OH_YOON_TERRACOTTA_EXHIBITION.slug`/`maxPerArtist`, `setFundraiserSelection(string[])→ActionState`, `getArtworksByExhibition(string)→Artwork[]`, `exhibition` 컬럼 전 태스크 일관.
