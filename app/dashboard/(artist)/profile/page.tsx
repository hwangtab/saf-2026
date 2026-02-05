import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { ProfileForm } from './profile-form';

export default async function ProfilePage() {
  const user = await requireArtistActive();
  const supabase = await createSupabaseServerClient();

  // Fetch existing artist data
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">프로필 설정</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>작가 정보와 소개글을 관리합니다.</p>
          </div>

          <div className="mt-5">
            <ProfileForm artist={artist} userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
