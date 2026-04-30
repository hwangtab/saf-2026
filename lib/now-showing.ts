/**
 * Now Showing — 시한성 큐레이션 전시·캠페인 데이터.
 *
 * 메인 페이지 hero 직하 섹션에 노출되며, endDate가 지난 항목은 자동 제외.
 * 새 전시 추가 시 이 배열에 항목 추가 + messages/ko.json·en.json의
 * `home.nowShowing.{i18nKey}Title|Desc|Status|Cta` 키 4종 추가.
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
}

export const NOW_SHOWING: NowShowingItem[] = [
  // 1번 — 본업: 전체 작품 페이지로 유도. 항상 첫 슬라이드, 구매 직결.
  {
    slug: 'all-artworks',
    i18nKey: 'allArtworks',
    href: '/artworks',
    // 강석태 「부드러운 바람이 불던 날」 (id 82) — SAF 인기 라인업 비주얼
    imageUrl:
      'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/ad5f81de-e946-4883-b8c0-59e7756fb8a8/82__original.webp',
    startDate: '2026-01-01',
    status: 'on',
  },
  {
    slug: 'oh-yoon-40th',
    i18nKey: 'ohYoon40th',
    href: '/special/oh-yoon',
    imageUrl:
      'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8/151__original.webp',
    startDate: '2026-04-01',
    status: 'on',
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
  },
];

export function getActiveShowingItems(now: Date = new Date()): NowShowingItem[] {
  return NOW_SHOWING.filter((item) => {
    if (item.endDate && new Date(item.endDate) < now) return false;
    return true;
  });
}
