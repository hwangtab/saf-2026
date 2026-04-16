import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { UserList } from './user-list';
import type { Profile } from '@/types/admin';
import { UserRole, UserStatus } from '@/types/database.types';
import { hasComposedTrailingConsonantQuery, hasHangulJamo } from '@/lib/search-utils';
import { sanitizeIlikeQuery } from '@/lib/utils/query';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

// Type annotations removed — DB query results are now inferred from typed Supabase client

type Props = {
  searchParams: Promise<{
    role?: string;
    status?: string;
    q?: string;
    applicant?: string;
  }>;
};

export default async function UsersPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const applicantFilter =
    params.applicant === 'artist' || params.applicant === 'exhibitor'
      ? params.applicant
      : undefined;
  const isReviewQueueMode = params.status === 'pending';

  // 기본 쿼리 빌더
  let query = supabase
    .from('profiles')
    .select('id, email, name, avatar_url, role, status, created_at', { count: 'exact' });

  // 역할 필터
  const validRoles: UserRole[] = ['admin', 'artist', 'user', 'exhibitor'];
  const requestedRole =
    params.role && validRoles.includes(params.role as UserRole) ? (params.role as UserRole) : null;
  const isRoleCompatibleWithApplicant =
    !requestedRole ||
    !applicantFilter ||
    (applicantFilter === 'artist' && (requestedRole === 'user' || requestedRole === 'artist')) ||
    (applicantFilter === 'exhibitor' &&
      (requestedRole === 'user' || requestedRole === 'exhibitor'));

  if (requestedRole && isRoleCompatibleWithApplicant) {
    query = query.eq('role', requestedRole);
  }

  // 상태 필터
  const validStatuses: UserStatus[] = ['pending', 'active', 'suspended'];
  if (params.status && validStatuses.includes(params.status as UserStatus)) {
    query = query.eq('status', params.status as 'pending' | 'active' | 'suspended');
  }

  // 검색어 필터: 초성/자모 입력은 클라이언트 보강 필터로 처리
  if (
    params.q &&
    params.q.trim() &&
    !hasHangulJamo(params.q) &&
    !hasComposedTrailingConsonantQuery(params.q)
  ) {
    const searchTerm = sanitizeIlikeQuery(params.q.trim());
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data: users } = await query.order('created_at', { ascending: false });

  const userIds = (users || []).map((u) => u.id);

  // Fetch only applications for the users in the current result set
  const [{ data: artistApplications }, { data: exhibitorApplications }] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from('artist_applications')
          .select('user_id, artist_name, contact, bio, referrer, updated_at')
          .in('user_id', userIds)
      : { data: [] },
    userIds.length > 0
      ? supabase
          .from('exhibitor_applications')
          .select('user_id, representative_name, contact, bio, referrer, updated_at')
          .in('user_id', userIds)
      : { data: [] },
  ]);

  const artistApplicationMap = new Map((artistApplications || []).map((app) => [app.user_id, app]));

  const exhibitorApplicationMap = new Map(
    (exhibitorApplications || []).map((app) => [app.user_id, app])
  );

  const usersWithApplications = (users || [])
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0; // Keep date sort
    })
    .map((user) => ({
      ...user,
      application: artistApplicationMap.get(user.id) || null,
      exhibitorApplication: exhibitorApplicationMap.get(user.id) || null,
    }));

  const sortedUsers = usersWithApplications.filter((user) => {
    if (applicantFilter === 'artist') {
      return Boolean(user.application);
    }

    if (applicantFilter === 'exhibitor') {
      return Boolean(user.exhibitorApplication);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader>
          <AdminPageTitle>{isReviewQueueMode ? '심사 큐' : '사용자 관리'}</AdminPageTitle>
          <AdminPageDescription>
            {isReviewQueueMode
              ? '작가·출품자 신청 심사와 사용자 상태 관리를 통합합니다.'
              : '가입된 사용자 권한과 계정 상태를 관리합니다.'}
          </AdminPageDescription>
        </AdminPageHeader>
      </div>

      <UserList
        users={sortedUsers as Profile[]}
        initialFilters={{
          role: params.role,
          status: params.status,
          q: params.q,
          applicant: applicantFilter,
        }}
      />
    </div>
  );
}
