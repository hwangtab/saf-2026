# 관리자 UX 개선 — 주문 CSV export (Spec C1) 설계

날짜: 2026-07-02
작업 브랜치: `feat/admin-orders-csv-export` (main에서 분기)

## 배경

관리자 UX 분석 #7(주문 CSV export + 작가 정산 리포트)은 독립적인 두 조각으로 분해됐다:

- **C1(이 스펙): 주문 CSV export** — `app/(portal)/admin/orders/export`가 없음(artists/revenue/artworks에는 export route 존재). 확립된 패턴 복제로 저위험.
- **C2: 작가 정산 리포트** — 별도 설계 사이클. 작가 약관상 판매 대금 50/50 분배·실비 공제·월별 지급 모델이 실재하나, 실비 데이터 출처·지급 상태 추적(신규 DB) 등 재무 결정이 많아 이 스펙에서 제외.

주문 데이터를 스프레드시트로 내려받아 정산·회계·배송 대사에 쓸 수 있게 한다.

## 목표 / 비목표

**목표**

- 관리자가 전체 주문을 CSV로 다운로드(구매자·작품·금액·배송·결제·타임스탬프 포함)
- 기존 export route(artists/revenue/artworks)와 동일한 UX·구현 패턴

**비목표**

- 작가 정산 리포트·지급 상태 추적 (C2)
- 필터·기간 파라미터 기반 부분 export (전체 dump만 — 기존 export route들과 동일)
- 스트리밍/페이지네이션 (주문 규모상 단일 응답으로 충분)

## 컴포넌트

### 1. `app/(portal)/admin/orders/export/route.ts` (신규)

[artworks/export/route.ts](<../../../app/(portal)/admin/artworks/export/route.ts>)를 구조 그대로 복제:

**Auth 가드** (동일):

- prefetch 요청(`next-router-prefetch === '1'`) → 204
- `supabase.auth.getUser()` → 없으면 401
- `profiles.role` 조회 → 에러 500, `role !== 'admin'` → 403

**조회**:

```
supabase.from('orders').select(
  'id, order_no, status, buyer_name, buyer_phone, buyer_email, quantity, item_amount, shipping_amount, total_amount, note, shipping_name, shipping_phone, shipping_postal_code, shipping_address, shipping_address_detail, shipping_memo, shipping_carrier, tracking_number, metadata, created_at, paid_at, cancelled_at, refunded_at, artworks(title, artists(name_ko)), order_items(artworks(title, artists(name_ko)))'
).order('created_at', { ascending: false })
```

- 상한 없음(artworks export와 동일). 실패 시 500.

**작품명·작가 결합** (read-model 정규화 미러):

- `order_items`가 1건 이상이면 각 항목의 `artworks.title`을 `|`로 결합, 작가는 첫 항목 `artists.name_ko`(중복 제거 후 결합도 허용)
- 없으면 단일 `artworks.title` / `artworks.artists.name_ko` 사용
- Supabase 조인은 객체 또는 배열로 올 수 있으므로 `normalize` 헬퍼(artworks export의 `normalizeArtist` 패턴)로 방어

**결제수단**: `metadata`가 객체면 `metadata.payment_provider ?? ''` (admin-read-model의 `getPaymentProvider` 로직 인라인)

**상태 한글 라벨**: order-list.tsx의 `STATUS_LABELS`와 동일한 매핑을 route 내부에 인라인(단일 출처는 아니나, order-list의 것은 client 컴포넌트라 재사용 시 client 번들 유발 — route에는 값만 복제). 미매핑 시 raw status.

**CSV 헤더**(한글):
주문번호, 상태, 구매자명, 구매자연락처, 구매자이메일, 작품명, 작가, 수량, 상품금액, 배송비, 총액, 결제수단, 수령인, 수령연락처, 우편번호, 주소, 상세주소, 배송메모, 택배사, 송장번호, 관리자메모, 주문일시, 결제일시, 취소일시, 환불일시

**출력**: `'﻿' + [header, ...rows].map(row => row.map(csvSafeCell).join(',')).join('\r\n')`, `logAdminAction('orders_exported', 'order', 'all', { total_count: rows.length }, user.id, { summary: `주문 전체 데이터 다운로드 (${rows.length}건)`, reversible: false })`, 파일명 `orders-data-${getKstDateToken()}.csv`, 헤더 `Content-Type: text/csv; charset=utf-8`+`Content-Disposition: attachment`+`Cache-Control: no-store`

### 2. `app/(portal)/admin/orders/page.tsx` (수정)

[artworks/page.tsx](<../../../app/(portal)/admin/artworks/page.tsx>):100의 패턴을 미러 — `AdminPageHeader`와 `LinkButton`을 flex 컨테이너로 감싼다:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <AdminPageHeader>...</AdminPageHeader>
  <LinkButton href="/admin/orders/export" variant="white" className="w-full sm:w-auto">
    주문 데이터 다운로드
  </LinkButton>
</div>
```

- `LinkButton` import 경로는 artworks/page.tsx의 것을 그대로 사용
- 리터럴 한국어(주문 포털은 admin non-i18n 스코프)

## 파일 변경 요약

| 파일                                        | 변경                            |
| ------------------------------------------- | ------------------------------- |
| `app/(portal)/admin/orders/export/route.ts` | 신규 — CSV export route         |
| `app/(portal)/admin/orders/page.tsx`        | 헤더에 다운로드 LinkButton 추가 |

## 테스트 / 검증

- 기존 export route(artworks/revenue/artists)는 전용 jest 테스트 없이 배포됨 → 동일 관례로 **type-check + lint + build + 코드 검토**로 검증
- CSV injection 방어는 기존 `csvSafeCell`(`@/lib/utils/csv`) 재사용으로 보장(수식 셀 이스케이프)
- 실제 다운로드·컬럼 정합은 사용자 확인에 위임(관리자 로그인 필요, Playwright 미사용)

## 리스크 / 주의

- 주문 규모가 매우 커지면 단일 응답이 무거워질 수 있으나 현재 규모(수백~수천)에선 문제없음. artworks export도 동일 전제
- `csvSafeCell` 필수 — 구매자명·주소·메모 등 사용자 입력이 셀에 들어가므로 CSV injection(`=`,`+`,`-`,`@` 시작) 방어
- PII(구매자 이메일·연락처·주소) 포함 export이므로 admin 전용 가드 필수 — 패턴상 이미 강제(401/403). `logAdminAction`으로 감사 기록(reversible:false)
- 상태 한글 라벨을 route에 복제 → order-list의 라벨이 바뀌면 두 곳을 함께 갱신해야 함(주석으로 명시). 라벨 종류가 소수라 수용 가능한 중복
