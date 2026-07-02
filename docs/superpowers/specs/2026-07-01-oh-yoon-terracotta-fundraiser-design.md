# 오윤 테라코타 기금마련전 설계

- 작성일: 2026-07-01
- 상태: 설계 확정 (구현 대기)
- 관련 메모리: `project_event_registration_oh_yoon_memorial`, `project_gallery_rendering_architecture`, `project_cafe24_shutdown_toss_only`, `feedback_reuse_standard_components`

## 1. 배경 & 목표

오윤 테라코타 작품의 이전 비용을 마련하기 위해, **씨앗페 상시 출품 작가들이 자발적으로 자신의 작품을 내놓는 기금마련전**을 연다. 판매 수익은 오윤 테라코타 이전 기금으로 쓰인다.

이 기금마련전은 기존 오윤 콘텐츠(`/event/oh-yoon-memorial` 추도식, `/petition/oh-yoon` 청원, 오윤 본인 사후판화)와 **별개**다. 여기서 파는 작품은 오윤의 작품이 아니라 **동료 작가들이 연대해 내놓은 자기 작품**이다.

### 테라코타 스토리는 이미 코드베이스에 있음 (재사용)

오윤 1974년 옛 상업은행 구의동지점 **테라코타 양면 부조**의 멸실 위기와 보존 서사는 이미 존재한다 — 새로 쓰지 않고 **재사용·링크**한다:

- [`app/[locale]/petition/oh-yoon/page.tsx`](../../../app/[locale]/petition/oh-yoon/page.tsx) — "벽화 지키기 청원", 1974 구의동 테라코타 양면 부조, 멸실 위기 서사, 구조화 데이터.
- [`components/special/master-artists/OhYoonFeature.tsx`](../../../components/special/master-artists/OhYoonFeature.tsx) — 오윤 전기·타임라인(테라코타 부조 제작 언급).
- 관련 매거진/청원 콘텐츠(`content/articles/오윤-청원-*.md`, `content/artist-articles.ts`).

### 해결할 핵심 문제

1. **구분 혼란**: 한 작가가 씨앗페에 올린 작품 중 어느 것이 "상시 판매작"이고 어느 것이 "기금마련전 출품작"인지 헷갈림.
2. **3점 한도**: 기금마련전은 작가당 최대 3점만 받는데, 작가가 여러 점 올렸을 때 "그 3점이 무엇인지"가 흐트러짐.
3. **비참여 작가 UX 보호**: 기금마련전과 무관한 대다수 상시 판매 작가의 등록 경험이 저하되면 안 됨.
4. **회계 분리**: 기금마련전 판매를 상시 판매와 별도로 집계·기록.

## 2. 확정된 결정 (브레인스토밍 합의)

| 항목           | 결정                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| 출품 확정 주체 | **작가가 직접 선택** (최대 3점)                                                      |
| 수익 성격      | **정산 파이프라인은 상시전과 동일. 집계(리포팅)만 태그로 분리**                      |
| 노출 범위      | **양쪽 노출** — 상시 갤러리 + 기금마련전 페이지 모두                                 |
| 데이터 모델    | **접근법 A** — `artworks`에 전용 태그 컬럼 추가 (조인 테이블/별도 파이프라인 미채택) |
| 태그 진입 동선 | **기본 등록 폼에서 분리** — 전용 참여 화면으로만 진입                                |
| 판매 후 무결성 | **간단(잠금)** — 판매된 출품작은 태그 해제 불가                                      |
| 문자 발송      | **스펙 제외** (기존 Solapi/알림톡 인프라로 별도 운영)                                |

## 3. 데이터 모델

### 3.1 `artworks` 컬럼 추가

```sql
-- supabase/migrations/<timestamp>_add_artwork_exhibition.sql
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS exhibition text;

-- 태그된 작품만 인덱싱 (기금마련전 페이지·리포트 필터 최적화)
CREATE INDEX IF NOT EXISTS idx_artworks_exhibition
  ON public.artworks (exhibition)
  WHERE exhibition IS NOT NULL;
```

- `exhibition = NULL` → 상시 판매작 (기본)
- `exhibition = 'oh-yoon-terracotta'` → 기금마련전 출품작
- 한 작품은 최대 하나의 전시에만 귀속(단일 컬럼). 미래에 다대다가 필요해지면 그때 조인 테이블로 마이그레이션(YAGNI).
- RLS: 기존 "작가는 본인 작품 update 가능" 정책으로 태그 설정 가능. **잠금 규칙(판매 후 해제 불가)은 RLS가 아니라 server action에서 강제** (판매 상태 판정 로직이 앱 레벨에 있으므로).
- 마이그레이션은 `supabase/migrations/`에 파일로 작성 후 **단건 적용**(`supabase db query --linked -f <file>`). pending 여러 건일 때 `db push` 금지.

