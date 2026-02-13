import { ArtistForm } from '../_components/artist-form';

export default async function NewArtistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">새 작가 등록</h1>
        <p className="mt-2 text-sm text-slate-500">새로운 작가 정보를 입력하고 등록합니다.</p>
      </div>
      <ArtistForm />
    </div>
  );
}
