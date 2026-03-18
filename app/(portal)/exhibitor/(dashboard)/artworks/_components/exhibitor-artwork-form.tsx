'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { ARTWORK_CATEGORIES, EditionType } from '@/types';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const ARTWORK_FORM_COPY: Record<
  LocaleCode,
  {
    syncSuccess: (action: string) => string;
    syncPendingAuth: (action: string) => string;
    syncFailed: (action: string) => string;
    syncContinuing: (action: string) => string;
    actionSave: string;
    actionCreate: string;
    actionSaveImage: string;
    missingRepresentativeImageWarning: string;
    saveError: string;
    imageSaveError: string;
    artworkImages: string;
    saving: string;
    imageGuide: string;
    artistCreatedNotice: string;
    editTitle: string;
    createTitle: string;
    artworkTitle: string;
    artist: string;
    addNewArtist: string;
    searchArtistPlaceholder: string;
    selectArtist: string;
    unnamed: string;
    price: string;
    size: string;
    material: string;
    year: string;
    edition: string;
    category: string;
    categoryPlaceholder: string;
    categoryCustom: string;
    categoryCustomPlaceholder: string;
    editionType: string;
    editionUnique: string;
    editionLimited: string;
    editionOpen: string;
    editionLimit: string;
    editionLimitPlaceholder: string;
    artistNote: string;
    backToList: string;
    save: string;
    create: string;
  }
> = {
  ko: {
    syncSuccess: (action: string) => `작품 ${action}이 완료되었습니다.`,
    syncPendingAuth: (action: string) =>
      `작품 ${action}은 완료되었습니다. 온라인 구매 정보 반영이 지연될 수 있습니다.`,
    syncFailed: (action: string) =>
      `작품 ${action}은 완료되었습니다. 온라인 구매 정보 반영이 지연되고 있습니다.`,
    syncContinuing: (action: string) =>
      `작품 ${action}은 완료되었습니다. 온라인 구매 정보 반영을 계속 진행합니다.`,
    actionSave: '저장',
    actionCreate: '등록',
    actionSaveImage: '이미지 저장',
    missingRepresentativeImageWarning:
      '작품 등록은 완료되었습니다. 온라인 구매 페이지에 노출할 이미지를 지금 업로드해 주세요.',
    saveError: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    imageSaveError: '이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    artworkImages: '작품 이미지',
    saving: '저장 중...',
    imageGuide: '이미지 등록은 작품 정보를 먼저 저장한 후에 가능합니다.',
    artistCreatedNotice:
      '새 작가가 등록되었습니다. 아래에서 바로 선택해 작품 등록을 이어서 진행하세요.',
    editTitle: '작품 정보 수정',
    createTitle: '새 작품 등록',
    artworkTitle: '작품명',
    artist: '작가',
    addNewArtist: '+ 새 작가 등록',
    searchArtistPlaceholder: '작가명 검색...',
    selectArtist: '작가 선택...',
    unnamed: '(이름 없음)',
    price: '가격',
    size: '크기',
    material: '재료',
    year: '제작연도',
    edition: '에디션 (선택)',
    category: '분류',
    categoryPlaceholder: '선택해주세요',
    categoryCustom: '직접입력',
    categoryCustomPlaceholder: '분류를 직접 입력하세요',
    editionType: '에디션 유형',
    editionUnique: 'Unique (1점)',
    editionLimited: 'Limited (한정판)',
    editionOpen: 'Open (무제한)',
    editionLimit: '에디션 수량',
    editionLimitPlaceholder: '예: 50',
    artistNote: '작가 노트',
    backToList: '목록으로',
    save: '저장',
    create: '등록',
  },
  en: {
    syncSuccess: (action: string) => `Artwork ${action} completed.`,
    syncPendingAuth: (action: string) =>
      `Artwork ${action} completed. Online purchase info may be delayed.`,
    syncFailed: (action: string) =>
      `Artwork ${action} completed. Online purchase info sync is currently delayed.`,
    syncContinuing: (action: string) =>
      `Artwork ${action} completed. Online purchase info sync is continuing.`,
    actionSave: 'save',
    actionCreate: 'creation',
    actionSaveImage: 'image save',
    missingRepresentativeImageWarning:
      'Artwork was created, but please upload an image now to show it on the online purchase page.',
    saveError: 'An error occurred while saving. Please try again shortly.',
    imageSaveError: 'An error occurred while saving image. Please try again shortly.',
    artworkImages: 'Artwork images',
    saving: 'Saving...',
    imageGuide: 'Images can be uploaded after artwork information is saved first.',
    artistCreatedNotice:
      'A new artist has been created. Select it below and continue registering artwork.',
    editTitle: 'Edit artwork information',
    createTitle: 'Create new artwork',
    artworkTitle: 'Artwork title',
    artist: 'Artist',
    addNewArtist: '+ Add new artist',
    searchArtistPlaceholder: 'Search artist name...',
    selectArtist: 'Select artist...',
    unnamed: '(Unnamed)',
    price: 'Price',
    size: 'Size',
    material: 'Material',
    year: 'Year',
    edition: 'Edition (optional)',
    category: 'Category',
    categoryPlaceholder: 'Select category',
    categoryCustom: 'Other',
    categoryCustomPlaceholder: 'Enter category',
    editionType: 'Edition type',
    editionUnique: 'Unique (1 item)',
    editionLimited: 'Limited',
    editionOpen: 'Open',
    editionLimit: 'Edition quantity',
    editionLimitPlaceholder: 'e.g., 50',
    artistNote: 'Artist note',
    backToList: 'Back to list',
    save: 'Save',
    create: 'Create',
  },
};

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
  category: string | null;
  price: string | null;
  artist_id: string | null;
  images: string[] | null;
};

