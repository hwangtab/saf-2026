'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { resolveClientLocale } from '@/lib/client-locale';
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
  const locale = resolveClientLocale(pathname);
  const router = useRouter();
  const toast = useToast();
  const msg =
    locale === 'en'
      ? {
          filterConflictNotice:
            'Role filter conflicting with applicant type was cleared automatically.',
          filterConflictToast:
            'Role filter was cleared automatically to prevent applicant type conflict.',
          selectUnlinkedArtist: 'Please select an unlinked artist to connect.',
          rejectSuccess: 'Application rejected and account suspended.',
          exhibitorApproveSuccess: 'Exhibitor application approved.',
          artistApproveSuccess: 'Artist application approved.',
          reactivated: 'User has been reactivated.',
          roleChanged: (role: string) => `Role changed to ${role}.`,
          searchUnlinkedArtistFailed:
            'Failed to search unlinked artists. Please try again shortly.',
          linkedNameConflictFailed: 'Failed to check duplicate-name linked artists.',
          exhibitorApproveError: 'An error occurred while approving exhibitor.',
          userDetailsTitle: 'User details',
          roleUser: 'User',
          roleArtist: 'Artist',
          roleExhibitor: 'Exhibitor',
          roleAdmin: 'Admin',
          statusActive: 'Active',
          statusPending: 'Pending',
          statusSuspended: 'Suspended',
          artistApplicationInfo: 'Artist application',
          exhibitorApplicationInfo: 'Exhibitor application',
          artistName: 'Artist name',
          representativeName: 'Representative',
          contact: 'Contact',
          referrer: 'Referrer',
          bio: 'Bio',
          noApplicationInfo: 'No application information.',
          close: 'Close',
          promoteArtistTitle: 'Grant Artist role and link profile',
          unnamed: 'Unnamed',
          noSubmittedArtistName: 'No submitted artist name.',
          noSubmittedContact: 'No submitted contact.',
          targetUser: 'Target user',
          submittedArtistName: 'Submitted artist name',
          submittedContact: 'Submitted contact',
          chooseMode: 'Select processing mode',
          modeLinkExisting: 'Select unlinked artist',
          modeCreateAndLink: 'Create and link new artist',
          modeRoleOnly: 'Change role only',
          searchUnlinkedArtist: 'Search unlinked artist',
          searchUnlinkedPlaceholder: 'Search by artist name (KR/EN) or email...',
          linkedNameConflicts: (count: number) =>
            `There are ${count} already-linked artists with the same name.`,
          searchMinChars: 'Enter at least 2 characters to search unlinked artists.',
          searchingUnlinkedArtist: 'Searching unlinked artists...',
          searchSlow: 'Search is taking longer than usual. Please wait a moment.',
          enterSearchKeyword: 'Please enter a search keyword.',
          noSearchResult: 'No search results.',
          noPhone: 'No phone',
          noEmail: 'No email',
          artworkCount: (count: number) => `${count} artworks`,
          recommended: 'Recommended',
          selected: 'Selected',
          executionSummary: 'Execution summary',
          summaryActivateStatus: 'Set user status to `active`.',
          summaryChangeRole: 'Set user role to `artist`.',
          summaryAutofillContact:
            'If artist contact fields are empty, auto-fill phone/email from user application data.',
          summaryLinkSelectedArtist: 'Link with selected artist',
          summarySelectionRequired: '(selection required)',
          summaryCreateArtist: 'Create an artist profile from application data and link it.',
          summaryRoleOnly: 'Change role only without linking an artist profile.',
          cancel: 'Cancel',
          approve: 'Approve',
          approveWithLink: 'Link and approve',
          approveWithCreate: 'Create and approve',
          approveConfirmTitle: 'Confirm approval',
          approveConfirmDescription: (name: string, email: string) =>
            `Approve application for ${name} (${email})?`,
          approveConfirmText: 'Approve',
          rejectConfirmTitle: 'Confirm reject/suspend',
          rejectConfirmDescription: (name: string, email: string, isPending: boolean) =>
            `Are you sure you want to ${isPending ? 'reject the application' : 'suspend the account'} for ${name} (${email})?`,
          rejectConfirmText: (isPending: boolean) => (isPending ? 'Reject' : 'Suspend'),
          reactivateConfirmTitle: 'Confirm reactivation',
          reactivateConfirmDescription: (name: string, email: string) =>
            `Reactivate account for ${name} (${email})?`,
          reactivateConfirmText: 'Reactivate',
          roleChangeConfirmTitle: 'Confirm role change',
          roleChangeConfirmDescription: (name: string, fromRole: string, toRole: string) =>
            `Change ${name}'s role from ${fromRole} to ${toRole}?`,
          roleChangeConfirmText: 'Change role',
          promoteArtistSuccess: 'Artist role granted.',
          promoteArtistError: 'An error occurred while granting artist role.',
          rejectError: 'An error occurred while rejecting/suspending account.',
          approveError: 'An error occurred while approving application.',
          reactivateError: 'An error occurred while reactivating account.',
          roleChangeError: 'An error occurred while changing role.',
        }
      : {
          filterConflictNotice: '신청유형과 충돌하는 권한 필터를 자동 해제했습니다.',
          filterConflictToast: '필터 충돌을 방지하기 위해 권한 필터를 자동 해제했습니다.',
          selectUnlinkedArtist: '연결할 미연결 작가를 선택해 주세요.',
          rejectSuccess: '신청을 거절하고 계정을 정지했습니다.',
          exhibitorApproveSuccess: '출품자 신청을 승인했습니다.',
          artistApproveSuccess: '작가 신청을 승인했습니다.',
          reactivated: '사용자를 다시 활성화했습니다.',
          roleChanged: (role: string) => `권한을 ${role}로 변경했습니다.`,
          searchUnlinkedArtistFailed:
            '미연결 작가 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          linkedNameConflictFailed: '동명이인 연결 여부 확인에 실패했습니다.',
          exhibitorApproveError: '출품자 승인 중 오류가 발생했습니다.',
          userDetailsTitle: '사용자 상세 정보',
          roleUser: '일반 사용자',
          roleArtist: '작가',
          roleExhibitor: '출품자',
          roleAdmin: '관리자',
          statusActive: '활성',
          statusPending: '대기',
          statusSuspended: '정지',
          artistApplicationInfo: '작가 신청 정보',
          exhibitorApplicationInfo: '출품자 신청 정보',
          artistName: '작가명',
          representativeName: '대표명',
          contact: '연락처',
          referrer: '추천인',
          bio: '소개',
          noApplicationInfo: '신청 정보가 없습니다.',
          close: '닫기',
          promoteArtistTitle: 'Artist 권한 부여 및 작가 연결',
          unnamed: '이름 없음',
          noSubmittedArtistName: '제출된 작가명이 없습니다.',
          noSubmittedContact: '제출된 연락처가 없습니다.',
          targetUser: '대상 사용자',
          submittedArtistName: '신청 작가명',
          submittedContact: '신청 연락처',
          chooseMode: '처리 방식 선택',
          modeLinkExisting: '미연결 작가 선택',
          modeCreateAndLink: '새 작가 생성 후 연결',
          modeRoleOnly: '권한만 변경',
          searchUnlinkedArtist: '미연결 작가 검색',
          searchUnlinkedPlaceholder: '작가명(한/영) 또는 이메일 검색...',
          linkedNameConflicts: (count: number) =>
            `이미 연결된 동명이인 작가가 ${count}명 있습니다.`,
          searchMinChars: '두 글자 이상 입력하면 미연결 작가를 검색합니다.',
          searchingUnlinkedArtist: '미연결 작가를 검색 중입니다...',
          searchSlow: '검색이 평소보다 오래 걸리고 있습니다. 잠시만 기다려 주세요.',
          enterSearchKeyword: '검색어를 입력해 주세요.',
          noSearchResult: '검색 결과가 없습니다.',
          noPhone: '전화번호 없음',
          noEmail: '이메일 없음',
          artworkCount: (count: number) => `${count} 작품`,
          recommended: '추천',
          selected: '선택됨',
          executionSummary: '실행 요약',
          summaryActivateStatus: '사용자 상태를 `active`로 변경합니다.',
          summaryChangeRole: '사용자 권한을 `artist`로 변경합니다.',
          summaryAutofillContact:
            '작가 연락처가 비어 있으면 사용자/신청 정보로 전화번호·이메일을 자동 채웁니다.',
          summaryLinkSelectedArtist: '선택 작가와 연결',
          summarySelectionRequired: '(선택 필요)',
          summaryCreateArtist: '신청 정보를 기준으로 작가 프로필을 생성하고 사용자와 연결합니다.',
          summaryRoleOnly: '작가 프로필 연결 없이 권한만 변경됩니다.',
          cancel: '취소',
          approve: '승인',
          approveWithLink: '연결하고 승인',
          approveWithCreate: '생성하고 승인',
          approveConfirmTitle: '신청 승인 확인',
          approveConfirmDescription: (name: string, email: string) =>
            `${name} (${email}) 님의 신청을 승인하시겠습니까?`,
          approveConfirmText: '승인하기',
          rejectConfirmTitle: '계정 거절/정지 확인',
          rejectConfirmDescription: (name: string, email: string, isPending: boolean) =>
            `${name} (${email}) 님의 ${isPending ? '가입 신청을 거절' : '계정을 정지'}하시겠습니까?`,
          rejectConfirmText: (isPending: boolean) => (isPending ? '거절하기' : '정지하기'),
          reactivateConfirmTitle: '계정 재활성화 확인',
          reactivateConfirmDescription: (name: string, email: string) =>
            `${name} (${email}) 님의 계정을 다시 활성화하시겠습니까?`,
          reactivateConfirmText: '재활성화',
          roleChangeConfirmTitle: '권한 변경 확인',
          roleChangeConfirmDescription: (name: string, fromRole: string, toRole: string) =>
            `${name} 님의 권한을 ${fromRole}에서 ${toRole}로 변경하시겠습니까?`,
          roleChangeConfirmText: '변경하기',
          promoteArtistSuccess: '작가 권한을 부여했습니다.',
          promoteArtistError: '작가 권한 부여 중 오류가 발생했습니다.',
          rejectError: '계정 거절/정지 처리 중 오류가 발생했습니다.',
          approveError: '신청 승인 중 오류가 발생했습니다.',
          reactivateError: '계정 재활성화 중 오류가 발생했습니다.',
          roleChangeError: '권한 변경 중 오류가 발생했습니다.',
        };

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
        setFilterNotice(msg.filterConflictNotice);
        toast.info(msg.filterConflictToast);
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
    [msg.filterConflictNotice, msg.filterConflictToast, pathname, router, toast]
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
          setArtistSearchError(msg.searchUnlinkedArtistFailed);
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
  }, [artistPromoteContext, debouncedArtistSearchQuery, msg.searchUnlinkedArtistFailed]);

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
          setLinkedNameConflictError(msg.linkedNameConflictFailed);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [artistPromoteContext, msg.linkedNameConflictFailed]);

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
      toast.error(msg.selectUnlinkedArtist);
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
      toast.error(resolveActionMessage(res.message, msg.promoteArtistError));
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
    toast.success(resolveActionMessage(res.message, msg.promoteArtistSuccess));
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
      toast.error(resolveActionMessage(res.message, msg.rejectError));
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'suspended' } : user))
      );
      setRejectConfirmId(null);
      toast.success(msg.rejectSuccess);
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
            ? msg.exhibitorApproveError
            : error instanceof Error
              ? error.message
              : msg.exhibitorApproveError;
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
      toast.success(msg.exhibitorApproveSuccess);
      return;
    }

    const result = await approveUser(approveConfirmId);
    setProcessingId(null);

    if (result.error) {
      toast.error(resolveActionMessage(result.message, msg.approveError));
      return;
    }

    setLocalUsers((prev) =>
      prev.map((user) =>
        user.id === approveConfirmId ? { ...user, role: 'artist', status: 'active' } : user
      )
    );
    setApproveConfirmId(null);
    toast.success(msg.artistApproveSuccess);
  };

  const executeReactivate = async () => {
    if (!reactivateConfirmId) return;
    const id = reactivateConfirmId;
    setProcessingId(id);
    const res = await reactivateUser(id);
    setProcessingId(null);
    if (res.error) {
      toast.error(resolveActionMessage(res.message, msg.reactivateError));
    } else {
      setLocalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'active' } : user))
      );
      setReactivateConfirmId(null);
      toast.success(msg.reactivated);
    }
  };

  const executeRoleChange = async () => {
    if (!roleChangeConfirm) return;
    const { id, role: newRole } = roleChangeConfirm;
    setProcessingId(id);
    const res = await updateUserRole(id, newRole as Profile['role']);
    setProcessingId(null);
    if (res.error) {
      toast.error(resolveActionMessage(res.message, msg.roleChangeError));
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
      toast.success(msg.roleChanged(newRole));
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
        title={msg.userDetailsTitle}
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
                      user: msg.roleUser,
                      artist: msg.roleArtist,
                      exhibitor: msg.roleExhibitor,
                      admin: msg.roleAdmin,
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
                      active: msg.statusActive,
                      pending: msg.statusPending,
                      suspended: msg.statusSuspended,
                    }[selectedUser.status] || selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

            {selectedUser.application ? (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="font-medium text-gray-900">{msg.artistApplicationInfo}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500">{msg.artistName}</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.application.artist_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{msg.contact}</label>
                    <div className="text-sm text-gray-900">{selectedUser.application.contact}</div>
                  </div>
                  {selectedUser.application.referrer && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">{msg.referrer}</label>
                      <div className="text-sm text-gray-900">
                        {selectedUser.application.referrer}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{msg.bio}</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.application.bio}
                  </div>
                </div>
              </div>
            ) : selectedUser.exhibitorApplication ? (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="font-medium text-gray-900">{msg.exhibitorApplicationInfo}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500">{msg.representativeName}</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.exhibitorApplication.representative_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{msg.contact}</label>
                    <div className="text-sm text-gray-900">
                      {selectedUser.exhibitorApplication.contact}
                    </div>
                  </div>
                  {selectedUser.exhibitorApplication.referrer && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">{msg.referrer}</label>
                      <div className="text-sm text-gray-900">
                        {selectedUser.exhibitorApplication.referrer}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{msg.bio}</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedUser.exhibitorApplication.bio}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4 text-center py-4">
                <span className="text-sm text-gray-500">{msg.noApplicationInfo}</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
              <Button variant="white" onClick={() => setSelectedUser(null)}>
                {msg.close}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Artist Promote Modal */}
      <Modal
        isOpen={!!artistPromoteContext}
        onClose={closeArtistPromoteModal}
        title={msg.promoteArtistTitle}
        className="max-w-3xl"
      >
        {artistPromoteContext && (
          <div className="space-y-5">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-sm text-indigo-900 font-medium">
                {msg.targetUser}: {artistPromoteContext.user.name || msg.unnamed} (
                {artistPromoteContext.user.email})
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                {msg.submittedArtistName}:{' '}
                {artistPromoteContext.user.application?.artist_name || msg.noSubmittedArtistName}
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                {msg.submittedContact}:{' '}
                {artistPromoteContext.user.application?.contact || msg.noSubmittedContact}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">{msg.chooseMode}</p>
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
                  {msg.modeLinkExisting}
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
                  {msg.modeCreateAndLink}
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
                  {msg.modeRoleOnly}
                </button>
              </div>
            </div>

            {artistPromoteContext.mode === 'link_existing' && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <label className="block text-sm font-medium text-slate-700">
                  {msg.searchUnlinkedArtist}
                </label>
                <div className="relative">
                  <AdminInput
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    placeholder={msg.searchUnlinkedPlaceholder}
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
                      {msg.linkedNameConflicts(linkedNameConflicts.length)}{' '}
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
                    <p className="text-slate-500">{msg.searchMinChars}</p>
                  )}
                  {artistSearchQuery.trim().length >= 2 && isSearchingArtists && (
                    <p className="text-indigo-600">{msg.searchingUnlinkedArtist}</p>
                  )}
                  {isArtistSearchSlow && <p className="text-amber-600">{msg.searchSlow}</p>}
                  {artistSearchError && <p className="text-rose-600">{artistSearchError}</p>}
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {artistOptions.length === 0 && !isSearchingArtists ? (
                    <div className="px-3 py-6 text-sm text-slate-500 text-center">
                      {artistSearchQuery.trim().length < 2
                        ? msg.enterSearchKeyword
                        : msg.noSearchResult}
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
                                {artist.name_ko || msg.unnamed}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {artist.name_en || '-'} · {artist.contact_phone || msg.noPhone} ·{' '}
                                {artist.contact_email || msg.noEmail}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {msg.artworkCount(artist.artwork_count)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRecommended && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                                  {msg.recommended}
                                </span>
                              )}
                              {isSelected && (
                                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                  {msg.selected}
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
              <p className="font-medium text-slate-900 mb-2">{msg.executionSummary}</p>
              <ul className="space-y-1 list-disc pl-5">
                <li>{msg.summaryActivateStatus}</li>
                <li>{msg.summaryChangeRole}</li>
                <li>{msg.summaryAutofillContact}</li>
                {artistPromoteContext.mode === 'link_existing' && (
                  <li>
                    {msg.summaryLinkSelectedArtist}:
                    {selectedArtistOption
                      ? ` ${selectedArtistOption.name_ko || selectedArtistOption.id}`
                      : ` ${msg.summarySelectionRequired}`}
                  </li>
                )}
                {artistPromoteContext.mode === 'create_and_link' && (
                  <li>{msg.summaryCreateArtist}</li>
                )}
                {artistPromoteContext.mode === 'role_only' && (
                  <li className="text-amber-700">{msg.summaryRoleOnly}</li>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="white" onClick={closeArtistPromoteModal}>
                {msg.cancel}
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
                  ? msg.approveWithLink
                  : artistPromoteContext.mode === 'create_and_link'
                    ? msg.approveWithCreate
                    : msg.approve}
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
          title={msg.approveConfirmTitle}
          description={msg.approveConfirmDescription(
            approveTargetUser.name || msg.unnamed,
            approveTargetUser.email
          )}
          confirmText={msg.approveConfirmText}
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
          title={msg.rejectConfirmTitle}
          description={msg.rejectConfirmDescription(
            rejectTargetUser.name || msg.unnamed,
            rejectTargetUser.email,
            rejectTargetUser.status === 'pending'
          )}
          confirmText={msg.rejectConfirmText(rejectTargetUser.status === 'pending')}
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
          title={msg.reactivateConfirmTitle}
          description={msg.reactivateConfirmDescription(
            reactivateTargetUser.name || msg.unnamed,
            reactivateTargetUser.email
          )}
          confirmText={msg.reactivateConfirmText}
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
          title={msg.roleChangeConfirmTitle}
          description={msg.roleChangeConfirmDescription(
            roleChangeTargetUser.name || msg.unnamed,
            roleChangeTargetUser.role,
            roleChangeConfirm.role
          )}
          confirmText={msg.roleChangeConfirmText}
          variant="warning"
          isLoading={processingId === roleChangeTargetUser.id}
        />
      )}
    </div>
  );
}
