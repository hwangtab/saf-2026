# 작품 이미지 AI 업스케일 실행 계획 (2026-04-02)

## 1) 목적

- 저해상도 작품 이미지를 단계적으로 업스케일해 공개 갤러리/상세 화면의 품질 저하를 줄인다.
- 원본이 너무 작은 이미지는 "업스케일"과 "원본 재수급 필요"를 구분해 처리한다.
- 레거시 파일명(`36.jpeg` 같은 bare filename) 상태의 이미지 매핑도 함께 정리해, 업스케일 결과가 실제 서비스에 안정적으로 반영되도록 한다.

## 2) 조사 결과 요약

- 전체 작품: 351점
- 장변 800px 미만: 74점
- 장변 800~1199px: 43점
- 장변 1200~1599px: 49점
- 합계 166점이 현재 상세 프리셋 목표(1600px) 미만
- 레거시 파일명 상태 이미지: 9점

## 3) 우선순위

### 1순위: 즉시 업스케일 대상

- 장변 800px 미만 74점
- 이유: 카드/상세/라이트박스에서 모두 품질 저하가 명확함
- 대표 작가군:
  - 오윤
  - 신학철
  - 천지수
  - 이윤엽
  - 라인석

### 2순위: 상세페이지 보강 대상

- 장변 800~1199px 43점
- 이유: 카드 영역은 일부 버티지만 상세/확대 화면에서 열세가 큼

### 3순위: 선택 업스케일 대상

- 장변 1200~1599px 49점
- 이유: 현재 상세 프리셋(1600px)만 미달하며, 시각적 급함은 1·2순위보다 낮음

## 4) 실행 범위

### Phase 1

- 1순위 74점 업스케일
- 레거시 파일명 9점의 실제 소스 경로 확인 및 매핑 정리

### Phase 2

- 2순위 43점 업스케일
- 결과 비교 후 필요한 작품만 재시도

### Phase 3

- 3순위 49점 중 실제 화면 체감이 큰 작품만 선별 업스케일

## 5) 구현 절차

1. 현재 원본 소스 인벤토리 확정
   - Supabase 원본 URL 사용 작품
   - `out/images/artworks/*` 로컬 원본 사용 작품
2. 업스케일 대상별 before 메타데이터 기록
   - 파일명/작가/작품명
   - 원본 픽셀 크기
   - 원본 파일 크기
3. AI 업스케일 실행
   - 목표: 장변 최소 1600px 확보
   - 필요 시 장변 1920px 버전까지 생성
4. 결과 검수
   - 노이즈, 가장자리 깨짐, 텍스트/판화 결 디테일 훼손 여부 확인
   - 원본보다 부자연스러운 경우 재시도 또는 제외
5. 서비스 반영
   - 최종 이미지 업로드/교체
   - 레거시 파일명 엔트리의 이미지 URL 정리
6. 검증 및 문서화
   - 변경 내역 정리
   - `walkthrough.md`에 결과 및 검증 기록

## 6) 품질 기준

- 최종 반영본은 장변 1600px 이상을 기본 목표로 한다.
- 원본이 300px 이하인 극저해상도 이미지는 AI 업스케일만으로 복원이 제한될 수 있으므로, 결과가 부자연스러우면 "원본 재수급 필요"로 분류한다.
- 사후판화/목판화처럼 결이 중요한 작품은 과도한 샤프닝이나 허위 디테일 생성이 보이면 반영하지 않는다.

## 7) 검증 계획

1. 업스케일 전/후 해상도 비교표 작성
2. 대표 저해상도 작가군(오윤, 신학철 등) 우선 육안 검수
3. 레거시 파일명 9점이 placeholder 대신 정상 이미지로 연결되는지 확인
4. 코드/데이터 수정이 발생하면:
   - `npm run lint`
   - `npm run type-check`
   - 필요 시 `npm run validate-artworks`

## 8) 리스크 및 대응

- 원본이 지나치게 작으면 AI가 실제 디테일이 아닌 가짜 결을 만들 수 있음
  - 대응: 해당 작품은 재수급 권고 목록으로 분리
