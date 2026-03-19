import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { ProfileForm } from './profile-form';
import {
  AdminCard,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getTranslations } from 'next-intl/server';

export default async function ProfilePage() {
  const t = await getTranslations('dashboard.profile');
  const { artist, user } = await getArtistDashboardContext();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{t('description')}</AdminPageDescription>
      </AdminPageHeader>

      <AdminCard className="p-5 sm:p-6">
        <ProfileForm artist={artist} userId={user.id} />
      </AdminCard>
    </div>
  );
}
