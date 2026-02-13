'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { useToast } from '@/lib/hooks/useToast';
import {
  createExhibitorArtwork,
  updateExhibitorArtwork,
  updateExhibitorArtworkImages,
} from '@/app/actions/exhibitor-artworks';
import {
  AdminCard,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminFieldLabel,
} from '@/app/admin/_components/admin-ui';

type Artist = {
  id: string;
  name_ko: string | null;
};

type Artwork = {
  id: string;
  title: string;
  description: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  edition: string | null;
  price: string | null;
  shop_url: string | null;
  artist_id: string | null;
  images: string[] | null;
};

type ExhibitorArtworkFormProps = {
  artwork?: Partial<Artwork>;
  artists: Artist[];
};

export function ExhibitorArtworkForm({ artwork = {}, artists }: ExhibitorArtworkFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [currentArtworkId, setCurrentArtworkId] = useState<string | undefined>(artwork.id);
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [artistQuery, setArtistQuery] = useState('');

  const filteredArtists = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((artist) => (artist.name_ko || '').toLowerCase().includes(q));
  }, [artists, artistQuery]);

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    try {
      if (currentArtworkId) {
        await updateExhibitorArtwork(currentArtworkId, formData);
        toast.success('작품 정보가 저장되었습니다.');
        router.refresh();
      } else {
        const result = await createExhibitorArtwork(formData);
        if (result.success && result.id) {
          setCurrentArtworkId(result.id);
          toast.success('작품이 생성되었습니다. 이미지를 등록해주세요.');
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = async (newImages: string[]) => {
    if (!currentArtworkId) return;
    setImages(newImages);
    setSavingImages(true);
    try {
      await updateExhibitorArtworkImages(currentArtworkId, newImages);
      toast.success('작품 이미지가 저장되었습니다.');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '이미지 저장 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setSavingImages(false);
    }
  };

  return (
    <div className="space-y-6">
      {currentArtworkId ? (
        <AdminCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            작품 이미지
            {savingImages && <span className="ml-2 text-sm text-slate-500">저장 중...</span>}
          </h2>
          <ImageUpload
            bucket="artworks"
            pathPrefix={`exhibitor-artwork-${currentArtworkId}`}
            value={images}
            onUploadComplete={handleImagesChange}
            maxFiles={10}
          />
        </AdminCard>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          이미지 등록은 작품 정보를 먼저 저장한 후에 가능합니다.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {currentArtworkId ? '작품 정보 수정' : '새 작품 등록'}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <AdminFieldLabel>
              작품명 <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput name="title" defaultValue={artwork.title} required />
          </div>

          <div>
            <AdminFieldLabel>
              작가 <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder="작가명 검색..."
              className="mb-2"
            />
            <AdminSelect
              name="artist_id"
              defaultValue={artwork.artist_id || ''}
              required
              className="w-full"
            >
              <option value="">작가 선택...</option>
              {filteredArtists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name_ko || '(이름 없음)'}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <AdminFieldLabel>
              가격 <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput
              name="price"
              defaultValue={artwork.price || ''}
              placeholder="₩1,000,000"
              required
            />
          </div>

          <div>
            <AdminFieldLabel>크기</AdminFieldLabel>
            <AdminInput name="size" defaultValue={artwork.size || ''} placeholder="60x45cm" />
          </div>

          <div>
            <AdminFieldLabel>재료</AdminFieldLabel>
            <AdminInput
              name="material"
              defaultValue={artwork.material || ''}
              placeholder="Oil on canvas"
            />
          </div>

          <div>
            <AdminFieldLabel>제작연도</AdminFieldLabel>
            <AdminInput name="year" defaultValue={artwork.year || ''} placeholder="2026" />
          </div>

          <div>
            <AdminFieldLabel>에디션</AdminFieldLabel>
            <AdminInput name="edition" defaultValue={artwork.edition || ''} placeholder="1/10" />
          </div>

          <div>
            <AdminFieldLabel>구매 링크</AdminFieldLabel>
            <AdminInput
              name="shop_url"
              type="url"
              defaultValue={artwork.shop_url || ''}
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <AdminFieldLabel>작가 노트</AdminFieldLabel>
          <AdminTextarea name="description" defaultValue={artwork.description || ''} rows={4} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/exhibitor/artworks')}>
            목록으로
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {currentArtworkId ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}
