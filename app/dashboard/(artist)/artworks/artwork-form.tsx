'use client';

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createArtwork, updateArtwork, type ActionState } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { createSupabaseBrowserClient } from '@/lib/auth/client';

type ArtworkFormProps = {
  artwork?: any; // If provided, mode is 'edit'
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

const getStoragePathFromPublicUrl = (publicUrl: string) => {
  try {
    const url = new URL(publicUrl);
    const marker = '/storage/v1/object/public/artworks/';
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.slice(index + marker.length);
  } catch {
    return null;
  }
};

export function ArtworkForm({ artwork, artistId }: ArtworkFormProps) {
  // If editing, we bind the ID to the update action
  const action = artwork ? updateArtwork.bind(null, artwork.id) : createArtwork;

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [images, setImages] = useState<string[]>(artwork?.images || []);
  const [newUploads, setNewUploads] = useState<string[]>([]);
  const pendingUploadsRef = useRef<string[]>([]);
  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef(createSessionId());
  const pendingKey = useMemo(() => `saf_pending_artwork_uploads_${artistId}`, [artistId]);
  const cleanupUrls = state.cleanupUrls || [];
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
      const paths = urls
        .map((url) => getStoragePathFromPublicUrl(url))
        .filter((path): path is string => !!path);
      if (paths.length === 0) return;
      await supabase.storage.from('artworks').remove(paths);
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
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {artwork ? '작품 수정' : '새 작품 등록'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">작품의 상세 정보를 입력해주세요.</p>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Hidden: Images JSON */}
            <input type="hidden" name="images" value={JSON.stringify(effectiveImages)} />
            <input type="hidden" name="new_uploads" value={JSON.stringify(effectiveNewUploads)} />

            {/* Images Upload */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작품 이미지 (최대 5장) <span className="text-red-500">*</span>
              </label>
              <ImageUpload
                bucket="artworks"
                pathPrefix={artistId}
                maxFiles={5}
                value={effectiveImages}
                onUploadComplete={(urls) => {
                  setImages(urls);
                  setNewUploads((prev) => {
                    const next = prev.filter((url) => urls.includes(url));
                    persistPending(next);
                    return next;
                  });
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
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                작품명 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  defaultValue={artwork?.title || ''}
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Price */}
            <div className="sm:col-span-2">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                가격 (₩) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₩</span>
                </div>
                <input
                  type="text"
                  name="price"
                  id="price"
                  required
                  defaultValue={artwork?.price || ''}
                  placeholder="2,000,000"
                  className="focus:ring-black focus:border-black block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">통화를 제외한 숫자 또는 ₩ 포함 텍스트</p>
            </div>

            {/* Size */}
            <div className="sm:col-span-2">
              <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                크기
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="size"
                  id="size"
                  defaultValue={artwork?.size || ''}
                  placeholder="50x50cm"
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Material */}
            <div className="sm:col-span-2">
              <label htmlFor="material" className="block text-sm font-medium text-gray-700">
                재료
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="material"
                  id="material"
                  defaultValue={artwork?.material || ''}
                  placeholder="Oil on canvas"
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Year */}
            <div className="sm:col-span-1">
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                제작년도
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="year"
                  id="year"
                  defaultValue={artwork?.year || new Date().getFullYear().toString()}
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Edition */}
            <div className="sm:col-span-1">
              <label htmlFor="edition" className="block text-sm font-medium text-gray-700">
                에디션
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="edition"
                  id="edition"
                  defaultValue={artwork?.edition || ''}
                  placeholder="1/10"
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                작가 노트
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={artwork?.description || ''}
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="작품에 담긴 의도나 작가 노트를 적어주세요."
                />
              </div>
            </div>

            {/* Options */}
            <div className="sm:col-span-6 border-t border-gray-200 pt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <label htmlFor="status" className="text-sm font-medium text-gray-700">
                  판매 상태
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={artwork?.status || 'available'}
                  className="h-11 rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="available">판매 중</option>
                  <option value="reserved">예약됨</option>
                  <option value="sold">판매 완료</option>
                </select>
              </div>

              {artwork && (
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="hidden"
                      name="hidden"
                      type="checkbox"
                      defaultChecked={artwork?.is_hidden}
                      className="focus:ring-black h-4 w-4 text-black border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="hidden" className="font-medium text-gray-700">
                      숨김 (Hidden)
                    </label>
                    <p className="text-gray-500">갤러리 리스트에서 숨깁니다.</p>
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
            취소
          </Button>
          <Button type="submit" loading={isPending} disabled={isPending}>
            {artwork ? '수정 사항 저장' : '작품 등록하기'}
          </Button>
        </div>
        {state.error && <p className="text-red-500 text-sm mt-2 text-right">{state.message}</p>}
      </div>
    </form>
  );
}
