import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type NewArtistPageProps = {
  searchParams?: {
    returnTo?: string | string[];
  };
};

export default async function NewArtistPage({ searchParams }: NewArtistPageProps) {
  const returnTo = Array.isArray(searchParams?.returnTo)
    ? searchParams?.returnTo[0]
    : searchParams?.returnTo;

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>새 작가 등록</AdminPageTitle>
        <AdminPageDescription>새로운 작가 정보를 입력하고 등록합니다.</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm returnTo={returnTo} />
    </div>
  );
}
