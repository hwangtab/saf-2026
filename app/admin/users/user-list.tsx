'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  approveUser,
  promoteUserToArtistWithLink,
  reactivateUser,
  rejectUser,
  searchUnlinkedArtists,
  updateUserRole,
} from '@/app/actions/admin';
import { approveExhibitor } from '@/app/actions/admin-exhibitors';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button'; // Import Button for ArtistPromoteModal
import { AdminCard, AdminInput } from '@/app/admin/_components/admin-ui'; // Import AdminInput for ArtistPromoteModal
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useToast } from '@/lib/hooks/useToast';
import {
  Profile,
  UnlinkedArtistOption,
  UserSortKey,
  SortDirection,
  InitialFilters,
} from '@/types/admin';
import { UserFilters } from './_components/UserFilters';
import { UserTable } from './_components/UserTable';

type ArtistPromoteContext = {
  user: Profile;
  selectedArtistId: string | null;
  mode: 'link_existing' | 'create_and_link' | 'role_only';
};

export function UserList({
  users,
  initialFilters,
}: {
  users: Profile[];
  initialFilters?: InitialFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialFilters?.q || '');
  const [filterNotice, setFilterNotice] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [localUsers, setLocalUsers] = useState<Profile[]>(users);

  // Confirmation Modals State
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
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
  const [sortKey, setSortKey] = useState<UserSortKey>('user');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    setQuery(initialFilters?.q || '');
  }, [initialFilters?.q]);

  // 실시간 검색: debounced query가 변경되면 자동 검색
  useEffect(() => {
    const initialQ = initialFilters?.q || '';
    if (debouncedQuery !== initialQ) {
      updateFilters({ q: debouncedQuery || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // URL 기반 필터 변경 함수
  const updateFilters = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const applicant = params.get('applicant');
    const role = params.get('role');
    const hasApplicant = applicant === 'artist' || applicant === 'exhibitor';
    const hasRole =
      role === 'user' || role === 'artist' || role === 'exhibitor' || role === 'admin';

    const incompatibleArtist =
      hasApplicant && applicant === 'artist' && hasRole && role === 'exhibitor';
    const incompatibleExhibitor =
      hasApplicant && applicant === 'exhibitor' && hasRole && role === 'artist';

    if (incompatibleArtist || incompatibleExhibitor) {
      params.delete('role');
      setFilterNotice('신청유형과 충돌하는 권한 필터를 자동 해제했습니다.');
      toast.info('필터 충돌을 방지하기 위해 권한 필터를 자동 해제했습니다.');
    } else {
      setFilterNotice(null);
    }

    router.push(`/admin/users?${params.toString()}`);
  };

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

  // 서버에서 이미 검색/필터링됨 - 클라이언트에서는 정렬만 수행
  const sortedUsers = useMemo(() => {
    const sorted = [...localUsers];
    const statusRank: Record<Profile['status'], number> = {
      pending: 0,
      active: 1,
      suspended: 2,
    };
    const roleRank: Record<Profile['role'], number> = {
      user: 0,
      artist: 1,
      exhibitor: 2,
      admin: 3,
    };

    const compareByUser = (a: Profile, b: Profile) => {
      const aName = (a.name || '').trim();
      const bName = (b.name || '').trim();
      const nameCompare = aName.localeCompare(bName, 'ko');
      if (nameCompare !== 0) return nameCompare;
      return a.email.localeCompare(b.email, 'en');
    };

    const compareByApplication = (a: Profile, b: Profile) => {
      const hasA = Number(Boolean(a.application));
      const hasB = Number(Boolean(b.application));
      if (hasA !== hasB) return hasA - hasB;

      const artistNameA = (a.application?.artist_name || '').trim();
      const artistNameB = (b.application?.artist_name || '').trim();
      const artistNameCompare = artistNameA.localeCompare(artistNameB, 'ko');
      if (artistNameCompare !== 0) return artistNameCompare;

      const updatedAtA = a.application?.updated_at || '';
      const updatedAtB = b.application?.updated_at || '';
      return updatedAtA.localeCompare(updatedAtB);
    };

    sorted.sort((a, b) => {
      let result = 0;

      if (sortKey === 'user') {
        result = compareByUser(a, b);
      } else if (sortKey === 'status_role') {
        const statusCompare = statusRank[a.status] - statusRank[b.status];
        result = statusCompare !== 0 ? statusCompare : roleRank[a.role] - roleRank[b.role];
      } else {
        result = compareByApplication(a, b);
      }

      if (result === 0) {
        result = compareByUser(a, b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [localUsers, sortDirection, sortKey]);

  const handleSort = (key: UserSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
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

  const handleRejectRequest = (id: string) => {
    setRejectConfirmId(id);
  };

  const handleApproveRequest = (id: string) => {
    setApproveConfirmId(id);
  };

  const handleReactivateRequest = (id: string) => {
    setReactivateConfirmId(id);
  };

  const handleRoleChangeRequest = (user: Profile, newRole: string) => {
    if (newRole === user.role) return;
    if (newRole === 'artist') {
      openArtistPromoteModal(user);
      return;
    }
    setRoleChangeConfirm({ id: user.id, role: newRole });
  };

  const executeReject = async () => {
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

  const executeApprove = async () => {
    if (!approveConfirmId) return;

    const targetUser = localUsers.find((user) => user.id === approveConfirmId);
    if (!targetUser) {
      setApproveConfirmId(null);
      return;
    }

    setProcessingId(approveConfirmId);

    if (targetUser.exhibitorApplication) {
      try {
        await approveExhibitor(approveConfirmId);
      } catch (error: unknown) {
        setProcessingId(null);
        const message =
          error instanceof Error ? error.message : '출품자 승인 중 오류가 발생했습니다.';
        toast.error(message);
        return;
      }

      setLocalUsers((prev) =>
        prev.map((user) =>
          user.id === approveConfirmId ? { ...user, role: 'exhibitor', status: 'active' } : user
        )
      );
      setProcessingId(null);
      setApproveConfirmId(null);
      toast.success('출품자 신청을 승인했습니다.');
      return;
    }

    const result = await approveUser(approveConfirmId);
    setProcessingId(null);

    if (result.error) {
      toast.error(result.message);
      return;
    }

    setLocalUsers((prev) =>
      prev.map((user) =>
        user.id === approveConfirmId ? { ...user, role: 'artist', status: 'active' } : user
      )
    );
    setApproveConfirmId(null);
    toast.success('작가 신청을 승인했습니다.');
  };

  const executeReactivate = async () => {
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

  const executeRoleChange = async () => {
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
                  newRole === 'admin' || newRole === 'artist'
                    ? 'active'
                    : newRole === 'exhibitor'
                      ? 'pending'
                      : user.status,
              }
            : user
        )
      );
      setRoleChangeConfirm(null);
      toast.success(`권한을 ${newRole}로 변경했습니다.`);
    }
  };

  const selectedArtistOption = artistPromoteContext?.selectedArtistId
    ? artistOptions.find((item) => item.id === artistPromoteContext.selectedArtistId) || null
    : null;

  const roleChangeTargetUser = roleChangeConfirm
    ? localUsers.find((user) => user.id === roleChangeConfirm.id) || null
    : null;

  const approveTargetUser = approveConfirmId
    ? localUsers.find((user) => user.id === approveConfirmId) || null
    : null;

  const rejectTargetUser = rejectConfirmId
    ? localUsers.find((user) => user.id === rejectConfirmId) || null
    : null;

  const reactivateTargetUser = reactivateConfirmId
    ? localUsers.find((user) => user.id === reactivateConfirmId) || null
    : null;

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        <UserFilters
          query={query}
          totalItems={localUsers.length}
          initialFilters={initialFilters}
          filterNotice={filterNotice}
          onQueryChange={setQuery}
          onQuerySubmit={() => updateFilters({ q: query || undefined })}
          onFilterChange={updateFilters}
        />

        <UserTable
          users={sortedUsers}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onSelectUser={setSelectedUser}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          onReactivate={handleReactivateRequest}
          onRoleChange={handleRoleChangeRequest}
          processingId={processingId}
        />
      </AdminCard>

      {/* User Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="사용자 상세 정보">
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
                  {selectedUser.application.referrer && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">추천인</label>
                      <div className="text-sm text-gray-900">
                        {selectedUser.application.referrer}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">소개</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.application.bio}
                  </div>
                </div>
              </div>
            ) : selectedUser.exhibitorApplication ? (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="font-medium text-gray-900">출품자 신청 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500">대표명</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.exhibitorApplication.representative_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">연락처</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.exhibitorApplication.contact}
                    </div>
                  </div>
                  {selectedUser.exhibitorApplication.referrer && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">추천인</label>
                      <div className="text-sm text-gray-900">
                        {selectedUser.exhibitorApplication.referrer}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">소개</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.exhibitorApplication.bio}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4 text-center py-4">
                <span className="text-sm text-gray-500">신청 정보가 없습니다.</span>
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

      {/* Artist Promote Modal */}
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
              <p className="text-xs text-indigo-700 mt-1">
                신청 연락처:{' '}
                {artistPromoteContext.user.application?.contact || '제출된 연락처가 없습니다.'}
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
                    ? '생성하고 승인'
                    : '승인'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {approveTargetUser && (
        <AdminConfirmModal
          isOpen={!!approveTargetUser}
          onClose={() => setApproveConfirmId(null)}
          onConfirm={executeApprove}
          title="신청 승인 확인"
          description={`${approveTargetUser.name} (${approveTargetUser.email}) 님의 신청을 승인하시겠습니까?`}
          confirmText="승인하기"
          variant="info"
          isLoading={processingId === approveTargetUser.id}
        />
      )}

      {/* Reject Confirmation */}
      {rejectTargetUser && (
        <AdminConfirmModal
          isOpen={!!rejectTargetUser}
          onClose={() => setRejectConfirmId(null)}
          onConfirm={executeReject}
          title="계정 거절/정지 확인"
          description={`${rejectTargetUser.name} (${rejectTargetUser.email}) 님의 ${
            rejectTargetUser.status === 'pending' ? '가입 신청을 거절' : '계정을 정지'
          }하시겠습니까?`}
          confirmText={rejectTargetUser.status === 'pending' ? '거절하기' : '정지하기'}
          variant="danger"
          isLoading={processingId === rejectTargetUser.id}
        />
      )}

      {/* Reactivate Confirmation */}
      {reactivateTargetUser && (
        <AdminConfirmModal
          isOpen={!!reactivateTargetUser}
          onClose={() => setReactivateConfirmId(null)}
          onConfirm={executeReactivate}
          title="계정 재활성화 확인"
          description={`${reactivateTargetUser.name} (${reactivateTargetUser.email}) 님의 계정을 다시 활성화하시겠습니까?`}
          confirmText="재활성화"
          variant="info"
          isLoading={processingId === reactivateTargetUser.id}
        />
      )}

      {/* Role Change Confirmation */}
      {roleChangeTargetUser && roleChangeConfirm && (
        <AdminConfirmModal
          isOpen={!!roleChangeTargetUser}
          onClose={() => setRoleChangeConfirm(null)}
          onConfirm={executeRoleChange}
          title="권한 변경 확인"
          description={`${roleChangeTargetUser.name} 님의 권한을 ${roleChangeTargetUser.role}에서 ${roleChangeConfirm.role}로 변경하시겠습니까?`}
          confirmText="변경하기"
          variant="warning"
          isLoading={processingId === roleChangeTargetUser.id}
        />
      )}
    </div>
  );
}
