'use client';

import { useEffect, useState } from 'react';
import { approveUser, reactivateUser, rejectUser, updateUserRole } from '@/app/actions/admin';
import Modal from '@/components/ui/Modal';
import { AdminCard, AdminCardHeader, AdminSelect } from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';

type Profile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'artist' | 'user';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  application?: {
    artist_name: string;
    contact: string;
    bio: string;
    updated_at: string;
  } | null;
};

export function UserList({ users }: { users: Profile[] }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [localUsers, setLocalUsers] = useState<Profile[]>(users);
  const toast = useToast();

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');
  const filteredUsers = localUsers.filter((user) => {
    if (!query) return true;
    const q = normalize(query);
    return normalize(user.name || '').includes(q) || normalize(user.email || '').includes(q);
  });

  const handleApprove = async (id: string) => {
    if (
      !confirm('이 사용자를 작가 계정으로 승인하시겠습니까?\n승인 시 역할이 Artist로 변경됩니다.')
    )
      return;
    setProcessingId(id);
    const res = await approveUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'active', role: 'artist' } : user))
      );
      toast.success('작가 계정으로 승인했습니다.');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('이 신청을 거절하고 계정을 정지하시겠습니까?')) return;
    setProcessingId(id);
    const res = await rejectUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'suspended' } : user))
      );
      toast.success('신청을 거절하고 계정을 정지했습니다.');
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!confirm(`권한을 ${newRole}로 변경할까요?`)) return;
    setProcessingId(id);
    const res = await updateUserRole(id, newRole as Profile['role']);
    setProcessingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      setLocalUsers((prev) =>
        prev.map((user) =>
          user.id === id
            ? {
                ...user,
                role: newRole as Profile['role'],
                status: newRole === 'admin' || newRole === 'artist' ? 'active' : user.status,
              }
            : user
        )
      );
      toast.success(`권한을 ${newRole}로 변경했습니다.`);
    }
  };

  const handleReactivate = async (id: string) => {
    if (!confirm('이 사용자를 다시 활성화하시겠습니까?')) return;
    setProcessingId(id);
    const res = await reactivateUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'active' } : user))
      );
      toast.success('사용자를 다시 활성화했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        {/* Header & Search */}
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">사용자 목록</h2>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              {filteredUsers.length}명
            </span>
          </div>
          <div className="relative max-w-sm w-full">
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
            <input
              id="search-users"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 이메일 검색..."
              aria-describedby="search-users-description"
              className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
            <span id="search-users-description" className="sr-only">
              이름 또는 이메일로 사용자를 검색할 수 있습니다. 현재 {filteredUsers.length}명이
              표시됩니다.
            </span>
          </div>
        </AdminCardHeader>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  사용자
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  상태/권한
                </th>
                <th
                  scope="col"
                  className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  신청 정보
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
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
                            onClick={() => setSelectedUser(user)}
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
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${
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
                        </span>
                        <AdminSelect
                          wrapperClassName="mt-1 w-28"
                          className="py-1 pl-2 pr-7 text-xs font-medium"
                          iconClassName="h-3.5 w-3.5"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={processingId === user.id}
                        >
                          <option value="user">User</option>
                          <option value="artist">Artist</option>
                          <option value="admin">Admin</option>
                        </AdminSelect>
                        {user.status === 'pending' && (
                          <span className="text-[11px] text-amber-700">작가 신청 검토 대기</span>
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
                        {user.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={processingId === user.id || !user.application}
                            title={
                              !user.application
                                ? '작가 신청서가 없어 승인할 수 없습니다.'
                                : undefined
                            }
                            aria-label={
                              !user.application
                                ? '작가 신청서 없음 - 승인 불가'
                                : '작가 계정으로 승인'
                            }
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            작가 승인
                          </button>
                        )}
                        {user.status !== 'suspended' && (
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={processingId === user.id}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                          >
                            {user.status === 'pending' ? '신청 거절' : '계정 정지'}
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => handleReactivate(user.id)}
                            disabled={processingId === user.id}
                            className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                          >
                            재활성화
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          상세
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Modal remains mostly the same, just keeping the import */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="사용자 상세 정보">
        {/* ... Same modal content structure ... */}
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-1 ring-gray-200">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 font-bold text-2xl">
                    {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {selectedUser.name || 'No Name'}
                </h4>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="mt-1 flex gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedUser.role}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedUser.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

            {selectedUser.application ? (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="font-medium text-gray-900">작가 신청 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500">작가명</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.application.artist_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">연락처</label>
                    <div className="text-sm text-gray-900">{selectedUser.application.contact}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">소개</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.application.bio}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4 text-sm text-gray-500 text-center py-4">
                제출된 신청 정보가 없습니다.
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
