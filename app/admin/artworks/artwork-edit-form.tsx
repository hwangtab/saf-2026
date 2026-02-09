'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { updateArtworkDetails, updateArtworkImages } from '@/app/actions/admin-artworks';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { AdminCard, AdminSelect } from '@/app/admin/_components/admin-ui';

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
  artists: Artist | null;
};

type ArtworkEditFormProps = {
  artwork: Artwork;
  artists: Artist[];
};

export function ArtworkEditForm({ artwork, artists }: ArtworkEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSaving(true);
    try {
      await updateArtworkDetails(artwork.id, formData);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = async (newImages: string[]) => {
    setImages(newImages);
    setError(null);
    setSavingImages(true);
    try {
      await updateArtworkImages(artwork.id, newImages);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingImages(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
            aria-label="오류 메시지 닫기"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Image Section */}
      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          작품 이미지
          {savingImages && <span className="ml-2 text-sm text-gray-500">저장 중...</span>}
        </h2>
        <ImageUpload
          bucket="artworks"
          pathPrefix={`admin-artwork-${artwork.id}`}
          value={images}
          onChange={handleImagesChange}
          onUploadComplete={handleImagesChange}
          maxFiles={10}
        />
      </AdminCard>

      {/* Details Section */}
      <form
        action={handleSubmit}
        className="space-y-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900">작품 정보</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              작품명 <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              defaultValue={artwork.title}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">작가</label>
            <AdminSelect
              name="artist_id"
              defaultValue={artwork.artist_id || ''}
              className="px-3 py-2 pr-9"
              iconClassName="right-3"
            >
              <option value="">작가 선택...</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name_ko || '(이름 없음)'}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">가격</label>
            <input
              name="price"
              defaultValue={artwork.price || ''}
              placeholder="₩1,000,000"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">크기</label>
            <input
              name="size"
              defaultValue={artwork.size || ''}
              placeholder="60x45cm"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">재료</label>
            <input
              name="material"
              defaultValue={artwork.material || ''}
              placeholder="Oil on canvas"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제작연도</label>
            <input
              name="year"
              defaultValue={artwork.year || ''}
              placeholder="2026"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">에디션</label>
            <input
              name="edition"
              defaultValue={artwork.edition || ''}
              placeholder="1/10"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">구매 링크</label>
            <input
              name="shop_url"
              type="url"
              defaultValue={artwork.shop_url || ''}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">작품 설명</label>
          <textarea
            name="description"
            defaultValue={artwork.description || ''}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/admin/artworks')}>
            목록으로
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}
