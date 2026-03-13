# Cafe24 판매/매출 블라인드스팟 개선 실행 계획

## 1) 목적

운영 중 재발한 핵심 리스크(중복 삽입, 커서 정지, 취소/환불 미반영, 배치 부분성공 불일치)를 제거하고,
`artwork_sales` 기반 집계/재고/판매상태를 일관되게 유지한다.

## 2) 우선순위(치명 → 높음 → 중간)

### 치명

1. CSV 재구축 스크립트 재실행 시 중복 삽입 방지(멱등성)
2. Cafe24 주문 일부 실패 시 전체 커서 정지 방지

### 높음

3. 취소/환불 주문의 역동기화(void 처리) 반영
4. 관리자 배치 상태/숨김 변경 시 실패 ID DB 롤백

### 중간

5. legacy cafe24(외부 주문키 없는 이관분) 추적성 강화
6. CSV no_match(alias) 운영 가드 강화

## 3) 구현 상세

### 3-1) 치명-1: CSV 멱등성

- 대상: `scripts/rebuild-sales-source-from-csv.js`
- DB 컬럼 추가
  - `artwork_sales.import_batch_id text`
  - `artwork_sales.import_row_no integer`
  - unique constraint: `(import_batch_id, import_row_no)`
- 스크립트 변경
  - `--apply` 실행 시 `--import-id` 필수
  - insert → upsert(`onConflict: import_batch_id,import_row_no`)
  - 동일 import-id 재실행 시 0 변경 보장

### 3-2) 치명-2: 실패주문 큐 + 커서 전진

- 대상: `lib/integrations/cafe24/sync-sales.ts`
- DB 테이블 추가
  - `cafe24_sales_sync_failed_orders` (mall_id, order_id PK, retry_count, last_error, resolved_at)
- 로직 변경
  - 주문 단위 실패는 큐에 적재(경고)하고 전체 실패로 승격하지 않음
  - 다음 동기화에서 실패주문 우선 재시도
  - 구조적 실패가 아니면 커서(`last_synced_paid_at`) 전진

### 3-3) 높음-1: 취소/환불 역동기화

- DB 컬럼 추가
  - `artwork_sales.voided_at timestamptz`
  - `artwork_sales.void_reason text`
- 동기화 로직
  - 취소/환불 상태 아이템 발견 시 기존 cafe24 판매 레코드 void 처리
  - void 대상 작품은 상태/재고 재계산 수행
- 집계 반영
  - 매출/대시보드 집계에서 `voided_at IS NULL`만 포함

### 3-4) 높음-2: 배치 변경 롤백

- 대상: `app/actions/admin-artworks.ts`
- 변경
  - 배치 status/hidden 변경 후 Cafe24 sync 실행
  - 실패한 ID만 before snapshot 기준 즉시 롤백
  - 성공/실패 ID를 분리한 오류 메시지 반환

### 3-5) 중간-1: legacy cafe24 추적 강화

- `artwork_sales.source_detail` 컬럼 추가
  - 값: `manual`, `manual_csv`, `cafe24_api`, `legacy_csv`
- 백필
  - `source='cafe24' AND external_order_item_code IS NULL` → `legacy_csv`
  - API 동기화 insert는 `cafe24_api` 지정
  - CSV 이관 insert는 `manual_csv/legacy_csv` 지정

### 3-6) 중간-2: CSV 매칭 가드

- 대상: `scripts/rebuild-sales-source-from-csv.js`
- 변경
  - alias 매핑 외부 파일화(운영 수정 가능)
  - `--strict` 모드에서 unresolved 존재 시 apply 차단

## 4) 마이그레이션 계획

- 신규 SQL 1개로 일괄 반영:
  - `artwork_sales` 확장(import/void/source_detail)
  - unique/check/index 추가
  - 실패주문 큐 테이블 생성
  - legacy source_detail 백필

## 5) 검증 계획

1. `sales:rebuild-source:dry` 후 같은 import-id 2회 적용 시 건수/매출 불변
2. Cafe24 sync에서 주문 1건 강제 실패 시:
   - 전체 작업은 완료(경고)
   - failed_orders 큐 적재
   - 커서 전진 확인
3. 취소/환불 케이스에서:
   - 해당 row `voided_at` 설정
   - 매출 집계 즉시 감소
4. 배치 status/hidden 변경에서 일부 실패 시:
   - 실패 ID만 원복
   - 성공 ID만 유지
5. `npm run lint`, `npm run type-check` 통과

## 6) 완료 기준

- 동일 CSV 재적용으로 매출 뻥튀기가 재발하지 않는다.
- 주문 일부 실패가 있어도 동기화 파이프라인이 멈추지 않는다.
- 취소/환불이 매출/판매상태/재고에 반영된다.
- 배치 조작에서 DB와 Cafe24 상태 불일치가 남지 않는다.

---

# i18n 영문 누수(P0) 실행 계획 (2026-03-12)

## 1) 목적

- 영어 로케일(`en`)에서 한국어가 노출되는 P0 구간을 우선 제거한다.
- 번역 키 누락이 아닌 하드코딩/상수 우회 구간을 `next-intl` 경로로 일원화한다.

## 2) P0 범위

- 공개 라우트:
  - `app/[locale]/news/page.tsx`
  - `app/[locale]/our-proof/page.tsx`
  - `app/[locale]/archive/2023/page.tsx`
  - `app/[locale]/special/oh-yoon/page.tsx`
