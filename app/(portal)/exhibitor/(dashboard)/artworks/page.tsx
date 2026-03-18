import type { Metadata } from 'next';
import { getExhibitorArtworks } from '@/app/actions/exhibitor-artworks';
import { ExhibitorArtworkList } from './_components/exhibitor-artwork-list';
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
    title: locale === 'en' ? 'Artwork Management' : '작품 관리',
  };
}

export default async function ExhibitorArtworksPage() {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Artwork management',
          badge: 'My artworks',
          description: 'Register and manage artworks for your affiliated artists.',
          createArtwork: 'Add artwork',
        }
      : {
          title: '작품 관리',
          badge: '내 작품',
          description: '보유한 작가의 작품을 등록하고 관리합니다.',
          createArtwork: '작품 등록',
        };
  const artworks = await getExhibitorArtworks();

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
        <LinkButton href="/exhibitor/artworks/new" className="w-full sm:w-auto">
          {copy.createArtwork}
        </LinkButton>
      </div>
      <ExhibitorArtworkList artworks={artworks} />
    </div>
  );
}
