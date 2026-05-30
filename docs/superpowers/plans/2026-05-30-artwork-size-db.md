# 작품 사이즈 구조화 DB + 호수 기반 정보·큐레이션 — 구현 계획 (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작품 크기를 평문 `size` text에서 구조화 컬럼(width/height/depth/bucket)으로 DB화하고, cm에서 호수(號)를 근사 복원해 정확한 크기 정보 표시 + 갤러리 크기 필터·정렬을 구현한다.

**Architecture:** `lib/artwork-size.ts` 순수 함수 모듈이 파싱·호수 환산·구간 분류의 단일 출처. Supabase `artworks`에 numeric 컬럼 추가 후 SQL로 백필. 갤러리 필터·정렬은 기존 클라이언트 훅(`useArtworkFilter`)을 확장. 기존 `lib/utils/parseArtworkSize.ts`(3D 가상 갤러리, m 단위)는 관심사가 달라 그대로 유지.

**Tech Stack:** Next.js 16, TypeScript(strict), Supabase(MCP `apply_migration`/`execute_sql`), next-intl, Jest, Playwright(axe).

**Spec:** `docs/superpowers/specs/2026-05-30-artwork-size-db-design.md`

---

## File Structure

| 파일                                                                             | 책임                                        | 동작      |
| -------------------------------------------------------------------------------- | ------------------------------------------- | --------- |
| `lib/artwork-size.ts`                                                            | 파싱·호수환산·구간분류·표시정보 (단일 출처) | **신규**  |
| `__tests__/lib/artwork-size.test.ts`                                             | 위 순수 함수 단위 테스트                    | **신규**  |
| `supabase/migrations/<ts>_artwork_dimensions.sql`                                | 컬럼·인덱스·제약 추가                       | **신규**  |
| `scripts/backfill-artwork-sizes.sql`                                             | 기존 572행 백필 DML (재현용 보존)           | **신규**  |
| `types/index.ts`                                                                 | `BaseArtwork`에 치수 4필드                  | 수정      |
| `lib/supabase-data.ts`                                                           | SELECT·매핑에 치수 컬럼                     | 수정      |
| `app/[locale]/artworks/[id]/page.tsx`                                            | 상세 크기 섹션 호수·구간 표시               | 수정      |
| `components/ui/ArtworkCard.tsx` 외 2                                             | 카드 cm 표기 정규화                         | 수정      |
| `app/(portal)/admin/artworks/artwork-edit-form.tsx`                              | size 1칸 → cm 3필드                         | 수정      |
| `app/actions/admin-artworks.ts`                                                  | width/height/depth 읽어 size 합성+컬럼 저장 | 수정      |
| `lib/hooks/useArtworkFilter.ts`                                                  | sizeBucket 필터 + size 정렬                 | 수정      |
| `components/features/SortControls.tsx`                                           | 크기순 정렬 옵션                            | 수정      |
| `components/features/ArtworkGalleryWithSort.tsx` (+ 신규 `SizeBucketFilter.tsx`) | 크기 필터 칩                                | 수정/신규 |
| `messages/ko.json`·`messages/en.json`                                            | 구간·호수·정렬 라벨                         | 수정      |

---

## Task 1: `lib/artwork-size.ts` 도메인 로직 (TDD)

**Files:**

- Create: `lib/artwork-size.ts`
- Test: `__tests__/lib/artwork-size.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/lib/artwork-size.test.ts`

