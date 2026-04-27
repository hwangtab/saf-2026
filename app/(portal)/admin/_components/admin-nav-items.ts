export type AdminNavItem = { href: string; label: string };
export type AdminNavGroup = {
  label?: string; // 있으면 드롭다운, 없으면 flat
  items: AdminNavItem[];
};

type LocaleCode = 'ko' | 'en';

const ADMIN_NAV_GROUPS_BY_LOCALE: Record<LocaleCode, AdminNavGroup[]> = {
  ko: [
    {
      items: [{ href: '/admin/dashboard', label: '대시보드' }],
    },
    {
      label: '구성원',
      items: [
        { href: '/admin/users?status=pending', label: '심사 큐' },
        { href: '/admin/users', label: '사용자 관리' },
        { href: '/admin/artists', label: '작가 관리' },
      ],
    },
    {
      label: '콘텐츠',
      items: [
        { href: '/admin/artworks', label: '작품 관리' },
        { href: '/admin/content', label: '콘텐츠 관리' },
      ],
    },
    {
      label: '캠페인',
      items: [{ href: '/admin/petition/oh-yoon', label: '오윤 청원 운영' }],
    },
    {
      label: '주문',
      items: [{ href: '/admin/orders', label: '주문 관리' }],
    },
    {
      label: '분석',
      items: [
        { href: '/admin/revenue', label: '매출 현황' },
        { href: '/admin/artist-sales', label: '작가별 판매' },
        { href: '/admin/buyers', label: '구매자 관리' },
        { href: '/admin/analytics', label: '사이트 분석' },
      ],
    },
    {
      label: '도구',
      items: [
        { href: '/admin/feedback', label: '피드백' },
        { href: '/admin/logs', label: '활동 로그' },
        { href: '/admin/changelog', label: '개발 이력' },
        { href: '/admin/trash', label: '휴지통' },
      ],
    },
  ],
  en: [
    {
      items: [{ href: '/admin/dashboard', label: 'Dashboard' }],
    },
    {
      label: 'Members',
      items: [
        { href: '/admin/users?status=pending', label: 'Review Queue' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/artists', label: 'Artists' },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: '/admin/artworks', label: 'Artworks' },
        { href: '/admin/content', label: 'Content Manager' },
      ],
    },
    {
      label: 'Campaigns',
      items: [{ href: '/admin/petition/oh-yoon', label: 'Oh Yoon Petition' }],
    },
    {
      label: 'Orders',
      items: [{ href: '/admin/orders', label: 'Order Management' }],
    },
    {
      label: 'Analytics',
      items: [
        { href: '/admin/revenue', label: 'Revenue' },
        { href: '/admin/artist-sales', label: 'Artist Sales' },
        { href: '/admin/buyers', label: 'Buyers' },
        { href: '/admin/analytics', label: 'Site Analytics' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { href: '/admin/feedback', label: 'Feedback' },
        { href: '/admin/logs', label: 'Activity Logs' },
        { href: '/admin/changelog', label: 'Dev Changelog' },
        { href: '/admin/trash', label: 'Trash' },
      ],
    },
  ],
};

export const getAdminNavGroups = (locale: LocaleCode): AdminNavGroup[] =>
  ADMIN_NAV_GROUPS_BY_LOCALE[locale];

export const adminNavGroups: AdminNavGroup[] = ADMIN_NAV_GROUPS_BY_LOCALE.ko;

/** Flat list for mobile nav and backward compat */
export const adminNavItems = adminNavGroups.flatMap((g) => g.items);
