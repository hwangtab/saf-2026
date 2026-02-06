import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { UserList } from './user-list';

export default async function UsersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  // Fetch all profiles, ordered by pending first, then created_at desc
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
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
    (applications || []).map((application: any) => [application.user_id, application])
  );

  // Custom sort in JS to put pending first
  const sortedUsers = (users || [])
    .sort((a: any, b: any) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0; // Keep date sort
    })
    .map((user: any) => ({
      ...user,
      application: applicationMap.get(user.id) || null,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="mt-2 text-sm text-gray-500">신규 가입한 사용자를 승인하거나 관리합니다.</p>
      </div>

      <UserList users={sortedUsers} />
    </div>
  );
}
