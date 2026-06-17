/**
 * Now Showing — 시한성 큐레이션 전시·캠페인 데이터.
 *
 * 메인 페이지 hero(`HomeHero`) + hero 직하 `NowShowing` 그리드 양쪽에서 사용.
 * endDate가 지난 항목은 자동 제외.
 *
 * 새 전시 추가 시 이 배열에 항목 추가 + messages/ko.json·en.json의
 * `home.nowShowing.{i18nKey}Title|Desc|Status|Cta` 키 4종 추가.
 *
 * **HeroSpotlight 폐기 이력 (2026-05-12)**: 과거 hero 슬라이더(embla)에서 발생한 PSI mobile
 * LCP 회귀 4종(server island/idleCallback/DOM enhance/font preload:false) 본질 회피를 위해
 * hero를 정적 단일 이미지로 단순화. 이 모듈은 hero가 어떤 슬라이드를 띄울지 결정하는
 * `getHeroSlide()`와 fold-below 그리드용 `getNowShowingCards()` 두 가지 셀렉터를 제공.
 */
export type NowShowingStatus = 'on' | 'coming-soon';

export type HeroTreatment = 'auto' | 'soft' | 'sharp';

export interface HeroImageQuality {
  width: number;
  height: number;
  lowRes: boolean;
}

export type HeroImageQualityMap = Record<string, HeroImageQuality>;

export interface NowShowingItem {
  slug: string;
  /** messages/{locale}.json `home.nowShowing.{i18nKey}{Title|Desc|Status|Cta}` prefix */
  i18nKey: string;
  /** 클릭 가능 시 페이지 경로. null이면 카드는 비활성(준비 중) 상태로 렌더 */
  href: string | null;
  /** 카드 비주얼 — Supabase storage URL 또는 public 이미지 */
  imageUrl: string;
  /** ISO date string (YYYY-MM-DD) */
  startDate: string;
  /** 종료일 — 지나면 자동 숨김. 무기한이면 생략 */
  endDate?: string;
  /**
   * 카드 배지 상태 override (optional).
   * - 미지정(default): `getCardStatus()`가 startDate 기준 자동 derive
   *   ('coming-soon' if startDate > now, else 'on')
   * - 지정 시: 자동 derive 무시하고 그대로 사용. 예외 케이스(예: 일시 중단, 준비 중 메시지)에만
   */
  status?: NowShowingStatus;
  /**
   * Hero 슬롯 우선순위. 활성 항목 중 값이 가장 높은 1개가 `HomeHero`의 단일 정적 LCP 이미지가 된다.
   * 모든 활성 항목이 동률이거나 미지정이면 배열 순서를 따른다.
   *
   * - `0` (또는 미지정) — 평상시 fallback (강석태 슬라이드: "예술인 동료를 위해 내놓은 작품")
   * - `5`~`10` — 활성 특별전. 특별전 기간엔 자동으로 hero를 점유.
   *
   * fold-below 그리드(`getNowShowingCards()`)는 priority와 무관하게 모든 활성 항목 노출.
   */
  heroPriority?: number;
  /**
   * 히어로 배경 연출 모드.
   * - 'auto'(기본/미지정): 빌드 타임 해상도 측정 결과대로. lowRes면 자동 블러 연출.
   * - 'soft': 측정 무시하고 강제 연출. 해상도는 충분하나 초점이 나간 사진 등 자동이 못 잡는 케이스.
   * - 'sharp': 측정 무시하고 연출 off. 자동 판정 오탐 시 탈출구.
   */
  heroTreatment?: HeroTreatment;
}

const STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

export const NOW_SHOWING: NowShowingItem[] = [
  // 1번 — 본업: 전체 작품 페이지로 유도. 평상시 hero fallback, 구매 직결.
  {
    slug: 'all-artworks',
    i18nKey: 'allArtworks',
    href: '/artworks',
    // 강석태 「부드러운 바람이 불던 날」 (id 82) — SAF 인기 라인업 비주얼
    imageUrl: `${STORAGE}/artworks/ad5f81de-e946-4883-b8c0-59e7756fb8a8/82__original.webp`,
    startDate: '2026-01-01',
    heroPriority: 0,
  },
  {
    slug: 'oh-yoon-40th',
    i18nKey: 'ohYoon40th',
    href: '/artworks/artist/오윤',
    imageUrl: `${STORAGE}/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8/151__original.webp`,
    startDate: '2026-04-01',
    // PM 확정: 오윤 40주기 commemoration 2026년 말일까지. 2027-01-01 자동 fallback (강석태 hero).
    endDate: '2026-12-31',
    heroPriority: 0,
  },
  {
    slug: 'park-saenggwang-drawings',
    i18nKey: 'parkSaenggwang',
    href: '/artworks/artist/박생광',
    imageUrl: `${STORAGE}/artworks/c8839e5b-46a9-490d-a142-74f6d2b99be7/273__original.webp`,
    // PM 확정 (공식 포스터): 박생광 드로잉전 2026-05-20(수) 개막 ~ 2026-06-28(일) 폐막. (회기 연장: 6-08 → 6-28)
    // 장소: 갤러리 PEG (서울시 은평구 통일로 870 M타워 6층). 관람 11am~8pm. (i18n parkSaenggwangDesc 참조)
    startDate: '2026-05-20',
    endDate: '2026-06-28',
    // status 미지정 — getCardStatus()가 startDate 기준 자동 derive.
    // 5/20 이전엔 'coming-soon'(어두운 톤 배지), 5/20 ~ 6/28 동안 'on'(success 배지 + ping dot).
    heroPriority: 5,
  },
];

