import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

export default async function NewArtistPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>새 작가 등록</AdminPageTitle>
        <AdminPageDescription>새로운 작가 정보를 입력하고 등록합니다.</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm />
    </div>
  );
}
