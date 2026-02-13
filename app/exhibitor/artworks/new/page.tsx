import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ExhibitorArtworkForm } from '../_components/exhibitor-artwork-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

export const metadata = {
  title: '새 작품 등록 | 씨앗페 2026',
};

export default async function NewExhibitorArtworkPage() {
  const artists = await getExhibitorArtists();

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>새 작품 등록</AdminPageTitle>
        <AdminPageDescription>
          보유한 작가를 선택하여 새로운 작품을 등록합니다.
        </AdminPageDescription>
      </AdminPageHeader>
      <ExhibitorArtworkForm artists={artists} />
    </div>
  );
}
