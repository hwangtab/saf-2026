'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  updateArtworkDetails,
  updateArtworkImages,
  createAdminArtwork,
  createAndAttachAdminTagToArtwork,
  addAdminTagToArtworks,
  removeAdminTagFromArtworks,
} from '@/app/actions/admin-artworks';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { AdminCard, AdminSelect } from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';
import { matchesSearchText } from '@/lib/search-utils';
import { cn } from '@/lib/utils/cn';
import { ARTWORK_CATEGORIES, ARTWORK_TONES, EditionType, TaxType } from '@/types';

type Artist = {
  id: string;
  name_ko: string | null;
};

type Artwork = {
  id: string;
  title: string;
  title_en: string | null;
  admin_product_name: string | null;
  description: string | null;
  quote: string | null;
  quote_en: string | null;
  size: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  material: string | null;
  year: string | null;
  edition: string | null;
  edition_type: EditionType | null;
  edition_limit: number | null;
  tax_type: TaxType | null;
  category: string | null;
  tone: string[] | null;
  price: string | null;
  artist_id: string | null;
  images: string[] | null;
  artists: Artist | null;
};

type AdminArtworkTag = {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  archived_at: string | null;
};

type ArtworkEditFormProps = {
  artwork?: Partial<Artwork>;
  artists: Artist[];
  adminTags?: AdminArtworkTag[];
  artworkAdminTags?: AdminArtworkTag[];
  initialArtistId?: string;
  artistJustCreated?: boolean;
};