```ts
import {
  parseSizeText,
  area,
  estimateHo,
  classifyBucket,
  describeSize,
} from '../../lib/artwork-size';

describe('parseSizeText', () => {
  it('표준 2D cm', () => {
    expect(parseSizeText('72.7x60.6cm')).toEqual({ width: 72.7, height: 60.6, depth: null });
  });
  it('정수 cm', () => {
    expect(parseSizeText('60x45cm')).toEqual({ width: 60, height: 45, depth: null });
  });
  it('3D WxHxDcm', () => {
    expect(parseSizeText('60x60x130cm')).toEqual({ width: 60, height: 60, depth: 130 });
  });
  it('× 구분자 허용', () => {
    expect(parseSizeText('72.7×60.6cm')).toEqual({ width: 72.7, height: 60.6, depth: null });
  });
  it.each(['확인 중', '미정', '', '23.9x,35.2cm', '24.918.5cm', null, undefined])(
    'placeholder·오타·빈값 → null: %s',
    (raw) => {
      expect(parseSizeText(raw as string)).toBeNull();
    }
  );
});

describe('estimateHo', () => {
  it('20호 정확 매칭 (72.7x60.6 → 20, confident)', () => {
    expect(estimateHo({ width: 72.7, height: 60.6 })).toEqual({ ho: 20, confident: true });
  });
  it('10호 근사 (53x45.5 → 10, confident)', () => {
    expect(estimateHo({ width: 53, height: 45.5 })).toEqual({ ho: 10, confident: true });
  });
  it('100호 (162.2x130.3 → 100)', () => {
    expect(estimateHo({ width: 162.2, height: 130.3 })?.ho).toBe(100);
  });
  it('종횡비 극단(180x30, 6:1) → confident=false', () => {
    expect(estimateHo({ width: 180, height: 30 })?.confident).toBe(false);
  });
  it('정사각(45.5x45.5) → confident=true', () => {
    expect(estimateHo({ width: 45.5, height: 45.5 })?.confident).toBe(true);
  });
});

describe('classifyBucket', () => {
  it.each([
    [{ width: 22.7, height: 15.8, depth: null }, 'small'],
    [{ width: 53, height: 45.5, depth: null }, 'small'], // 2412 경계 = small
    [{ width: 72.7, height: 60.6, depth: null }, 'medium'],
    [{ width: 90.9, height: 72.7, depth: null }, 'medium'], // 6608 경계 = medium
    [{ width: 100, height: 80.3, depth: null }, 'large'],
    [{ width: 200, height: 150, depth: null }, 'xlarge'], // 30000 > 21135
    [{ width: 60, height: 60, depth: 130 }, 'object'],
  ] as const)('%o → %s', (d, expected) => {
    expect(classifyBucket(d)).toBe(expected);
  });
});

describe('describeSize', () => {
  it('DB 컬럼 우선', () => {
    expect(describeSize({ size: '확인 중', width_cm: 72.7, height_cm: 60.6 })).toEqual({
      cm: '72.7×60.6cm',
      ho: 20,
      bucket: 'medium',
      is3d: false,
    });
  });
  it('size text 폴백', () => {
    expect(describeSize({ size: '60x45cm' })).toEqual({
      cm: '60×45cm',
      ho: expect.any(Number),
      bucket: 'small',
      is3d: false,
    });
  });
  it('3D는 ho=null, is3d=true', () => {
    const r = describeSize({ size: '60x60x130cm' });
    expect(r).toMatchObject({ cm: '60×60×130cm', ho: null, bucket: 'object', is3d: true });
  });
  it('종횡비 극단은 ho=null', () => {
    expect(describeSize({ size: '180x30cm' })?.ho).toBeNull();
  });
  it('치수 미상 → null', () => {
    expect(describeSize({ size: '확인 중' })).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- artwork-size`
Expected: FAIL — `Cannot find module '../../lib/artwork-size'`

- [ ] **Step 3: 구현 작성** — `lib/artwork-size.ts`

