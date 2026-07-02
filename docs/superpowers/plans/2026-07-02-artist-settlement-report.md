# 작가 정산 리포트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작가별·월별 정산 예정액(gross×50%)을 산출하고 지급 상태를 DB로 추적하는 관리자 리포트.

**Architecture:** 재무 계산은 `lib/settlements/compute.ts` 순수 함수로 분리해 mock 없이 단위 테스트. 서버 액션(`admin-settlements.ts`)은 fetch 후 순수 함수에 위임 + 지급 upsert/delete. `/admin/settlements` 페이지에서 월별 조회·지급 완료 처리·CSV. 지급 완료 시 gross/share를 `artist_settlements` 테이블에 스냅샷.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript strict, Supabase(PostgREST + RLS), Jest, Tailwind.

## Global Constraints

- 격리 worktree(`feat/admin-artist-settlements`)에서만 작업. main 작업 트리 미접촉(동시 세션 활동 중).
- **worktree 커밋은 `HUSKY=0 git commit --no-verify`** (worktree에 husky 생성물 부재로 훅 실패). 대신 각 태스크에서 `npm run type-check`·`npm run lint`·`npm run build`를 **수동 실행**해 lint-staged 공백을 메운다.
- 금액: **gross×50%만**(실비 미모델링). `share = Math.round(gross * 0.5)` 원 단위.
- 지급 완료 = `artist_settlements` 행 존재. gross/share는 지급 시점 스냅샷.
- 색상 토큰만(`primary-*`/`charcoal-*`/`gray-*`/`success-*`/`danger-*`). Tailwind 기본 팔레트·`slate-*` 금지.
- admin 포털은 비-i18n → 한국어 리터럴.
- `'use server'` 파일은 async 함수 export만(re-export barrel 금지).
- 비-void 매출만 집계(`voided_at is null`), `voided_at` 컬럼 부재 폴백은 `admin-artist-sales.ts` 패턴 참고.
- 커밋 컨벤션 `type(scope): subject` + `요약:` 본문 줄.
- 프로덕션 마이그레이션: pending 다수 시 `db push` 금지. 단건 `supabase db query --linked -f <파일>`. DDL은 사용자 컨펌 필수.

---

## Task 1: 마이그레이션 + 프로덕션 적용 + 타입 재생성 (컨트롤러 실행, 사용자 컨펌 게이트)

> **이 태스크는 서브에이전트가 아니라 컨트롤러가 직접 실행한다.** 프로덕션 DDL 적용 + `supabase` CLI 인증 + 사용자 컨펌이 필요하기 때문. 이후 Task 2~5는 재생성된 타입을 전제로 서브에이전트가 진행.

