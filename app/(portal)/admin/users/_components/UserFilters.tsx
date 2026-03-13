import { usePathname } from 'next/navigation';
import { InitialFilters } from '@/types/admin';
import {
  AdminBadge,
  AdminCardHeader,
  AdminHelp,
  AdminInput,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';
import { resolveClientLocale } from '@/lib/client-locale';

interface UserFiltersProps {
  query: string;
  totalItems: number;
  initialFilters?: InitialFilters;
  filterNotice?: string | null;
  onQueryChange: (query: string) => void;
  onQuerySubmit: () => void;
  onFilterChange: (updates: Partial<InitialFilters>) => void;
}

export function UserFilters({
  query,
  totalItems,
  initialFilters,
  filterNotice,
  onQueryChange,
  onQuerySubmit,
  onFilterChange,
}: UserFiltersProps) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy =
    locale === 'en'
      ? {
          reviewQueue: 'Review queue',
          userList: 'User list',
          reviewHelp:
            'Review artist/exhibitor applications in one place and manage account status.',
          userHelp: 'View and manage roles and statuses of registered users.',
          count: (count: number) => `${count}`,
          searchUsers: 'Search users',
          searchPlaceholder: 'Search by name or email...',
          searchDescription: (count: number) =>
            `Search users by name or email. ${count} currently shown.`,
          allApplicants: 'All applicants',
          artistApplicant: 'Artist applicant',
          exhibitorApplicant: 'Exhibitor applicant',
          allRoles: 'All roles',
          allStatus: 'All status',
          pending: 'Pending',
          active: 'Active',
          suspended: 'Suspended',
        }
      : {
          reviewQueue: '심사 큐',
          userList: '사용자 목록',
          reviewHelp: '작가/출품자 신청을 한 곳에서 승인·거절하고 계정 상태를 관리합니다.',
          userHelp: '가입된 사용자의 권한과 상태를 조회하고 관리합니다.',
          count: (count: number) => `${count}명`,
          searchUsers: '사용자 검색',
          searchPlaceholder: '이름, 이메일 검색...',
          searchDescription: (count: number) =>
            `이름 또는 이메일로 사용자를 검색할 수 있습니다. 현재 ${count}명이 표시됩니다.`,
          allApplicants: '모든 신청유형',
          artistApplicant: '작가 신청',
          exhibitorApplicant: '출품자 신청',
          allRoles: '모든 권한',
          allStatus: '모든 상태',
          pending: '대기',
          active: '활성',
          suspended: '정지',
        };
  const isReviewQueueMode = initialFilters?.status === 'pending';

  return (
    <AdminCardHeader>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {isReviewQueueMode ? copy.reviewQueue : copy.userList}
          <AdminHelp>{isReviewQueueMode ? copy.reviewHelp : copy.userHelp}</AdminHelp>
        </h2>
        <AdminBadge tone="info">{copy.count(totalItems)}</AdminBadge>
        {filterNotice && <AdminBadge tone="warning">{filterNotice}</AdminBadge>}
      </div>

      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(200px,1fr)_auto] sm:items-end">
        <div className="relative w-full sm:min-w-[260px]">
          <label htmlFor="search-users" className="sr-only">
            {copy.searchUsers}
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <AdminInput
            id="search-users"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onQuerySubmit();
              }
            }}
            placeholder={copy.searchPlaceholder}
            aria-describedby="search-users-description"
            className="h-10 border-0 py-2 pl-10"
          />
          <span id="search-users-description" className="sr-only">
            {copy.searchDescription(totalItems)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end lg:grid-cols-3">
          <AdminSelect
            value={initialFilters?.applicant || 'all'}
            onChange={(e) => onFilterChange({ applicant: e.target.value, role: 'all' })}
            wrapperClassName="min-w-[120px]"
          >
            <option value="all">{copy.allApplicants}</option>
            <option value="artist">{copy.artistApplicant}</option>
            <option value="exhibitor">{copy.exhibitorApplicant}</option>
          </AdminSelect>
          <AdminSelect
            value={initialFilters?.role || 'all'}
            onChange={(e) => onFilterChange({ role: e.target.value })}
            wrapperClassName="min-w-[100px]"
          >
            <option value="all">{copy.allRoles}</option>
            <option value="user">User</option>
            <option value="artist">Artist</option>
            <option value="exhibitor">Exhibitor</option>
            <option value="admin">Admin</option>
          </AdminSelect>
          <AdminSelect
            value={initialFilters?.status || 'all'}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            wrapperClassName="min-w-[100px]"
          >
            <option value="all">{copy.allStatus}</option>
            <option value="pending">{copy.pending}</option>
            <option value="active">{copy.active}</option>
            <option value="suspended">{copy.suspended}</option>
          </AdminSelect>
        </div>
      </div>
    </AdminCardHeader>
  );
}
