import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { UserList } from './user-list';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

const ITEMS_PER_PAGE = 20;

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
  role: 'admin' | 'artist' | 'user' | 'exhibitor';
  status: 'pending' | 'active' | 'suspended';
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
    page?: string;
  }>;
};

export default async function UsersPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  // 페이지 파싱
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // 기본 쿼리 빌더
  let query = supabase
    .from('profiles')
    .select('id, email, name, avatar_url, role, status, created_at', { count: 'exact' });

  // 역할 필터
  if (params.role && ['admin', 'artist', 'user', 'exhibitor'].includes(params.role)) {
    query = query.eq('role', params.role);
  }

  // 상태 필터
  if (params.status && ['pending', 'active', 'suspended'].includes(params.status)) {
    query = query.eq('status', params.status);
  }

  // 검색어 필터
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  // 정렬 및 페이지네이션
  const { data: users, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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

  // Custom sort in JS to put pending first
  const sortedUsers: ProfileWithApplication[] = (users || [])
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

  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader>
          <AdminPageTitle>사용자 관리</AdminPageTitle>
          <AdminPageDescription>신규 가입한 사용자를 승인하거나 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
      </div>

      <UserList
        users={sortedUsers}
        initialFilters={{
          role: params.role,
          status: params.status,
          q: params.q,
        }}
        pagination={{
          currentPage: page,
          totalPages,
          totalItems,
        }}
      />
    </div>
  );
}
