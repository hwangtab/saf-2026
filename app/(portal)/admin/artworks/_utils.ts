export type ArtworkItem = {
  id: string;
  title: string;
  admin_product_name?: string | null;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  is_hidden: boolean;
  images: string[] | null;
  created_at: string | null;
  category: string | null;
  admin_tags: AdminArtworkTag[];
  artists: { name_ko: string | null } | null;
};

export type AdminArtworkTag = {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  archived_at: string | null;
};

export type StatusFilter = 'all' | 'available' | 'reserved' | 'sold';
export type VisibilityFilter = 'all' | 'visible' | 'hidden';
export type SortKey = 'artwork_info' | 'status' | 'category' | 'visibility' | 'created_at';
export type SortDirection = 'asc' | 'desc';
export type SortFilter = 'default' | 'recent' | 'oldest';

export type InitialArtworkFilters = {
  status?: string;
  visibility?: string;
  tag?: string;
  q?: string;
  sort?: string;
};

export function normalizeStatusFilter(value: string | undefined): StatusFilter {
  if (value === 'available' || value === 'reserved' || value === 'sold') return value;
  return 'all';
}

export function normalizeVisibilityFilter(value: string | undefined): VisibilityFilter {
  if (value === 'visible' || value === 'hidden') return value;
  return 'all';
}

export function normalizeQuery(value: string | undefined): string {
  return (value || '').trim();
}

export function normalizeTagFilter(value: string | undefined): string {
  return (value || '').trim();
}

export function normalizeSortFilter(value: string | undefined): SortFilter {
  if (value === 'recent' || value === 'oldest') return value;
  return 'recent';
}

export function getSortStateFromFilter(sortFilter: SortFilter): {
  key: SortKey;
  direction: SortDirection;
} {
  if (sortFilter === 'recent') {
    return { key: 'created_at', direction: 'desc' };
  }

  if (sortFilter === 'oldest') {
    return { key: 'created_at', direction: 'asc' };
  }

  return { key: 'artwork_info', direction: 'asc' };
}

export function mapSortStateToFilter(sortKey: SortKey, sortDirection: SortDirection): SortFilter {
  if (sortKey !== 'created_at') return 'default';
  return sortDirection === 'desc' ? 'recent' : 'oldest';
}

export function formatDate(dateString: string | null | undefined, locale: 'ko' | 'en') {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  // hydration mismatch(#418) 방지 2종:
  // 1) timeZone 고정: 미지정 시 서버(UTC)/브라우저(KST)가 9시간 다른 시:분을 렌더.
  // 2) hourCycle:'h23' 필수: day-period(오전/오후·AM/PM)를 쓰면 Node ICU는 일반
  //    space(U+0020), 브라우저 ICU는 narrow no-break space(U+202F)를 day-period 앞에
  //    넣어 timeZone이 같아도 텍스트가 보이지 않게 달라진다. 24시간 표기로 제거.
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}
