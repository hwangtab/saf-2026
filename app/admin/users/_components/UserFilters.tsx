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
  onQueryChange: (query: string) => void;
  onQuerySubmit: () => void;
  onFilterChange: (updates: Partial<InitialFilters>) => void;
}

export function UserFilters({
  query,
  totalItems,
  initialFilters,
  onQueryChange,
  onQuerySubmit,
  onFilterChange,
}: UserFiltersProps) {
  return (
    <AdminCardHeader>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          사용자 목록
          <AdminHelp>
            가입된 사용자의 권한을 관리하고 신청을 승인하거나 차단할 수 있습니다.
          </AdminHelp>
        </h2>
        <AdminBadge tone="info">{totalItems}명</AdminBadge>
      </div>

      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(200px,1fr)_auto] sm:items-end">
        <div className="relative w-full sm:min-w-[260px]">
          <label htmlFor="search-users" className="sr-only">
            사용자 검색
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
            placeholder="이름, 이메일 검색... (Enter)"
            aria-describedby="search-users-description"
            className="h-10 border-0 py-2 pl-10"
          />
          <span id="search-users-description" className="sr-only">
            이름 또는 이메일로 사용자를 검색할 수 있습니다. 현재 {totalItems}명이 표시됩니다.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <AdminSelect
            value={initialFilters?.role || 'all'}
            onChange={(e) => onFilterChange({ role: e.target.value })}
            wrapperClassName="min-w-[100px]"
          >
            <option value="all">모든 권한</option>
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
            <option value="all">모든 상태</option>
            <option value="pending">대기</option>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
          </AdminSelect>
        </div>
      </div>
    </AdminCardHeader>
  );
}
