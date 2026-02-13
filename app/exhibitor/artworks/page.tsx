import { getExhibitorArtworks } from '@/app/actions/exhibitor-artworks';
import { ExhibitorArtworkList } from './_components/exhibitor-artwork-list';
import Button from '@/components/ui/Button';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

export const metadata = {
  title: '작품 관리 | Exhibitor Dashboard',
};

export default async function ExhibitorArtworksPage() {
  const artworks = await getExhibitorArtworks();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>작품 관리</AdminPageTitle>
          <AdminPageDescription>보유한 작가의 작품을 등록하고 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <Button href="/exhibitor/artworks/new" className="w-full sm:w-auto">
          작품 등록
        </Button>
      </div>
      <ExhibitorArtworkList artworks={artworks} />
    </div>
  );
}
