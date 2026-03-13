export const UI_STRINGS_BY_LOCALE = {
  ko: {
    FILTERS: {
      ALL: '전체',
      SELLING: '판매중',
      SOLD: '판매완료',
      CATEGORY_ALL: '전체 분류',
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
    NAV: {
      TOGGLE_MENU: '메뉴 토글',
      DONATE: '조합원 가입',
      BUY_ART: '작품 구매',
      ORDER_STATUS: '주문/배송 조회',
      ARTIST_MENU: '아티스트 메뉴',
      ADMIN_DASHBOARD: '관리자 대시보드',
    },
    FOOTER: {
      LINKS: '링크',
      FOLLOW: '팔로우',
      CONTACT: '문의',
      ONLINE_GALLERY: '온라인 갤러리',
      LOAN_INFO: '상호부조 대출',
      COOP_HOME: '협동조합 홈페이지',
      PRIVACY_POLICY: '개인정보처리방침',
      TERMS_OF_SERVICE: '이용약관',
    },
    CTA: {
      DONATE_NOW: '🤝 조합원 가입하기',
      BUY_ART: '🎨 작품 구매하기',
    },
    ERROR: {
      GO_HOME: '홈으로 돌아가기',
      RETRY: '다시 시도하기',
    },
    A11Y: {
      SORT_OPTIONS: '정렬 옵션 선택',
      FILTER_STATUS: '판매 상태 필터',
      FILTER_CATEGORY: '작품 분류 필터',
      SEARCH_LABEL: '작품 검색',
      CLEAR_SEARCH: '검색어 지우기',
      VIEW_ARTIST: '작가 작품 보기',
      LOGO_ALT: '씨앗페 로고',
      HOME_LINK: '씨앗페 2026 홈',
      SHARE_KAKAO: '카카오톡으로 공유하기',
    },
  },
  en: {
    FILTERS: {
      ALL: 'All',
      SELLING: 'For Sale',
      SOLD: 'Sold',
      CATEGORY_ALL: 'All Categories',
    },
    SORT: {
      ARTIST_ASC: 'Artist A-Z',
      TITLE_ASC: 'Title A-Z',
      PRICE_DESC: 'Price High-Low',
      PRICE_ASC: 'Price Low-High',
    },
    SEARCH: {
      PLACEHOLDER_ARTWORKS: 'Search by artist or artwork title',
      PLACEHOLDER_DEFAULT: 'Enter a keyword...',
      NO_RESULTS_TITLE: 'No results found',
      NO_RESULTS_DESC: 'Try another keyword or browse all artworks.',
      RESET_BUTTON: 'View all artworks',
      RESULT_PREFIX: 'results',
      RESULT_SUFFIX: '',
    },
    NAV: {
      TOGGLE_MENU: 'Toggle menu',
      DONATE: 'Join as a member',
      BUY_ART: 'Buy artworks',
      ORDER_STATUS: 'Order & shipping status',
      ARTIST_MENU: 'Artist menu',
      ADMIN_DASHBOARD: 'Admin dashboard',
    },
    FOOTER: {
      LINKS: 'Links',
      FOLLOW: 'Follow',
      CONTACT: 'Contact',
      ONLINE_GALLERY: 'Online gallery',
      LOAN_INFO: 'Mutual-aid loan',
      COOP_HOME: 'Co-op website',
      PRIVACY_POLICY: 'Privacy policy',
      TERMS_OF_SERVICE: 'Terms of service',
    },
    CTA: {
      DONATE_NOW: '🤝 Join as a member',
      BUY_ART: '🎨 Buy artworks',
    },
    ERROR: {
      GO_HOME: 'Back to home',
      RETRY: 'Try again',
    },
    A11Y: {
      SORT_OPTIONS: 'Choose sort option',
      FILTER_STATUS: 'Filter by sale status',
      FILTER_CATEGORY: 'Filter by category',
      SEARCH_LABEL: 'Search artworks',
      CLEAR_SEARCH: 'Clear search text',
      VIEW_ARTIST: 'View artist artworks',
      LOGO_ALT: 'SAF logo',
      HOME_LINK: 'SAF 2026 home',
      SHARE_KAKAO: 'Share on KakaoTalk',
    },
  },
} as const;

export type UILocale = keyof typeof UI_STRINGS_BY_LOCALE;

export const UI_STRINGS = UI_STRINGS_BY_LOCALE.ko;

export function getUIStrings(locale?: string) {
  return locale === 'en' ? UI_STRINGS_BY_LOCALE.en : UI_STRINGS_BY_LOCALE.ko;
}