```ts
/**
 * 작품 크기 도메인 로직 — 단일 출처.
 * cm 기반 파싱 + 호수(號) 근사 환산 + 구간 분류 + 표시 정보.
 *
 * 주의: lib/utils/parseArtworkSize.ts는 3D 가상 갤러리 전용(미터 단위, 실패 시 기본값).
 * 관심사가 달라 통합하지 않는다. 이 모듈은 cm·표시·분류 전담.
 */

export interface Dimensions {
  width: number;
  height: number;
  depth: number | null;
}

export type SizeBucket = 'small' | 'medium' | 'large' | 'xlarge' | 'object';

export interface SizeInfo {
  cm: string;
  ho: number | null;
  bucket: SizeBucket | null;
  is3d: boolean;
}

// 표준 호수표(F형 기준) 면적(cm²). cm→호 역환산용 최근접 매칭 기준.
const HO_TABLE: ReadonlyArray<{ ho: number; area: number }> = [
  { ho: 1, area: 359 },
  { ho: 2, area: 462 },
  { ho: 3, area: 601 },
  { ho: 4, area: 808 },
  { ho: 5, area: 950 },
  { ho: 6, area: 1301 },
  { ho: 8, area: 1724 },
  { ho: 10, area: 2412 },
  { ho: 12, area: 3030 },
  { ho: 15, area: 3450 },
  { ho: 20, area: 4406 },
  { ho: 25, area: 5236 },
  { ho: 30, area: 6608 },
  { ho: 40, area: 8030 },
  { ho: 50, area: 10629 },
  { ho: 60, area: 12639 },
  { ho: 80, area: 16311 },
  { ho: 100, area: 21135 },
  { ho: 120, area: 25265 },
  { ho: 150, area: 41323 },
  { ho: 200, area: 50239 },
  { ho: 300, area: 63474 },
  { ho: 500, area: 82825 },
];

// 종횡비 이 이상이면 호수 표기 부적합 → confident=false.
const HO_RATIO_MAX = 2.2;

// 구간 경계(면적 cm²) — 호수 통념 매핑. spec §4.4. 백필 SQL과 동일 유지.
const BUCKET_SMALL_MAX = 2412; // ~10호
const BUCKET_MEDIUM_MAX = 6608; // 10–30호
const BUCKET_LARGE_MAX = 21135; // 30–100호

const SIZE_RE = /^(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)(?:\s*[x×X]\s*(\d+(?:\.\d+)?))?\s*cm$/;

export function parseSizeText(raw: string | null | undefined): Dimensions | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const m = s.match(SIZE_RE);
  if (!m) return null;
  const width = parseFloat(m[1]);
  const height = parseFloat(m[2]);
  const depth = m[3] !== undefined ? parseFloat(m[3]) : null;
  if (!(width > 0) || !(height > 0)) return null;
  if (depth !== null && !(depth > 0)) return null;
  return { width, height, depth };
}

export function area(d: Pick<Dimensions, 'width' | 'height'>): number {
  return d.width * d.height;
}

export function estimateHo(
  d: Pick<Dimensions, 'width' | 'height'>
): { ho: number; confident: boolean } | null {
  const a = area(d);
  if (!(a > 0)) return null;
  let best = HO_TABLE[0];
  for (const row of HO_TABLE) {
    if (Math.abs(row.area - a) < Math.abs(best.area - a)) best = row;
  }
  const ratio = Math.max(d.width, d.height) / Math.min(d.width, d.height);
  return { ho: best.ho, confident: ratio <= HO_RATIO_MAX };
}

export function classifyBucket(d: Dimensions): SizeBucket {
  if (d.depth != null) return 'object';
  const a = area(d);
  if (a <= BUCKET_SMALL_MAX) return 'small';
  if (a <= BUCKET_MEDIUM_MAX) return 'medium';
  if (a <= BUCKET_LARGE_MAX) return 'large';
  return 'xlarge';
}

// 60.0 → "60", 72.70 → "72.7"
function fmt(n: number): string {
  return String(Number(n.toFixed(1)));
}

export function describeSize(input: {
  size: string;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
}): SizeInfo | null {
  let dims: Dimensions | null = null;
  if (input.width_cm != null && input.height_cm != null) {
    dims = { width: input.width_cm, height: input.height_cm, depth: input.depth_cm ?? null };
  } else {
    dims = parseSizeText(input.size);
  }
  if (!dims) return null;

  const is3d = dims.depth != null;
  const cm = is3d
    ? `${fmt(dims.width)}×${fmt(dims.height)}×${fmt(dims.depth as number)}cm`
    : `${fmt(dims.width)}×${fmt(dims.height)}cm`;
  const hoEst = is3d ? null : estimateHo(dims);
  const ho = hoEst && hoEst.confident ? hoEst.ho : null;
  const bucket = classifyBucket(dims);
  return { cm, ho, bucket, is3d };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- artwork-size`
Expected: PASS (모든 케이스)

- [ ] **Step 5: 커밋**

