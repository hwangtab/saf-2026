import type { Metadata } from 'next';
import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === 'en' ? 'Create New Artist | SAF 2026' : '새 작가 등록 | 씨앗페 2026',
  };
}

type NewArtistPageProps = {
  searchParams?: {
    returnTo?: string | string[];
  };
};

export default async function NewArtistPage({ searchParams }: NewArtistPageProps) {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Create new artist',
          description: 'Enter and register information for a new artist.',
        }
      : {
          title: '새 작가 등록',
          description: '새로운 작가 정보를 입력하고 등록합니다.',
        };
  const returnTo = Array.isArray(searchParams?.returnTo)
    ? searchParams?.returnTo[0]
    : searchParams?.returnTo;

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{copy.title}</AdminPageTitle>
        <AdminPageDescription>{copy.description}</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm returnTo={returnTo} />
    </div>
  );
}