### 3.2 전시 상수 단일 출처

```ts
// lib/exhibitions.ts (신규)
export const OH_YOON_TERRACOTTA_EXHIBITION = {
  slug: 'oh-yoon-terracotta',
  maxPerArtist: 3,
  active: true, // 캠페인 기간 종료 시 false → 배너/참여 화면 숨김
  labelKo: '오윤 테라코타 기금마련전',
  labelEn: 'Oh Yoon Terracotta Relief Exhibition',
} as const;

export type ExhibitionSlug = typeof OH_YOON_TERRACOTTA_EXHIBITION.slug;
```

- 슬러그, 작가당 한도(3), 캠페인 활성 여부, 한/영 라벨의 단일 출처.
- 다음 기금마련전이 생기면 이 파일에 항목을 추가해 재사용.

## 4. 작가 참여 동선 (핵심 UX)

**원칙: 기본 작품 등록 폼(`artwork-form.tsx`)은 손대지 않는다. 기금마련전은 별도의 명시적 동선으로만 진입한다.** → 비참여 작가는 아무 변화도 겪지 않음.

### 4.1 전용 참여 화면 `/dashboard/fundraiser`

- 위치: `app/(portal)/dashboard/(artist)/fundraiser/page.tsx` (신규)
- 대시보드 네비/배너로 안내 (§4.3). `OH_YOON_TERRACOTTA_EXHIBITION.active === false`면 접근 시 "종료됨" 안내.
- 화면 구성:
  1. **스토리 헤더** — 오윤 테라코타 이전 취지를 담아 작가에게 안내이자 감동이 되게. **새 카피를 쓰지 않고 기존 오윤 테라코타 콘텐츠(§1의 petition/OhYoonFeature)를 재사용·요약**하고 `/petition/oh-yoon`으로 링크. (유틸 화면이 아니라 "마음을 담아 출품하는 경험") 표준 컴포넌트(`Section` 톤)로 구성하되 대시보드 내부용.
  2. **선택 UI** — 작가 본인 작품 목록을 카드로 나열, 각 카드에 체크박스. 상단에 **"기금마련전 출품 2/3"** 카운터.
  3. **저장** — 선택을 저장하면 태그 반영.
- **3점 초과 방지**: 3점 선택 시 나머지 체크박스 비활성 + 안내. 4점째 시도 시 명확한 안내 문구.
- **잠금 표시**: 이미 판매된 출품작은 "판매됨 · 출품 확정"으로 잠금 표시, 체크 해제 불가(§6).
- **새 작품을 출품하려면**: 이 참여 화면의 "새 작품 등록하고 출품" 버튼 → 표준 등록 폼을 `?exhibition=oh-yoon-terracotta` 쿼리로 오픈. **그 진입 경로에서만** 폼이 "이 작품은 기금마련전에 출품됩니다" 확정 상태(읽기 전용 안내 배지)를 노출하고, 저장 후 참여 화면으로 복귀. 폼의 기본 모습은 불변(비참여 작가는 파라미터 없이 진입하므로 아무 변화 없음). → **진입점은 항상 기금마련전 참여 페이지**로 단일 유지.

### 4.2 서버 액션

```ts
// app/actions/artwork.ts 또는 app/actions/fundraiser.ts (신규 분리 권장)
// 배치 저장 방식
setFundraiserSelection(selectedArtworkIds: string[]): Promise<ActionState>
```

검증 순서:

1. 인증된 작가의 `artist_id` 확인.
2. `selectedArtworkIds`가 모두 본인 작품인지 확인 (아니면 거부).
3. **잠금 유지**: 현재 태그+판매된 작품은 반드시 선택에 포함돼야 함(누락 시 자동 유지 또는 거부). 판매된 출품작의 태그는 절대 제거하지 않음.
4. **한도**: 최종 태그 개수 `<= maxPerArtist(3)`. 초과 시 i18n 에러.
5. 선택된 작품 `exhibition = slug`, 선택 해제된(잠금 아닌) 작품 `exhibition = NULL`로 갱신.

- 표준 폼 경유 신규 등록(참여 화면에서 `?exhibition=` 진입)의 경우 `createArtwork`가 태그를 설정하되 **동일한 3점 한도·소유권 검증을 재적용**.
- `updateArtwork`는 기존 `exhibition` 값을 **보존**(`.update({...})`에 exhibition 미포함)하고, 잠금 규칙 위반 변경을 거부.

### 4.3 대시보드 안내 배너

- `OH_YOON_TERRACOTTA_EXHIBITION.active`일 때만, 작가 대시보드 상단에 dismiss 가능한 캠페인 배너("🌱 오윤 테라코타 기금마련전 — 출품하기" → `/dashboard/fundraiser`).
- 비참여 작가는 dismiss로 제거 가능. 기간 한정.
- SMS의 "출품하세요" 링크도 이 화면(`/dashboard/fundraiser`)을 가리킴.

