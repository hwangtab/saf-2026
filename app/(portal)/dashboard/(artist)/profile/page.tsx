import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { ProfileForm } from './profile-form';
import {
  AdminCard,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

export default async function ProfilePage() {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Profile settings',
          description: 'Manage artist details, biography, and external links.',
        }
      : {
          title: '프로필 설정',
          description: '작가 정보와 소개글, 외부 링크를 관리합니다.',
        };
  const { artist, user } = await getArtistDashboardContext();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{copy.title}</AdminPageTitle>
        <AdminPageDescription>{copy.description}</AdminPageDescription>
      </AdminPageHeader>

      <AdminCard className="p-5 sm:p-6">
        <ProfileForm artist={artist} userId={user.id} />
      </AdminCard>
    </div>
  );
}