/**
 * **운영 정책 (2026-05-12 PM 회의 결정)**
 *
 * - **영구 fallback** (강석태 `all-artworks`): `heroPriority: 0` + `endDate` 없음.
 *   다른 항목 모두 만료/비활성 시 hero를 영구 점유.
 * - **시한성 특별전** (oh-yoon-40th, park-saenggwang 등): `heroPriority >= 5` + **`endDate` 필수**.
 *   endDate 누락 시 영구 hero 점유 → fallback 복귀 불가 (회귀 패턴).
 * - **미래 시작 항목**: `startDate` 미래로 지정 시 `getActiveShowingItems()` 필터에 의해
 *   해당 일자까지 자동 숨김 + 활성 풀에서 제외.
 *
 * 신규 특별전 추가 절차:
 * 1. NOW_SHOWING 배열에 항목 추가 (slug, i18nKey, href, imageUrl, startDate, endDate, status, heroPriority).
 * 2. messages/{ko,en}.json `home.nowShowing.{i18nKey}{Title|Desc|Status|Cta}` 4종 추가.
 * 3. 특별전이 끝나면 endDate 도달로 자동 fallback. 별도 코드 수정 X.
 */

export function getActiveShowingItems(now: Date = new Date()): NowShowingItem[] {
  return NOW_SHOWING.filter((item) => {
    if (item.endDate && new Date(item.endDate) < now) return false;
    if (item.startDate && new Date(item.startDate) > now) return false;
    return true;
  });
}

/**
 * `HomeHero`의 단일 정적 LCP 슬라이드를 결정.
 *
 * 활성 항목(`endDate` 미경과) 중 `heroPriority`가 가장 높은 1개. 동률이면 배열 첫 항목.
 * 활성 항목이 없으면 배열의 첫 항목(평상시 fallback). 빈 배열 보호.
 *
 * **특별전 기간 자동 전환 UX**: 활성 특별전(`heroPriority >= 5`)이 있으면 hero가 자동으로
 * 그 슬라이드로 교체된다. 특별전이 끝나면 `endDate` 필터에 의해 자동으로 fallback(priority 0,
 * 강석태 작품)으로 복귀. 코드 수정 없이 데이터만으로 hero가 시즌에 맞춰 갱신.
 */
export function getHeroSlide(now: Date = new Date()): NowShowingItem {
  const active = getActiveShowingItems(now);
  const pool = active.length > 0 ? active : NOW_SHOWING;
  // 빈 배열 안전장치 — 데이터가 완전히 비면 throw 대신 첫 fallback이 반드시 존재한다고 가정.
  // NOW_SHOWING이 빈 배열일 가능성은 데이터 정의상 0 (강석태 fallback이 영구 보장).
  return [...pool].sort((a, b) => (b.heroPriority ?? 0) - (a.heroPriority ?? 0))[0];
}

/**
 * fold-below "Now Showing" 그리드에 노출할 카드 목록.
 *
 * **`getActiveShowingItems()`와 다른 점**: `startDate` 미래(coming-soon) 항목도 노출한다.
 * 박생광 드로잉전처럼 "곧 시작" 예고 카드는 그리드에 미리 보여 사용자 기대감 형성.
 * 만료(endDate < now)만 필터.
 *
 * hero 선택(`getHeroSlide()`)은 별도로 활성(`getActiveShowingItems()`) 풀에서만 결정하므로
 * coming-soon 항목이 hero를 점유하지 않는다 — 그리드 카드만 미리 노출.
 *
 * status 'coming-soon'은 카드 UI에서 자동으로 "준비 중" 배지(어두운 톤) + 클릭 가능
 * (작가 페이지 등 임시 진입처)으로 렌더된다.
 */
export function getNowShowingCards(now: Date = new Date()): NowShowingItem[] {
  return NOW_SHOWING.filter((item) => {
    if (item.endDate && new Date(item.endDate) < now) return false;
    return true;
  });
}

/**
 * 카드 배지 상태 자동 derive.
 *
 * - `item.status` 명시 지정 시 그대로 사용 (예외 케이스 override).
 * - 미지정 시: `startDate`가 미래면 'coming-soon', 아니면 'on'.
 *
 * 이전엔 entry 정의에 `status: 'on'` 또는 `'coming-soon'` 하드코딩이라 시작일 도래해도
 * 수동 변경 필요했음(잊으면 카드 색상이 어색). 자동 derive로 코드 수정 없이 시즌 자동 전환.
 */
export function getCardStatus(item: NowShowingItem, now: Date = new Date()): NowShowingStatus {
  if (item.status) return item.status;
  if (item.startDate && new Date(item.startDate) > now) return 'coming-soon';
  return 'on';
}

/**
 * 히어로 배경에 soft 연출(블러+짙은 오버레이)을 적용할지 결정.
 *
 * - heroTreatment 'sharp' → 항상 false (자동 오탐 탈출구)
 * - heroTreatment 'soft' → 항상 true (자동이 못 잡는 초점 흐림 등 수동 강제)
 * - 'auto'/미지정 → 빌드 타임 측정 결과(qualityMap[slug].lowRes)를 따른다.
 *   측정값이 없으면(미측정/측정 실패) false = 평소대로 렌더(안전 폴백).
 */
export function resolveHeroSoftTreatment(
  item: NowShowingItem,
  qualityMap: HeroImageQualityMap
): boolean {
  const treatment = item.heroTreatment ?? 'auto';
  if (treatment === 'sharp') return false;
  if (treatment === 'soft') return true;
  return qualityMap[item.slug]?.lowRes === true;
}