## 5. 공개 노출

### 5.1 기금마련전 공개 페이지

- 위치: `app/[locale]/exhibition/oh-yoon-terracotta/page.tsx` (신규)
  - 경로명은 크라우드펀딩(`/funding`)과 구분하기 위해 `exhibition` 사용. (조정 가능)
- 구성: `PageHero`(오윤 테라코타 취지) + `exhibition='oh-yoon-terracotta' AND is_hidden=false`인 **전 작가 작품**을 표준 `ArtworkGridCard` 그리드로. 다작가 테마전 → 거장(단일작가) 갤러리와 다름.
- **스토리는 재사용·링크** — 테라코타 서사는 §1의 기존 콘텐츠(petition/OhYoonFeature)를 재사용하고 `/petition/oh-yoon`으로 연결. 히어로에 취지 요약 + "벽화 지키기 청원" 링크. 새 서사 작성 금지.
- **표준 컴포넌트 재사용 필수** (`PageHero`, `Section`, `ArtworkGridCard`, 기존 갤러리 그리드 패턴). 인라인 히어로/카드 제작 금지.
- 데이터 헬퍼: `lib/supabase-data.ts`에 `getArtworksByExhibition(slug)` 추가 (`getSupabaseArtworksByArtist` 패턴 참고, `unstable_cache` + `cache` 래핑, `is_hidden=false` 자동 필터).
- **i18n**: 공개 라우트 → `messages/ko.json`·`messages/en.json`에 메시지 키 추가. 한국어 리터럴 직접 사용 금지. `force-static` 사용 시 `getMessages`/`getTranslations`에 `{locale}` 명시 (메모리 `project_i18n_force_static_locale`).
- **Header 투명화**: `lib/hero-routes.ts`의 `HERO_EXACT`에 `/exhibition/oh-yoon-terracotta` 추가 + `__tests__/lib/hero-routes.test.ts` 케이스 추가.
- **a11y**: `e2e/a11y/`에 spec 추가 (신규 공개 페이지 필수, e2e-a11y가 머지 전 차단). CTA는 `<Button variant="primary">`.

### 5.2 상시 갤러리

- **변경 없음**. "양쪽 노출"이므로 메인/상시 갤러리 쿼리는 출품작을 특별 취급하지 않고 그대로 노출.

### 5.3 크라우드펀딩과의 관계 (별개 공존 + 상호 연결)

오윤 테라코타 이전을 위한 모금 수단은 두 갈래로 **공존**한다:

1. **크라우드펀딩** (`/funding/oh-yoon-terracotta`) — 기존 텀블벅형 플랫폼(`app/[locale]/funding/[slug]`, `funding_*` 테이블, 리워드형 카드 후원). **이미 구현됨.**
2. **기금마련전** (`/exhibition/oh-yoon-terracotta`) — 작가가 자기 작품을 내놓아 **판매**, 수익이 기금. (이 스펙)

- **명명 구분**: 라우트 네임스페이스가 다르므로(`/funding/` vs `/exhibition/`) 슬러그 `oh-yoon-terracotta` 재사용 OK. `exhibition` 태그 값도 `'oh-yoon-terracotta'` 유지.
- **상호 연결(필수)**:
  - **기금마련전 → 크라우드펀딩**: 기금마련전 공개 페이지에 "직접 후원하기 → `/funding/oh-yoon-terracotta`" 링크를 **코드로** 추가(이 페이지는 이 캠페인 전용 하드코딩이라 안전).
  - **크라우드펀딩 → 기금마련전**: 펀딩 플랫폼은 범용이라 코드로 링크 박지 않음. 해당 캠페인의 **admin 작성 콘텐츠(설명 본문)에 `/exhibition/oh-yoon-terracotta` 링크를 넣는 운영 작업**으로 처리(펀딩 플랫폼 코드 무수정). → 이 스펙의 코드 범위는 기금마련전 쪽 링크만.
- 펀딩 플랫폼 코드는 **손대지 않음**.

## 6. 판매 후 무결성 (잠금 방식)

문제: 집계는 "현재 `exhibition` 태그가 붙은 판매작"을 세는데, 태그가 사후에 바뀌면 과거 모금액이 소급 왜곡됨.

해결(간단·잠금):

- **작품이 기금마련전 태그를 단 채로 판매되면(`status='sold'` 또는 `manual_sold_override=true`), 그 태그는 이후 제거·변경 불가.**
- 강제 지점: `setFundraiserSelection`(선택에서 판매된 출품작이 빠지면 거부) + `createArtwork`/`updateArtwork`(태그 해제/변경 거부).
- 참여 화면(§4.1)에서는 해당 작품을 "판매됨 · 출품 확정" 잠금 카드로 표시.
- 결과: 판매 후 태그가 불변이므로 조인 기반 집계가 항상 정확. (추후 감사수준 원장이 필요하면 `order_items` 스냅샷으로 업그레이드.)