type Cafe24SyncFeedback = {
  status: 'synced' | 'warning' | 'failed' | 'pending_auth';
  reason: string | null;
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
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = ARTWORK_FORM_COPY[locale];
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [artistQuery, setArtistQuery] = useState('');
  const isEditing = !!artwork.id;
  const initialSelectedArtistId = artwork.artist_id || initialArtistId || '';
  const [selectedArtistId, setSelectedArtistId] = useState(initialSelectedArtistId);
  const [editionType, setEditionType] = useState<EditionType>(artwork.edition_type || 'unique');
  const [editionLimit, setEditionLimit] = useState<number | ''>(artwork.edition_limit || '');
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

  useEffect(() => {
    setSelectedArtistId(initialSelectedArtistId);
  }, [initialSelectedArtistId]);

  const filteredArtists = useMemo(() => {
    const normalizedQuery = artistQuery.trim();
    if (!normalizedQuery) return artists;
    return artists.filter((artist) => matchesSearchText(artist.name_ko, normalizedQuery));
  }, [artists, artistQuery]);

  const isMissingRepresentativeImageReason = (reason: string | null | undefined) => {
    if (!reason) return false;
    return (
      reason.includes('대표 이미지') ||
      /representative image|primary image|main image|cover image/i.test(reason)
    );
  };

  const notifyCafe24SyncResult = (sync: Cafe24SyncFeedback, actionLabel: string) => {
    if (sync.status === 'synced') {
      toast.success(copy.syncSuccess(actionLabel));
      return;
    }

    if (sync.status === 'pending_auth') {
      toast.warning(copy.syncPendingAuth(actionLabel));
      return;
    }

    if (sync.status === 'failed') {
      toast.warning(copy.syncFailed(actionLabel));
      return;
    }

    toast.warning(copy.syncContinuing(actionLabel));
  };

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    try {
      if (isEditing && artwork.id) {
        const result = await updateExhibitorArtwork(artwork.id, formData);
        if (result.success) {
          notifyCafe24SyncResult(result.cafe24, copy.actionSave);
        }
        router.push('/exhibitor/artworks');
      } else {
        const result = await createExhibitorArtwork(formData);
        if (result.success && result.id) {
          const missingImageWarning =
            result.cafe24.status === 'warning' &&
            isMissingRepresentativeImageReason(result.cafe24.reason);

          if (missingImageWarning) {
            toast.warning(copy.missingRepresentativeImageWarning);
            router.push(`/exhibitor/artworks/${result.id}`);
            return;
          }

          notifyCafe24SyncResult(result.cafe24, copy.actionCreate);
          router.push('/exhibitor/artworks');
        }
      }
    } catch (error) {
      console.error('[exhibitor-artwork-form] Artwork save failed:', error);
      toast.error(copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = async (newImages: string[]) => {
    if (!artwork.id) return;
    setImages(newImages);
    setSavingImages(true);
    try {
      const result = await updateExhibitorArtworkImages(artwork.id, newImages);
      if (result.success) {
        notifyCafe24SyncResult(result.cafe24, copy.actionSaveImage);
      }
      router.refresh();
    } catch (error) {
      console.error('[exhibitor-artwork-form] Artwork image save failed:', error);
      toast.error(copy.imageSaveError);
    } finally {
      setSavingImages(false);
    }
  };

  return (
    <div className="space-y-6">
      {isEditing && artwork.id ? (
        <AdminCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {copy.artworkImages}
            {savingImages && <span className="ml-2 text-sm text-slate-500">{copy.saving}</span>}
          </h2>
          <ImageUpload
            bucket="artworks"
            pathPrefix={selectedArtistId || `exhibitor-artwork-${artwork.id}`}
            value={images}
            onUploadComplete={handleImagesChange}
            maxFiles={10}
          />
        </AdminCard>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {copy.imageGuide}
        </div>
      )}

      {artistJustCreated && !isEditing && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {copy.artistCreatedNotice}
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
          {isEditing ? copy.editTitle : copy.createTitle}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <AdminFieldLabel>
              {copy.artworkTitle} <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput name="title" defaultValue={artwork.title} required />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <AdminFieldLabel className="mb-0">
                {copy.artist} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <Link
                href="/exhibitor/artists/new?returnTo=%2Fexhibitor%2Fartworks%2Fnew"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                {copy.addNewArtist}
              </Link>
            </div>
            <AdminInput
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder={copy.searchArtistPlaceholder}
              className="mb-2"
            />
            <AdminSelect
              name="artist_id"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              required
              className="w-full"
            >
              <option value="">{copy.selectArtist}</option>
              {filteredArtists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name_ko || copy.unnamed}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <AdminFieldLabel>
              {copy.price} <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput
              name="price"
              defaultValue={artwork.price || ''}
              placeholder="₩1,000,000"
              required
            />
          </div>

          <div>
            <AdminFieldLabel>{copy.size}</AdminFieldLabel>
            <AdminInput name="size" defaultValue={artwork.size || ''} placeholder="60x45cm" />
          </div>

          <div>
            <AdminFieldLabel>{copy.material}</AdminFieldLabel>
            <AdminInput
              name="material"
              defaultValue={artwork.material || ''}
              placeholder="Oil on canvas"
            />
          </div>

          <div>
            <AdminFieldLabel>{copy.year}</AdminFieldLabel>
            <AdminInput name="year" defaultValue={artwork.year || ''} placeholder="2026" />
          </div>

          <div>
            <AdminFieldLabel>{copy.edition}</AdminFieldLabel>
            <AdminInput name="edition" defaultValue={artwork.edition || ''} placeholder="1/10" />
          </div>

          <div>
            <AdminFieldLabel>{copy.category}</AdminFieldLabel>
            <input type="hidden" name="category" value={categoryValue} />
            <AdminSelect
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
              className="w-full"
            >
              <option value="">{copy.categoryPlaceholder}</option>
              {ARTWORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">{copy.categoryCustom}</option>
            </AdminSelect>
            {categoryMode === 'custom' && (
              <AdminInput
                type="text"
                value={categoryCustom}
                onChange={(e) => setCategoryCustom(e.target.value)}
                placeholder={copy.categoryCustomPlaceholder}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <AdminFieldLabel>
              {copy.editionType} <span className="text-red-500">*</span>
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
              <option value="unique">{copy.editionUnique}</option>
              <option value="limited">{copy.editionLimited}</option>
              <option value="open">{copy.editionOpen}</option>
            </AdminSelect>
          </div>

          {editionType === 'limited' && (
            <div>
              <AdminFieldLabel>
                {copy.editionLimit} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <AdminInput
                type="number"
                name="edition_limit"
                value={editionLimit}
                onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                min="1"
                placeholder={copy.editionLimitPlaceholder}
                required
              />
            </div>
          )}
        </div>

        <div>
          <AdminFieldLabel>{copy.artistNote}</AdminFieldLabel>
          <AdminTextarea name="description" defaultValue={artwork.description || ''} rows={4} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/exhibitor/artworks')}>
            {copy.backToList}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {isEditing ? copy.save : copy.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
