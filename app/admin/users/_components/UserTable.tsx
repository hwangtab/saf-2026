import { Profile, UserSortKey, SortDirection } from '@/types/admin';
import Button from '@/components/ui/Button';
import { AdminEmptyState, AdminSelect } from '@/app/admin/_components/admin-ui';

interface UserTableProps {
  users: Profile[];
  sortKey: UserSortKey;
  sortDirection: SortDirection;
  onSort: (key: UserSortKey) => void;
  onSelectUser: (user: Profile) => void;
  onReject: (id: string) => void;
  onReactivate: (id: string) => void;
  onRoleChange: (user: Profile, newRole: string) => void;
  processingId: string | null;
}

export function UserTable({
  users,
  sortKey,
  sortDirection,
  onSort,
  onSelectUser,
  onReject,
  onReactivate,
  onRoleChange,
  processingId,
}: UserTableProps) {
  const getSortArrow = (key: UserSortKey) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getSortAriaLabel = (label: string, key: UserSortKey) => {
    if (sortKey !== key) return `${label} 오름차순 정렬`;
    return sortDirection === 'asc' ? `${label} 내림차순 정렬` : `${label} 오름차순 정렬`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50/50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <button
                type="button"
                onClick={() => onSort('user')}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                aria-label={getSortAriaLabel('사용자', 'user')}
              >
                사용자
                <span className="text-[11px] text-gray-400">{getSortArrow('user')}</span>
              </button>
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <button
                type="button"
                onClick={() => onSort('status_role')}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                aria-label={getSortAriaLabel('상태/권한', 'status_role')}
              >
                상태/권한
                <span className="text-[11px] text-gray-400">{getSortArrow('status_role')}</span>
              </button>
            </th>
            <th
              scope="col"
              className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <button
                type="button"
                onClick={() => onSort('application')}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                aria-label={getSortAriaLabel('신청 정보', 'application')}
              >
                신청 정보
                <span className="text-[11px] text-gray-400">{getSortArrow('application')}</span>
              </button>
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">관리</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-0">
                <AdminEmptyState
                  title="검색 결과가 없습니다"
                  description="다른 검색어로 다시 시도해보세요."
                />
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                          src={user.avatar_url}
                          alt=""
                        />
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200 text-gray-500 font-medium">
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => onSelectUser(user)}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline text-left"
                      >
                        {user.name || 'No Name'}
                      </button>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1 items-start">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset relative group cursor-help ${
                        user.status === 'active'
                          ? 'bg-green-50 text-green-700 ring-green-600/20'
                          : user.status === 'pending'
                            ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                            : 'bg-red-50 text-red-700 ring-red-600/10'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-600'
                            : user.status === 'pending'
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                        }`}
                      />
                      {user.status === 'active'
                        ? '활성'
                        : user.status === 'pending'
                          ? '대기'
                          : '정지'}
                      <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 px-2 py-1 text-[10px] font-normal text-white bg-slate-800 rounded shadow-lg text-center z-50">
                        {user.status === 'active'
                          ? '로그인 및 모든 기능 이용 가능'
                          : user.status === 'pending'
                            ? '작가 신청 대기 중인 상태'
                            : '로그인이 차단된 사용자'}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                      </span>
                    </span>
                    <AdminSelect
                      wrapperClassName="mt-1 w-28"
                      className="py-1 pl-2 pr-7 text-xs font-medium"
                      iconClassName="h-3.5 w-3.5"
                      value={user.role}
                      onChange={(e) => onRoleChange(user, e.target.value)}
                      disabled={processingId === user.id}
                    >
                      <option value="user">User</option>
                      <option value="artist">Artist</option>
                      <option value="exhibitor">Exhibitor</option>
                      <option value="admin">Admin</option>
                    </AdminSelect>
                    {user.status === 'pending' && (
                      <span className="text-[11px] text-amber-700">
                        권한을 Artist로 변경하면 승인됩니다.
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden lg:table-cell px-6 py-4">
                  {user.application ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {user.application.artist_name}
                      </div>
                      <div className="text-gray-500 truncate max-w-xs">
                        {user.application.contact}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">신청 정보 없음</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-2">
                    {user.status !== 'suspended' && (
                      <Button
                        variant="white"
                        size="sm"
                        onClick={() => onReject(user.id)}
                        disabled={processingId === user.id}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 disabled:opacity-50"
                      >
                        {user.status === 'pending' ? '신청 거절' : '계정 정지'}
                      </Button>
                    )}
                    {user.status === 'suspended' && (
                      <Button
                        variant="white"
                        size="sm"
                        onClick={() => onReactivate(user.id)}
                        disabled={processingId === user.id}
                        className="text-blue-700 hover:text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                      >
                        재활성화
                      </Button>
                    )}
                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => onSelectUser(user)}
                      className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    >
                      상세
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
