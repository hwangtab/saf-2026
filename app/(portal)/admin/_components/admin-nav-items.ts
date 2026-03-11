export type AdminNavItem = { href: string; label: string };
export type AdminNavGroup = {
  label?: string; // 있으면 드롭다운, 없으면 flat
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [
      { href: '/admin/dashboard', label: '대시보드' },
      { href: '/admin/users?status=pending', label: '심사 큐' },
      { href: '/admin/users', label: '사용자 관리' },
    ],
  },
  {
    label: '관리',
    items: [
      { href: '/admin/artists', label: '작가 관리' },
      { href: '/admin/artworks', label: '작품 관리' },
      { href: '/admin/content', label: '콘텐츠 관리' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/admin/revenue', label: '매출 현황' },
      { href: '/admin/analytics', label: '사이트 분석' },
    ],
  },
  {
    label: '도구',
    items: [
      { href: '/admin/feedback', label: '피드백' },
      { href: '/admin/logs', label: '활동 로그' },
      { href: '/admin/trash', label: '휴지통' },
    ],
  },
];

/** Flat list for mobile nav and backward compat */
export const adminNavItems = adminNavGroups.flatMap((g) => g.items);
