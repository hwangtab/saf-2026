import type { Metadata } from 'next';
import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('exhibitor');
  return {
    title: t('meta.createNewArtist'),
  };
}

type NewArtistPageProps = {
  searchParams?: {
    returnTo?: string | string[];
  };
};

export default async function NewArtistPage({ searchParams }: NewArtistPageProps) {
  const t = await getTranslations('exhibitor.artistNew');
  const returnTo = Array.isArray(searchParams?.returnTo)
    ? searchParams?.returnTo[0]
    : searchParams?.returnTo;

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{t('description')}</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm returnTo={returnTo} />
    </div>
  );
}
