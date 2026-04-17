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
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function NewArtistPage({ searchParams }: NewArtistPageProps) {
  const t = await getTranslations('exhibitor.artistNew');
  const params = await searchParams;
  const returnToRaw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  // BUG 23: open redirect 방지 — /exhibitor/ 경로만 허용
  const returnTo = returnToRaw?.startsWith('/exhibitor/') ? returnToRaw : undefined;

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