**Files:**
- Create: `supabase/migrations/20260702150000_create_artist_settlements.sql`
- Modify: `types/supabase.ts` (regen)

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260702150000_create_artist_settlements.sql`:

```sql
-- 작가 월별 정산 지급 기록. 행 존재 = 해당 (작가, 월) 지급 완료.
-- gross_amount/artist_share는 지급 시점 스냅샷(이후 매출 void에도 불변). email_logs RLS 패턴 미러.
create table if not exists public.artist_settlements (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  period_month  date not null,
  gross_amount  numeric not null,
  artist_share  numeric not null,
  paid_amount   numeric,
  paid_at       timestamptz not null default now(),
  note          text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create unique index if not exists artist_settlements_artist_month_uniq
  on public.artist_settlements (artist_id, period_month);
create index if not exists artist_settlements_period_idx
  on public.artist_settlements (period_month desc);

alter table public.artist_settlements enable row level security;

create policy "admins_can_view_artist_settlements" on public.artist_settlements
  for select using (get_my_role() = 'admin');

comment on table public.artist_settlements is '작가 월별 정산 지급 기록(gross 50% 스냅샷 + 실지급액)';
```

- [ ] **Step 2: pending 마이그레이션 확인 (blast-radius)**

Run: `supabase migration list --linked`
Expected: 이 파일 외 pending이 없는지 확인. 다수면 `db push` 금지 — 단건 적용으로.

- [ ] **Step 3: 사용자 컨펌 후 프로덕션 적용**

사용자에게 DDL 적용 컨펌을 받는다. 승인 시 단건 적용:
Run: `supabase db query --linked -f supabase/migrations/20260702150000_create_artist_settlements.sql`
Expected: 성공(테이블·인덱스·정책 생성). 멱등(`if not exists`)이라 재실행 안전.

- [ ] **Step 4: 적용 검증**

Run: `supabase db query --linked "select count(*) from public.artist_settlements"`
Expected: `0` (빈 테이블 조회 성공 = 존재 확인).

- [ ] **Step 5: 타입 재생성**

Run: `supabase gen types typescript --linked > types/supabase.ts`
Expected: `types/supabase.ts`에 `artist_settlements` 테이블 타입 포함. `git diff types/supabase.ts`로 확인.

- [ ] **Step 6: 커밋**

```bash
HUSKY=0 git add supabase/migrations/20260702150000_create_artist_settlements.sql types/supabase.ts
HUSKY=0 git commit --no-verify -m "feat(admin): artist_settlements 테이블 + 타입 (정산 리포트)

요약: 작가 월별 정산 지급 기록 테이블 신설(gross 50% 스냅샷·실지급액·RLS)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 순수 정산 계산 로직 `lib/settlements/compute.ts` (TDD)

**Files:**
- Create: `lib/settlements/compute.ts`
- Test: `__tests__/lib/settlements/compute.test.ts`

**Interfaces:**
- Produces:
  - `type SaleRowLite = { sale_price: number; quantity: number; sold_at: string; artist_id: string | null; artist_name: string | null }`
  - `type PaidRow = { artist_id: string; period_month: string; gross_amount: number; artist_share: number; paid_amount: number | null; paid_at: string; note: string | null }`
  - `type SettlementRow = { artistId: string | null; artistName: string; soldCount: number; gross: number; share: number; status: 'paid' | 'pending'; paidAmount: number | null; paidAt: string | null; note: string | null; payable: boolean }`
  - `type MonthlySettlements = { month: string; availableMonths: string[]; rows: SettlementRow[]; totals: { gross: number; share: number; paidCount: number; artistCount: number } }`
  - `soldAtToKstMonth(iso: string): string` → `'YYYY-MM'`
  - `kstMonthRange(month: string): { startIso: string; endIso: string }`
  - `computeMonthlySettlements(sales: SaleRowLite[], paid: PaidRow[], month: string, availableMonths: string[]): MonthlySettlements`

- [ ] **Step 1: 실패 테스트 작성**

`__tests__/lib/settlements/compute.test.ts`:

```typescript
import {
  soldAtToKstMonth,
  kstMonthRange,
  computeMonthlySettlements,
  type SaleRowLite,
  type PaidRow,
} from '@/lib/settlements/compute';

describe('soldAtToKstMonth', () => {
  it('UTC 시각을 KST 달로 변환한다 (월말 경계)', () => {
    // 2026-05-31T15:30:00Z = KST 2026-06-01 00:30 → 6월
    expect(soldAtToKstMonth('2026-05-31T15:30:00Z')).toBe('2026-06');
    // 2026-06-30T14:00:00Z = KST 2026-06-30 23:00 → 6월
    expect(soldAtToKstMonth('2026-06-30T14:00:00Z')).toBe('2026-06');
  });
});

describe('kstMonthRange', () => {
  it('KST 월 경계를 +09:00 offset ISO로 만든다', () => {
    const { startIso, endIso } = kstMonthRange('2026-06');
    expect(startIso).toBe('2026-06-01T00:00:00+09:00');
    expect(endIso).toBe('2026-07-01T00:00:00+09:00');
  });
  it('12월은 다음 해 1월로 넘어간다', () => {
    expect(kstMonthRange('2026-12').endIso).toBe('2027-01-01T00:00:00+09:00');
  });
});

describe('computeMonthlySettlements', () => {
  const sales: SaleRowLite[] = [
    { sale_price: 1000000, quantity: 1, sold_at: '2026-06-10T02:00:00Z', artist_id: 'a1', artist_name: '김작가' },
    { sale_price: 500000, quantity: 2, sold_at: '2026-06-20T02:00:00Z', artist_id: 'a1', artist_name: '김작가' },
    { sale_price: 300000, quantity: 1, sold_at: '2026-06-15T02:00:00Z', artist_id: null, artist_name: null },
  ];

  it('작가별 gross 합계와 50% share를 계산한다', () => {
    const result = computeMonthlySettlements(sales, [], '2026-06', ['2026-06']);
    const a1 = result.rows.find((r) => r.artistId === 'a1')!;
    expect(a1.gross).toBe(2000000); // 1,000,000 + 500,000×2
    expect(a1.share).toBe(1000000);
    expect(a1.soldCount).toBe(3);
    expect(a1.status).toBe('pending');
    expect(a1.payable).toBe(true);
  });

  it('artist_id null은 작가 미지정 버킷으로, payable=false', () => {
    const result = computeMonthlySettlements(sales, [], '2026-06', ['2026-06']);
    const none = result.rows.find((r) => r.artistId === null)!;
    expect(none.artistName).toBe('작가 미지정');
    expect(none.payable).toBe(false);
    expect(none.gross).toBe(300000);
  });

  it('지급 완료 행이 있으면 status=paid + 스냅샷 값을 쓴다', () => {
    const paid: PaidRow[] = [
      {
        artist_id: 'a1',
        period_month: '2026-06-01',
        gross_amount: 1800000,
        artist_share: 900000,
        paid_amount: 850000,
        paid_at: '2026-07-10T00:00:00Z',
        note: '수수료 차감',
      },
    ];
    const result = computeMonthlySettlements(sales, paid, '2026-06', ['2026-06']);
    const a1 = result.rows.find((r) => r.artistId === 'a1')!;
    expect(a1.status).toBe('paid');
    expect(a1.gross).toBe(1800000); // 스냅샷 우선(실시간 2,000,000 아님)
    expect(a1.share).toBe(900000);
    expect(a1.paidAmount).toBe(850000);
    expect(a1.note).toBe('수수료 차감');
  });

  it('totals와 availableMonths를 채운다', () => {
    const result = computeMonthlySettlements(sales, [], '2026-06', ['2026-06', '2026-05']);
    expect(result.month).toBe('2026-06');
    expect(result.availableMonths).toEqual(['2026-06', '2026-05']);
    expect(result.totals.gross).toBe(2300000);
    expect(result.totals.artistCount).toBe(2);
    expect(result.totals.paidCount).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- __tests__/lib/settlements/compute.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`lib/settlements/compute.ts`:

```typescript
export type SaleRowLite = {
  sale_price: number;
  quantity: number;
  sold_at: string;
  artist_id: string | null;
  artist_name: string | null;
};

export type PaidRow = {
  artist_id: string;
  period_month: string; // 'YYYY-MM-DD' (월 1일)
  gross_amount: number;
  artist_share: number;
  paid_amount: number | null;
  paid_at: string;
  note: string | null;
};

export type SettlementRow = {
  artistId: string | null;
  artistName: string;
  soldCount: number;
  gross: number;
  share: number;
  status: 'paid' | 'pending';
  paidAmount: number | null;
  paidAt: string | null;
  note: string | null;
  payable: boolean;
};

export type MonthlySettlements = {
  month: string;
  availableMonths: string[];
  rows: SettlementRow[];
  totals: { gross: number; share: number; paidCount: number; artistCount: number };
};

const UNASSIGNED = '작가 미지정';

/** timestamptz ISO를 KST(Asia/Seoul) 'YYYY-MM'으로. */
export function soldAtToKstMonth(iso: string): string {
  // en-CA + timeZone은 'YYYY-MM-DD' → 앞 7자리가 'YYYY-MM'
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return formatted.slice(0, 7);
}

/** 'YYYY-MM' → KST 월 경계(+09:00 offset ISO). Postgres timestamptz 비교용. */
export function kstMonthRange(month: string): { startIso: string; endIso: string } {
  const [y, m] = month.split('-').map(Number);
  const startIso = `${month}-01T00:00:00+09:00`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endIso = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00+09:00`;
  return { startIso, endIso };
}

export function roundShare(gross: number): number {
  return Math.round(gross * 0.5);
}

export function computeMonthlySettlements(
  sales: SaleRowLite[],
  paid: PaidRow[],
  month: string,
  availableMonths: string[]
): MonthlySettlements {
  // 지급 완료 행을 artist_id로 인덱싱(해당 월 것만 넘어온다고 가정 — 서버가 필터).
  const paidByArtist = new Map<string, PaidRow>();
  for (const p of paid) paidByArtist.set(p.artist_id, p);

  type Agg = { artistId: string | null; artistName: string; gross: number; soldCount: number };
  const map = new Map<string, Agg>();
  for (const s of sales) {
    const key = s.artist_id || `unassigned`;
    const name = s.artist_id ? s.artist_name || UNASSIGNED : UNASSIGNED;
    const existing = map.get(key);
    const amount = s.sale_price * s.quantity;
    if (existing) {
      existing.gross += amount;
      existing.soldCount += s.quantity;
    } else {
      map.set(key, {
        artistId: s.artist_id,
        artistName: name,
        gross: amount,
        soldCount: s.quantity,
      });
    }
  }

  const rows: SettlementRow[] = Array.from(map.values()).map((agg) => {
    const paidRow = agg.artistId ? paidByArtist.get(agg.artistId) : undefined;
    if (paidRow) {
      return {
        artistId: agg.artistId,
        artistName: agg.artistName,
        soldCount: agg.soldCount,
        gross: paidRow.gross_amount, // 스냅샷 우선
        share: paidRow.artist_share,
        status: 'paid',
        paidAmount: paidRow.paid_amount,
        paidAt: paidRow.paid_at,
        note: paidRow.note,
        payable: agg.artistId != null,
      };
    }
    return {
      artistId: agg.artistId,
      artistName: agg.artistName,
      soldCount: agg.soldCount,
      gross: agg.gross,
      share: roundShare(agg.gross),
      status: 'pending',
      paidAmount: null,
      paidAt: null,
      note: null,
      payable: agg.artistId != null,
    };
  });

  rows.sort((a, b) => b.gross - a.gross);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.gross;
      acc.share += r.share;
      if (r.status === 'paid') acc.paidCount += 1;
      return acc;
    },
    { gross: 0, share: 0, paidCount: 0, artistCount: rows.length }
  );

  return { month, availableMonths, rows, totals };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- __tests__/lib/settlements/compute.test.ts`
Expected: PASS (전체).

- [ ] **Step 5: type-check**

Run: `npm run type-check`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
HUSKY=0 git add lib/settlements/compute.ts __tests__/lib/settlements/compute.test.ts
HUSKY=0 git commit --no-verify -m "feat(admin): 정산 계산 순수 로직 + 단위 테스트

요약: 작가별 월별 gross 집계·50% share·스냅샷 병합 순수 함수(mock 없는 TDD)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 서버 액션 `app/actions/admin-settlements.ts`

**Files:**
- Create: `app/actions/admin-settlements.ts`

**Interfaces:**
- Consumes: `computeMonthlySettlements`, `kstMonthRange`, `soldAtToKstMonth`, `roundShare`, 타입들 (Task 2), `requireAdmin`/`requireAdminClient`(`@/lib/auth/guards`), `fetchAllInBatches`(`@/lib/utils/supabase-batch`), `logAdminAction`(`@/app/actions/activity-log-writer`).
- Produces:
  - `getMonthlySettlements(month?: string): Promise<MonthlySettlements>`
  - `markSettlementPaid(artistId: string, month: string, paidAmount: number | null, note: string | null): Promise<{ success: true } | { error: string }>`
  - `unmarkSettlementPaid(artistId: string, month: string): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: 구현**

`app/actions/admin-settlements.ts`:

```typescript
'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { logAdminAction } from './activity-log-writer';
import {
  computeMonthlySettlements,
  kstMonthRange,
  soldAtToKstMonth,
  roundShare,
  type SaleRowLite,
  type PaidRow,
  type MonthlySettlements,
} from '@/lib/settlements/compute';

type RawSaleRow = {
  sale_price: number;
  quantity: number;
  sold_at: string;
  artworks: {
    artist_id: string | null;
    artists: { name_ko: string | null } | Array<{ name_ko: string | null }> | null;
  } | null;
};

function extractArtistName(
  artists: { name_ko: string | null } | Array<{ name_ko: string | null }> | null
): string | null {
  if (!artists) return null;
  const first = Array.isArray(artists) ? artists[0] : artists;
  return first?.name_ko ?? null;
}

export async function getMonthlySettlements(month?: string): Promise<MonthlySettlements> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  // 1) 전체 비-void 매출의 sold_at으로 availableMonths 산출.
  const { data: allSoldRows } = await fetchAllInBatches<{ sold_at: string }>((from, to) =>
    supabase
      .from('artwork_sales')
      .select('sold_at')
      .is('voided_at', null)
      .order('sold_at', { ascending: false })
      .range(from, to)
  );
  const monthSet = new Set<string>();
  for (const r of allSoldRows) monthSet.add(soldAtToKstMonth(r.sold_at));
  const availableMonths = Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1));

  const targetMonth = month && monthSet.has(month) ? month : (availableMonths[0] ?? month ?? '');
  if (!targetMonth) {
    return { month: '', availableMonths, rows: [], totals: { gross: 0, share: 0, paidCount: 0, artistCount: 0 } };
  }

  // 2) 해당 월 매출.
  const { startIso, endIso } = kstMonthRange(targetMonth);
  const { data: rawSales } = await fetchAllInBatches<RawSaleRow>((from, to) =>
    supabase
      .from('artwork_sales')
      .select('sale_price, quantity, sold_at, artworks(artist_id, artists(name_ko))')
      .is('voided_at', null)
      .gte('sold_at', startIso)
      .lt('sold_at', endIso)
      .order('sold_at', { ascending: true })
      .range(from, to)
  );
  const sales: SaleRowLite[] = rawSales.map((r) => ({
    sale_price: r.sale_price,
    quantity: r.quantity,
    sold_at: r.sold_at,
    artist_id: r.artworks?.artist_id ?? null,
    artist_name: extractArtistName(r.artworks?.artists ?? null),
  }));

  // 3) 해당 월 지급 완료 행.
  const periodMonth = `${targetMonth}-01`;
  const { data: paidRows } = await supabase
    .from('artist_settlements')
    .select('artist_id, period_month, gross_amount, artist_share, paid_amount, paid_at, note')
    .eq('period_month', periodMonth);

  const paid: PaidRow[] = (paidRows ?? []).map((p) => ({
    artist_id: p.artist_id,
    period_month: p.period_month,
    gross_amount: Number(p.gross_amount),
    artist_share: Number(p.artist_share),
    paid_amount: p.paid_amount == null ? null : Number(p.paid_amount),
    paid_at: p.paid_at,
    note: p.note,
  }));

  return computeMonthlySettlements(sales, paid, targetMonth, availableMonths);
}

