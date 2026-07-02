# 작가 정산 리포트 (Spec C2) 설계

날짜: 2026-07-02
작업 브랜치: `feat/admin-artist-settlements` (main에서 분기, 격리 worktree에서 작업)

## 배경

관리자 UX 분석 #7의 두 조각 중 C2. 작가 약관(`lib/legal-documents.ts`)상 정산 모델이 실재한다:

- 작품 판매 대금 **출품 작가 50% / 씨앗페 50%** 분배
- **실비(결제수수료·배송비·포장비) 공제 후** 정산
- **매월 말일 기준, 익월 15일 이내** 정산 내역 제공 + 대금 지급

현재 상태:

- `artwork_sales`에 gross(sale_price·quantity·sold_at·artist·`voided_at`)는 있으나 **실비 컬럼 없음**(payments에 fee 없음, 포장비 미추적)
- **정산 계좌번호가 구조화 컬럼으로 없음**(약관상 수집하나 자유텍스트/오프라인)
- settlement/payout 테이블 없음
- 작가별 gross 집계(`getAllArtistSales`)·void 처리는 이미 존재

## 결정 사항 (확정)

1. **실비: gross×50%만 계산**(실비 미모델링). 리포트는 "실비 공제 전 예정 정산액". 실비는 지급 시 운영진이 실지급액·메모에 수기 반영.
2. **지급 상태: DB 추적**. `artist_settlements` 테이블에 월별 지급 완료 기록.
3. **계좌번호: 구조화 컬럼 미도입**(수집 플로우 부재). 지급 시 메모/실지급액에 수기.
4. **별도 `/admin/settlements` 페이지**(기존 artist-sales 확장 아님).
5. 구현은 full 플랜 + SDD 서브에이전트, 격리 worktree.

## 목표 / 비목표

**목표**
- 작가별·월별 정산 예정액(gross×50%) 산출 + CSV
- 월별 지급 완료 상태 추적(실지급액·지급일·메모 스냅샷)
- 매월 말일 기준 그룹핑(약관 정합)

**비목표**
- 실비 자동 계산/모델링 (지급 시 수기)
- 계좌번호 구조화 저장·자동 송금
- 작가에게 정산 내역 자동 발송(이메일/알림) — 후속
- 씨앗페 50% 몫·상호부조 기금 회계 — 별건

## 1. DB 마이그레이션 — `artist_settlements`

`supabase/migrations/20260702150000_create_artist_settlements.sql` (email_logs 마이그레이션 RLS 패턴 미러):

```sql
create table if not exists public.artist_settlements (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  period_month  date not null,              -- 해당 월 1일 (예: 2026-06-01)
  gross_amount  numeric not null,           -- 지급 시점 스냅샷: Σ(sale_price×quantity), 비-void
  artist_share  numeric not null,           -- 스냅샷: round(gross_amount × 0.5)
  paid_amount   numeric,                    -- 실지급액(실비 반영). 미입력 시 artist_share와 동일 취급
  paid_at       timestamptz not null default now(),
  note          text,                       -- 실비 내역·계좌 등 수기 메모
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create unique index if not exists artist_settlements_artist_month_uniq
  on public.artist_settlements (artist_id, period_month);
create index if not exists artist_settlements_period_idx
  on public.artist_settlements (period_month desc);

alter table public.artist_settlements enable row level security;

-- 관리자만 조회. 쓰기는 service-role(서버)만 — service-role은 RLS 우회.
create policy "admins_can_view_artist_settlements" on public.artist_settlements
  for select using (get_my_role() = 'admin');

comment on table public.artist_settlements is '작가 월별 정산 지급 기록(gross 50% 스냅샷 + 실지급액)';
```

- **행 존재 = 해당 (작가, 월) 지급 완료.** pending은 리포트가 즉석 계산(행 없음).
- 적용: `supabase/migrations/`에 작성 후 **단건** `supabase db query --linked -f <파일>`(일괄 push 회피, CLAUDE.md blast-radius). pending migration이 이것뿐이면 `db push`로 history 기록.
- 타입 재생성: `supabase gen types typescript --linked` → `types/supabase.ts` 갱신.

## 2. 집계·액션 — `app/actions/admin-settlements.ts`

`'use server'`. `getAllArtistSales`의 배치 fetch·void 제외 패턴 참고.

```typescript
export type SettlementRow = {
  artistId: string | null;
  artistName: string;       // null이면 '작가 미지정'
  soldCount: number;
  gross: number;            // Σ(sale_price×quantity), 비-void, 해당 월
  share: number;            // round(gross × 0.5)
  status: 'paid' | 'pending';
  paidAmount: number | null;
  paidAt: string | null;
  note: string | null;
  payable: boolean;         // artistId != null
};
export type MonthlySettlements = {
  month: string;            // 'YYYY-MM'
  availableMonths: string[];// 매출 존재 월 목록(내림차순)
  rows: SettlementRow[];
  totals: { gross: number; share: number; paidCount: number; artistCount: number };
};
```