- 레거시 파일명 엔트리는 실제 서비스 연결 경로가 깨질 수 있음
  - 대응: 업스케일 반영 전 URL 정규화 우선
- 작가별로 동일 계열 작품이 많아 결과 일관성이 깨질 수 있음
  - 대응: 작가 단위로 묶어서 동일 파라미터로 처리 후 비교

## 9) 완료 기준

- 1순위 74점이 우선 반영되거나, 반영 불가 사유가 작품별로 정리된다.
- 레거시 파일명 9점의 실제 서비스 이미지 연결 상태가 정리된다.
- 업스케일 결과와 제외 사유가 `walkthrough.md`에 기록된다.

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

---

# 포털 진행바 rAF 충돌 수정 실행 계획 (2026-04-02)

## 1) 목적

- 포털 레이아웃의 상단 진행바에서 연속 네비게이션 시 이전 애니메이션 프레임이 다음 사이클에 섞이는 문제를 제거한다.
- 진행바의 시작/완료/숨김 상태 전이를 한 사이클 단위로 정리해, 폭이 튀거나 조기 완료처럼 보이는 현상을 방지한다.

## 2) 문제 요약

- 대상 파일: `components/layout/NavigationProgress.tsx`
- 현재 구현은 다음 메커니즘을 함께 사용한다.
  - double `requestAnimationFrame`
  - 중첩 `setTimeout`
  - DOM `style` 직접 변경
- 하지만 이전 사이클의 rAF id를 저장/취소하지 않아, 빠른 라우트 전환 또는 검색 파라미터 연속 변경 시 이전 write가 뒤늦게 실행될 여지가 있다.

## 3) 수정 범위

- `components/layout/NavigationProgress.tsx`
- 필요 시 관련 테스트 추가:
  - `__tests__/components/NavigationProgress*.test.tsx` 또는 기존 레이아웃/컴포넌트 테스트 파일
- 문서화:
  - `walkthrough.md`

## 4) 구현 방안

1. 진행바 사이클 상태 정리
   - rAF id를 `useRef`로 저장
   - effect cleanup에서 예약된 rAF를 반드시 취소
2. 타이머 정리 강화
   - 현재 하나의 ref에 덮어쓰는 timeout 관리 구조를 점검
   - 시작/완료/숨김 단계별 예약이 다음 사이클로 누수되지 않도록 cleanup 보강
3. DOM write 순서 안정화
   - 새 사이클 시작 시 이전 사이클의 잔여 transition/width/opactiy 상태를 초기화
   - 동일 노드에 대한 style 변경 순서를 고정
4. 회귀 테스트 추가
   - 짧은 간격으로 pathname/searchParams가 바뀌는 상황에서:
     - 이전 rAF가 취소되는지
     - 진행바가 새 사이클 기준으로만 동작하는지 검증

## 5) 검증 계획

1. 단위 테스트
   - 연속 라우트 변경 시 진행바 width가 이전 사이클 값으로 덮이지 않는지 확인
   - cleanup 시 `cancelAnimationFrame` 및 timer 정리가 수행되는지 확인
2. 정적 검증
   - `npm run lint`
   - 필요 시 해당 테스트만 선택 실행 후 전체 테스트 영향 확인

## 6) 리스크 및 대응

- DOM style을 직접 제어하는 구조라 테스트가 구현 세부사항에 과도하게 묶일 수 있음
  - 대응: 최종 style 상태와 cleanup 호출 여부 중심으로 검증
- 포털 전역 레이아웃에서만 쓰이는 컴포넌트라 수동 재현이 늦게 드러날 수 있음
  - 대응: 빠른 연속 네비게이션을 흉내내는 회귀 테스트를 우선 추가

## 7) 완료 기준

- 이전 사이클의 rAF/timeout이 다음 진행바 사이클에 영향을 주지 않는다.
- 빠른 연속 라우트 변경에서도 진행바가 튀지 않고, 시작 → 진행 → 완료 → 숨김 순서를 안정적으로 유지한다.
- 관련 테스트와 `walkthrough.md`가 업데이트된다.
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