## 7. 별도 집계 — 기존 Admin 화면에 통합 (신규 페이지 없음)

**원칙: 기금마련전 전용 admin 페이지를 새로 만들지 않는다.** 이미 있는 매출/작품 관리 화면에 필터·컬럼으로 흡수한다. (admin은 한국어 전용 — i18n 비스코프.)

- **`app/(portal)/admin/revenue`** (기존 매출 화면 — `RevenueFilterBar`·`RevenueCharts`·`MonthlyRevenueChart`):
  - `RevenueFilterBar`에 **전시(exhibition) 필터 차원** 추가 — "전체 / 상시 / 오윤 테라코타 기금마련전".
  - 기금마련전 선택 시 그 태그의 매출만 집계·차트. 여기서 **총 모금액·기간별·작가별**을 본다. → "별도로 기록"의 실체.
- **`app/(portal)/admin/artworks`** (기존 작품 관리):
  - 목록에 `exhibition` 태그 **뱃지/필터** 노출 — 운영진이 어떤 작품이 출품작인지 보고 관리(필요 시 태그 수정).
- 쿼리: `artworks` where `exhibition='oh-yoon-terracotta'` 기준. 매출 정밀 대조는 `order_items → artworks` 조인(신규 판매는 전부 토스/체크아웃 → `order_items` 존재; 메모리 `project_cafe24_shutdown_toss_only`).
- **정산 파이프라인 무수정** — 태그 필터로 읽기만. `admin/funding`(크라우드펀딩)과 혼동 금지 — 별개 기능.

## 8. 영향 범위 요약

| 구분          | 파일/위치                                                       | 변경                                                                        |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| DB            | `supabase/migrations/<ts>_add_artwork_exhibition.sql`           | 신규 컬럼 + 인덱스                                                          |
| 타입          | `types/supabase.ts`, `types/index.ts`                           | `exhibition` 필드 반영                                                      |
| 상수          | `lib/exhibitions.ts`                                            | 신규                                                                        |
| 데이터        | `lib/supabase-data.ts`                                          | `getArtworksByExhibition` 추가                                              |
| 작가 참여     | `app/(portal)/dashboard/(artist)/fundraiser/page.tsx`           | 신규 참여 화면                                                              |
| 서버 액션     | `app/actions/fundraiser.ts` (or `artwork.ts`)                   | `setFundraiserSelection` + 잠금/한도 검증                                   |
| 등록 폼       | `artwork-form.tsx`, `app/actions/artwork.ts`                    | `?exhibition=` 진입 시에만 태그 확정 배지; create/update가 한도·잠금 재검증 |
| 대시보드 배너 | 작가 대시보드 레이아웃/네비                                     | 캠페인 배너                                                                 |
| 공개 페이지   | `app/[locale]/exhibition/oh-yoon-terracotta/page.tsx`           | 신규                                                                        |
| Header        | `lib/hero-routes.ts` + `__tests__/lib/hero-routes.test.ts`      | hero 경로 등록                                                              |
| i18n          | `messages/ko.json`, `messages/en.json`                          | 공개 페이지·작가 화면 메시지                                                |
| a11y          | `e2e/a11y/`                                                     | 신규 spec                                                                   |
| Admin (통합)  | `app/(portal)/admin/revenue/*`, `app/(portal)/admin/artworks/*` | 기존 화면에 전시 필터·태그 컬럼 추가 (신규 페이지 없음)                     |

## 9. 테스트 계획

- **단위**: 3점 한도 강제, 소유권 검증, 판매 후 잠금(태그 해제 거부) — server action 테스트.
- **hero-routes**: 신규 공개 경로 케이스.
- **a11y(e2e)**: 신규 공개 페이지 spec (`bg-primary` 대비 규칙, `Button variant="primary"`).
- **데이터 헬퍼**: `getArtworksByExhibition` 필터(`is_hidden` 제외) 검증.
- 회귀: 기본 등록 폼이 비참여 작가에게 불변인지(스냅샷/시각 확인은 사용자에게 요청 — Playwright 금지).

## 10. 범위 밖 (YAGNI / 후속)

- 전시 메타데이터 테이블(제목·기간·목표액) — 단일 기금마련전은 페이지 하드코딩으로 충분.
- 다대다 전시:작품 조인 테이블.
- `order_items` 스냅샷 원장(감사수준) — 잠금 방식으로 v1 충족.
- 공개 페이지의 실시간 모금 진행바 — admin 집계 우선, 필요 시 후속.
- 전체 작가 문자 발송 — 기존 인프라로 별도 운영.
