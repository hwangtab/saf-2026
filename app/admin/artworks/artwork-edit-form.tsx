'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import {
  updateArtworkDetails,
  updateArtworkImages,
  createAdminArtwork,
} from '@/app/actions/admin-artworks';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { AdminCard, AdminSelect } from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';
import { matchesSearchText } from '@/lib/search-utils';
import { cn } from '@/lib/utils';
import { EditionType } from '@/types';

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
  edition_type: EditionType | null;
  edition_limit: number | null;
  price: string | null;
  artist_id: string | null;
  images: string[] | null;
  artists: Artist | null;
};

type ArtworkEditFormProps = {
  artwork?: Partial<Artwork>;
  artists: Artist[];
  initialArtistId?: string;
  artistJustCreated?: boolean;
};

export function ArtworkEditForm({
  artwork = {},
  artists,
  initialArtistId,
  artistJustCreated = false,
}: ArtworkEditFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!artwork.id;
  const initialSelectedArtistId = artwork.artist_id || initialArtistId || '';
  const [selectedArtistId, setSelectedArtistId] = useState(initialSelectedArtistId);
  const [artistQuery, setArtistQuery] = useState('');

  // Form Field States for Validation & Formatting
  const [price, setPrice] = useState(artwork.price || '');
  const [title, setTitle] = useState(artwork.title || '');
  const [editionType, setEditionType] = useState<EditionType>(artwork.edition_type || 'unique');
  const [editionLimit, setEditionLimit] = useState<number | ''>(artwork.edition_limit || '');
  const [showErrors, setShowErrors] = useState(false);

  const formatPrice = (val: string) => {
    // 숫자만 추출
    const numericValue = val.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    // 한국 원화 형식 포맷
    return `₩${Number(numericValue).toLocaleString('ko-KR')}`;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setPrice(formatted);
  };

  useEffect(() => {
    setSelectedArtistId(initialSelectedArtistId);
  }, [initialSelectedArtistId]);

  const filteredArtists = useMemo(() => {
    const normalizedQuery = artistQuery.trim();
    if (!normalizedQuery) return artists;
    return artists.filter((artist) => matchesSearchText(artist.name_ko, normalizedQuery));
  }, [artists, artistQuery]);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setShowErrors(true);

    // Validation
    if (!title.trim() || !selectedArtistId) {
      toast.error('필수 정보를 입력해주세요.');
      return;
    }

    if (editionType === 'limited' && !editionLimit) {
      toast.error('한정판은 에디션 수량을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && artwork.id) {
        await updateArtworkDetails(artwork.id, formData);
        toast.success('작품 정보가 저장되었습니다.');
        router.push('/admin/artworks');
      } else {
        const result = await createAdminArtwork(formData);
        if (result.success && result.id) {
          toast.success('작품이 생성되었습니다.');
          router.push('/admin/artworks');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = async (newImages: string[]) => {
    if (!artwork.id) return;
    setImages(newImages);
    setError(null);
    setSavingImages(true);
    try {
      await updateArtworkImages(artwork.id, newImages);
      toast.success('작품 이미지가 저장되었습니다.');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '이미지 저장 중 오류가 발생했습니다.';
      setError(message);
      toast.error(message);
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

      {artistJustCreated && !isEditing && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          새 작가가 등록되었습니다. 아래에서 바로 선택해 작품 등록을 이어서 진행하세요.
        </div>
      )}

      {/* Image Section - Only visible when editing */}
      {isEditing && artwork.id ? (
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            작품 이미지
            {savingImages && <span className="ml-2 text-sm text-gray-500">저장 중...</span>}
          </h2>
          <ImageUpload
            bucket="artworks"
            pathPrefix={`admin-artwork-${artwork.id}`}
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

      {/* Details Section */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? '작품 정보 수정' : '새 작품 등록'}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              작품명 <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors',
                showErrors && !title.trim() ? 'border-red-500 bg-red-50' : 'border-gray-300'
              )}
            />
            {showErrors && !title.trim() && (
              <p className="mt-1 text-xs text-red-600">작품명을 입력해주세요.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                작가 <span className="text-red-500">*</span>
              </label>
              <Link
                href="/admin/artists/new?returnTo=%2Fadmin%2Fartworks%2Fnew"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                + 새 작가 등록
              </Link>
            </div>
            <input
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder="작가명 검색..."
              className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
            <AdminSelect
              name="artist_id"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              className={cn(
                'px-3 py-2 pr-9',
                artistJustCreated && 'border-green-300 bg-green-50 text-green-900',
                showErrors && !selectedArtistId && 'border-red-500 bg-red-50'
              )}
              iconClassName="right-3"
              required
            >
              <option value="">작가 선택...</option>
              {filteredArtists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name_ko || '(이름 없음)'}
                </option>
              ))}
            </AdminSelect>
            {showErrors && !selectedArtistId ? (
              <p className="mt-1 text-xs text-red-600">작가를 선택해주세요.</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">검색 결과 {filteredArtists.length}명</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">가격</label>
            <input
              name="price"
              value={price}
              onChange={handlePriceChange}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              에디션 유형 <span className="text-red-500">*</span>
            </label>
            <select
              name="edition_type"
              value={editionType}
              onChange={(e) => {
                setEditionType(e.target.value as EditionType);
                if (e.target.value !== 'limited') {
                  setEditionLimit('');
                }
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            >
              <option value="unique">Unique (1점)</option>
              <option value="limited">Limited (한정판)</option>
              <option value="open">Open (무제한)</option>
            </select>
          </div>

          {editionType === 'limited' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                에디션 수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="edition_limit"
                value={editionLimit}
                onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                min="1"
                placeholder="예: 50"
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none',
                  showErrors && editionType === 'limited' && !editionLimit
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                )}
              />
              {showErrors && editionType === 'limited' && !editionLimit && (
                <p className="mt-1 text-xs text-red-600">한정판은 수량을 입력해주세요.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">작가 노트</label>
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
            {isEditing ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}
