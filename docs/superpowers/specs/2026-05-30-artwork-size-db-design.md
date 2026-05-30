# 작품 사이즈 구조화 DB + 호수 기반 정보·큐레이션 — 설계서

- **작성일**: 2026-05-30
- **상태**: 설계 확정 (Phase 1 구현 대상)
- **범위**: SAF 2026 작품(`artworks`)의 크기 데이터를 평문 텍스트에서 구조화 DB로 전환하고, 호수(號) 기반으로 정확한 크기 정보 제공 + 크기 필터·정렬을 구현한다.

---

## 1. 배경 / 목적

현재 작품 크기는 Supabase `artworks.size` **단일 `text` 컬럼**에 평문(`72.7x60.6cm`)으로만 저장된다. 구조화 치수(가로/세로/깊이)가 없어:

- 크기 기반 **필터·정렬·집계가 불가능** (DB 쿼리로 못 함)
- 크기 정보를 사용자에게 **정확·일관되게** 제공하기 어려움
- 한국 미술시장의 표준 언어인 **호수(號)** 정보가 cm 정규화 과정에서 소실됨

목표: size를 구조화 DB로 만들어 (1) 정확한 크기 정보 제공, (2) 호수 기반 크기 필터·정렬, (3) (후속) 공간·용도 큐레이션의 데이터 기반을 마련한다.

### 의사결정 로그 (브레인스토밍 합의)

| 결정           | 값                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1차 목적       | 셋 다(정보·필터·큐레이션) — **데이터 기반부터 단계적**                                                           |
| 분류 척도      | **호수(號) 기준**                                                                                                |
| 호수 표기      | **근사 환산** (`약 N호`)                                                                                         |
| 호수 적용 범위 | **모든 평면(2D) 작품**. 3D 조각·도자는 높이/부피 기준 별도 처리                                                  |
| 크기 구간      | **4단계** — 소품(~10호) / 중형(10–30호) / 대형(30–100호) / 특대(100호~)                                          |
| 1차(MVP) 표현  | **텍스트 정밀화 중심** — cm + 근사 호수 + 면적 + 구간 라벨 + 갤러리 필터·정렬. 시각화·공간 큐레이션은 후속 Phase |
| 저장 방식      | **A안 — 구조화 컬럼 + 백필** (DB 정규 컬럼)                                                                      |

---

## 2. 현재 실태 (검증된 데이터, 2026-05-30 기준)

Supabase `artworks` (운영, `khtunrybrzntlnowlahb`), 총 **572개**:

| 구분                  | 개수 | 형태                                            |
| --------------------- | ---- | ----------------------------------------------- |
| 표준 2D `WxHcm`       | 540  | `72.7x60.6cm`                                   |
| 3D `WxHxDcm`          | 10   | `60x60x130cm`, `32x140x500cm`(대형 설치) 등     |
| placeholder `확인 중` | 20   | —                                               |
| 오타/엣지             | 2    | `23.9x,35.2cm`(쉼표), `24.918.5cm`(구분자 누락) |

- `size`는 단일 `text` 컬럼. 호(號) 표기 0개 — `scripts/normalize-artwork-sizes.js`가 이미 cm로 정규화 완료.
- mm·inch·호 잔존 표기 없음. 단위는 전부 cm.
- 크기 기반 정렬/필터/큐레이션 **현재 없음**.
- admin 입력은 자유 텍스트 1칸 (`artwork-edit-form.tsx`).
- 데이터 단일 출처는 **Supabase**. `content/saf2026-artworks.ts`는 Supabase 불가 시 fallback.

### 구간 분포 (표준 2D 539개 기준)

| 구간           | 개수 | 비율 | 면적범위(cm²)  |
| -------------- | ---- | ---- | -------------- |
| 소품(~10호)    | 366  | 64%  | 81 – 2,412     |
| 중형(10–30호)  | 136  | 24%  | 2,436 – 6,598  |
| 대형(30–100호) | 37   | 6%   | 6,608 – 20,430 |
| 특대(100호~)   | 0    | 0%   | —              |