```bash
git add lib/artwork-size.ts __tests__/lib/artwork-size.test.ts
git commit -m "feat(artwork): 사이즈 도메인 로직 lib/artwork-size.ts 추가

요약: cm 파싱·호수 근사 환산·구간 분류 단일 출처 모듈 + 단위 테스트

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: DB 마이그레이션 (컬럼·인덱스·제약)

**Files:**

- Create: `supabase/migrations/<timestamp>_artwork_dimensions.sql`

- [ ] **Step 1: 마이그레이션 파일 작성** (파일명 timestamp는 `date +%Y%m%d%H%M%S`)

```sql
-- 작품 치수 구조화 컬럼. 기존 size text는 표시용 원본으로 유지.
alter table public.artworks
  add column if not exists width_cm  numeric(7,2),
  add column if not exists height_cm numeric(7,2),
  add column if not exists depth_cm  numeric(7,2),
  add column if not exists size_bucket text;

alter table public.artworks
  add constraint artworks_width_cm_positive  check (width_cm  is null or width_cm  > 0),
  add constraint artworks_height_cm_positive check (height_cm is null or height_cm > 0),
  add constraint artworks_depth_cm_positive  check (depth_cm  is null or depth_cm  > 0),
  add constraint artworks_size_bucket_valid  check (
    size_bucket is null or size_bucket in ('small','medium','large','xlarge','object')
  );

create index if not exists idx_artworks_size_bucket on public.artworks (size_bucket);
create index if not exists idx_artworks_dimensions  on public.artworks (width_cm, height_cm);
```

- [ ] **Step 2: 적용 전 사용자 확인** — 운영 DB DDL이므로 적용 직전 사용자에게 알림.

- [ ] **Step 3: MCP로 단건 적용**

`mcp__claude_ai_Supabase__apply_migration` (`project_id: khtunrybrzntlnowlahb`, `name: artwork_dimensions`, `query`: 위 SQL 본문)

- [ ] **Step 4: 적용 검증**

`execute_sql`: `select column_name, data_type from information_schema.columns where table_name='artworks' and column_name in ('width_cm','height_cm','depth_cm','size_bucket') order by column_name;`
Expected: 4행.

- [ ] **Step 5: 타입 재생성**

`mcp__claude_ai_Supabase__generate_typescript_types` → 결과로 `types/supabase.ts` 갱신(diff에 신규 컬럼 포함 확인).

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/ types/supabase.ts
git commit -m "feat(db): artworks 치수 컬럼(width/height/depth/bucket) 추가

요약: 작품 크기 구조화를 위한 numeric 컬럼·인덱스·CHECK 제약 마이그레이션

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 백필 (기존 572행)

**Files:**

- Create: `scripts/backfill-artwork-sizes.sql` (재현용 보존)

- [ ] **Step 1: dry-run 검증 쿼리** — `execute_sql`로 파싱 가능 건수 미리 확인

```sql
select
  count(*) filter (where size ~ '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?cm$') as cnt_2d,
  count(*) filter (where size ~ '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?cm$') as cnt_3d,
  count(*) filter (where size in ('확인 중','미정')) as cnt_placeholder,
  count(*) filter (where size !~ '^[0-9]+(\.[0-9]+)?(x[0-9]+(\.[0-9]+)?){1,2}cm$' and size not in ('확인 중','미정')) as cnt_unparseable
from artworks;
```

Expected: 대략 cnt_2d=540, cnt_3d=10, cnt_placeholder=20, cnt_unparseable=2.

- [ ] **Step 2: 백필 DML 작성** — `scripts/backfill-artwork-sizes.sql`

```sql
-- 2D: WxHcm
update artworks set
  width_cm  = split_part(regexp_replace(size,'cm$',''),'x',1)::numeric,
  height_cm = split_part(regexp_replace(size,'cm$',''),'x',2)::numeric,
  depth_cm  = null
where size ~ '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?cm$';

-- 3D: WxHxDcm
update artworks set
  width_cm  = split_part(regexp_replace(size,'cm$',''),'x',1)::numeric,
  height_cm = split_part(regexp_replace(size,'cm$',''),'x',2)::numeric,
  depth_cm  = split_part(regexp_replace(size,'cm$',''),'x',3)::numeric
where size ~ '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?cm$';

-- 구간 분류 (lib/artwork-size.ts 경계와 동일 유지)
update artworks set size_bucket = 'object' where depth_cm is not null;
update artworks set size_bucket = case
    when width_cm*height_cm <= 2412  then 'small'
    when width_cm*height_cm <= 6608  then 'medium'
    when width_cm*height_cm <= 21135 then 'large'
    else 'xlarge'
  end