---

# 작품 상세 페이지 작가 관련 URL 확장 계획 (2026-04-01)

## 1) 목적

- 작품 상세 페이지의 작가 관련 자료를 의미 있는 URL 중심으로 확장한다.
- 작가 웹사이트, SNS, 소속 소개 페이지는 수집 대상에서 제외한다.
- 이미 등록된 URL과 중복되지 않도록 수집/정규화 기준을 먼저 세운다.
- 동명이인 리스크가 있는 작가는 식별 근거를 남기며 보수적으로 수집한다.

## 2) 현재 상태 요약

- 공개 작품 상세 페이지는 [content/artist-articles.ts]의 작가명 키를 기준으로 관련 자료를 렌더링한다.
- 현재 확인 기준:
  - 출품 작가: 112명
  - `artist-articles.ts` 등록 작가: 107명
  - 등록 URL: 375개
  - 파일 내부 exact URL 중복: 0건
- 자료가 아예 없는 출품 작가:
  - `남진현`, `림지언`, `박영선`, `손장섭`, `작가미상`, `칡뫼 김구`
- 엔트리는 있으나 URL이 0개인 작가:
  - `김영서`, `변경희`, `이지은`, `이채원`, `김유진`
- URL 1개인 작가가 다수 존재하므로, "없는 작가 우선" 이후 "1개만 있는 작가 보강" 순서가 효율적이다.

## 3) 핵심 리스크

### 3-1) 동명이인

- 현재 구조는 `artist name -> Article[]` 단일 키 방식이어서 동명이인 대응이 약하다.
- 특히 `김지영`, `김정원`, `김유진`, `이지은`, `안소현`, `박지혜`처럼 일반적인 이름은 이름만으로 검색하면 오수집 가능성이 높다.

### 3-2) URL 품질 편차

- 기관/미술관/언론 기사와 재게시 기사/검색 유입용 페이지가 섞일 수 있다.
- 자료 수만 늘리면 상세 페이지의 신뢰도가 오히려 떨어질 수 있다.

### 3-3) 중복의 기준 불명확

- 추적 파라미터가 붙은 URL, 모바일 링크, 공유용 링크, 유튜브 단축 링크는 육안상 다른 URL처럼 보일 수 있다.
- 같은 기사 재배포본을 여러 건 넣으면 실질적 중복이 된다.

## 4) 수집 원칙

### 4-1) 소스 우선순위

1. 국공립 미술관 / 공공기관 / 비엔날레 / 아트페어 / 소장 기관 페이지
2. 신뢰 가능한 언론 인터뷰 / 전시 기사 / 영상 인터뷰
3. 전시 리뷰 / 아카이브 / 연구·비평 성격의 제3자 자료
4. 블로그 / 브런치 / 나무위키 / 커뮤니티는 원칙적으로 제외하고, 대체재가 전혀 없을 때만 보류 후보로만 관리

### 4-2) 작가당 목표 수량

- 최소 기준: 작가당 3개
- 우선 보강 대상: 0개 → 1개 → 2개 순
- 최대 수량은 일률적으로 늘리기보다, 품질이 낮은 URL 추가는 지양한다.

### 4-3) 제외 기준

- 작가 웹사이트, 작가 본인 SNS, 소속 갤러리/에이전시 프로필
- 작가 동일성 근거가 부족한 링크
- 로그인 필요, 만료 가능성 높음, 리디렉션 체인 과다 링크
- 단순 판매 페이지, 복사 기사, 출처 불명 요약문
- 다른 매체/세대/분야의 동명이인 링크

## 5) 동명이인 판별 규칙

### 5-1) 검색용 식별자 구성

- [content/artists-data.ts]를 기준으로 아래 식별자를 조합한다.
  - 매체: 회화, 사진, 도예, 판화, 조각 등
  - 학력: 학교명, 학위, 교수명
  - 전시/시리즈: 대표 개인전명, 대표 연작명
  - 활동 지역/기관: 미술관, 레지던시, 소장처, 전시 공간

