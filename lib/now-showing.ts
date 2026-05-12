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
  status: NowShowingStatus;
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
}

export const NOW_SHOWING: NowShowingItem[] = [
  // 1번 — 본업: 전체 작품 페이지로 유도. 평상시 hero fallback, 구매 직결.
  {
    slug: 'all-artworks',
    i18nKey: 'allArtworks',
    href: '/artworks',
    // 강석태 「부드러운 바람이 불던 날」 (id 82) — SAF 인기 라인업 비주얼
    imageUrl:
      'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/ad5f81de-e946-4883-b8c0-59e7756fb8a8/82__original.webp',
    startDate: '2026-01-01',
    status: 'on',
    heroPriority: 0,
  },
  {
    slug: 'oh-yoon-40th',
    i18nKey: 'ohYoon40th',
    href: '/special/oh-yoon',
    imageUrl:
      'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8/151__original.webp',
    startDate: '2026-04-01',
    status: 'on',
    heroPriority: 10,
  },
  {
    slug: 'park-saenggwang-drawings',
    i18nKey: 'parkSaenggwang',
    // 드로잉전 페이지 준비 중 — 작가 페이지로 임시 진입 (작품 미리 보기)
    href: '/artworks/artist/박생광',
    imageUrl:
      'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/c8839e5b-46a9-490d-a142-74f6d2b99be7/273__original.webp',
    startDate: '2026-08-01',
    status: 'coming-soon',
    heroPriority: 5,
  },
];

export function getActiveShowingItems(now: Date = new Date()): NowShowingItem[] {
  return NOW_SHOWING.filter((item) => {
    if (item.endDate && new Date(item.endDate) < now) return false;
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
 * 현재는 `getActiveShowingItems()`와 동일하지만, 추후 hero 슬라이드 중복 노출 회피/우선순위
 * 재정렬 등이 필요해질 때 이 셀렉터만 수정하면 된다.
 */
export function getNowShowingCards(now: Date = new Date()): NowShowingItem[] {
  return getActiveShowingItems(now);
}