where depth_cm is null and width_cm is not null;
```

- [ ] **Step 3: 적용 전 사용자 확인** — DML(운영 데이터 변경)이므로 적용 직전 알림.

- [ ] **Step 4: `execute_sql`로 백필 적용** (위 4개 UPDATE 순차)

- [ ] **Step 5: 백필 검증 + 오타 리포트**

```sql
select size_bucket, count(*) from artworks group by 1 order by 1;
-- 미파싱(오타) 잔존 확인: 채워지지 않은 비-placeholder
select id, size from artworks
where width_cm is null and size not in ('확인 중','미정');
```

Expected: bucket 분포가 small 366 / medium 136 / large 37 / object 10 / null 22(placeholder 20+오타 2). 오타 2건(`23.9x,35.2cm`, `24.918.5cm`) 목록 출력 → **사용자에게 보고**(자동 수정 안 함).

- [ ] **Step 6: 커밋**

```bash
git add scripts/backfill-artwork-sizes.sql
git commit -m "chore(db): 작품 치수 백필 SQL 추가 및 적용

요약: 기존 550개 작품의 width/height/depth/bucket 백필 (오타 2건 수동 교정 대상 리포트)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 데이터 fetch + 타입

**Files:**

- Modify: `types/index.ts:64-91` (`BaseArtwork`), `types/index.ts:183-201` (`ArtworkCardData`)
- Modify: `lib/supabase-data.ts:33-53` (`ArtworkRow`), `:109-118` (SELECT 상수), `:146-173` (`mapArtworkRow`)

- [ ] **Step 1: `BaseArtwork`에 치수 필드 추가** (`types/index.ts`, `size: string;` 다음 줄)

```ts
  size: string;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
  size_bucket?: string | null;
```

`ArtworkCardData`에도 동일 4필드(`size?: string;` 인접)를 optional로 추가.

- [ ] **Step 2: `ArtworkRow`에 컬럼 추가** (`lib/supabase-data.ts`, `size: string | null;` 다음)

```ts
width_cm: number | null;
height_cm: number | null;
depth_cm: number | null;
size_bucket: string | null;
```

- [ ] **Step 3: SELECT 상수에 컬럼 추가** — `ARTWORK_SELECT_COLUMNS`와 `LIGHT_ARTWORK_COLUMNS` 둘 다 끝에 `, width_cm, height_cm, depth_cm, size_bucket` 추가.

- [ ] **Step 4: `mapArtworkRow`에 매핑 추가** (`size:` 다음 줄)

```ts
  width_cm: item.width_cm,
  height_cm: item.height_cm,
  depth_cm: item.depth_cm,
  size_bucket: item.size_bucket,
```

- [ ] **Step 5: 타입체크**

Run: `npm run type-check`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add types/index.ts lib/supabase-data.ts
git commit -m "feat(artwork): 치수 컬럼을 fetch·타입에 연결

요약: BaseArtwork·ArtworkRow·SELECT·mapArtworkRow에 width/height/depth/bucket 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 공개 표시 (상세·카드) + i18n

**Files:**

- Modify: `messages/ko.json`·`messages/en.json` (`artworkCard` 네임스페이스)
- Modify: `app/[locale]/artworks/[id]/page.tsx:287` 및 크기 섹션(~571–590)
- Modify: `components/ui/ArtworkCard.tsx:360-375`, `components/features/ArtworkGridCard.tsx:156-169`, `components/features/ArtworkCategoryGrid.tsx:314-328`

- [ ] **Step 1: i18n 키 추가** — `messages/ko.json` `artworkCard`에 추가

```json
  "approxHo": "약 {n}호",
  "sizeBucketSmall": "소품",
  "sizeBucketMedium": "중형",
  "sizeBucketLarge": "대형",
  "sizeBucketXlarge": "특대",
  "sizeBucketObject": "입체"
```

`messages/en.json` `artworkCard`에 대응:

```json
  "approxHo": "Size {n}",
  "sizeBucketSmall": "Small",
  "sizeBucketMedium": "Medium",
  "sizeBucketLarge": "Large",
  "sizeBucketXlarge": "Extra large",
  "sizeBucketObject": "3D"
```

- [ ] **Step 2: 상세 페이지 크기 섹션에 호수·구간 표시** — `app/[locale]/artworks/[id]/page.tsx`