### 5-2) 수집 승인 조건

- 최소 2개 이상의 식별 근거가 일치할 때만 채택한다.
- 예시:
  - 이름 + 매체 일치
  - 이름 + 학교/전시명 일치
  - 이름 + 전시 기관/소장처 일치

### 5-3) 보수적 처리 대상

- `작가미상`은 수집 대상에서 제외한다.
- 근거가 약한 동명이인 의심 링크는 보류 목록으로 분리한다.

## 6) 중복 방지 규칙

### 6-1) URL 정규화

- 저장 전 아래 정규화를 적용한다.
  - `utm_*`, `fbclid`, `gclid`, `srsltid` 제거
  - `http` → `https` 가능한 경우 canonical 우선
  - trailing slash 정리
  - YouTube short URL과 watch URL 통일
  - 모바일/AMP/공유 링크 대신 원문 canonical 사용

### 6-2) 중복 판정 기준

- exact URL 중복
- 정규화 후 canonical URL 중복
- 동일 기사/영상의 재게시본 중복

### 6-3) 저장 전 체크

- `artist-articles.ts` 전체에서 URL exact match 확인
- 정규화 후 canonical URL match 확인
- 동일 작가 내 중복뿐 아니라 작가 간 중복도 확인

## 7) 실행 배치 전략

### 7-1) 1차 배치: 공백 해소

- 자료가 전혀 없는 출품 작가 6명
- 엔트리만 있고 URL 0개인 작가 5명

### 7-2) 2차 배치: 빈약한 엔트리 보강

- URL 1개인 작가 21명

### 7-3) 3차 배치: 품질 균형화

- URL 2개인 작가 13명
- 이미 3개 이상인 작가는 품질 이슈가 있을 때만 선별 보강

## 8) 작업 방식

### 8-1) 사전 정리

- 작가별 수집 시트 작성
  - `artist`
  - `priority`
  - `search clues`
  - `candidate url`
  - `canonical url`
  - `source type`
  - `identity evidence`
  - `confidence`
  - `status(accept / hold / reject)`

### 8-2) 수집 단위

- 한 번에 5~10명씩 소배치로 진행
- 소배치마다 중복/동명이인 검수 후 반영

### 8-3) 반영 파일

- 1차 반영: [content/artist-articles.ts]
- 필요 시 후속 개선 검토:
  - 내부 관리용 메타(검색 힌트, 보류 사유, canonical_url)를 별도 파일로 분리

## 9) 후속 구조 개선 제안

- 장기적으로는 단순 작가명 키 대신 내부 관리용 `artistKey` 도입 검토
- UI는 기존 구조를 유지하되, 수집/검수용 데이터 레이어를 분리하면 동명이인 대응이 쉬워진다.
- 예:
  - `artist-resource-registry.ts`: 식별자/검색 힌트/제외 키워드
  - `artist-articles.ts`: 상세 페이지 렌더링용 확정 데이터

## 9-1) 수집 범위 메모

- 이번 작업의 목표는 "작가가 직접 운영하는 채널"이 아니라 "작가를 설명하거나 검증해 주는 제3자 자료" 확보다.
- 따라서 링크 수집은 아래 범위로 제한한다.
  - 기관 전시/소장/아카이브 페이지
  - 언론 기사, 인터뷰, 리뷰
  - 공공기관 또는 신뢰 가능한 문화예술 플랫폼의 작가 소개/전시 기록
- 아래 범위는 수집하지 않는다.
  - 개인 웹사이트
  - 인스타그램, 페이스북, X, 유튜브 채널 홈 등 SNS
  - 소속 갤러리, 에이전시, 플랫폼 입점 소개 페이지

## 10) 검증 계획

1. 수집 전후 작가별 URL 개수 비교
2. exact URL 중복 0건 확인
3. 정규화 후 canonical 중복 0건 확인
4. 동명이인 주의 작가 샘플 수동 검수
5. 작품 상세 페이지에서 링크 렌더링 이상 여부 확인
6. 데이터 수정 시 필요하면 `npm run lint`, `npm run type-check` 실행

