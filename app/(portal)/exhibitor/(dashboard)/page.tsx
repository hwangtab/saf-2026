import type { Metadata } from 'next';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import {
  AdminCard,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === 'en' ? 'Dashboard | SAF 2026' : '대시보드 | 씨앗페 2026',
  };
}

export default async function ExhibitorDashboard() {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Dashboard',
          description: 'Overview of artists and artworks managed by this account.',
          managedArtists: 'Managed artists',
          registeredArtworks: 'Registered artworks',
        }
      : {
          title: '대시보드',
          description: '현재 계정에서 관리 중인 작가와 작품 현황입니다.',
          managedArtists: '관리 중인 작가',
          registeredArtworks: '등록된 작품',
        };
  const artists = await getExhibitorArtists();
  const artworkCount = artists.reduce(
    (sum: number, artist) =>
      sum + (typeof artist.artwork_count === 'number' ? artist.artwork_count : 0),
    0
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>{copy.title}</AdminPageTitle>
        <AdminPageDescription>{copy.description}</AdminPageDescription>
      </AdminPageHeader>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AdminCard className="p-6">
          <h2 className="text-sm font-medium text-slate-500">{copy.managedArtists}</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{artists.length}</p>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-sm font-medium text-slate-500">{copy.registeredArtworks}</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{artworkCount}</p>
        </AdminCard>
      </div>
    </div>
  );
}