/** 해당 월 매출을 재집계해 gross/share 스냅샷을 만든 뒤 지급 완료 upsert. */
export async function markSettlementPaid(
  artistId: string,
  month: string,
  paidAmount: number | null,
  note: string | null
): Promise<{ success: true } | { error: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { startIso, endIso } = kstMonthRange(month);
  const { data: rawSales } = await fetchAllInBatches<{ sale_price: number; quantity: number; artworks: { artist_id: string | null } | null }>(
    (from, to) =>
      supabase
        .from('artwork_sales')
        .select('sale_price, quantity, artworks(artist_id)')
        .is('voided_at', null)
        .gte('sold_at', startIso)
        .lt('sold_at', endIso)
        .range(from, to)
  );
  const gross = rawSales
    .filter((r) => r.artworks?.artist_id === artistId)
    .reduce((sum, r) => sum + r.sale_price * r.quantity, 0);

  if (gross <= 0) {
    return { error: '해당 월에 이 작가의 매출이 없어 정산할 수 없습니다.' };
  }
  const share = roundShare(gross);
  const periodMonth = `${month}-01`;

  const { error } = await supabase.from('artist_settlements').upsert(
    {
      artist_id: artistId,
      period_month: periodMonth,
      gross_amount: gross,
      artist_share: share,
      paid_amount: paidAmount,
      note,
      created_by: admin.id,
    },
    { onConflict: 'artist_id,period_month' }
  );
  if (error) {
    console.error('[markSettlementPaid] upsert failed:', error.message);
    return { error: '정산 기록 저장에 실패했습니다.' };
  }

  await logAdminAction(
    'artist_settlement_paid',
    'artist',
    artistId,
    { period_month: periodMonth, gross, share, paid_amount: paidAmount },
    admin.id,
    { summary: `정산 지급 완료: ${month} (₩${share.toLocaleString('ko-KR')})`, reversible: true }
  );
  return { success: true };
}

