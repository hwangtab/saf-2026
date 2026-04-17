'use client';

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createArtwork, updateArtwork, type ActionState } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { getStoragePathsForRemoval } from '@/lib/utils/form-helpers';
import {
  AdminFieldLabel,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from '@/app/admin/_components/admin-ui';
import { ARTWORK_CATEGORIES, EditionType } from '@/types';

type ArtworkData = {
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
  status: string | null;
  images: string[] | null;
  is_hidden: boolean | null;
};

type ArtworkFormProps = {
  artwork?: Partial<ArtworkData>;
  artistId: string;
};

const initialState: ActionState = {
  message: '',
  error: false,
};

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function ArtworkForm({ artwork, artistId }: ArtworkFormProps) {
  // If editing, we bind the ID to the update action
  const action = artwork?.id ? updateArtwork.bind(null, artwork.id) : createArtwork;

  const locale = useLocale();
  const t = useTranslations('dashboard.artworkForm');
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [images, setImages] = useState<string[]>(artwork?.images || []);
  const [newUploads, setNewUploads] = useState<string[]>([]);
  const pendingUploadsRef = useRef<string[]>([]);
  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef(createSessionId());
  const [editionType, setEditionType] = useState<EditionType>(artwork?.edition_type || 'unique');
  const [editionLimit, setEditionLimit] = useState<number | ''>(artwork?.edition_limit || '');
  const isPresetCategory = (val: string | null | undefined) =>
    !val || (ARTWORK_CATEGORIES as readonly string[]).includes(val);
  const [categoryMode, setCategoryMode] = useState<'preset' | 'custom'>(
    isPresetCategory(artwork?.category) ? 'preset' : 'custom'
  );
  const [categoryPreset, setCategoryPreset] = useState(
    isPresetCategory(artwork?.category) ? artwork?.category || '' : ''
  );
  const [categoryCustom, setCategoryCustom] = useState(
    isPresetCategory(artwork?.category) ? '' : artwork?.category || ''
  );
  const categoryValue = categoryMode === 'custom' ? categoryCustom : categoryPreset;
  const pendingKey = useMemo(() => `saf_pending_artwork_uploads_${artistId}`, [artistId]);
  const cleanupUrls = useMemo(() => state.cleanupUrls ?? [], [state.cleanupUrls]);
  const effectiveImages =
    cleanupUrls.length > 0 ? images.filter((url) => !cleanupUrls.includes(url)) : images;
  const effectiveNewUploads =
    cleanupUrls.length > 0 ? newUploads.filter((url) => !cleanupUrls.includes(url)) : newUploads;

  const persistPending = useCallback(
    (urls: string[]) => {
      pendingUploadsRef.current = urls;
      try {
        sessionStorage.setItem(
          pendingKey,
          JSON.stringify({ sessionId: sessionIdRef.current, urls, updatedAt: Date.now() })
        );
      } catch (error) {
        console.error('[artist-artwork-form] Pending upload session save failed:', error);
      }
    },
    [pendingKey]
  );

  const clearPending = useCallback(() => {
    pendingUploadsRef.current = [];
    try {
      sessionStorage.removeItem(pendingKey);
    } catch (error) {
      console.error('[artist-artwork-form] Pending upload session clear failed:', error);
    }
  }, [pendingKey]);

  const removeStorageObjects = useCallback(
    async (urls: string[]) => {
      const uniquePaths = getStoragePathsForRemoval(urls, 'artworks');
      if (uniquePaths.length === 0) return;
      await supabase.storage.from('artworks').remove(uniquePaths);
    },
    [supabase]
  );

  useEffect(() => {
    if (state.error) {
      isSubmittingRef.current = false;
    }
  }, [state.error]);

  useEffect(() => {
    if (cleanupUrls.length === 0) return;
    const next = pendingUploadsRef.current.filter((url) => !cleanupUrls.includes(url));
    if (next.length !== pendingUploadsRef.current.length) {
      persistPending(next);
    }
  }, [cleanupUrls, persistPending]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(pendingKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { sessionId?: string; urls?: string[] };
        if (parsed?.sessionId && parsed.sessionId !== sessionIdRef.current) {
          const urls = Array.isArray(parsed.urls) ? parsed.urls : [];
          if (urls.length > 0) {
            void removeStorageObjects(urls).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error('[artist-artwork-form] Pending upload session parse failed:', error);
    }

    persistPending(pendingUploadsRef.current);

    return () => {
      if (!isSubmittingRef.current && pendingUploadsRef.current.length > 0) {
        void removeStorageObjects(pendingUploadsRef.current).catch(() => {});
      }
      clearPending();
    };
  }, [pendingKey, clearPending, persistPending, removeStorageObjects]);

  // Handling 'sold' status checkbox
  // DB stores 'status' enum, UI uses simpler checkboxes generally or logic
  // We'll treat 'sold' status as a boolean checkbox for simplicity here,
  // or a select if we want more options (available, sold, reserved, hidden).
  // User req said: "Status (Sold)" -> checkbox likely sufficient or simple select.
  // Planning doc said: "Status (Sold)".

  const handleCancel = async () => {
    try {
      if (pendingUploadsRef.current.length > 0) {
        await removeStorageObjects(pendingUploadsRef.current);
      }
    } catch (error) {
      console.error('[artist-artwork-form] Pending upload cleanup on cancel failed:', error);
    } finally {
      clearPending();
      router.push('/dashboard/artworks');
    }
  };

  const inputClassName = 'mt-1';
  const actionErrorMessage =
    state.error && state.message
      ? locale === 'en' && /[가-힣]/.test(state.message)
        ? t('genericError')
        : state.message
      : '';

  return (
    <form
      action={formAction}
      onSubmit={() => {
        isSubmittingRef.current = true;
      }}
      className="space-y-8 divide-y divide-gray-200"
    >
      <div className="space-y-8 divide-y divide-gray-200">
        <div>
          <h3 className="text-lg leading-6 font-semibold text-gray-900">
            {artwork ? t('editTitle') : t('createTitle')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Hidden: Images JSON */}
            <input type="hidden" name="images" value={JSON.stringify(effectiveImages)} />
            <input type="hidden" name="new_uploads" value={JSON.stringify(effectiveNewUploads)} />

            {/* Images Upload */}
            <div className="sm:col-span-6">
              <AdminFieldLabel>
                {t('images')} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <ImageUpload
                bucket="artworks"
                pathPrefix={artistId}
                maxFiles={5}
                value={effectiveImages}
                onUploadComplete={(urls) => {
                  setImages(urls);
                }}
                onUploadDelta={(urls) =>
                  setNewUploads((prev) => {
                    const next = [...prev, ...urls.filter((url) => !prev.includes(url))];
                    persistPending(next);
                    return next;
                  })
                }
              />
            </div>

            {/* Title */}
            <div className="sm:col-span-4">
              <AdminFieldLabel htmlFor="title">
                {t('title')} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <AdminInput
                type="text"
                name="title"
                id="title"
                required
                defaultValue={artwork?.title || ''}
                className={inputClassName}
              />
            </div>

            {/* Title (English) */}
            <div className="sm:col-span-4">
              <AdminFieldLabel htmlFor="title_en">{t('titleEn')}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="title_en"
                id="title_en"
                defaultValue={artwork?.title_en || ''}
                placeholder="English title"
                className={inputClassName}
              />
            </div>

            {/* Price */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="price">
                {t('price')} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-sm text-gray-500">₩</span>
                </div>
                <AdminInput
                  type="text"
                  name="price"
                  id="price"
                  required
                  defaultValue={artwork?.price || ''}
                  placeholder="2,000,000"
                  className="pl-7 pr-12"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('priceHint')}</p>
            </div>

            {/* Size */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="size">{t('size')}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="size"
                id="size"
                defaultValue={artwork?.size || ''}
                placeholder="50x50cm"
                className={inputClassName}
              />
            </div>

            {/* Material */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="material">{t('material')}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="material"
                id="material"
                defaultValue={artwork?.material || ''}
                placeholder="Oil on canvas"
                className={inputClassName}
              />
            </div>

            {/* Year */}
            <div className="sm:col-span-1">
              <AdminFieldLabel htmlFor="year">{t('year')}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="year"
                id="year"
                defaultValue={artwork?.year || new Date().getFullYear().toString()}
                className={inputClassName}
              />
            </div>

            {/* Edition */}
            <div className="sm:col-span-1">
              <AdminFieldLabel htmlFor="edition">{t('edition')}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="edition"
                id="edition"
                defaultValue={artwork?.edition || ''}
                placeholder="1/10"
                className={inputClassName}
              />
            </div>

            {/* Category */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="category">{t('category')}</AdminFieldLabel>
              <input type="hidden" name="category" value={categoryValue} />
              <AdminSelect
                id="category"
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
                className={inputClassName}
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

            {/* Edition Type */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="edition_type">
                {t('editionType')} <span className="text-red-500">*</span>
              </AdminFieldLabel>
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
                className={inputClassName}
                required
              >
                <option value="unique">{t('editionUnique')}</option>
                <option value="limited">{t('editionLimited')}</option>
                <option value="open">{t('editionOpen')}</option>
              </AdminSelect>
            </div>

            {/* Edition Limit */}
            {editionType === 'limited' && (
              <div className="sm:col-span-2">
                <AdminFieldLabel htmlFor="edition_limit">
                  {t('editionLimit')} <span className="text-red-500">*</span>
                </AdminFieldLabel>
                <AdminInput
                  type="number"
                  name="edition_limit"
                  id="edition_limit"
                  value={editionLimit}
                  onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                  min="1"
                  max="10000"
                  step="1"
                  required
                  placeholder={t('editionLimitPlaceholder')}
                  className={inputClassName}
                />
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-6">
              <AdminFieldLabel htmlFor="description">{t('artistNote')}</AdminFieldLabel>
              <AdminTextarea
                id="description"
                name="description"
                rows={5}
                defaultValue={artwork?.description || ''}
                className={inputClassName}
                placeholder={t('artistNotePlaceholder')}
              />
            </div>

            {/* Options */}
            <div className="sm:col-span-6 border-t border-gray-200 pt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <AdminFieldLabel htmlFor="status" className="mb-0">
                  {t('status')}
                </AdminFieldLabel>
                <AdminSelect
                  id="status"
                  name="status"
                  defaultValue={artwork?.status || 'available'}
                  className="min-w-36"
                >
                  <option value="available">{t('statusAvailable')}</option>
                  <option value="reserved">{t('statusReserved')}</option>
                  <option value="sold">{t('statusSold')}</option>
                </AdminSelect>
              </div>

              {artwork && (
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="hidden"
                      name="hidden"
                      type="checkbox"
                      defaultChecked={artwork?.is_hidden ?? undefined}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="hidden" className="font-medium text-gray-700">
                      {t('hidden')}
                    </label>
                    <p className="text-gray-500">{t('hiddenDescription')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={handleCancel}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={isPending} disabled={isPending}>
            {artwork ? t('saveEdit') : t('saveCreate')}
          </Button>
        </div>
        {state.error && actionErrorMessage && (
          <p className="mt-2 text-right text-sm text-rose-600">{actionErrorMessage}</p>
        )}
      </div>
    </form>
  );
}
