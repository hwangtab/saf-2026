'use client';

import { usePathname } from 'next/navigation';
import { Profile, UserSortKey, SortDirection } from '@/types/admin';
import Button from '@/components/ui/Button';
import SafeAvatarImage from '@/components/common/SafeAvatarImage';
import { AdminEmptyState, AdminSelect } from '@/app/admin/_components/admin-ui';
import { resolveClientLocale } from '@/lib/client-locale';

interface UserTableProps {
  users: Profile[];
  sortKey: UserSortKey;
  sortDirection: SortDirection;
  onSort: (key: UserSortKey) => void;
  onSelectUser: (user: Profile) => void;
  onApprove: (id: string) => void;
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
  onApprove,
  onReject,
  onReactivate,
  onRoleChange,
  processingId,
}: UserTableProps) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy =
    locale === 'en'
      ? {
          sortAscending: (label: string) => `Sort ${label} ascending`,
          sortDescending: (label: string) => `Sort ${label} descending`,
          user: 'User',
          statusRole: 'Status/Role',
          application: 'Application',
          joinedAt: 'Joined',
          manage: 'Manage',
          emptyTitle: 'No search results',
          emptyDescription: 'Try a different keyword.',
          artistApplicant: 'Artist applicant',
          exhibitorApplicant: 'Exhibitor applicant',
          active: 'Active',
          pending: 'Pending',
          suspended: 'Suspended',
          activeHint: 'Can sign in and use all features',
          pendingHint: 'Waiting for application review',
          suspendedHint: 'Sign-in is blocked',
          roleUser: 'User',
          roleArtist: 'Artist',
          roleExhibitor: 'Exhibitor',
          roleAdmin: 'Admin',
          reviewQueueHint: 'Approve/reject from the review queue.',
          noApplication: 'No application',
          approve: 'Approve',
          rejectApplication: 'Reject application',
          suspendAccount: 'Suspend account',
          reactivate: 'Reactivate',
          details: 'Details',
        }
      : {
          sortAscending: (label: string) => `${label} 오름차순 정렬`,
          sortDescending: (label: string) => `${label} 내림차순 정렬`,
          user: '사용자',
          statusRole: '상태/권한',
          application: '신청 정보',
          joinedAt: '가입일',
          manage: '관리',
          emptyTitle: '검색 결과가 없습니다',
          emptyDescription: '다른 검색어로 다시 시도해보세요.',
          artistApplicant: '작가 신청',
          exhibitorApplicant: '출품자 신청',
          active: '활성',
          pending: '대기',
          suspended: '정지',
          activeHint: '로그인 및 모든 기능 이용 가능',
          pendingHint: '작가 신청 대기 중인 상태',
          suspendedHint: '로그인이 차단된 사용자',
          roleUser: '일반 사용자',
          roleArtist: '작가',
          roleExhibitor: '출품자',
          roleAdmin: '관리자',
          reviewQueueHint: '심사 큐에서 승인/거절합니다.',
          noApplication: '신청 정보 없음',
          approve: '승인',
          rejectApplication: '신청 거절',
          suspendAccount: '계정 정지',
          reactivate: '재활성화',
          details: '상세',
        };

  const getSortArrow = (key: UserSortKey) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getSortAriaLabel = (label: string, key: UserSortKey) => {
    if (sortKey !== key) return copy.sortAscending(label);
    return sortDirection === 'asc' ? copy.sortDescending(label) : copy.sortAscending(label);
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
                aria-label={getSortAriaLabel(copy.user, 'user')}
              >
                {copy.user}
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
                aria-label={getSortAriaLabel(copy.statusRole, 'status_role')}
              >
                {copy.statusRole}
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
                aria-label={getSortAriaLabel(copy.application, 'application')}
              >
                {copy.application}
                <span className="text-[11px] text-gray-400">{getSortArrow('application')}</span>
              </button>
            </th>
            <th
              scope="col"
              className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <button
                type="button"
                onClick={() => onSort('created_at')}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                aria-label={getSortAriaLabel(copy.joinedAt, 'created_at')}
              >
                {copy.joinedAt}
                <span className="text-[11px] text-gray-400">{getSortArrow('created_at')}</span>
              </button>
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">{copy.manage}</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-0">
                <AdminEmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {user.avatar_url ? (
                        <SafeAvatarImage
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                          src={user.avatar_url}
                          alt=""
                          width={40}
                          height={40}
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
                      {(user.application || user.exhibitorApplication) && (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                              user.exhibitorApplication
                                ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                                : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            }`}
                          >
                            {user.exhibitorApplication
                              ? copy.exhibitorApplicant
                              : copy.artistApplicant}
                          </span>
                        </div>
                      )}
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
                        ? copy.active
                        : user.status === 'pending'
                          ? copy.pending
                          : copy.suspended}
                      <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 px-2 py-1 text-[10px] font-normal text-white bg-slate-800 rounded shadow-lg text-center z-50">
                        {user.status === 'active'
                          ? copy.activeHint
                          : user.status === 'pending'
                            ? copy.pendingHint
                            : copy.suspendedHint}
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
                      <option value="user">{copy.roleUser}</option>
                      <option value="artist">{copy.roleArtist}</option>
                      <option value="exhibitor">{copy.roleExhibitor}</option>
                      <option value="admin">{copy.roleAdmin}</option>
                    </AdminSelect>
                    {user.status === 'pending' && (
                      <span className="text-[11px] text-amber-700">{copy.reviewQueueHint}</span>
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
                  ) : user.exhibitorApplication ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {user.exhibitorApplication.representative_name}
                      </div>
                      <div className="text-gray-500 truncate max-w-xs">
                        {user.exhibitorApplication.contact}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">{copy.noApplication}</span>
                  )}
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString(
                        locale === 'en' ? 'en-US' : 'ko-KR',
                        {
                          year: 'numeric',
                          month: locale === 'en' ? 'short' : 'long',
                          day: 'numeric',
                        }
                      )
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-2">
                    {user.status === 'pending' && user.role !== 'admin' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onApprove(user.id)}
                        disabled={processingId === user.id}
                      >
                        {copy.approve}
                      </Button>
                    )}
                    {user.status !== 'suspended' && (
                      <Button
                        variant="white"
                        size="sm"
                        onClick={() => onReject(user.id)}
                        disabled={processingId === user.id}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 disabled:opacity-50"
                      >
                        {user.status === 'pending' ? copy.rejectApplication : copy.suspendAccount}
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
                        {copy.reactivate}
                      </Button>
                    )}
                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => onSelectUser(user)}
                      className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    >
                      {copy.details}
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