export async function unmarkSettlementPaid(
  artistId: string,
  month: string
): Promise<{ success: true } | { error: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const periodMonth = `${month}-01`;

  const { error } = await supabase
    .from('artist_settlements')
    .delete()
    .eq('artist_id', artistId)
    .eq('period_month', periodMonth);
  if (error) {
    console.error('[unmarkSettlementPaid] delete failed:', error.message);
    return { error: '정산 기록 취소에 실패했습니다.' };
  }

  await logAdminAction(
    'artist_settlement_unpaid',
    'artist',
    artistId,
    { period_month: periodMonth },
    admin.id,
    { summary: `정산 지급 취소: ${month}`, reversible: true }
  );
  return { success: true };
}
```

- [ ] **Step 2: type-check**

Run: `npm run type-check`
Expected: 에러 없음. (`artist_settlements` 타입은 Task 1에서 재생성돼 존재. 없으면 Task 1 미완 — 중단하고 보고)

- [ ] **Step 3: lint**

Run: `npx eslint app/actions/admin-settlements.ts`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
HUSKY=0 git add app/actions/admin-settlements.ts
HUSKY=0 git commit --no-verify -m "feat(admin): 정산 조회·지급 처리 서버 액션

요약: getMonthlySettlements(월별 집계)·markSettlementPaid(스냅샷 upsert)·unmarkSettlementPaid

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **검증 노트:** 서버 액션은 테스트된 순수 함수(Task 2)에 위임 + 얇은 upsert/delete라 별도 jest 하네스 대신 type-check/lint/build로 검증(admin-orders 등 기존 액션과 동일 관례).

---

## Task 4: UI — 페이지 + 클라이언트 리스트 + nav

**Files:**
- Create: `app/(portal)/admin/settlements/page.tsx`
- Create: `app/(portal)/admin/settlements/settlement-list.tsx`
- Modify: `app/(portal)/admin/_components/admin-nav-items.ts`

**Interfaces:**
- Consumes: `getMonthlySettlements`·`markSettlementPaid`·`unmarkSettlementPaid`·`MonthlySettlements`·`SettlementRow` (Task 2/3), `AdminPageHeader`/`AdminPageTitle`/`AdminPageDescription`/`AdminCard`/`AdminCardHeader`/`AdminSelect`/`AdminBadge`/`AdminEmptyState`(`@/app/admin/_components/admin-ui`), `AdminConfirmModal`(`@/app/(portal)/admin/_components/AdminConfirmModal`), `useToast`(`@/lib/hooks/useToast`).

- [ ] **Step 1: 서버 페이지**

`app/(portal)/admin/settlements/page.tsx`:

```tsx
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { getMonthlySettlements } from '@/app/actions/admin-settlements';
import { SettlementList } from './settlement-list';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ month?: string }> };

