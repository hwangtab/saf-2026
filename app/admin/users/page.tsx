import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { UserList } from './user-list';
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
};

export default async function UsersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  // Fetch all profiles, ordered by pending first, then created_at desc
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, name, avatar_url, role, status, created_at')
    .order('status', { ascending: false }) // pending (p) > suspended (s) > active (a) ... simplistic, maybe specific logic better
    // 'pending' > 'active' > 'suspended' sorting is tricky with simple string sort.
    // Let's just sort by created_at desc for now, or filter client side if needed.
    // Ideally: Order by case status when 'pending' then 1 else 2 end.
    // Supabase JS order accepts simple cols.
    .order('created_at', { ascending: false });

  const { data: applications } = await supabase
    .from('artist_applications')
    .select('user_id, artist_name, contact, bio, updated_at');

  const applicationMap = new Map(
    (applications || []).map((application: ArtistApplication) => [application.user_id, application])
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
      application: applicationMap.get(user.id) || null,
    }));

  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader>
          <AdminPageTitle>사용자 관리</AdminPageTitle>
          <AdminPageDescription>신규 가입한 사용자를 승인하거나 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
      </div>

      <UserList users={sortedUsers} />
    </div>
  );
}
