'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveUser, rejectUser, updateUserRole } from '@/app/actions/admin';
import Button from '@/components/ui/Button';
import { CheckIcon, XIcon } from '@/components/ui/Icons';

type Profile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'artist' | 'user';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
};

export function UserList({ users }: { users: Profile[] }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleSelections, setRoleSelections] = useState<
    Record<string, { value: Profile['role']; baseRole: Profile['role'] }>
  >({});
  const router = useRouter();

  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');
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
          {filteredUsers.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 flex items-center sm:px-6">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-gray-500 font-bold">
                          {user.name?.charAt(0) || user.email.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="ml-4 truncate">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-indigo-600 truncate">
                          {user.name || 'No Name'}
                        </p>
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
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex-shrink-0 flex gap-2">
                  {user.role !== 'admin' && (
                    <>
                      {user.status !== 'active' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(user.id)}
                          loading={processingId === user.id}
                          disabled={!!processingId}
                        >
                          <CheckIcon className="mr-1" /> 승인
                        </Button>
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
          ))}
        </ul>
      </div>
    </div>
  );
}