- 공용 컴포넌트:
  - `components/common/ShareButtons.tsx`
  - `components/ui/ArtworkCard.tsx`
  - `components/features/TrustBadges.tsx`
  - `components/features/ArtworkDetailNav.tsx`
  - `components/features/BackgroundSlider.tsx`
  - `components/features/ExpandableHistory.tsx`

## 3) 구현 방법

1. 각 파일의 하드코딩 한글 문자열을 `useTranslations`/`getTranslations` 기반으로 치환
2. `messages/ko.json`, `messages/en.json`에 대응 키 추가
3. 의미상 데이터 문구(예: `'문의'`, `'확인 중'`)는 키 기반 상수로 통일

## 4) 검증

- 수정 파일 LSP 진단 오류 0
- `npm run lint` 통과
- `npm run type-check` 통과
- `npm run build` 통과(환경 의존 이슈가 있으면 로그와 함께 명시)

## 5) 완료 기준

- P0 대상 파일에서 영어 로케일 시 한국어 UI 문구가 노출되지 않는다.
- ko/en 메시지 키 정합성이 유지된다.

---

# 출품작 페이지 전환 중간화면(3열 스켈레톤/연노랑 배경) 근본 개선 계획 (2026-03-13)

## 1) 목적

- 출품작 라우트 전환 시 간헐적으로 노출되는 불쾌한 중간 프레임(3열 스켈레톤 + 연노랑 계열 배경)을 제거한다.
- 로딩/전환 UI를 라우트별로 일관화해 "가끔 보임" 같은 타이밍 의존 현상을 줄인다.

## 2) 원인 요약 (확인 완료)

1. `app/[locale]/artworks/loading.tsx`가 데스크톱 기준 `lg:grid-cols-3` 스켈레톤을 강제 렌더링함.
2. 같은 파일에서 `bg-[var(--color-primary-surface)]`를 사용하지만, `styles/globals.css`의 `:root`에는 `--color-primary-surface`가 정의되어 있지 않음.
3. 결과적으로 로딩 구간에서 의도한 배경 대신 body 기본 배경(`--color-canvas-soft`, 연노랑 톤)이 드러나며, 전환 타이밍에 따라 중간 화면으로 체감됨.
4. 전환 경로가 `app/[locale]/layout.tsx`의 `Suspense` + 세그먼트 `loading.tsx` 조합이라 네트워크/프리패치 타이밍에 따라 간헐적으로 노출됨.

## 3) 근본 해결 전략

### 3-1) 로딩 UI 정책 일원화 (핵심)

- 출품작 라우트(`list/detail/artist`)에 대해 "콘텐츠 형태를 흉내내는 스켈레톤"을 지양하고, 공통 로더 패턴으로 통일.
- 구체안:
  - `app/[locale]/artworks/loading.tsx`의 3열 카드 스켈레톤 제거
  - 전환 중에는 단일 안정 로더(레이아웃 점프가 적은 형태)만 노출
  - 필요 시 `app/[locale]/artworks/[id]/loading.tsx`, `app/[locale]/artworks/artist/[artist]/loading.tsx`도 동일 정책으로 맞춤

### 3-2) 색상 토큰 정합성 복구

- `bg-[var(--color-primary-surface)]` 제거 후 Tailwind 토큰 클래스(`bg-primary-surface`) 사용으로 통일.
- 또는 `styles/globals.css`에 `--color-primary-surface`를 명시적으로 추가하되, 프로젝트 표준은 Tailwind 토큰 우선으로 유지.

### 3-3) 전환 타이밍 노출 최소화

- 출품작 내부 프로그래매틱 네비게이션(`router.push`) 경로를 점검하고 필요 시 `startTransition` 래핑하여 fallback 노출 빈도 완화.
- 현재 쿼리 기반 필터 전환은 이미 `useArtworkFilter`에서 `startTransition` 사용 중이므로, 아티스트 전환 등 미적용 경로만 보강.

### 3-4) PageTransition/로더 충돌 점검

- `components/common/PageTransition.tsx`와 route loading이 동시에 체감되는 구간을 최소화하도록, 불필요한 중간 opacity 프레임 노출 여부 점검.
- 변경 시 전체 라우트 영향이 있으므로 출품작 경로 한정 A/B 비교 후 확정.

## 4) 구현 대상 파일

- `app/[locale]/artworks/loading.tsx`
- `app/[locale]/artworks/[id]/loading.tsx` (신규 가능)
- `app/[locale]/artworks/artist/[artist]/loading.tsx` (신규 가능)
- `components/features/ArtworkGalleryWithSort.tsx`
- `lib/hooks/useArtworkFilter.ts` (필요 시)
- `components/common/PageTransition.tsx` (필요 시)
- `styles/globals.css` 또는 토큰 사용부(변수 정합성 선택안에 따라)

## 5) 검증 계획

1. 기능 검증
   - `/en/artworks` 진입 시 3열 카드형 스켈레톤이 중간에 노출되지 않는지 확인
   - `/en/artworks` ↔ `/en/artworks/artist/[artist]` ↔ `/en/artworks/[id]` 왕복 전환 반복(최소 20회)
2. 시각 검증
   - 전환 영상 캡처(데스크톱/모바일)로 배경 플래시 재현 여부 확인
3. 정적 검증
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`
   - `npm test -- --runInBand`

## 6) 완료 기준

- 출품작 전환 중 "3열 스켈레톤 + 연노랑 배경" 중간 프레임이 재현되지 않는다.
- 로딩 UI가 list/detail/artist 간 일관되게 동작한다.
- 전역 라우트 전환 품질 저하(깜빡임 증가, 레이아웃 점프 증가)가 없다.
