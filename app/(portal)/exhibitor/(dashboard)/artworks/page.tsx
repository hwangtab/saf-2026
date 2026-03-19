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
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('exhibitor');
  return {
    title: t('meta.artworkManagement'),
  };
}

export default async function ExhibitorArtworksPage() {
  const t = await getTranslations('exhibitor.artworks');
  const artworks = await getExhibitorArtworks();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <div className="flex items-center gap-2">
            <AdminPageTitle>{t('title')}</AdminPageTitle>
            <AdminBadge tone="info">{t('badge')}</AdminBadge>
          </div>
          <AdminPageDescription>{t('description')}</AdminPageDescription>
        </AdminPageHeader>
        <LinkButton href="/exhibitor/artworks/new" className="w-full sm:w-auto">
          {t('createArtwork')}
        </LinkButton>
      </div>
      <ExhibitorArtworkList artworks={artworks} />
    </div>
  );
}
