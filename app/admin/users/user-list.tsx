'use client';

import { useEffect, useState } from 'react';
import {
  promoteUserToArtistWithLink,
  reactivateUser,
  rejectUser,
  searchUnlinkedArtists,
  updateUserRole,
} from '@/app/actions/admin';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
  AdminSelect,
  AdminHelp,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';

type Profile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'artist' | 'user' | 'exhibitor';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  application?: {
    artist_name: string;
    contact: string;
    bio: string;
    updated_at: string;
  } | null;
};

type UnlinkedArtistOption = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  updated_at: string | null;
  artwork_count: number;
};

type ArtistPromoteContext = {
  user: Profile;
  selectedArtistId: string | null;
  mode: 'link_existing' | 'create_and_link' | 'role_only';
};

export function UserList({ users }: { users: Profile[] }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [localUsers, setLocalUsers] = useState<Profile[]>(users);
  const toast = useToast();

  // Confirmation Modals State
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [reactivateConfirmId, setReactivateConfirmId] = useState<string | null>(null);
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{ id: string; role: string } | null>(
    null
  );
  const [artistPromoteContext, setArtistPromoteContext] = useState<ArtistPromoteContext | null>(
    null
  );
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [debouncedArtistSearchQuery, setDebouncedArtistSearchQuery] = useState('');
  const [artistOptions, setArtistOptions] = useState<UnlinkedArtistOption[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);
  const [artistSearchError, setArtistSearchError] = useState<string | null>(null);
  const [isArtistSearchSlow, setIsArtistSearchSlow] = useState(false);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedArtistSearchQuery(artistSearchQuery.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [artistSearchQuery]);

  useEffect(() => {
    if (!artistPromoteContext) return;

    const keyword =
      debouncedArtistSearchQuery ||
      artistPromoteContext.user.application?.artist_name ||
      artistPromoteContext.user.name ||
      '';

    if (keyword.trim().length < 2) {
      setArtistOptions([]);
      setArtistSearchError(null);
      setIsSearchingArtists(false);
      setIsArtistSearchSlow(false);
      return;
    }

    let cancelled = false;
    let slowTimer: ReturnType<typeof setTimeout> | null = null;
    setIsSearchingArtists(true);
    setArtistSearchError(null);
    setIsArtistSearchSlow(false);
    slowTimer = setTimeout(() => {
      if (!cancelled) setIsArtistSearchSlow(true);
    }, 1200);

    const run = async () => {
      try {
        const items = await searchUnlinkedArtists(keyword);
        if (!cancelled) {
          setArtistOptions(items);
          setArtistSearchError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setArtistOptions([]);
          setArtistSearchError('미연결 작가 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (!cancelled) {
          if (slowTimer) clearTimeout(slowTimer);
          setIsSearchingArtists(false);
          setIsArtistSearchSlow(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (slowTimer) clearTimeout(slowTimer);
    };
  }, [artistPromoteContext, debouncedArtistSearchQuery]);

  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');
  const filteredUsers = localUsers.filter((user) => {
    if (!query) return true;
    const q = normalize(query);
    return normalize(user.name || '').includes(q) || normalize(user.email || '').includes(q);
  });

  const handleReject = async () => {
    if (!rejectConfirmId) return;
    const id = rejectConfirmId;
    setProcessingId(id);
    const res = await rejectUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'suspended' } : user))
      );
      setRejectConfirmId(null);
      toast.success('신청을 거절하고 계정을 정지했습니다.');
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeConfirm) return;
    const { id, role: newRole } = roleChangeConfirm;
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
                status:
                  newRole === 'admin' || newRole === 'artist' || newRole === 'exhibitor'
                    ? 'active'
                    : user.status,
              }
            : user
        )
      );
      setRoleChangeConfirm(null);
      toast.success(`권한을 ${newRole}로 변경했습니다.`);
    }
  };

  const openArtistPromoteModal = (user: Profile) => {
    const initialKeyword = user.application?.artist_name || user.name || '';
    setArtistPromoteContext({
      user,
      selectedArtistId: null,
      mode: 'link_existing',
    });
    setArtistSearchQuery(initialKeyword);
    setDebouncedArtistSearchQuery(initialKeyword.trim());
    setArtistOptions([]);
    setArtistSearchError(null);
    setIsSearchingArtists(false);
    setIsArtistSearchSlow(false);
  };

  const closeArtistPromoteModal = () => {
    setArtistPromoteContext(null);
    setArtistSearchQuery('');
    setDebouncedArtistSearchQuery('');
    setArtistOptions([]);
    setArtistSearchError(null);
    setIsSearchingArtists(false);
    setIsArtistSearchSlow(false);
  };

  const handlePromoteToArtist = async () => {
    if (!artistPromoteContext) return;
    const { user, mode, selectedArtistId } = artistPromoteContext;

    if (mode === 'link_existing' && !selectedArtistId) {
      toast.error('연결할 미연결 작가를 선택해 주세요.');
      return;
    }

    setProcessingId(user.id);

    const res = await promoteUserToArtistWithLink({
      userId: user.id,
      mode,
      artistId: mode === 'link_existing' ? selectedArtistId || undefined : undefined,
    });

    setProcessingId(null);

    if (res.error) {
      toast.error(res.message);
      return;
    }

    setLocalUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? {
              ...item,
              role: 'artist',
              status: 'active',
            }
          : item
      )
    );
    closeArtistPromoteModal();
    toast.success(res.message);
  };

  const handleReactivate = async () => {
    if (!reactivateConfirmId) return;
    const id = reactivateConfirmId;
    setProcessingId(id);
    const res = await reactivateUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'active' } : user))
      );
      setReactivateConfirmId(null);
      toast.success('사용자를 다시 활성화했습니다.');
    }
  };

  const selectedArtistOption = artistPromoteContext?.selectedArtistId
    ? artistOptions.find((item) => item.id === artistPromoteContext.selectedArtistId) || null
    : null;

  const roleChangeTargetUser = roleChangeConfirm
    ? localUsers.find((user) => user.id === roleChangeConfirm.id) || null
    : null;

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        {/* Header & Search */}
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              사용자 목록
              <AdminHelp>
                가입된 사용자의 권한을 관리하고 신청을 승인하거나 차단할 수 있습니다.
              </AdminHelp>
            </h2>
            <AdminBadge tone="info">{filteredUsers.length}명</AdminBadge>
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
            <AdminInput
              id="search-users"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 이메일 검색..."
              aria-describedby="search-users-description"
              className="h-10 border-0 py-2 pl-10"
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
                  <td colSpan={4} className="px-6 py-0">
                    <AdminEmptyState
                      title="검색 결과가 없습니다"
                      description="다른 검색어로 다시 시도해보세요."
                    />
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
                          onChange={(e) => {
                            const nextRole = e.target.value as Profile['role'];
                            if (nextRole === user.role) return;
                            if (nextRole === 'artist') {
                              openArtistPromoteModal(user);
                              return;
                            }
                            setRoleChangeConfirm({ id: user.id, role: nextRole });
                          }}
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
                            onClick={() => setRejectConfirmId(user.id)}
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
                            onClick={() => setReactivateConfirmId(user.id)}
                            disabled={processingId === user.id}
                            className="text-blue-700 hover:text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                          >
                            재활성화
                          </Button>
                        )}
                        <Button
                          variant="white"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
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
              <Button variant="white" onClick={() => setSelectedUser(null)}>
                닫기
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!artistPromoteContext}
        onClose={closeArtistPromoteModal}
        title="Artist 권한 부여 및 작가 연결"
        className="max-w-3xl"
      >
        {artistPromoteContext && (
          <div className="space-y-5">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-sm text-indigo-900 font-medium">
                대상 사용자: {artistPromoteContext.user.name || '이름 없음'} (
                {artistPromoteContext.user.email})
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                신청 작가명:{' '}
                {artistPromoteContext.user.application?.artist_name || '제출된 작가명이 없습니다.'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">처리 방식 선택</p>
              <div className="grid gap-2 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    setArtistPromoteContext((prev) =>
                      prev ? { ...prev, mode: 'link_existing' } : prev
                    )
                  }
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    artistPromoteContext.mode === 'link_existing'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  미연결 작가 선택
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setArtistPromoteContext((prev) =>
                      prev ? { ...prev, mode: 'create_and_link' } : prev
                    )
                  }
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    artistPromoteContext.mode === 'create_and_link'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  새 작가 생성 후 연결
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setArtistPromoteContext((prev) =>
                      prev ? { ...prev, mode: 'role_only' } : prev
                    )
                  }
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    artistPromoteContext.mode === 'role_only'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  권한만 변경
                </button>
              </div>
            </div>

            {artistPromoteContext.mode === 'link_existing' && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <label className="block text-sm font-medium text-slate-700">미연결 작가 검색</label>
                <div className="relative">
                  <AdminInput
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    placeholder="작가명(한/영) 또는 이메일 검색..."
                    className="pr-10"
                    disabled={processingId === artistPromoteContext.user.id}
                  />
                  {isSearchingArtists && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full inline-block" />
                    </span>
                  )}
                </div>

                <div aria-live="polite" className="min-h-[1.25rem] text-xs">
                  {artistSearchQuery.trim().length < 2 && (
                    <p className="text-slate-500">
                      두 글자 이상 입력하면 미연결 작가를 검색합니다.
                    </p>
                  )}
                  {artistSearchQuery.trim().length >= 2 && isSearchingArtists && (
                    <p className="text-indigo-600">미연결 작가를 검색 중입니다...</p>
                  )}
                  {isArtistSearchSlow && (
                    <p className="text-amber-600">
                      검색이 평소보다 오래 걸리고 있습니다. 잠시만 기다려 주세요.
                    </p>
                  )}
                  {artistSearchError && <p className="text-rose-600">{artistSearchError}</p>}
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {artistOptions.length === 0 && !isSearchingArtists ? (
                    <div className="px-3 py-6 text-sm text-slate-500 text-center">
                      {artistSearchQuery.trim().length < 2
                        ? '검색어를 입력해 주세요.'
                        : '검색 결과가 없습니다.'}
                    </div>
                  ) : (
                    artistOptions.map((artist) => {
                      const isSelected = artistPromoteContext.selectedArtistId === artist.id;
                      const isRecommended =
                        !!artistPromoteContext.user.application?.artist_name &&
                        artist.name_ko?.includes(artistPromoteContext.user.application.artist_name);

                      return (
                        <button
                          type="button"
                          key={artist.id}
                          onClick={() =>
                            setArtistPromoteContext((prev) =>
                              prev ? { ...prev, selectedArtistId: artist.id } : prev
                            )
                          }
                          className={`w-full px-3 py-3 text-left transition-colors ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {artist.name_ko || '이름 없음'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {artist.name_en || '-'} · {artist.contact_phone || '전화번호 없음'}{' '}
                                · {artist.contact_email || '이메일 없음'}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {artist.artwork_count} 작품
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRecommended && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                                  추천
                                </span>
                              )}
                              {isSelected && (
                                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                  선택됨
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900 mb-2">실행 요약</p>
              <ul className="space-y-1 list-disc pl-5">
                <li>사용자 상태를 `active`로 변경합니다.</li>
                <li>사용자 권한을 `artist`로 변경합니다.</li>
                <li>
                  작가 연락처가 비어 있으면 사용자/신청 정보로 전화번호·이메일을 자동 채웁니다.
                </li>
                {artistPromoteContext.mode === 'link_existing' && (
                  <li>
                    선택 작가와 연결:
                    {selectedArtistOption
                      ? ` ${selectedArtistOption.name_ko || selectedArtistOption.id}`
                      : ' (선택 필요)'}
                  </li>
                )}
                {artistPromoteContext.mode === 'create_and_link' && (
                  <li>신청 정보를 기준으로 작가 프로필을 생성하고 사용자와 연결합니다.</li>
                )}
                {artistPromoteContext.mode === 'role_only' && (
                  <li className="text-amber-700">작가 프로필 연결 없이 권한만 변경됩니다.</li>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="white" onClick={closeArtistPromoteModal}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handlePromoteToArtist}
                loading={processingId === artistPromoteContext.user.id}
                disabled={
                  processingId === artistPromoteContext.user.id ||
                  (artistPromoteContext.mode === 'link_existing' &&
                    !artistPromoteContext.selectedArtistId)
                }
              >
                {artistPromoteContext.mode === 'link_existing'
                  ? '연결하고 승인'
                  : artistPromoteContext.mode === 'create_and_link'
                    ? '생성 후 승인'
                    : '권한만 변경'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modals */}
      <AdminConfirmModal
        isOpen={!!rejectConfirmId}
        onClose={() => setRejectConfirmId(null)}
        onConfirm={handleReject}
        title="신청 거절 및 계정 정지"
        description="이 사용자의 신청을 거절하고 계정을 정지하시겠습니까?\n정지된 사용자는 로그인이 불가능해집니다."
        confirmText="거절 및 정지"
        variant="danger"
        isLoading={!!processingId}
      />

      <AdminConfirmModal
        isOpen={!!roleChangeConfirm}
        onClose={() => setRoleChangeConfirm(null)}
        onConfirm={handleRoleChange}
        title="권한 변경 확인"
        description={`${roleChangeTargetUser?.name || roleChangeTargetUser?.email || '선택한 사용자'}의 권한을 '${roleChangeConfirm?.role}'(으)로 변경하시겠습니까?\nArtist 이상의 권한 부여 시 계정이 자동으로 활성화됩니다.`}
        confirmText="권한 변경"
        variant="warning"
        isLoading={!!processingId}
      />

      <AdminConfirmModal
        isOpen={!!reactivateConfirmId}
        onClose={() => setReactivateConfirmId(null)}
        onConfirm={handleReactivate}
        title="계정 재활성화"
        description="이 사용자의 계정을 다시 활성화하시겠습니까?"
        confirmText="재활성화"
        variant="info"
        isLoading={!!processingId}
      />
    </div>
  );
}
