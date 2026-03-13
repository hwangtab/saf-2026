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
