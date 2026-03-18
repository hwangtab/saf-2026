import type { Metadata } from 'next';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ArtistList } from './_components/artist-list';
import LinkButton from '@/components/ui/LinkButton';
import {
  AdminBadge,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === 'en' ? 'Artist Management' : '작가 관리',
  };
}

export default async function ExhibitorArtistsPage() {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Artist management',
          badge: 'My artists',
          description: 'Register and manage affiliated artist information.',
          createArtist: 'Add artist',
        }
      : {
          title: '작가 관리',
          badge: '내 작가',
          description: '소속 작가 정보를 등록하고 관리합니다.',
          createArtist: '작가 등록',
        };
  const artists = await getExhibitorArtists();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <div className="flex items-center gap-2">
            <AdminPageTitle>{copy.title}</AdminPageTitle>
            <AdminBadge tone="info">{copy.badge}</AdminBadge>
          </div>
          <AdminPageDescription>{copy.description}</AdminPageDescription>
        </AdminPageHeader>
        <LinkButton href="/exhibitor/artists/new" className="w-full sm:w-auto">
          {copy.createArtist}
        </LinkButton>
      </div>
      <ArtistList artists={artists} />
    </div>
  );
}