export default async function AdminSettlementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getMonthlySettlements(params.month);

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>정산 관리</AdminPageTitle>
        <AdminPageDescription>
          작가별·월별 정산 예정액(판매액의 50%)을 확인하고 지급 완료를 기록합니다.
        </AdminPageDescription>
      </AdminPageHeader>
      <SettlementList data={data} />
    </div>
  );
}
```

- [ ] **Step 2: 클라이언트 리스트 + 지급 모달**

`app/(portal)/admin/settlements/settlement-list.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminCard,
  AdminCardHeader,
  AdminSelect,
  AdminBadge,
  AdminEmptyState,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import {
  markSettlementPaid,
  unmarkSettlementPaid,
} from '@/app/actions/admin-settlements';
import type { MonthlySettlements, SettlementRow } from '@/lib/settlements/compute';

function formatKRW(amount: number) {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function SettlementList({ data }: { data: MonthlySettlements }) {
  const router = useRouter();
  const toast = useToast();
  const [payTarget, setPayTarget] = useState<SettlementRow | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isPending, startTransition] = useTransition();

  function onMonthChange(month: string) {
    router.push(`/admin/settlements?month=${encodeURIComponent(month)}`);
  }

  function openPay(row: SettlementRow) {
    setPayTarget(row);
    setPaidAmountInput(String(row.share));
    setNoteInput('');
  }

  function handleMarkPaid() {
    if (!payTarget || payTarget.artistId == null) return;
    const artistId = payTarget.artistId;
    const parsed = paidAmountInput.trim() === '' ? null : Number(paidAmountInput.replace(/,/g, ''));
    if (parsed != null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.error('실지급액은 0 이상의 숫자여야 합니다.');
      return;
    }
    startTransition(async () => {
      const res = await markSettlementPaid(artistId, data.month, parsed, noteInput.trim() || null);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success('지급 완료로 기록했습니다.');
      setPayTarget(null);
      router.refresh();
    });
  }

  function handleUnmark(row: SettlementRow) {
    if (row.artistId == null) return;
    const artistId = row.artistId;
    startTransition(async () => {
      const res = await unmarkSettlementPaid(artistId, data.month);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success('지급 기록을 취소했습니다.');
      router.refresh();
    });
  }

  return (
    <AdminCard>
      <AdminCardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminSelect
            value={data.month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full sm:w-48"
          >
            {data.availableMonths.length === 0 && <option value="">데이터 없음</option>}
            {data.availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </AdminSelect>
          <p className="text-sm text-gray-500">
            판매액 {formatKRW(data.totals.gross)} · 정산예정 {formatKRW(data.totals.share)} · 지급완료{' '}
            {data.totals.paidCount}/{data.totals.artistCount}
          </p>
        </div>
      </AdminCardHeader>

      <div className="border-b border-[var(--admin-border-soft)] bg-charcoal-deep/5 px-4 py-3 text-xs text-charcoal-muted">
        표시 금액은 실비(결제수수료·배송비·포장비) 공제 전 <strong>판매액의 50%</strong> 기준입니다. 실지급 시 실비
        차감 후 실지급액과 메모를 기록하세요.
      </div>

      {data.rows.length === 0 ? (
        <AdminEmptyState title="매출 없음" description="이 달에는 정산할 매출이 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border-soft)] text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">작가</th>
                <th className="px-4 py-3 text-right">판매건수</th>
                <th className="px-4 py-3 text-right">판매액</th>
                <th className="px-4 py-3 text-right">정산예정(50%)</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3 text-right">실지급액</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-soft)]">
              {data.rows.map((row) => (
                <tr key={row.artistId ?? 'unassigned'} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{row.artistName}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.soldCount}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{formatKRW(row.gross)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatKRW(row.share)}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={row.status === 'paid' ? 'success' : 'default'}>
                      {row.status === 'paid' ? '지급완료' : '미지급'}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.paidAmount != null ? formatKRW(row.paidAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!row.payable ? (
                      <span className="text-xs text-gray-400">지급 불가</span>
                    ) : row.status === 'paid' ? (
                      <button
                        type="button"
                        onClick={() => handleUnmark(row)}
                        disabled={isPending}
                        className="text-xs text-charcoal-muted hover:underline disabled:opacity-50"
                      >
                        지급 취소
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPay(row)}
                        disabled={isPending}
                        className="whitespace-nowrap rounded-md bg-primary-strong px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-strong/90 disabled:opacity-50"
                      >
                        지급 완료 처리
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmModal
        isOpen={payTarget !== null}
        onClose={() => setPayTarget(null)}
        onConfirm={handleMarkPaid}
        title="정산 지급 완료 처리"
        description={
          payTarget
            ? `${payTarget.artistName} · ${data.month} · 정산예정 ${formatKRW(payTarget.share)}. 실비 차감 후 실지급액과 메모를 입력하세요.`
            : ''
        }
        confirmText="지급 완료"
        variant="info"
        isLoading={isPending}
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">실지급액 (원)</span>
            <input
              type="text"
              inputMode="numeric"
              value={paidAmountInput}
              onChange={(e) => setPaidAmountInput(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">메모 (실비 내역·계좌 등)</span>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </AdminConfirmModal>
    </AdminCard>
  );
}
```

- [ ] **Step 3: nav 항목 추가**

`app/(portal)/admin/_components/admin-nav-items.ts`에서 ko 블록의 `{ href: '/admin/artist-sales', label: '작가별 판매' }` 다음 줄에 추가:

```typescript
        { href: '/admin/settlements', label: '정산 관리' },
```

en 블록의 `{ href: '/admin/artist-sales', label: 'Artist Sales' }` 다음 줄에 추가:

```typescript
        { href: '/admin/settlements', label: 'Settlements' },
```

- [ ] **Step 4: type-check + lint + build**

Run: `npm run type-check && npx eslint "app/(portal)/admin/settlements/page.tsx" "app/(portal)/admin/settlements/settlement-list.tsx" "app/(portal)/admin/_components/admin-nav-items.ts" && npm run build`
Expected: 전부 통과. (`AdminSelect`/`AdminBadge`/`AdminEmptyState` prop이 admin-ui export와 맞는지 확인 — 안 맞으면 실제 시그니처로 정정)

- [ ] **Step 5: 커밋**

```bash
HUSKY=0 git add "app/(portal)/admin/settlements/page.tsx" "app/(portal)/admin/settlements/settlement-list.tsx" "app/(portal)/admin/_components/admin-nav-items.ts"
HUSKY=0 git commit --no-verify -m "feat(admin): 정산 관리 페이지 + 지급 처리 UI + nav

요약: /admin/settlements 월별 정산 리포트·지급 완료 모달·실비 공제 전 안내 배너·nav 항목

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **검증 노트:** UI 배선 태스크라 jest 대신 type-check/lint/build로 검증(묶음 A UI 태스크와 동일). 실제 화면은 사용자 확인.

---

## Task 5: CSV export route

**Files:**
- Create: `app/(portal)/admin/settlements/export/route.ts`

**Interfaces:**
- Consumes: `getMonthlySettlements`(Task 3), `csvSafeCell`(`@/lib/utils/csv`), `logAdminAction`. (auth 가드는 `getMonthlySettlements` 내부 `requireAdmin`으로 이미 강제되나, route 자체도 admin 확인 — orders/export 패턴 미러.)

- [ ] **Step 1: 구현**

`app/(portal)/admin/settlements/export/route.ts` — orders/export 패턴 미러, 데이터는 `getMonthlySettlements` 재사용:

```typescript
import { logAdminAction } from '@/app/actions/activity-log-writer';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { csvSafeCell } from '@/lib/utils/csv';
import { getMonthlySettlements } from '@/app/actions/admin-settlements';

function getKstDateToken() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(request: Request) {
  if (request.headers.get('next-router-prefetch') === '1') {
    return new Response(null, { status: 204 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return new Response('Unauthorized', { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return new Response('Failed to verify role', { status: 500 });
  if (!profile || profile.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? undefined;
  const data = await getMonthlySettlements(month);

  const header = [
    '작가',
    '판매건수',
    '판매액',
    '정산예정액(50%)',
    '지급상태',
    '실지급액',
    '지급일',
    '메모',
  ];
  const rows = data.rows.map((r) => [
    r.artistName,
    r.soldCount,
    r.gross,
    r.share,
    r.status === 'paid' ? '지급완료' : '미지급',
    r.paidAmount ?? '',
    r.paidAt ? r.paidAt.slice(0, 10) : '',
    r.note ?? '',
  ]);

  const csvBody =
    '﻿' +
    [header, ...rows].map((row) => row.map((cell) => csvSafeCell(cell)).join(',')).join('\r\n');

  try {
    await logAdminAction(
      'artist_settlements_exported',
      'artist',
      'all',
      { month: data.month, total_count: rows.length },
      user.id,
      { summary: `정산 리포트 다운로드 ${data.month} (${rows.length}건)`, reversible: false }
    );
  } catch (error) {
    console.error('Failed to log settlements export:', error);
  }

  const fileName = `settlements-${data.month || 'none'}-${getKstDateToken()}.csv`;
  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
```

- [ ] **Step 2: export 버튼을 settlement-list에 추가**

`settlement-list.tsx`의 `AdminCardHeader` 내 월 셀렉트/합계 줄에 다운로드 링크를 추가한다. `data.month`가 있을 때만 노출. 헤더의 `<p className="text-sm text-gray-500">...합계...</p>` 옆(같은 flex row)에 배치:

```tsx
          {data.month && (
            <a
              href={`/admin/settlements/export?month=${encodeURIComponent(data.month)}`}
              className="whitespace-nowrap rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-gray-50"
            >
              CSV 다운로드
            </a>
          )}
```

- [ ] **Step 3: type-check + lint + build**

Run: `npm run type-check && npx eslint "app/(portal)/admin/settlements/export/route.ts" "app/(portal)/admin/settlements/settlement-list.tsx" && npm run build`
Expected: 전부 통과.

- [ ] **Step 4: 커밋**

```bash
HUSKY=0 git add "app/(portal)/admin/settlements/export/route.ts" "app/(portal)/admin/settlements/settlement-list.tsx"
HUSKY=0 git commit --no-verify -m "feat(admin): 정산 리포트 CSV export

요약: /admin/settlements/export 월별 정산 CSV(작가·판매액·정산예정·지급상태·실지급액·메모)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 최종 검증 (전 태스크 완료 후)

- [ ] `npm test` 전체 그린
- [ ] `npm run type-check` 클린
- [ ] `npm run lint` 클린
- [ ] `npm run build` 성공(SSG + i18n placeholder)
- [ ] 프로덕션 `artist_settlements` 테이블 존재 확인(`supabase db query --linked "select count(*) from artist_settlements"`)
- [ ] 사용자 시각 확인: 월 선택·지급 완료 모달·CSV 다운로드·nav 항목

## Self-Review 결과 (spec 대비)

- **DB 테이블**(Task 1)·**집계 로직**(Task 2)·**서버 액션**(Task 3)·**UI**(Task 4)·**CSV**(Task 5) 스펙 전 컴포넌트 커버.
- gross×50%·스냅샷·void 제외·null artist 버킷·월 그룹핑 — Task 2 순수 함수 + 테스트로 고정.
- 지급 상태 DB·실지급액·메모 — Task 1 스키마 + Task 3 upsert/delete로 커버.
- 실비 미모델링(수기) — 배너(Task 4) + paidAmount/note 입력으로 반영.
- Placeholder 없음. 타입 일관성: `SettlementRow`/`MonthlySettlements`/`PaidRow` 명칭이 Task 2 정의 ↔ Task 3/4/5 소비 일치. `markSettlementPaid`/`unmarkSettlementPaid`/`getMonthlySettlements` 시그니처 일관.
- 미커버 위험: `admin-ui`의 `AdminSelect`/`AdminBadge`/`AdminEmptyState` 실제 prop 시그니처는 Task 4 구현 시 확인(불일치 시 정정). `AdminBadge` tone 값('success'|'default')이 실제 지원 tone과 맞는지 확인.