→ **특대(100호 초과)는 0건.** 통념(100호↑=전시급)상 자연스러움. 경계는 통념 유지, **0건 구간은 필터 UI에서 동적 숨김**.

종횡비 극단(긴변/짧은변 > 2.2): **14건** (`180x30cm` 6:1, `4.7x25.5cm` 등). → 호수 환산 부적합 → `confident=false` 처리.

---

## 3. 데이터 모델 — Supabase `artworks` 컬럼 추가

마이그레이션 1건 (`supabase/migrations/` 파일 작성 → MCP `apply_migration`로 단건 적용).

| 컬럼          | 타입           | Null | 의미                                                   |
| ------------- | -------------- | ---- | ------------------------------------------------------ |
| `width_cm`    | `numeric(7,2)` | YES  | 가로 (cm)                                              |
| `height_cm`   | `numeric(7,2)` | YES  | 세로 (cm)                                              |
| `depth_cm`    | `numeric(7,2)` | YES  | 깊이 (cm) — 3D 작품만 채움                             |
| `size_bucket` | `text`         | YES  | `small`/`medium`/`large`/`xlarge`/`object` (쿼리 캐시) |

원칙:

- 기존 `size` text 컬럼은 **표시용 원본(raw)으로 영구 유지**. 삭제·이전 안 함.
- `(width_cm, height_cm)` 복합 인덱스 + `size_bucket` 인덱스 → DB 필터·정렬.
- `size_bucket`의 **단일 출처는 코드(`lib/artwork-size.ts`)**, DB 컬럼은 백필된 캐시. 구간 경계가 바뀌면 재백필 스크립트로 동기화.
- `width_cm`/`height_cm` CHECK 제약: `> 0` (양수). depth는 양수 또는 NULL.

---

## 4. 도메인 로직 — `lib/artwork-size.ts` (신규, 단일 출처)

순수 함수 모듈. size 관련 모든 파싱·환산·분류·표시는 여기 한 곳을 import. 기존 `lib/artwork-material.ts`의 `getSizeLabel`/`SIZE_EN_MAP`은 이 모듈로 흡수·대체.

### 4.1 표준 호수표 (F형 기준)

면적 환산 기준표 — 코드 상수 `HO_TABLE`:

| 호  | cm (F형)  | 면적(cm²) | 호  | cm (F형)    | 면적(cm²) |
| --- | --------- | --------- | --- | ----------- | --------- |
| 1   | 22.7×15.8 | 359       | 30  | 90.9×72.7   | 6,608     |
| 2   | 25.8×17.9 | 462       | 40  | 100.0×80.3  | 8,030     |
| 3   | 27.3×22.0 | 601       | 50  | 116.8×91.0  | 10,629    |
| 4   | 33.4×24.2 | 808       | 60  | 130.3×97.0  | 12,639    |
| 5   | 34.8×27.3 | 950       | 80  | 145.5×112.1 | 16,311    |
| 6   | 40.9×31.8 | 1,301     | 100 | 162.2×130.3 | 21,135    |
| 8   | 45.5×37.9 | 1,724     | 120 | 193.9×130.3 | 25,265    |
| 10  | 53.0×45.5 | 2,412     | 150 | 227.3×181.8 | 41,323    |
| 12  | 60.6×50.0 | 3,030     | 200 | 259.1×193.9 | 50,239    |
| 15  | 65.1×53.0 | 3,450     | 300 | 290.9×218.2 | 63,474    |
| 20  | 72.7×60.6 | 4,406     | 500 | 333.3×248.5 | 82,825    |
| 25  | 80.3×65.2 | 5,236     |     |             |           |

### 4.2 공개 API (시그니처)