`localizeDataValue(artwork.size)` 유지(폴백). 상단에 추가:

```ts
import { describeSize } from '@/lib/artwork-size';
// ...
const sizeInfo = describeSize(artwork);
```

크기 값을 렌더하는 곳(현재 `localizedSize` 출력 위치)을 다음으로 교체 — `sizeInfo`가 있으면 `cm · 약 N호 · 구간`, 없으면 기존 `localizedSize`:

```tsx
{
  sizeInfo ? (
    <>
      {sizeInfo.cm}
      {sizeInfo.ho != null && ` · ${t('approxHo', { n: sizeInfo.ho })}`}
      {sizeInfo.bucket && ` · ${t(sizeBucketKey(sizeInfo.bucket))}`}
    </>
  ) : (
    localizedSize
  );
}
```

`sizeBucketKey`는 `page.tsx` 파일 내 로컬 헬퍼:

```ts
const sizeBucketKey = (b: string) =>
  ({
    small: 'sizeBucketSmall',
    medium: 'sizeBucketMedium',
    large: 'sizeBucketLarge',
    xlarge: 'sizeBucketXlarge',
    object: 'sizeBucketObject',
  })[b] ?? 'sizeBucketSmall';
```

(`t`가 `artworkCard` 네임스페이스를 가리키는지 확인 — 아니면 `useTranslations('artworkCard')` 인스턴스를 별도로 가져와 사용.)

- [ ] **Step 3: 카드 cm 표기 정규화** — 3개 카드 컴포넌트. `localizeDataValue(artwork.size)` 결과 대신 cm 표기를 `describeSize`로 통일(호수·구간은 카드 과밀 방지로 미표시):

각 파일에서:

```ts
import { describeSize } from '@/lib/artwork-size';
// localizedSize 정의 직후:
const sizeInfo = describeSize(artwork);
const displaySize = sizeInfo ? sizeInfo.cm : localizedSize;
```

그리고 size를 출력하는 `{showSize && localizedSize}` → `{showSize && displaySize}`로 교체.

- [ ] **Step 4: 타입체크 + 기존 테스트**

Run: `npm run type-check && npm test`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add messages/ app/[locale]/artworks/[id]/page.tsx components/ui/ArtworkCard.tsx components/features/ArtworkGridCard.tsx components/features/ArtworkCategoryGrid.tsx
git commit -m "feat(artwork): 작품 상세에 호수·크기 구간 표시, 카드 cm 표기 통일

요약: describeSize로 상세 페이지에 약 N호·구간 라벨 노출, 카드 cm 표기 정규화 (i18n)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Admin 폼 cm 3필드 + server action

**Files:**

- Modify: `app/(portal)/admin/artworks/artwork-edit-form.tsx:350-361`
- Modify: `app/actions/admin-artworks.ts:188-245` (`updateArtworkDetails`), `:297-345` (`createAdminArtwork`)

- [ ] **Step 1: 폼 입력을 cm 3필드로 교체** — `artwork-edit-form.tsx` 크기 블록을 다음으로:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">크기 (cm)</label>
  <div className="grid grid-cols-3 gap-2">
    <input
      id="width_cm"
      name="width_cm"
      type="number"
      step="0.1"
      min="0"
      defaultValue={artwork.width_cm ?? ''}
      placeholder="가로"
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    />
    <input
      id="height_cm"
      name="height_cm"
      type="number"
      step="0.1"
      min="0"
      defaultValue={artwork.height_cm ?? ''}
      placeholder="세로"
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    />
    <input
      id="depth_cm"
      name="depth_cm"
      type="number"
      step="0.1"
      min="0"
      defaultValue={artwork.depth_cm ?? ''}
      placeholder="깊이(3D만)"
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    />
  </div>
  <p className="text-xs text-gray-500 mt-1">
    비우면 "확인 중"으로 저장됩니다. 깊이는 입체 작품만 입력.
  </p>
</div>
```

- [ ] **Step 2: server action에 치수 처리 추가** — `admin-artworks.ts`. 파일 상단/헬퍼 구역에 합성 유틸 추가:

```ts
import { classifyBucket } from '@/lib/artwork-size';