## 11) 완료 기준

- 공백 작가(0개)가 우선 해소된다.
- 신규 추가 URL은 중복 없이 저장된다.
- 동명이인 가능성이 있는 링크는 근거 없이 반영되지 않는다.
- 작가당 최소 3개 목표에 맞춰 점진적으로 품질 있는 자료가 축적된다.

## 12) 승인 후 실행 순서

1. 1차 배치 대상 작가 목록 확정
2. 작가별 검색 힌트 시트 작성
3. 실제 웹 수집 및 후보 URL 정리
4. 중복/동명이인 검수
5. `content/artist-articles.ts` 반영
6. 검증 및 `walkthrough.md` 기록

---

# 주문 취소 활동 로그 표시 개선 계획 (2026-04-09)

## 문제 요약

- 주문 취소 시 활동 로그에는 `order_awaiting_cancelled` 액션이 기록됨
- 하지만 활동로그 UI에서 이 액션을 해석하는 매핑이 없어 `정의되지 않은 활동`으로 표시됨
- 대상 타입도 `order`에 대한 라벨/링크/이름 해석이 없어 `order`와 `이름 정보 없음`으로 표시됨
- 활동로그 필터 목록에도 주문 관련 액션이 빠져 있어 조회성이 떨어짐

## 확인한 원인

1. `app/actions/admin-orders.ts`
   - 주문 취소는 정상적으로 `logAdminAction('order_awaiting_cancelled', 'order', ...)` 호출
   - 입금 확인, 상태 변경, 운송장 수정, 환불 등도 모두 `order` 대상 로그를 남기고 있음
2. `app/(portal)/admin/logs/_utils.ts`
   - `formatActionDescription()`에 주문 관련 액션 분기 없음
   - `getTargetTypeLabel()`에 `order` 타입 분기 없음
   - `getTargetLink()`에 주문 상세(`/admin/orders/[id]`) 연결 없음
   - `getLogTargetDisplayName()`가 `order_no` 같은 주문 식별값을 우선 사용하지 않음
3. `app/actions/admin-logs.ts`
   - 대상 이름 보강 로직이 `artwork`, `artist`, 신청서 계열만 지원
   - `order`는 조회 보강 대상에서 빠져 있어 기존 로그 재표시 품질이 낮음
4. `app/(portal)/admin/logs/page.tsx`
   - 활동 필터 옵션에 주문 관련 액션이 없음
5. `messages/ko.admin.json`, `messages/en.admin.json`
   - `targetTypeOrder` 번역 키 없음

## 수정 계획

1. 활동로그 표시 유틸 보강
   - 주문 관련 액션(`order_awaiting_cancelled`, `order_deposit_confirmed`, `order_status_updated`, `order_tracking_updated`, `order_refunded`) 표시 문구 추가
   - `order` 대상 라벨, 상세 링크, 표시 이름 해석 추가
   - 표시 이름은 `target_name` → `order_no` → 구매자명 순으로 우선 사용
2. 서버 측 대상 이름 보강 확장
   - `app/actions/admin-logs.ts`의 target enrichment에 `order` 추가
   - `orders` 테이블에서 `id, order_no, buyer_name` 조회 후 `target_name`/`target_names` 주입
   - 기존 로그도 조회 시 주문번호 기반으로 자연스럽게 노출되도록 처리
3. 활동로그 필터 개선
   - 주문 관련 액션을 관리자 활동로그 필터 옵션에 추가
   - `order` 대상 번역 키 추가
4. 검증
   - 변경 파일 기준 타입 오류 확인
   - `npm run lint`, `npm run type-check` 실행

## 예상 결과

- 주문 취소 로그가 `입금대기 주문 취소: 주문번호` 형태로 표시됨
- 대상 열이 `주문` + 실제 주문번호로 표시되고, 상세 페이지로 이동 가능해짐
- 주문 관련 다른 로그도 동일한 방식으로 일관되게 보이게 됨
