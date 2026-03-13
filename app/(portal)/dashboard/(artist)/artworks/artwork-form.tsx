'use client';

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { resolveClientLocale } from '@/lib/client-locale';

type ArtworkFormProps = {
  artwork?: any; // If provided, mode is 'edit'
  artistId: string;
};

const initialState: ActionState = {
  message: '',
  error: false,
};

type LocaleCode = 'ko' | 'en';

const ARTWORK_FORM_COPY: Record<
  LocaleCode,
  {
    editTitle: string;
    createTitle: string;
    subtitle: string;
    images: string;
    title: string;
    price: string;
    priceHint: string;
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
    artistNotePlaceholder: string;
    status: string;
    statusAvailable: string;
    statusReserved: string;
    statusSold: string;
    hidden: string;
    hiddenDescription: string;
    cancel: string;
    saveEdit: string;
    saveCreate: string;
    genericError: string;
  }
> = {
  ko: {
    editTitle: '작품 수정',
    createTitle: '새 작품 등록',
    subtitle: '작품의 상세 정보를 입력해주세요.',
    images: '작품 이미지 (최대 5장)',
    title: '작품명',
    price: '가격 (₩)',
    priceHint: '통화를 제외한 숫자 또는 ₩ 포함 텍스트',
    size: '크기',
    material: '재료',
    year: '제작년도',
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
    artistNotePlaceholder: '작품에 담긴 의도나 작가 노트를 적어주세요.',
    status: '판매 상태',
    statusAvailable: '판매 중',
    statusReserved: '예약됨',
    statusSold: '판매 완료',
    hidden: '숨김 (Hidden)',
    hiddenDescription: '갤러리 리스트에서 숨깁니다.',
    cancel: '취소',
    saveEdit: '수정 사항 저장',
    saveCreate: '작품 등록하기',
    genericError: 'An error occurred while saving. Please try again shortly.',
  },
  en: {
    editTitle: 'Edit artwork',
    createTitle: 'Create new artwork',
    subtitle: 'Enter detailed information for this artwork.',
    images: 'Artwork images (up to 5)',
    title: 'Title',
    price: 'Price (₩)',
    priceHint: 'Enter numbers only or text including ₩',
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
    artistNotePlaceholder: 'Describe the intention or artist note for this artwork.',
    status: 'Sales status',
    statusAvailable: 'Available',
    statusReserved: 'Reserved',
    statusSold: 'Sold',
    hidden: 'Hidden',
    hiddenDescription: 'Hide from the gallery list.',
    cancel: 'Cancel',
    saveEdit: 'Save changes',
    saveCreate: 'Create artwork',
    genericError: 'An error occurred while saving. Please try again shortly.',
  },
};

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function ArtworkForm({ artwork, artistId }: ArtworkFormProps) {
  // If editing, we bind the ID to the update action
  const action = artwork ? updateArtwork.bind(null, artwork.id) : createArtwork;

  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = ARTWORK_FORM_COPY[locale];
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
      } catch {
        // ignore storage errors
      }
    },
    [pendingKey]
  );

  const clearPending = useCallback(() => {
    pendingUploadsRef.current = [];
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {
      // ignore storage errors
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
    } catch {
      // ignore parse errors
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
    } catch {
      // ignore cleanup errors on cancel
    } finally {
      clearPending();
      router.push('/dashboard/artworks');
    }
  };

  const inputClassName = 'mt-1';
  const actionErrorMessage =
    state.error && state.message
      ? locale === 'en' && /[가-힣]/.test(state.message)
        ? copy.genericError
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
          <h3 className="text-lg leading-6 font-semibold text-slate-900">
            {artwork ? copy.editTitle : copy.createTitle}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Hidden: Images JSON */}
            <input type="hidden" name="images" value={JSON.stringify(effectiveImages)} />
            <input type="hidden" name="new_uploads" value={JSON.stringify(effectiveNewUploads)} />

            {/* Images Upload */}
            <div className="sm:col-span-6">
              <AdminFieldLabel>
                {copy.images} <span className="text-red-500">*</span>
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
                {copy.title} <span className="text-red-500">*</span>
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

            {/* Price */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="price">
                {copy.price} <span className="text-red-500">*</span>
              </AdminFieldLabel>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-sm text-slate-500">₩</span>
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
              <p className="mt-1 text-xs text-slate-500">{copy.priceHint}</p>
            </div>

            {/* Size */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="size">{copy.size}</AdminFieldLabel>
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
              <AdminFieldLabel htmlFor="material">{copy.material}</AdminFieldLabel>
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
              <AdminFieldLabel htmlFor="year">{copy.year}</AdminFieldLabel>
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
              <AdminFieldLabel htmlFor="edition">{copy.edition}</AdminFieldLabel>
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
              <AdminFieldLabel htmlFor="category">{copy.category}</AdminFieldLabel>
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

            {/* Edition Type */}
            <div className="sm:col-span-2">
              <AdminFieldLabel htmlFor="edition_type">
                {copy.editionType} <span className="text-red-500">*</span>
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
                <option value="unique">{copy.editionUnique}</option>
                <option value="limited">{copy.editionLimited}</option>
                <option value="open">{copy.editionOpen}</option>
              </AdminSelect>
            </div>

            {/* Edition Limit */}
            {editionType === 'limited' && (
              <div className="sm:col-span-2">
                <AdminFieldLabel htmlFor="edition_limit">
                  {copy.editionLimit} <span className="text-red-500">*</span>
                </AdminFieldLabel>
                <AdminInput
                  type="number"
                  name="edition_limit"
                  id="edition_limit"
                  value={editionLimit}
                  onChange={(e) => setEditionLimit(e.target.value ? parseInt(e.target.value) : '')}
                  min="1"
                  required
                  placeholder={copy.editionLimitPlaceholder}
                  className={inputClassName}
                />
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-6">
              <AdminFieldLabel htmlFor="description">{copy.artistNote}</AdminFieldLabel>
              <AdminTextarea
                id="description"
                name="description"
                rows={5}
                defaultValue={artwork?.description || ''}
                className={inputClassName}
                placeholder={copy.artistNotePlaceholder}
              />
            </div>

            {/* Options */}
            <div className="sm:col-span-6 border-t border-gray-200 pt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <AdminFieldLabel htmlFor="status" className="mb-0">
                  {copy.status}
                </AdminFieldLabel>
                <AdminSelect
                  id="status"
                  name="status"
                  defaultValue={artwork?.status || 'available'}
                  className="min-w-36"
                >
                  <option value="available">{copy.statusAvailable}</option>
                  <option value="reserved">{copy.statusReserved}</option>
                  <option value="sold">{copy.statusSold}</option>
                </AdminSelect>
              </div>

              {artwork && (
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="hidden"
                      name="hidden"
                      type="checkbox"
                      defaultChecked={artwork?.is_hidden}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="hidden" className="font-medium text-slate-700">
                      {copy.hidden}
                    </label>
                    <p className="text-slate-500">{copy.hiddenDescription}</p>
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
            {copy.cancel}
          </Button>
          <Button type="submit" loading={isPending} disabled={isPending}>
            {artwork ? copy.saveEdit : copy.saveCreate}
          </Button>
        </div>
        {state.error && actionErrorMessage && (
          <p className="mt-2 text-right text-sm text-rose-600">{actionErrorMessage}</p>
        )}
      </div>
    </form>
  );
}