export function ArtworkEditForm({
  artwork = {},
  artists,
  adminTags = [],
  artworkAdminTags = [],
  initialArtistId,
  artistJustCreated = false,
}: ArtworkEditFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [tones, setTones] = useState<string[]>(artwork.tone || []);
  const [toneCustomInput, setToneCustomInput] = useState('');
  const [tagOptions, setTagOptions] = useState(adminTags);
  const [selectedAdminTags, setSelectedAdminTags] = useState(artworkAdminTags);
  const [newAdminTagName, setNewAdminTagName] = useState('');
  const [newAdminTagColor, setNewAdminTagColor] = useState('#6b7280');
  const [tagSaving, setTagSaving] = useState(false);
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
  const isPresetCategory = (val: string | null | undefined) =>
    !val || (ARTWORK_CATEGORIES as readonly string[]).includes(val);
  const [categoryMode, setCategoryMode] = useState<'preset' | 'custom'>(
    isPresetCategory(artwork.category) ? 'preset' : 'custom'
  );
  const [categoryPreset, setCategoryPreset] = useState(
    isPresetCategory(artwork.category) ? artwork.category || '' : ''
  );
  const [categoryCustom, setCategoryCustom] = useState(
    isPresetCategory(artwork.category) ? '' : artwork.category || ''
  );
  const categoryValue = categoryMode === 'custom' ? categoryCustom : categoryPreset;

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

  useEffect(() => {
    setTagOptions(adminTags);
  }, [adminTags]);

  useEffect(() => {
    setSelectedAdminTags(artworkAdminTags);
  }, [artworkAdminTags]);

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
      toast.error('Please fill in required fields.');
      return;
    }

    if (editionType === 'limited' && !editionLimit) {
      toast.error('For limited editions, please enter edition quantity.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && artwork.id) {
        const result = await updateArtworkDetails(artwork.id, formData);
        if (result.success) {
          toast.success('작품 저장이 완료되었습니다.');
        }
        router.push('/admin/artworks');
      } else {
        const result = await createAdminArtwork(formData);
        if (result.success && result.id) {
          toast.success('작품 등록이 완료되었습니다.');
          router.push('/admin/artworks');
        }
      }
    } catch (error) {
      console.error('[admin-artwork-edit-form] Artwork save failed:', error);
      setError('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      toast.error('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdminTag = async (tagId: string) => {
    if (!artwork.id || !tagId || selectedAdminTags.some((tag) => tag.id === tagId)) return;
    const tag = tagOptions.find((item) => item.id === tagId);
    if (!tag) return;
    setTagSaving(true);
    try {
      await addAdminTagToArtworks([artwork.id], tagId);
      setSelectedAdminTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      );
      toast.success('내부 태그를 추가했습니다.');
    } catch {
      toast.error('내부 태그 추가 중 오류가 발생했습니다.');
    } finally {
      setTagSaving(false);
    }
  };

  const handleRemoveAdminTag = async (tagId: string) => {
    if (!artwork.id) return;
    setTagSaving(true);
    try {
      await removeAdminTagFromArtworks([artwork.id], tagId);
      setSelectedAdminTags((prev) => prev.filter((tag) => tag.id !== tagId));
      toast.success('내부 태그를 제거했습니다.');
    } catch {
      toast.error('내부 태그 제거 중 오류가 발생했습니다.');
    } finally {
      setTagSaving(false);
    }
  };

  const handleCreateAndAddAdminTag = async () => {
    if (!artwork.id || !newAdminTagName.trim()) return;
    setTagSaving(true);
    try {
      const tag = await createAndAttachAdminTagToArtwork(artwork.id, {
        name: newAdminTagName,
        color: newAdminTagColor,
      });
      setTagOptions((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
      setSelectedAdminTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      );
      setNewAdminTagName('');
      setNewAdminTagColor('#6b7280');
      toast.success('내부 태그를 만들고 작품에 추가했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '내부 태그 생성 중 오류가 발생했습니다.');
    } finally {
      setTagSaving(false);
    }
  };

  const handleImagesChange = async (newImages: string[]) => {
    if (!artwork.id) return;
    setImages(newImages);
    setError(null);
    setSavingImages(true);
    try {
      const result = await updateArtworkImages(artwork.id, newImages);
      if (result.success) {
        toast.success('이미지 저장이 완료되었습니다.');
      }
      router.refresh();
    } catch (error) {
      console.error('[admin-artwork-edit-form] Artwork image save failed:', error);
      setError('이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      toast.error('An error occurred while saving image.');
    } finally {
      setSavingImages(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-sm text-danger-a11y flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-4 text-danger hover:text-danger-a11y"
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
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success-a11y">
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
        <div className="rounded-lg border border-primary-soft bg-primary-surface p-4 text-sm text-primary-strong">
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              작품명 <span className="text-danger">*</span>
            </label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y transition-colors',
                showErrors && !title.trim() ? 'border-danger bg-danger/10' : 'border-gray-300'
              )}
            />
            {showErrors && !title.trim() && (
              <p className="mt-1 text-xs text-danger-a11y">작품명을 입력해주세요.</p>
            )}
          </div>

          <div>
            <label htmlFor="title_en" className="block text-sm font-medium text-gray-700 mb-2">
              작품명 (영문)
            </label>
            <input
              id="title_en"
              name="title_en"
              defaultValue={artwork.title_en || ''}
              placeholder="English title"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
          </div>

          <div>
            <label
              htmlFor="admin_product_name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              상품명(관리용)
            </label>
            <input
              id="admin_product_name"
              name="admin_product_name"
              defaultValue={artwork.admin_product_name || ''}
              placeholder="예: 연작 1, 파란배경"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
            <p className="mt-1 text-xs text-gray-500">
              관리자 화면에서만 보이며, 동명 작품 구분에 사용됩니다.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="artist_id" className="block text-sm font-medium text-gray-700">
                작가 <span className="text-danger">*</span>
              </label>
              <Link
                href="/admin/artists/new?returnTo=%2Fadmin%2Fartworks%2Fnew"
                className="text-xs text-primary-a11y hover:text-primary-strong hover:underline"
              >
                + 새 작가 등록
              </Link>
            </div>
            <input
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder="작가명 검색..."
              className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
            <AdminSelect
              id="artist_id"
              name="artist_id"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              className={cn(
                'px-3 py-2 pr-9',
                artistJustCreated && 'border-success/40 bg-success/10 text-success-a11y',
                showErrors && !selectedArtistId && 'border-danger bg-danger/10'
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
              <p className="mt-1 text-xs text-danger-a11y">작가를 선택해주세요.</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">검색 결과 {filteredArtists.length}명</p>
            )}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              가격
            </label>
            <input
              id="price"
              name="price"
              value={price}
              onChange={handlePriceChange}
              placeholder="₩1,000,000"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
          </div>

          <div>
            <label htmlFor="width_cm" className="block text-sm font-medium text-gray-700 mb-2">
              크기 (cm)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                id="width_cm"
                name="width_cm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={artwork.width_cm ?? ''}
                placeholder="가로"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
              />
              <input
                id="height_cm"
                name="height_cm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={artwork.height_cm ?? ''}
                placeholder="세로"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
              />
              <input
                id="depth_cm"
                name="depth_cm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={artwork.depth_cm ?? ''}
                placeholder="깊이(3D만)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              비우면 &quot;확인 중&quot;으로 저장됩니다. 깊이는 입체 작품만 입력.
            </p>
          </div>

          <div>
            <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-2">
              재료
            </label>
            <input
              id="material"
              name="material"
              defaultValue={artwork.material || ''}
              placeholder="Oil on canvas"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              제작연도
            </label>
            <input
              id="year"
              name="year"
              defaultValue={artwork.year || ''}
              placeholder="2026"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
          </div>

          <div>
            <label htmlFor="edition" className="block text-sm font-medium text-gray-700 mb-2">
              에디션
            </label>
            <input
              id="edition"
              name="edition"
              defaultValue={artwork.edition || ''}
              placeholder="1/10"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
          </div>

          <div>
            <label htmlFor="edition_type" className="block text-sm font-medium text-gray-700 mb-2">
              에디션 유형 <span className="text-danger">*</span>
            </label>
            <AdminSelect
              id="edition_type"
              name="edition_type"
              value={editionType}
              onChange={(e) => {
                setEditionType(e.target.value as EditionType);
                if (e.target.value !== 'limited') {
                  setEditionLimit('');
                }
              }}
            >
              <option value="unique">Unique (1점)</option>
              <option value="limited">Limited (한정판)</option>
              <option value="open">Open (무제한)</option>
            </AdminSelect>
          </div>

          <div>
            <label htmlFor="tax_type" className="block text-sm font-medium text-gray-700 mb-2">
              과세구분
            </label>
            <AdminSelect id="tax_type" name="tax_type" defaultValue={artwork.tax_type || 'B'}>
              <option value="B">면세</option>
              <option value="A">과세</option>
              <option value="C">영세</option>
            </AdminSelect>
          </div>

          <div>
            <label
              htmlFor="category_select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              분류
            </label>
            <input type="hidden" name="category" value={categoryValue} />
            <AdminSelect
              id="category_select"
              value={categoryMode === 'custom' ? '__custom__' : categoryPreset}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setCategoryMode('custom');
                  setCategoryPreset('');
                } else {
                  setCategoryMode('preset');
                  setCategoryPreset(e.target.value);
                  setCategoryCustom('');
                }
              }}
            >
              <option value="">선택해주세요</option>
              {ARTWORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">직접입력</option>
            </AdminSelect>
            {categoryMode === 'custom' && (
              <input
                type="text"
                value={categoryCustom}
                onChange={(e) => setCategoryCustom(e.target.value)}
                placeholder="분류를 직접 입력하세요"
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
              />
            )}
          </div>

          {editionType === 'limited' && (
            <div>
              <label
                htmlFor="edition_limit"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                에디션 수량 <span className="text-danger">*</span>
              </label>
              <input
                id="edition_limit"
                type="number"
                name="edition_limit"
                value={editionLimit}
                onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                min="1"
                placeholder="예: 50"
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y',
                  showErrors && editionType === 'limited' && !editionLimit
                    ? 'border-danger bg-danger/10'
                    : 'border-gray-300'
                )}
              />
              {showErrors && editionType === 'limited' && !editionLimit && (
                <p className="mt-1 text-xs text-danger-a11y">한정판은 수량을 입력해주세요.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            작가 노트
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={artwork.description || ''}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
          />
        </div>

        <div>
          <label htmlFor="quote" className="block text-sm font-medium text-gray-700 mb-2">
            작가 인용
          </label>
          <textarea
            id="quote"
            name="quote"
            defaultValue={artwork.quote || ''}
            rows={2}
            placeholder="작가의 1~2줄 한 마디 (본인 표현 그대로)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
          />
        </div>

        <div>
          <label htmlFor="quote_en" className="block text-sm font-medium text-gray-700 mb-2">
            작가 인용 (영문)
          </label>
          <textarea
            id="quote_en"
            name="quote_en"
            defaultValue={artwork.quote_en || ''}
            rows={2}
            placeholder="English quote"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
          />
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            톤/무드{' '}
            <span className="text-xs text-gray-400 font-normal">
              (비슷한 작품 랭킹용 — 복수 선택 가능)
            </span>
          </p>
          {/* 직렬화: hidden input 복수 개 → formData.getAll('tone') */}
          {tones.map((t) => (
            <input key={t} type="hidden" name="tone" value={t} />
          ))}
          <div className="flex flex-wrap gap-2 mb-3">
            {ARTWORK_TONES.map((tone) => {
              const active = tones.includes(tone);
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() =>
                    setTones((prev) => (active ? prev.filter((t) => t !== tone) : [...prev, tone]))
                  }
                  className={cn(
                    'rounded-full px-3 py-1 text-sm border transition-colors',
                    active
                      ? 'bg-primary-strong text-white border-primary-strong'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary/60'
                  )}
                >
                  {tone}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={toneCustomInput}
              onChange={(e) => setToneCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = toneCustomInput.trim();
                  if (val && !tones.includes(val)) setTones((prev) => [...prev, val]);
                  setToneCustomInput('');
                }
              }}
              placeholder="직접 입력 후 추가 버튼"
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:border-primary-a11y"
            />
            <button
              type="button"
              onClick={() => {
                const val = toneCustomInput.trim();
                if (val && !tones.includes(val)) setTones((prev) => [...prev, val]);
                setToneCustomInput('');
              }}
              className="rounded-md px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300"
            >
              추가
            </button>
          </div>
          {tones.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tones.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTones((prev) => prev.filter((x) => x !== t))}
                    className="hover:text-primary-strong"
                    aria-label={`${t} 삭제`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="rounded-lg border border-primary-soft bg-primary-surface/40 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">관리자 내부 태그</p>
              <p className="mt-1 text-xs text-gray-500">
                공개 페이지와 작가/전시자 포털에는 노출되지 않는 운영용 태그입니다.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {selectedAdminTags.length === 0 ? (
                <span className="text-xs text-gray-400">태그 없음</span>
              ) : (
                selectedAdminTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-charcoal-deep ring-1 ring-charcoal/10"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveAdminTag(tag.id)}
                      disabled={tagSaving}
                      className="rounded-full p-0.5 text-charcoal-soft hover:bg-charcoal/10 hover:text-charcoal-deep disabled:opacity-50"
                      aria-label={`${tag.name} 내부 태그 제거`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(360px,1fr)]">
              <AdminSelect
                value=""
                onChange={(e) => {
                  handleAddAdminTag(e.target.value);
                  e.target.value = '';
                }}
                disabled={tagSaving || tagOptions.length === 0}
                wrapperClassName="min-w-0"
                className="h-12 pr-11"
                iconClassName="right-4 h-4 w-4"
              >
                <option value="">기존 태그 추가...</option>
                {tagOptions
                  .filter((tag) => !selectedAdminTags.some((selected) => selected.id === tag.id))
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </AdminSelect>

              <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_48px_auto]">
                <input
                  type="text"
                  value={newAdminTagName}
                  onChange={(e) => setNewAdminTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAndAddAdminTag();
                    }
                  }}
                  placeholder="새 태그 생성 후 추가"
                  className="h-12 min-w-0 rounded-md border border-gray-300 px-3 text-sm focus-visible:border-primary-a11y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y"
                />
                <input
                  type="color"
                  value={newAdminTagColor}
                  onChange={(e) => setNewAdminTagColor(e.target.value)}
                  className="h-12 w-12 rounded-md border border-gray-300 bg-white p-1"
                  aria-label="내부 태그 색상"
                />
                <Button
                  type="button"
                  variant="white"
                  onClick={handleCreateAndAddAdminTag}
                  disabled={tagSaving || !newAdminTagName.trim()}
                  leadingIcon={<Plus className="h-4 w-4" />}
                  className="h-12 whitespace-nowrap px-4"
                >
                  추가
                </Button>
              </div>
            </div>
          </div>
        )}

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
