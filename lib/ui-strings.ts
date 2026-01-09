export const UI_STRINGS = {
  FILTERS: {
    ALL: '전체',
    SELLING: '판매중',
    SOLD: '판매완료',
  },
  SORT: {
    ARTIST_ASC: '작가명순',
    TITLE_ASC: '작품명순',
    PRICE_DESC: '가격 높은순',
    PRICE_ASC: '가격 낮은순',
  },
  SEARCH: {
    PLACEHOLDER_ARTWORKS: '작가명, 작품명으로 검색해보세요',
    PLACEHOLDER_DEFAULT: '검색어를 입력하세요...',
    NO_RESULTS_TITLE: '검색 결과가 없습니다',
    NO_RESULTS_DESC: '다른 키워드로 검색해보거나, 모든 작품을 둘러보세요.',
    RESET_BUTTON: '전체 목록 보기',
    RESULT_PREFIX: '검색 결과:',
    RESULT_SUFFIX: '개',
  },
  A11Y: {
    SORT_OPTIONS: '정렬 옵션 선택',
    FILTER_STATUS: '판매 상태 필터',
    SEARCH_LABEL: '작품 검색',
    CLEAR_SEARCH: '검색어 지우기',
    VIEW_ARTIST: '작가 작품 보기',
  },
} as const;
