import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { UserList } from './user-list';
import { UserRole, UserStatus } from '@/types/database.types';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type ArtistApplication = {
  user_id: string;
  artist_name: string;
  contact: string;
  bio: string;
  referrer: string | null;
  updated_at: string;
};

type ExhibitorApplication = {
  user_id: string;
  representative_name: string;
  contact: string;
  bio: string;
  referrer: string | null;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
};

type ProfileWithApplication = ProfileRow & {
  application: ArtistApplication | null;
  exhibitorApplication: ExhibitorApplication | null;
};

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

  // 기본 쿼리 빌더
  let query = supabase
    .from('profiles')
    .select('id, email, name, avatar_url, role, status, created_at', { count: 'exact' });

  // 역할 필터
  const validRoles: UserRole[] = ['admin', 'artist', 'user', 'exhibitor'];
  if (params.role && validRoles.includes(params.role as UserRole)) {
    query = query.eq('role', params.role);
  }

  // 상태 필터
  const validStatuses: UserStatus[] = ['pending', 'active', 'suspended'];
  if (params.status && validStatuses.includes(params.status as UserStatus)) {
    query = query.eq('status', params.status);
  }

  // 검색어 필터
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data: users } = await query.order('created_at', { ascending: false });

  // Fetch artist applications
  const { data: artistApplications } = await supabase
    .from('artist_applications')
    .select('user_id, artist_name, contact, bio, referrer, updated_at');

  const artistApplicationMap = new Map(
    (artistApplications || []).map((app: ArtistApplication) => [app.user_id, app])
  );

  // Fetch exhibitor applications
  const { data: exhibitorApplications } = await supabase
    .from('exhibitor_applications')
    .select('user_id, representative_name, contact, bio, referrer, updated_at');

  const exhibitorApplicationMap = new Map(
    (exhibitorApplications || []).map((app: ExhibitorApplication) => [app.user_id, app])
  );

  const usersWithApplications: ProfileWithApplication[] = (users || [])
    .sort((a: ProfileRow, b: ProfileRow) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0; // Keep date sort
    })
    .map((user: ProfileRow) => ({
      ...user,
      application: artistApplicationMap.get(user.id) || null,
      exhibitorApplication: exhibitorApplicationMap.get(user.id) || null,
    }));

  const applicantFilter = params.applicant;
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
          <AdminPageTitle>심사 큐</AdminPageTitle>
          <AdminPageDescription>
            작가·출품자 신청 심사와 사용자 상태 관리를 통합합니다.
          </AdminPageDescription>
        </AdminPageHeader>
      </div>

      <UserList
        users={sortedUsers}
        initialFilters={{
          role: params.role,
          status: params.status,
          q: params.q,
          applicant: params.applicant,
        }}
      />
    </div>
  );
}