function buildSizeFields(formData: FormData) {
  const num = (k: string) => {
    const v = (formData.get(k) as string | null)?.trim();
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const width_cm = num('width_cm');
  const height_cm = num('height_cm');
  const depth_cm = num('depth_cm');
  if (width_cm == null || height_cm == null) {
    return { size: '확인 중', width_cm: null, height_cm: null, depth_cm: null, size_bucket: null };
  }
  const size =
    depth_cm != null ? `${width_cm}x${height_cm}x${depth_cm}cm` : `${width_cm}x${height_cm}cm`;
  const size_bucket = classifyBucket({ width: width_cm, height: height_cm, depth: depth_cm });
  return { size, width_cm, height_cm, depth_cm, size_bucket };
}
```

`updateArtworkDetails`·`createAdminArtwork`에서 기존 `const size = getString(formData, 'size');`를 제거하고 `const sizeFields = buildSizeFields(formData);`로 교체. 두 함수의 update/insert payload에서 `size,`를 `...sizeFields,`로 교체(컬럼 4개 동시 기록). SELECT 상수에 `width_cm, height_cm, depth_cm, size_bucket` 포함.

- [ ] **Step 3: 타입체크**

Run: `npm run type-check`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add "app/(portal)/admin/artworks/artwork-edit-form.tsx" app/actions/admin-artworks.ts
git commit -m "feat(admin): 작품 크기 입력을 cm 3필드로 구조화

요약: 가로/세로/깊이 입력 → size 텍스트 자동 합성 + 치수·구간 컬럼 동시 저장 (오타 차단)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 갤러리 크기 필터·정렬

**Files:**

- Modify: `types/index.ts:292` (`SortOption`)
- Modify: `lib/hooks/useArtworkFilter.ts` (필터/정렬 상태·로직)
- Modify: `components/features/SortControls.tsx:17-52`
- Create: `components/features/SizeBucketFilter.tsx`
- Modify: `components/features/ArtworkGalleryWithSort.tsx` (필터 칩 배치)
- Modify: `messages/ko.json`·`en.json` (`sort`, `filters` 네임스페이스)

- [ ] **Step 1: `SortOption`에 크기순 추가** (`types/index.ts:292`)

```ts
export type SortOption =
  | 'artist-asc'
  | 'title-asc'
  | 'price-desc'
  | 'price-asc'
  | 'size-desc'
  | 'size-asc';
```

- [ ] **Step 2: i18n 키 추가** — `messages/ko.json` `sort`: `"sizeDesc": "크기 큰순", "sizeAsc": "크기 작은순"`. `filters`: `"sizeAll": "전체 크기", "sizeSmall": "소품", "sizeMedium": "중형", "sizeLarge": "대형", "sizeXlarge": "특대", "sizeObject": "입체"`. `en.json` 대응: `"Largest"`, `"Smallest"`, `"All sizes"`, `"Small"`, `"Medium"`, `"Large"`, `"Extra large"`, `"3D"`.

- [ ] **Step 3: `useArtworkFilter`에 sizeBucket 필터 + 크기 정렬** — 다음을 추가:

```ts
import { describeSize, area, parseSizeText } from '@/lib/artwork-size';

// 상태 (searchParams 동기화, 기존 패턴 따름)
const [sizeBucket, setSizeBucket] = useState<string | null>(
  searchParams.get('size_bucket') || null
);

// bucket 헬퍼 — DB 컬럼 우선, 없으면 계산
const bucketOf = (a: Artwork) => a.size_bucket ?? describeSize(a)?.bucket ?? null;
const areaOf = (a: Artwork) => {
  const d =
    a.width_cm != null && a.height_cm != null
      ? { width: a.width_cm, height: a.height_cm }
      : parseSizeText(a.size);
  return d ? area(d) : -1; // 미상은 정렬 최하
};
```

필터 적용부에 `if (sizeBucket) list = list.filter((a) => bucketOf(a) === sizeBucket);` 추가. 정렬 switch에 `case 'size-desc': return areaOf(b) - areaOf(a);` / `case 'size-asc': return areaOf(a) - areaOf(b);` 추가. 반환 객체에 `sizeBucket, setSizeBucket` 노출. searchParams 직렬화에 `size_bucket` 포함.

- [ ] **Step 4: `SortControls`에 옵션 2개 추가** — `sortOptions` 배열에:

```ts
{ value: 'size-desc', label: t('sizeDesc') },
{ value: 'size-asc', label: t('sizeAsc') },
```

- [ ] **Step 5: `SizeBucketFilter.tsx` 신규** — 0건 구간 동적 숨김 칩

```tsx
'use client';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

const BUCKETS = ['small', 'medium', 'large', 'xlarge', 'object'] as const;
const LABEL_KEY: Record<string, string> = {
  small: 'sizeSmall',
  medium: 'sizeMedium',
  large: 'sizeLarge',
  xlarge: 'sizeXlarge',
  object: 'sizeObject',
};

export default function SizeBucketFilter({
  available,
  value,
  onChange,
}: {
  available: Set<string>;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const t = useTranslations('filters');
  const visible = BUCKETS.filter((b) => available.has(b));
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('sizeAll')}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={clsx(
          'px-3 py-1 rounded-full text-sm border',
          value === null
            ? 'bg-primary-strong text-white border-primary-strong'
            : 'border-gray-300 text-charcoal'
        )}
      >
        {t('sizeAll')}
      </button>
      {visible.map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onChange(value === b ? null : b)}
          className={clsx(
            'px-3 py-1 rounded-full text-sm border',
            value === b
              ? 'bg-primary-strong text-white border-primary-strong'
              : 'border-gray-300 text-charcoal'
          )}
        >
          {t(LABEL_KEY[b])}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 갤러리에 필터 배치** — `ArtworkGalleryWithSort.tsx`에서 `available` 집계 후 `CategoryFilter` 인근에 렌더:

```tsx
import SizeBucketFilter from './SizeBucketFilter';
import { describeSize } from '@/lib/artwork-size';
// ...
const availableBuckets = useMemo(
  () =>
    new Set(
      artworks.map((a) => a.size_bucket ?? describeSize(a)?.bucket).filter(Boolean) as string[]
    ),
  [artworks]
);
// 데스크톱 필터 영역:
<SizeBucketFilter available={availableBuckets} value={sizeBucket} onChange={setSizeBucket} />;
```

(`sizeBucket`/`setSizeBucket`는 `useArtworkFilter`에서 구조분해.)

- [ ] **Step 7: 타입체크 + 빌드**

Run: `npm run type-check && npm run build`
Expected: 통과 (SSG 호환).

- [ ] **Step 8: 커밋**

```bash
git add types/index.ts lib/hooks/useArtworkFilter.ts components/features/SortControls.tsx components/features/SizeBucketFilter.tsx components/features/ArtworkGalleryWithSort.tsx messages/
git commit -m "feat(gallery): 크기 구간 필터 + 크기순 정렬 추가

요약: 호수 기반 소품/중형/대형/특대/입체 필터 칩(0건 동적 숨김)과 크기순 정렬, 클라이언트 훅 확장

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 최종 검증

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 신규 `artwork-size` 포함 전부 통과.

- [ ] **Step 2: 타입체크 + 린트**

Run: `npm run type-check && npm run lint`
Expected: 0 error.

- [ ] **Step 3: 프로덕션 빌드**

Run: `npm run build`
Expected: 성공 (SSG prerender 정상).

- [ ] **Step 4: e2e a11y (선택, 환경 가능 시)**

Run: `npx playwright test e2e/a11y/artworks.spec.ts`
Expected: 필터 칩 추가 후에도 위반 0.

- [ ] **Step 5: push**

```bash
git push origin main
```

---

## Self-Review 체크 (작성자 확인 완료)

- **Spec 커버리지**: §3 데이터모델→Task2, §4 도메인로직→Task1, §5 백필→Task3, §6 admin→Task6, §7 표시→Task5, §8 필터정렬→Task7, §9 연동→Task4/5, §10 테스트→Task1/8. 누락 없음.
- **타입 일관성**: `describeSize`/`classifyBucket`/`parseSizeText`/`area` 시그니처가 Task1 정의와 Task5~7 사용처에서 일치. `SizeBucket` 유니온 동일.
- **경계 중복 주의**: 구간 경계(2412/6608/21135)가 `lib/artwork-size.ts`와 백필 SQL 양쪽에 존재 — spec §3에 "코드가 단일 출처, SQL은 초기 적재용, 변경 시 재백필" 명시됨. 의도된 중복.
