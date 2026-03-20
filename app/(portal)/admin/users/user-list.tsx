'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  approveUser,
  promoteUserToArtistWithLink,
  searchLinkedArtistsByName,
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
import { matchesAnySearch } from '@/lib/search-utils';
import SafeAvatarImage from '@/components/common/SafeAvatarImage';
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

function normalizeQuery(value: string | null | undefined) {
  return (value || '').trim();
}

export function UserList({
  users,
  initialFilters,
}: {
  users: Profile[];
  initialFilters?: InitialFilters;
}) {
  const pathname = usePathname();
  const locale = useLocale() as 'ko' | 'en';
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations('admin.users');

  const resolveActionMessage = (serverMessage: string | undefined, fallback: string) =>
    locale === 'en' ? fallback : serverMessage || fallback;

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState(normalizeQuery(initialFilters?.q));
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
  const [linkedNameConflicts, setLinkedNameConflicts] = useState<
    Array<{
      artist_id: string;
      linked_user_id: string;
      linked_user_name: string | null;
      linked_user_email: string | null;
    }>
  >([]);
  const [linkedNameConflictError, setLinkedNameConflictError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<UserSortKey>('user');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const pendingQueryRef = useRef<string | null>(null);
  const latestQueryRef = useRef(query);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    latestQueryRef.current = query;
  }, [query]);

  useEffect(() => {
    const nextInitialQuery = normalizeQuery(initialFilters?.q);
    const pendingQuery = pendingQueryRef.current;

    if (pendingQuery !== null) {
      if (nextInitialQuery !== pendingQuery) return;
      if (normalizeQuery(latestQueryRef.current) !== pendingQuery) return;
      pendingQueryRef.current = null;
    }

    if (normalizeQuery(latestQueryRef.current) !== nextInitialQuery) {
      setQuery(nextInitialQuery);
    }
  }, [initialFilters?.q]);

  // URL 기반 필터 변경 함수
  const updateFilters = useCallback(
    (
      newParams: Record<string, string | undefined>,
      options?: {
        trackQuery?: boolean;
      }
    ) => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
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
        setFilterNotice(t('filterConflictNotice'));
        toast.info(t('filterConflictToast'));
      } else {
        setFilterNotice(null);
      }

      const nextQueryValue = normalizeQuery(params.get('q'));
      if (options?.trackQuery) {
        pendingQueryRef.current = nextQueryValue;
      }

      const nextQueryString = params.toString();
      const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (currentUrl === nextUrl) {
        if (options?.trackQuery && pendingQueryRef.current === nextQueryValue) {
          pendingQueryRef.current = null;
        }
        return;
      }

      router.replace(nextUrl, { scroll: false });
    },
    [t, pathname, router, toast]
  );

  // 실시간 검색: debounced query가 변경되면 자동 검색
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentQueryInUrl = normalizeQuery(new URLSearchParams(window.location.search).get('q'));
    const normalizedDebouncedQuery = normalizeQuery(debouncedQuery);
    if (normalizedDebouncedQuery !== currentQueryInUrl) {
      updateFilters({ q: normalizedDebouncedQuery || undefined }, { trackQuery: true });
    }
  }, [debouncedQuery, updateFilters]);

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
          setArtistSearchError(t('searchUnlinkedArtistFailed'));
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
  }, [artistPromoteContext, debouncedArtistSearchQuery, t]);

  useEffect(() => {
    if (!artistPromoteContext || artistPromoteContext.mode !== 'link_existing') {
      setLinkedNameConflicts([]);
      setLinkedNameConflictError(null);
      return;
    }

    const candidateName =
      artistPromoteContext.user.application?.artist_name?.trim() ||
      artistPromoteContext.user.name?.trim() ||
      '';

    if (candidateName.length < 2) {
      setLinkedNameConflicts([]);
      setLinkedNameConflictError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const conflicts = await searchLinkedArtistsByName(candidateName);
        if (!cancelled) {
          setLinkedNameConflicts(
            conflicts.filter((item) => item.linked_user_id !== artistPromoteContext.user.id)
          );
          setLinkedNameConflictError(null);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setLinkedNameConflicts([]);
          setLinkedNameConflictError(t('linkedNameConflictFailed'));
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [artistPromoteContext, t]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return localUsers;

    return localUsers.filter((user) =>
      matchesAnySearch(normalizedQuery, [user.name, user.email, user.application?.artist_name])
    );
  }, [localUsers, query]);

  // 검색 결과 기준으로 정렬 수행
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    const nameSortLocale = locale === 'en' ? 'en' : 'ko';
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
      const nameCompare = aName.localeCompare(bName, nameSortLocale);
      if (nameCompare !== 0) return nameCompare;
      return a.email.localeCompare(b.email, 'en');
    };

    const compareByApplication = (a: Profile, b: Profile) => {
      const hasA = Number(Boolean(a.application));
      const hasB = Number(Boolean(b.application));
      if (hasA !== hasB) return hasA - hasB;

      const artistNameA = (a.application?.artist_name || '').trim();
      const artistNameB = (b.application?.artist_name || '').trim();
      const artistNameCompare = artistNameA.localeCompare(artistNameB, nameSortLocale);
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
      } else if (sortKey === 'application') {
        result = compareByApplication(a, b);
      } else if (sortKey === 'created_at') {
        result = (a.created_at || '').localeCompare(b.created_at || '');
      }

      if (result === 0) {
        result = compareByUser(a, b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredUsers, locale, sortDirection, sortKey]);

  const handleSort = (key: UserSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'created_at' ? 'desc' : 'asc');
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
    setLinkedNameConflicts([]);
    setLinkedNameConflictError(null);
  };

  const handlePromoteToArtist = async () => {
    if (!artistPromoteContext) return;
    const { user, mode, selectedArtistId } = artistPromoteContext;

    if (mode === 'link_existing' && !selectedArtistId) {
      toast.error(t('selectUnlinkedArtist'));
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
      toast.error(resolveActionMessage(res.message, t('promoteArtistError')));
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
    toast.success(resolveActionMessage(res.message, t('promoteArtistSuccess')));
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
      toast.error(resolveActionMessage(res.message, t('rejectError')));
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'suspended' } : user))
      );
      setRejectConfirmId(null);
      toast.success(t('rejectSuccess'));
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
          locale === 'en'
            ? t('exhibitorApproveError')
            : error instanceof Error
              ? error.message
              : t('exhibitorApproveError');
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
      toast.success(t('exhibitorApproveSuccess'));
      return;
    }

    const result = await approveUser(approveConfirmId);
    setProcessingId(null);

    if (result.error) {
      toast.error(resolveActionMessage(result.message, t('approveError')));
      return;
    }

    setLocalUsers((prev) =>
      prev.map((user) =>
        user.id === approveConfirmId ? { ...user, role: 'artist', status: 'active' } : user
      )
    );
    setApproveConfirmId(null);
    toast.success(t('artistApproveSuccess'));
  };

  const executeReactivate = async () => {
    if (!reactivateConfirmId) return;
    const id = reactivateConfirmId;
    setProcessingId(id);
    const res = await reactivateUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(resolveActionMessage(res.message, t('reactivateError')));
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'active' } : user))
      );
      setReactivateConfirmId(null);
      toast.success(t('reactivated'));
    }
  };

  const executeRoleChange = async () => {
    if (!roleChangeConfirm) return;
    const { id, role: newRole } = roleChangeConfirm;
    setProcessingId(id);
    const res = await updateUserRole(id, newRole as Profile['role']);
    setProcessingId(null);
    if (res.error) {
      toast.error(resolveActionMessage(res.message, t('roleChangeError')));
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
      toast.success(t('roleChanged', { role: newRole }));
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
          totalItems={sortedUsers.length}
          initialFilters={initialFilters}
          filterNotice={filterNotice}
          onQueryChange={setQuery}
          onQuerySubmit={() => updateFilters({ q: query || undefined }, { trackQuery: true })}
          onFilterChange={(updates) =>
            updateFilters({ ...updates, q: query || undefined }, { trackQuery: true })
          }
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
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={t('userDetailsTitle')}
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-1 ring-gray-200">
                {selectedUser.avatar_url ? (
                  <SafeAvatarImage
                    src={selectedUser.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                    width={64}
                    height={64}
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
                    {{
                      user: t('roleUser'),
                      artist: t('roleArtist'),
                      exhibitor: t('roleExhibitor'),
                      admin: t('roleAdmin'),
                    }[selectedUser.role] || selectedUser.role}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedUser.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {{
                      active: t('statusActive'),
                      pending: t('statusPending'),
                      suspended: t('statusSuspended'),
                    }[selectedUser.status] || selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

            {selectedUser.application ? (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="font-medium text-gray-900">{t('artistApplicationInfo')}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500">{t('artistName')}</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.application.artist_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('contact')}</label>
                    <div className="text-sm text-gray-900">{selectedUser.application.contact}</div>
                  </div>
                  {selectedUser.application.referrer && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">{t('referrer')}</label>
                      <div className="text-sm text-gray-900">
                        {selectedUser.application.referrer}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('bio')}</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.application.bio}
                  </div>
                </div>
              </div>
            ) : selectedUser.exhibitorApplication ? (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="font-medium text-gray-900">{t('exhibitorApplicationInfo')}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500">{t('representativeName')}</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.exhibitorApplication.representative_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('contact')}</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.exhibitorApplication.contact}
                    </div>
                  </div>
                  {selectedUser.exhibitorApplication.referrer && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">{t('referrer')}</label>
                      <div className="text-sm text-gray-900">
                        {selectedUser.exhibitorApplication.referrer}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('bio')}</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.exhibitorApplication.bio}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4 text-center py-4">
                <span className="text-sm text-gray-500">{t('noApplicationInfo')}</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
              <Button variant="white" onClick={() => setSelectedUser(null)}>
                {t('close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Artist Promote Modal */}
      <Modal
        isOpen={!!artistPromoteContext}
        onClose={closeArtistPromoteModal}
        title={t('promoteArtistTitle')}
        className="max-w-3xl"
      >
        {artistPromoteContext && (
          <div className="space-y-5">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-sm text-indigo-900 font-medium">
                {t('targetUser')}: {artistPromoteContext.user.name || t('unnamed')} (
                {artistPromoteContext.user.email})
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                {t('submittedArtistName')}:{' '}
                {artistPromoteContext.user.application?.artist_name || t('noSubmittedArtistName')}
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                {t('submittedContact')}:{' '}
                {artistPromoteContext.user.application?.contact || t('noSubmittedContact')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">{t('chooseMode')}</p>
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
                  {t('modeLinkExisting')}
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
                  {t('modeCreateAndLink')}
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
                  {t('modeRoleOnly')}
                </button>
              </div>
            </div>

            {artistPromoteContext.mode === 'link_existing' && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <label className="block text-sm font-medium text-slate-700">
                  {t('searchUnlinkedArtist')}
                </label>
                <div className="relative">
                  <AdminInput
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    placeholder={t('searchUnlinkedPlaceholder')}
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
                  {linkedNameConflicts.length > 0 && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                      {t('linkedNameConflicts', { count: linkedNameConflicts.length })}{' '}
                      {linkedNameConflicts
                        .map(
                          (item) =>
                            item.linked_user_name || item.linked_user_email || item.linked_user_id
                        )
                        .join(', ')}
                    </p>
                  )}
                  {linkedNameConflictError && (
                    <p className="text-amber-700">{linkedNameConflictError}</p>
                  )}
                  {artistSearchQuery.trim().length < 2 && (
                    <p className="text-slate-500">{t('searchMinChars')}</p>
                  )}
                  {artistSearchQuery.trim().length >= 2 && isSearchingArtists && (
                    <p className="text-indigo-600">{t('searchingUnlinkedArtist')}</p>
                  )}
                  {isArtistSearchSlow && <p className="text-amber-600">{t('searchSlow')}</p>}
                  {artistSearchError && <p className="text-rose-600">{artistSearchError}</p>}
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {artistOptions.length === 0 && !isSearchingArtists ? (
                    <div className="px-3 py-6 text-sm text-slate-500 text-center">
                      {artistSearchQuery.trim().length < 2
                        ? t('enterSearchKeyword')
                        : t('noSearchResult')}
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
                                {artist.name_ko || t('unnamed')}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {artist.name_en || '-'} · {artist.contact_phone || t('noPhone')} ·{' '}
                                {artist.contact_email || t('noEmail')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {t('artworkCount', { count: artist.artwork_count })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRecommended && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                                  {t('recommended')}
                                </span>
                              )}
                              {isSelected && (
                                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                  {t('selected')}
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
              <p className="font-medium text-slate-900 mb-2">{t('executionSummary')}</p>
              <ul className="space-y-1 list-disc pl-5">
                <li>{t('summaryActivateStatus')}</li>
                <li>{t('summaryChangeRole')}</li>
                <li>{t('summaryAutofillContact')}</li>
                {artistPromoteContext.mode === 'link_existing' && (
                  <li>
                    {t('summaryLinkSelectedArtist')}:
                    {selectedArtistOption
                      ? ` ${selectedArtistOption.name_ko || selectedArtistOption.id}`
                      : ` ${t('summarySelectionRequired')}`}
                  </li>
                )}
                {artistPromoteContext.mode === 'create_and_link' && (
                  <li>{t('summaryCreateArtist')}</li>
                )}
                {artistPromoteContext.mode === 'role_only' && (
                  <li className="text-amber-700">{t('summaryRoleOnly')}</li>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="white" onClick={closeArtistPromoteModal}>
                {t('cancel')}
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
                  ? t('approveWithLink')
                  : artistPromoteContext.mode === 'create_and_link'
                    ? t('approveWithCreate')
                    : t('approve')}
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
          title={t('approveConfirmTitle')}
          description={t('approveConfirmDescription', {
            name: approveTargetUser.name || t('unnamed'),
            email: approveTargetUser.email,
          })}
          confirmText={t('approveConfirmText')}
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
          title={t('rejectConfirmTitle')}
          description={t(
            rejectTargetUser.status === 'pending'
              ? 'rejectConfirmDescriptionPending'
              : 'rejectConfirmDescriptionActive',
            { name: rejectTargetUser.name || t('unnamed'), email: rejectTargetUser.email }
          )}
          confirmText={t(
            rejectTargetUser.status === 'pending'
              ? 'rejectConfirmTextPending'
              : 'rejectConfirmTextActive'
          )}
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
          title={t('reactivateConfirmTitle')}
          description={t('reactivateConfirmDescription', {
            name: reactivateTargetUser.name || t('unnamed'),
            email: reactivateTargetUser.email,
          })}
          confirmText={t('reactivateConfirmText')}
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
          title={t('roleChangeConfirmTitle')}
          description={t('roleChangeConfirmDescription', {
            name: roleChangeTargetUser.name || t('unnamed'),
            fromRole: roleChangeTargetUser.role,
            toRole: roleChangeConfirm.role,
          })}
          confirmText={t('roleChangeConfirmText')}
          variant="warning"
          isLoading={processingId === roleChangeTargetUser.id}
        />
      )}
    </div>
  );
}
