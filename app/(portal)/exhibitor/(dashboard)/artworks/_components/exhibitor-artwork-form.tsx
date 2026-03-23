'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

type Artist = {
  id: string;
  name_ko: string | null;
};

type Artwork = {
  id: string;
  title: string;
  title_en: string | null;
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
  const t = useTranslations('exhibitor.artworkForm');
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
      toast.success(t('syncSuccess', { action: actionLabel }));
      return;
    }

    if (sync.status === 'pending_auth') {
      toast.warning(t('syncPendingAuth', { action: actionLabel }));
      return;
    }

    if (sync.status === 'failed') {
      toast.warning(t('syncFailed', { action: actionLabel }));
      return;
    }

    toast.warning(t('syncContinuing', { action: actionLabel }));
  };

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    try {
      if (isEditing && artwork.id) {
        const result = await updateExhibitorArtwork(artwork.id, formData);
        if (result.success) {
          notifyCafe24SyncResult(result.cafe24, t('actionSave'));
        }
        router.push('/exhibitor/artworks');
      } else {
        const result = await createExhibitorArtwork(formData);
        if (result.success && result.id) {
          const missingImageWarning =
            result.cafe24.status === 'warning' &&
            isMissingRepresentativeImageReason(result.cafe24.reason);

          if (missingImageWarning) {
            toast.warning(t('missingRepresentativeImageWarning'));
            router.push(`/exhibitor/artworks/${result.id}`);
            return;
          }

          notifyCafe24SyncResult(result.cafe24, t('actionCreate'));
          router.push('/exhibitor/artworks');
        }
      }
    } catch (error) {
      console.error('[exhibitor-artwork-form] Artwork save failed:', error);
      toast.error(t('saveError'));
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
        notifyCafe24SyncResult(result.cafe24, t('actionSaveImage'));
      }
      router.refresh();
    } catch (error) {
      console.error('[exhibitor-artwork-form] Artwork image save failed:', error);
      toast.error(t('imageSaveError'));
    } finally {
      setSavingImages(false);
    }
  };

  return (
    <div className="space-y-6">
      {isEditing && artwork.id ? (
        <AdminCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {t('artworkImages')}
            {savingImages && <span className="ml-2 text-sm text-slate-500">{t('saving')}</span>}
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
          {t('imageGuide')}
        </div>
      )}

      {artistJustCreated && !isEditing && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {t('artistCreatedNotice')}
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
          {isEditing ? t('editTitle') : t('createTitle')}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <AdminFieldLabel>
              {t('artworkTitle')} <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput name="title" defaultValue={artwork.title} required />
          </div>

          <div>
            <AdminFieldLabel>{t('artworkTitleEn')}</AdminFieldLabel>
            <AdminInput
              name="title_en"
              defaultValue={artwork.title_en || ''}
              placeholder={t('artworkTitleEnPlaceholder')}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <AdminFieldLabel className="mb-0">
                {t('artist')} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <Link
                href="/exhibitor/artists/new?returnTo=%2Fexhibitor%2Fartworks%2Fnew"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                {t('addNewArtist')}
              </Link>
            </div>
            <AdminInput
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              placeholder={t('searchArtistPlaceholder')}
              className="mb-2"
            />
            <AdminSelect
              name="artist_id"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              required
              className="w-full"
            >
              <option value="">{t('selectArtist')}</option>
              {filteredArtists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name_ko || t('unnamed')}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div>
            <AdminFieldLabel>
              {t('price')} <span className="text-red-500">*</span>
            </AdminFieldLabel>
            <AdminInput
              name="price"
              defaultValue={artwork.price || ''}
              placeholder="₩1,000,000"
              required
            />
          </div>

          <div>
            <AdminFieldLabel>{t('size')}</AdminFieldLabel>
            <AdminInput name="size" defaultValue={artwork.size || ''} placeholder="60x45cm" />
          </div>

          <div>
            <AdminFieldLabel>{t('material')}</AdminFieldLabel>
            <AdminInput
              name="material"
              defaultValue={artwork.material || ''}
              placeholder="Oil on canvas"
            />
          </div>

          <div>
            <AdminFieldLabel>{t('year')}</AdminFieldLabel>
            <AdminInput name="year" defaultValue={artwork.year || ''} placeholder="2026" />
          </div>

          <div>
            <AdminFieldLabel>{t('edition')}</AdminFieldLabel>
            <AdminInput name="edition" defaultValue={artwork.edition || ''} placeholder="1/10" />
          </div>

          <div>
            <AdminFieldLabel>{t('category')}</AdminFieldLabel>
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
              <option value="">{t('categoryPlaceholder')}</option>
              {ARTWORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">{t('categoryCustom')}</option>
            </AdminSelect>
            {categoryMode === 'custom' && (
              <AdminInput
                type="text"
                value={categoryCustom}
                onChange={(e) => setCategoryCustom(e.target.value)}
                placeholder={t('categoryCustomPlaceholder')}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <AdminFieldLabel>
              {t('editionType')} <span className="text-red-500">*</span>
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
              <option value="unique">{t('editionUnique')}</option>
              <option value="limited">{t('editionLimited')}</option>
              <option value="open">{t('editionOpen')}</option>
            </AdminSelect>
          </div>

          {editionType === 'limited' && (
            <div>
              <AdminFieldLabel>
                {t('editionLimit')} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <AdminInput
                type="number"
                name="edition_limit"
                value={editionLimit}
                onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                min="1"
                placeholder={t('editionLimitPlaceholder')}
                required
              />
            </div>
          )}
        </div>

        <div>
          <AdminFieldLabel>{t('artistNote')}</AdminFieldLabel>
          <AdminTextarea name="description" defaultValue={artwork.description || ''} rows={4} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/exhibitor/artworks')}>
            {t('backToList')}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {isEditing ? t('save') : t('create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
