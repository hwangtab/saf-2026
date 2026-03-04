import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { ArtworkForm } from '../artwork-form';
import { AdminCard } from '@/app/admin/_components/admin-ui';

export default async function NewArtworkPage() {
  const { artist } = await getArtistDashboardContext();

  return (
    <AdminCard className="mx-auto max-w-4xl p-6 sm:p-8">
      <ArtworkForm artistId={artist.id} />
    </AdminCard>
  );
}
