import { notFound } from 'next/navigation';
import { getExhibitorArtworkById } from '@/app/actions/exhibitor-artworks';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ExhibitorArtworkForm } from '../_components/exhibitor-artwork-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorArtworkDetailPage({ params }: Props) {
  const { id } = await params;

  let artwork;
  let artists;

  try {
    [artwork, artists] = await Promise.all([getExhibitorArtworkById(id), getExhibitorArtists()]);
  } catch {
    notFound();
  }

  if (!artwork) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>작품 정보 수정</AdminPageTitle>
        <AdminPageDescription>{artwork.title}</AdminPageDescription>
      </AdminPageHeader>
      <ExhibitorArtworkForm artwork={artwork} artists={artists} />
    </div>
  );
}
