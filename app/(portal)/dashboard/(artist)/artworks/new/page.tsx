import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { isExhibitionSlug } from '@/lib/exhibitions';
import { ArtworkForm } from '../artwork-form';
import { AdminCard } from '@/app/admin/_components/admin-ui';

type NewArtworkPageProps = {
  searchParams: Promise<{ exhibition?: string }>;
};

export default async function NewArtworkPage({ searchParams }: NewArtworkPageProps) {
  const { artist } = await getArtistDashboardContext();
  const params = await searchParams;
  const exhibition = isExhibitionSlug(params.exhibition) ? params.exhibition : undefined;

  return (
    <AdminCard className="mx-auto max-w-4xl p-6 sm:p-8">
      <ArtworkForm artistId={artist.id} exhibition={exhibition} />
    </AdminCard>
  );
}
