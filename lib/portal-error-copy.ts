type AppLocale = 'ko' | 'en';

export type PortalErrorKey =
  | 'dashboard'
  | 'exhibitor'
  | 'adminDashboard'
  | 'adminArtworks'
  | 'adminArtists'
  | 'adminUsers'
  | 'adminExhibitors'
  | 'adminContent'
  | 'adminLogs'
  | 'adminOrders'
  | 'adminRevenue'
  | 'adminTrash'
  | 'global';

type ErrorCopy = {
  title: string;
  message: string;
  backLabel?: string;
};

const COPY: Record<PortalErrorKey, Record<AppLocale, ErrorCopy>> = {
  global: {
    ko: {
      title: '오류가 발생했습니다',
      message: '페이지를 불러오는 도중 예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    },
    en: {
      title: 'Something went wrong',
      message: 'An unexpected error occurred while loading this page. Please try again shortly.',
    },
  },
  dashboard: {
    ko: {
      title: '대시보드를 불러올 수 없습니다',
      message: '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '대시보드로',
    },
    en: {
      title: 'Unable to load dashboard',
      message: 'An error occurred while loading dashboard data. Please try again shortly.',
      backLabel: 'Back to dashboard',
    },
  },
  exhibitor: {
    ko: {
      title: '출품자 포털을 불러올 수 없습니다',
      message: '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '출품자 홈으로',
    },
    en: {
      title: 'Unable to load exhibitor portal',
      message: 'An error occurred while loading exhibitor data. Please try again shortly.',
      backLabel: 'Back to exhibitor home',
    },
  },
  adminDashboard: {
    ko: {
      title: '대시보드를 불러올 수 없습니다',
      message: '통계 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load admin dashboard',
      message: 'An error occurred while loading analytics data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminArtworks: {
    ko: {
      title: '작품 목록을 불러올 수 없습니다',
      message: '작품 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load artworks',
      message: 'An error occurred while loading artwork data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminArtists: {
    ko: {
      title: '작가 목록을 불러올 수 없습니다',
      message: '작가 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load artists',
      message: 'An error occurred while loading artist data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminUsers: {
    ko: {
      title: '사용자 목록을 불러올 수 없습니다',
      message: '사용자 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load users',
      message: 'An error occurred while loading user data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminExhibitors: {
    ko: {
      title: '출품자 목록을 불러올 수 없습니다',
      message: '출품자 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load exhibitors',
      message: 'An error occurred while loading exhibitor data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminContent: {
    ko: {
      title: '콘텐츠를 불러올 수 없습니다',
      message: '콘텐츠 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load content',
      message: 'An error occurred while loading content data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminOrders: {
    ko: {
      title: '주문 데이터를 불러올 수 없습니다',
      message: '주문 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load orders',
      message: 'An error occurred while loading order data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminLogs: {
    ko: {
      title: '활동 로그를 불러올 수 없습니다',
      message: '로그 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load activity logs',
      message: 'An error occurred while loading log data. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminRevenue: {
    ko: {
      title: '매출 데이터를 불러올 수 없습니다',
      message: '매출 분석 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load revenue data',
      message: 'An error occurred while loading revenue analytics. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
  adminTrash: {
    ko: {
      title: '휴지통을 불러올 수 없습니다',
      message: '삭제 항목 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      backLabel: '관리자 홈으로',
    },
    en: {
      title: 'Unable to load trash',
      message: 'An error occurred while loading deleted items. Please try again shortly.',
      backLabel: 'Back to admin home',
    },
  },
};

export function getPortalErrorCopy(key: PortalErrorKey, locale: AppLocale): ErrorCopy {
  return COPY[key][locale];
}

/** ErrorView의 retry/home 버튼 라벨. locale별 공통. */
export function getErrorActionLabels(locale: AppLocale): { retryLabel: string; homeLabel: string } {
  return locale === 'en'
    ? { retryLabel: 'Try again', homeLabel: 'Go to home' }
    : { retryLabel: '다시 시도하기', homeLabel: '홈으로 돌아가기' };
}
