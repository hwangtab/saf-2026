'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { useToast } from '@/lib/hooks/useToast';
import { matchesSearchText } from '@/lib/search-utils';
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
  shop_url: string | null;
  artist_id: string | null;
  images: string[] | null;
};

type ExhibitorArtworkFormProps = {
  artwork?: Partial<Artwork>;
  artists: Artist[];
  initialArtistId?: string;
  artistJustCreated?: boolean;
};

export function ExhibitorArtworkForm({
  artwork = {},
  artists,
  initialArtistId,
  artistJustCreated = false,
}: ExhibitorArtworkFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [currentArtworkId, setCurrentArtworkId] = useState<string | undefined>(artwork.id);
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [artistQuery, setArtistQuery] = useState('');
  const initialSelectedArtistId = artwork.artist_id || initialArtistId || '';
  const [selectedArtistId, setSelectedArtistId] = useState(initialSelectedArtistId);
  const [editionType, setEditionType] = useState<EditionType>(artwork.edition_type || 'unique');
  const [editionLimit, setEditionLimit] = useState<number | ''>(artwork.edition_limit || '');

  useEffect(() => {
    setSelectedArtistId(initialSelectedArtistId);
  }, [initialSelectedArtistId]);

  const filteredArtists = useMemo(() => {
    const normalizedQuery = artistQuery.trim();
    if (!normalizedQuery) return artists;
    return artists.filter((artist) => matchesSearchText(artist.name_ko, normalizedQuery));
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
            pathPrefix={selectedArtistId || `exhibitor-artwork-${currentArtworkId}`}
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

      {artistJustCreated && !currentArtworkId && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          새 작가가 등록되었습니다. 아래에서 바로 선택해 작품 등록을 이어서 진행하세요.
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
            <div className="mb-2 flex items-center justify-between">
              <AdminFieldLabel className="mb-0">
                작가 <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <Link
                href="/exhibitor/artists/new?returnTo=%2Fexhibitor%2Fartworks%2Fnew"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                + 새 작가 등록
              </Link>
            </div>
            <AdminInput
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder="작가명 검색..."
              className="mb-2"
            />
            <AdminSelect
              name="artist_id"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
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
            <AdminFieldLabel>에디션 (선택)</AdminFieldLabel>
            <AdminInput name="edition" defaultValue={artwork.edition || ''} placeholder="1/10" />
          </div>

          <div>
            <AdminFieldLabel>
              에디션 유형 <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminSelect
              name="edition_type"
              value={editionType}
              onChange={(e) => {
                setEditionType(e.target.value as EditionType);
                if (e.target.value !== 'limited') {
                  setEditionLimit('');
                }
              }}
              required
              className="w-full"
            >
              <option value="unique">Unique (1점)</option>
              <option value="limited">Limited (한정판)</option>
              <option value="open">Open (무제한)</option>
            </AdminSelect>
          </div>

          {editionType === 'limited' && (
            <div>
              <AdminFieldLabel>
                에디션 수량 <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <AdminInput
                type="number"
                name="edition_limit"
                value={editionLimit}
                onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                min="1"
                placeholder="예: 50"
                required
              />
            </div>
          )}

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
