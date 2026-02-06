'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveUser, rejectUser, updateUserRole } from '@/app/actions/admin';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { CheckIcon, XIcon } from '@/components/ui/Icons';

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
  const [roleSelections, setRoleSelections] = useState<
    Record<string, { value: Profile['role']; baseRole: Profile['role'] }>
  >({});
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const router = useRouter();

  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');
  const truncate = (value: string, max = 80) =>
    value.length > max ? `${value.slice(0, max)}…` : value;
  const filteredUsers = users.filter((user) => {
    if (!query) return true;
    const q = normalize(query);
    return normalize(user.name || '').includes(q) || normalize(user.email || '').includes(q);
  });

  const handleApprove = async (id: string) => {
    if (!confirm('이 사용자를 작가로 승인하시겠습니까?')) return;

    setProcessingId(id);
    const res = await approveUser(id);
    setProcessingId(null);

    if (res.error) alert(res.message);
    else router.refresh();
  };

  const handleReject = async (id: string) => {
    if (!confirm('이 사용자를 거절(차단)하시겠습니까?')) return;

    setProcessingId(id);
    const res = await rejectUser(id);
    setProcessingId(null);

    if (res.error) alert(res.message);
    else router.refresh();
  };

  const handleRoleChange = async (id: string, currentRole: Profile['role']) => {
    const selectedRole = roleSelections[id];
    const nextRole =
      selectedRole && selectedRole.baseRole === currentRole ? selectedRole.value : currentRole;
    if (nextRole === currentRole) {
      if (selectedRole) {
        setRoleSelections((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      return;
    }

    if (!confirm(`권한을 ${currentRole} → ${nextRole}로 변경할까요?`)) return;

    setProcessingId(id);
    const res = await updateUserRole(id, nextRole);
    setProcessingId(null);

    if (res.error) {
      alert(res.message);
    } else {
      setRoleSelections((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-sm rounded-lg p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색: 이름/이메일"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {filteredUsers.map((user) => {
            const hasApplication =
              !!user.application?.artist_name?.trim() &&
              !!user.application?.contact?.trim() &&
              !!user.application?.bio?.trim();
            const hasApplicationRecord = !!user.application;

            return (
              <li key={user.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 font-bold">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="ml-4 truncate">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="font-medium text-indigo-600 truncate hover:underline text-left"
                          >
                            {user.name || 'No Name'}
                          </button>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.status.toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-xs">({user.role})</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 truncate">{user.email}</p>
                        {hasApplicationRecord ? (
                          <div className="mt-2 text-xs text-gray-500">
                            <p>작가명: {user.application?.artist_name || '-'}</p>
                            <p>연락처: {user.application?.contact || '-'}</p>
                            <p>소개: {truncate(user.application?.bio || '-')}</p>
                          </div>
                        ) : (
                          user.status === 'pending' && (
                            <p className="mt-2 text-xs text-red-500">
                              신청 정보가 아직 제출되지 않았습니다.
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-5 flex-shrink-0 flex gap-2">
                    {user.role !== 'admin' && (
                      <>
                        {user.status !== 'active' && (
                          <span
                            className="inline-flex"
                            title={
                              !hasApplication
                                ? '작가 신청 정보가 없어 승인할 수 없습니다.'
                                : undefined
                            }
                          >
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApprove(user.id)}
                              loading={processingId === user.id}
                              disabled={!!processingId || !hasApplication}
                              aria-disabled={!!processingId || !hasApplication}
                            >
                              <CheckIcon className="mr-1" /> 승인
                            </Button>
                          </span>
                        )}
                        {user.status === 'pending' && !hasApplicationRecord && (
                          <span className="text-xs text-red-500 self-center">
                            신청 정보 없음 (승인 불가)
                          </span>
                        )}
                        {user.status === 'pending' && hasApplicationRecord && !hasApplication && (
                          <span className="text-xs text-red-500 self-center">
                            신청 정보 불완전 (승인 불가)
                          </span>
                        )}
                        {user.status !== 'suspended' && (
                          <Button
                            size="sm"
                            variant="white"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(user.id)}
                            loading={processingId === user.id}
                            disabled={!!processingId}
                          >
                            <XIcon className="mr-1" /> 거절
                          </Button>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={
                          roleSelections[user.id]?.baseRole === user.role
                            ? roleSelections[user.id]?.value
                            : user.role
                        }
                        onChange={(e) =>
                          setRoleSelections((prev) => ({
                            ...prev,
                            [user.id]: {
                              value: e.target.value as Profile['role'],
                              baseRole: user.role,
                            },
                          }))
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        disabled={!!processingId}
                      >
                        <option value="user">user</option>
                        <option value="artist">artist</option>
                        <option value="admin">admin</option>
                      </select>
                      <Button
                        size="sm"
                        variant="white"
                        onClick={() => handleRoleChange(user.id, user.role)}
                        loading={processingId === user.id}
                        disabled={!!processingId}
                      >
                        권한 변경
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Detail Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="사용자 상세 정보">
        {selectedUser && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 font-bold text-2xl">
                    {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {selectedUser.name || 'No Name'}
                </h4>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedUser.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : selectedUser.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedUser.status.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs">({selectedUser.role})</span>
                </div>
              </div>
            </div>

            {/* Application Info */}
            {selectedUser.application ? (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <h5 className="font-medium text-gray-900">작가 신청 정보</h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">작가명</p>
                    <p className="text-sm text-gray-900">
                      {selectedUser.application.artist_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">연락처</p>
                    <p className="text-sm text-gray-900">
                      {selectedUser.application.contact || '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">소개</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {selectedUser.application.bio || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    신청일:{' '}
                    {new Date(selectedUser.application.updated_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500">작가 신청 정보가 없습니다.</p>
              </div>
            )}

            {/* Actions */}
            {selectedUser.role !== 'admin' && (
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                {selectedUser.status !== 'active' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setSelectedUser(null);
                      handleApprove(selectedUser.id);
                    }}
                    disabled={
                      !selectedUser.application?.artist_name?.trim() ||
                      !selectedUser.application?.contact?.trim() ||
                      !selectedUser.application?.bio?.trim()
                    }
                  >
                    <CheckIcon className="mr-1" /> 승인
                  </Button>
                )}
                {selectedUser.status !== 'suspended' && (
                  <Button
                    variant="white"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedUser(null);
                      handleReject(selectedUser.id);
                    }}
                  >
                    <XIcon className="mr-1" /> 거절
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