- `getMonthlySettlements(month: string)`: requireAdmin. 해당 월 `[firstDay, nextMonthFirstDay)` `sold_at` 범위의 `artwork_sales`(`voided_at is null`) 배치 fetch → artist_id별 집계. `artist_settlements`(해당 period_month) 병합해 status/paidAmount/paidAt/note. artist_id null은 '작가 미지정' 버킷(`payable:false`). availableMonths는 전체 `artwork_sales`의 distinct `to_char(sold_at,'YYYY-MM')`.
- `markSettlementPaid(artistId: string, month: string, paidAmount: number | null, note: string | null)`: requireAdmin. 그 시점 gross/share **재계산(스냅샷)** 후 `artist_settlements` upsert(onConflict artist_id,period_month). paidAmount null이면 컬럼 null(리포트는 share로 표기). `logAdminAction('artist_settlement_paid', ...)`. artistId 유효성(존재하는 artist) 검증.
- `unmarkSettlementPaid(artistId: string, month: string)`: requireAdmin. 행 삭제(정정용). `logAdminAction('artist_settlement_unpaid', ...)`.
- 월 문자열→date 변환은 서버에서 `${month}-01`. KST 기준 월 경계.

## 3. UI — `/admin/settlements`

- `app/(portal)/admin/settlements/page.tsx` (server, `dynamic = 'force-dynamic'`): `searchParams.month`(기본=availableMonths[0] 또는 현재월) → `getMonthlySettlements` → `SettlementList` 렌더. `AdminPageHeader`.
- `app/(portal)/admin/settlements/settlement-list.tsx` (client):
  - 월 선택 `AdminSelect`(availableMonths) → `router.push('/admin/settlements?month=...')`
  - 상단 배너(주의): "표시 금액은 실비(수수료·배송·포장) 공제 전 gross 50% 기준입니다. 실지급 시 실비 차감 후 실지급액·메모를 기록하세요."
  - 테이블: 작가 · 판매건수 · 판매액(gross) · 정산예정(50%) · 상태(AdminBadge paid/pending) · 실지급액 · 액션([지급 완료 처리] 또는 [지급 취소])
  - '작가 미지정' 행은 액션 비활성(payable=false)
  - 지급 완료 모달(`AdminConfirmModal` + children 입력): 실지급액(기본 share) + 메모 → `markSettlementPaid`. 성공 토스트 + `router.refresh()`
  - 합계 표시(gross·share·지급완료 수)
- nav: `admin-nav-items.ts`의 "작가별 판매"(`/admin/artist-sales`) 다음에 `{ href: '/admin/settlements', label: '정산 관리' }` (ko/en 블록 모두)
- 리터럴 한국어(admin 비-i18n 스코프)

## 4. CSV export — `/admin/settlements/export/route.ts`

`orders/export` 패턴 복제. `?month=YYYY-MM` 파라미터. admin 가드·`csvSafeCell`·`logAdminAction('artist_settlements_exported', ...)`. 컬럼: 작가, 판매건수, 판매액(gross), 정산예정액(50%), 지급상태, 실지급액, 지급일, 메모. 파일명 `settlements-<month>-<KST날짜>.csv`.

## 5. 엣지 케이스

- 지급 후 매출 void → `artist_settlements` 스냅샷(gross_amount/artist_share) 보존, 완료 지급 불변. 리포트는 스냅샷 표시(실시간 재계산 아님, paid 행은 저장값 사용).
- artist_id null 매출(레거시 수기) → '작가 미지정' 버킷, 지급 불가 표기.
- 무매출 월 → 빈 표 + 안내.
- 동일 (작가,월) 재지급 시도 → upsert로 스냅샷 갱신(정정), unique 위반 없음.
- share 반올림: `Math.round(gross * 0.5)` (원 단위).

## 파일 변경 요약

| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260702150000_create_artist_settlements.sql` | 신규 테이블 |
| `types/supabase.ts` | 타입 재생성 반영 |
| `app/actions/admin-settlements.ts` | 신규 — 집계·markPaid·unmark |
| `app/(portal)/admin/settlements/page.tsx` | 신규 — 서버 페이지 |
| `app/(portal)/admin/settlements/settlement-list.tsx` | 신규 — 클라이언트 리스트·모달 |
| `app/(portal)/admin/settlements/export/route.ts` | 신규 — CSV export |
| `app/(portal)/admin/_components/admin-nav-items.ts` | "정산 관리" nav 항목 |

## 테스트 / 검증

- `admin-settlements.ts` 단위 테스트(재무 로직이라 TDD 필수):
  - `getMonthlySettlements`: 월 버킷 경계·void 제외·50% 반올림·settlement 병합·null artist 버킷
  - `markSettlementPaid`: 스냅샷 정확성·upsert 멱등·paidAmount null 처리
  - mock 패턴은 `__tests__/actions/admin-orders.test.ts`의 supabase mock 참조
- UI(page/list/export route)는 기존 관례대로 type-check + lint + build + 코드 검토
- 마이그레이션: 프로덕션 적용 전 사용자 컨펌 필수(DDL). RLS·unique 검증
- `npm run type-check`, `npm run lint`, `npm run build`

## 리스크 / 주의

- **재무 정확성**: gross 집계는 기존 revenue/artist-sales와 동일 소스(`artwork_sales` 비-void). 50% 계산·월 버킷은 단위 테스트로 고정.
- **프로덕션 마이그레이션 blast-radius**: pending migration 다수 시 `db push` 금지. 단건 파일 `db query --linked -f`로 적용(CLAUDE.md).
- **RLS**: 서버는 `requireAdminClient`(service-role, RLS 우회)로 접근. select 정책은 방어적. 직접 클라이언트 노출 없음.
- **동시 세션**: 공유 작업 디렉토리에 다른 세션이 활동 중 — 구현은 격리 worktree(`feat/admin-artist-settlements`)에서만, main 작업 트리 미접촉.
- **스냅샷 vs 실시간**: paid 행은 저장 스냅샷을 신뢰(지급 후 매출 변동 무시). pending은 실시간 계산. 이 이원성을 리포트가 명확히 구분.
