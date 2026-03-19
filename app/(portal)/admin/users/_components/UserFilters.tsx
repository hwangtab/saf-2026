import { useTranslations } from 'next-intl';
import { InitialFilters } from '@/types/admin';
import {
  AdminBadge,
  AdminCardHeader,
  AdminHelp,
  AdminInput,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';

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
  const t = useTranslations('admin.users');
  const isReviewQueueMode = initialFilters?.status === 'pending';

  return (
    <AdminCardHeader>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {isReviewQueueMode ? t('reviewQueue') : t('userList')}
          <AdminHelp>{isReviewQueueMode ? t('reviewHelp') : t('userHelp')}</AdminHelp>
        </h2>
        <AdminBadge tone="info">{t('count', { count: totalItems })}</AdminBadge>
        {filterNotice && <AdminBadge tone="warning">{filterNotice}</AdminBadge>}
      </div>

      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(200px,1fr)_auto] sm:items-end">
        <div className="relative w-full sm:min-w-[260px]">
          <label htmlFor="search-users" className="sr-only">
            {t('searchUsers')}
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
            placeholder={t('searchPlaceholder')}
            aria-describedby="search-users-description"
            className="h-10 border-0 py-2 pl-10"
          />
          <span id="search-users-description" className="sr-only">
            {t('searchDescription', { count: totalItems })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end lg:grid-cols-3">
          <AdminSelect
            value={initialFilters?.applicant || 'all'}
            onChange={(e) => onFilterChange({ applicant: e.target.value, role: 'all' })}
            wrapperClassName="min-w-[120px]"
          >
            <option value="all">{t('allApplicants')}</option>
            <option value="artist">{t('artistApplicant')}</option>
            <option value="exhibitor">{t('exhibitorApplicant')}</option>
          </AdminSelect>
          <AdminSelect
            value={initialFilters?.role || 'all'}
            onChange={(e) => onFilterChange({ role: e.target.value })}
            wrapperClassName="min-w-[100px]"
          >
            <option value="all">{t('allRoles')}</option>
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
            <option value="all">{t('allStatus')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="active">{t('active')}</option>
            <option value="suspended">{t('suspended')}</option>
          </AdminSelect>
        </div>
      </div>
    </AdminCardHeader>
  );
}