```ts
export interface Dimensions {
  width: number;
  height: number;
  depth: number | null;
}
export type SizeBucket = 'small' | 'medium' | 'large' | 'xlarge' | 'object';

// 레거시 size text → 구조화 치수. 파싱 실패 시 null (placeholder/오타).
export function parseSizeText(raw: string | null | undefined): Dimensions | null;

// 면적 최근접 호수 + 신뢰도. 3D(depth!=null)이거나 종횡비 극단이면 confident=false 또는 null.
export function estimateHo(
  d: Pick<Dimensions, 'width' | 'height'>
): { ho: number; confident: boolean } | null;

// 구간 분류. depth 있으면 'object'. 면적 기반 4단계.
export function classifyBucket(d: Dimensions): SizeBucket;

// 면적(cm²) — 2D 한정.
export function area(d: Pick<Dimensions, 'width' | 'height'>): number;

// 표시 라벨 (i18n). 예: "72.7×60.6cm · 약 20호 · 중형" / "72.7×60.6cm · Size 20 · Medium"
export function formatSizeLabel(
  input: {
    size: string;
    width_cm?: number | null;
    height_cm?: number | null;
    depth_cm?: number | null;
  },
  locale: 'ko' | 'en'
): string;
```

### 4.3 호수 환산 알고리즘 + 신뢰도 가드

1. `depth != null`(3D) → 호수 미적용, `null` 반환.
2. 면적 = `width * height`. `HO_TABLE`에서 면적 차이 최소인 호수 선택.
3. **신뢰도 가드** — `ratio = max(w,h)/min(w,h)`:
   - `ratio > 2.2` → `confident=false` (호수 표기 생략, cm+구간만 노출)
   - 그 외 → `confident=true`, `약 N호` 표기
   - (정사각 ratio≈1.0은 S형 변형으로 confident 처리)
4. placeholder/파싱 실패 → `null`.

### 4.4 구간 경계 (면적 기준, 호수 통념 매핑)

| bucket   | 조건                  | 호수 의미 |
| -------- | --------------------- | --------- |
| `object` | depth != null (3D)    | 입체      |
| `small`  | area ≤ 2,412          | ~10호     |
| `medium` | 2,412 < area ≤ 6,608  | 10–30호   |
| `large`  | 6,608 < area ≤ 21,135 | 30–100호  |
| `xlarge` | area > 21,135         | 100호~    |

placeholder/치수 미상 → bucket `null` (필터에서 제외).

---

## 5. 백필 전략

`scripts/backfill-artwork-dimensions.ts` (신규). 기존 `normalize-artwork-sizes.js` 패턴(dry-run → apply 2단계) 준수.

- `--dry`(기본): 변경 없이 파싱 결과·구간 분포·실패 목록 리포트.
- `--apply`: MCP 또는 service-role로 `width_cm/height_cm/depth_cm/size_bucket` UPDATE.

처리 분기:

| 입력                                  | 처리                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| 표준 2D 540                           | width/height/bucket 채움, depth NULL                                              |
| 3D 10                                 | width/height/depth 채움, bucket=`object`                                          |
| placeholder `확인 중` 20              | 전부 NULL, raw `size`만 유지                                                      |
| 오타 2 (`23.9x,35.2cm`, `24.918.5cm`) | **자동 추측 금지.** 수동 교정 목록으로 리포트 → 확인 후 `size` 원본 수정 → 재백필 |

검증: 백필 후 `width_cm IS NOT NULL` 카운트 = 550(표준+3D), `size_bucket` 분포가 §2.1 분포와 일치하는지 SQL 재확인.

---

## 6. Admin 입력 폼

`app/(portal)/admin/artworks/artwork-edit-form.tsx`:

- 자유 텍스트 1칸 → **가로/세로/깊이(cm) 3개 numeric 필드 + 실시간 미리보기**(`formatSizeLabel` 결과 표시).
- 저장 시: 3필드로 `size` 텍스트 자동 합성(`WxHcm` / `WxHxDcm`) + `width_cm/height_cm/depth_cm/size_bucket` 동시 기록.
- 깊이 비우면 2D로 간주(depth NULL). 치수 미상이면 "확인 중" 체크 → 전부 NULL + `size='확인 중'`.
- → `24.918.5cm` 같은 입력 오타 엣지 **원천 차단**.
- admin은 한국어 유지 (i18n 비대상, CLAUDE.md 정책).

---

## 7. 공개 표시 (i18n 필수)

작품 상세·갤러리 카드에서 `formatSizeLabel` 사용:

- 형태: `72.7×60.6cm · 약 20호 · 중형` (KO) / `72.7×60.6cm · Size 20 · Medium` (EN)
- 호수 `confident=false`면 `약 N호` 생략 → `180×30cm · 대형`.
- 3D: `60×60×130cm · 입체` / `... · 3D`.
- placeholder: `확인 중` / `TBD` (기존 동작 유지).
- `messages/ko.json`·`en.json`에 구간 라벨(소품/중형/대형/특대/입체), `약 {n}호`, `Size {n}` 키 추가.
- 구분자 `×`(U+00D7) 표준화(표시 한정, raw는 `x` 유지).

영향 컴포넌트: `components/ui/ArtworkCard.tsx`, `components/features/ArtworkGridCard.tsx`, `components/features/ArtworkCategoryGrid.tsx`, 작품 상세 페이지.

---

## 8. 갤러리 필터·정렬

`/artworks` 갤러리:

- **크기 구간 필터 칩**: 소품/중형/대형/특대/입체. **0건 구간 칩은 동적 숨김.**
- **크기순 정렬** 옵션 추가(`SortOption`에 `size-asc`/`size-desc`). 면적(2D)·긴변 기준.
- 서버 쿼리: `WHERE size_bucket = ?`, `ORDER BY width_cm * height_cm`. (갤러리 렌더링 아키텍처 단일 출처 준수 — `lib/supabase-data.ts`).
- 신규 UI → `e2e/a11y/`에 spec 추가 (CLAUDE.md 차단 규칙).
- 필터 칩·정렬 라벨 i18n.

---

## 9. 연동 / 정리

- `types/index.ts` `BaseArtwork`에 `width_cm?: number|null` 등 4개 필드 추가. `ArtworkCardData`에도 필요한 필드 노출.
- `lib/supabase-data.ts` SELECT에 신규 컬럼 추가.
- `lib/schemas/artwork.ts`: size 처리를 `lib/artwork-size.ts`로 일원화. SEO는 **`additionalProperty`(PropertyValue) 방식 유지** — 과거 GSC "size 개체 유형 오류" 회귀 방지를 위해 `width`/`height` 직속 필드 추가는 **하지 않음**.
- `lib/artwork-material.ts`의 `getSizeLabel`/`SIZE_EN_MAP` → `lib/artwork-size.ts`로 이관 후 호출처 교체.

---

## 10. 테스트

`__tests__/lib/artwork-size.test.ts` (신규):

- `parseSizeText`: 표준 2D / 3D / placeholder / 오타 엣지(`23.9x,35.2cm`, `24.918.5cm`) → null.
- `estimateHo`: 표준 호수 정확 매칭(`72.7x60.6` → 20호 confident), 종횡비 극단(`180x30` → confident=false), 3D → null.
- `classifyBucket`: 경계값(2412/6608/21135) 정확 분기, 3D → object.
- `formatSizeLabel`: KO/EN, confident false, 3D, placeholder.

---

## 11. Phasing

- **Phase 1 (이번 spec)**: §3~§10 전부 — 데이터 모델·백필·도메인 로직·정보 표시·필터·정렬·테스트.
- **Phase 2 (후속 spec)**: A4/명함/사람 실루엣 대비 실측 시각화 컴포넌트.
- **Phase 3 (후속 spec)**: "거실 대작"·"현관 소품" 등 공간·용도 큐레이션 컬렉션.

---

## 12. 리스크 / 미해결

- **호수 근사 정확도**: 면적 최근접 + 종횡비 가드로 대부분 신뢰 가능(데이터가 표준 호수표와 잘 일치). `약 N호` 표기로 근사임을 명시.
- **마이그레이션 적용**: 비파괴(컬럼 추가)이나 운영 DB DDL → 적용 직전 사용자 확인.
- **재백필 동기화**: 구간 경계 변경 시 `size_bucket` 캐시 재생성 필요 — 스크립트가 단일 진입점.
- **fallback 정적 파일**: `content/saf2026-artworks.ts` 경로는 구조화 컬럼 없이도 `parseSizeText`로 런타임 파싱하여 동일 표시 보장.
