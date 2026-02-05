'use client';

import { useActionState, useState } from 'react';
import { createArtwork, updateArtwork, type ActionState } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';

type ArtworkFormProps = {
  artwork?: any; // If provided, mode is 'edit'
  artistId: string;
};

const initialState: ActionState = {
  message: '',
  error: false,
};

export function ArtworkForm({ artwork, artistId }: ArtworkFormProps) {
  // If editing, we bind the ID to the update action
  const action = artwork ? updateArtwork.bind(null, artwork.id) : createArtwork;

  const [state, formAction, isPending] = useActionState(action, initialState);
  const [images, setImages] = useState<string[]>(artwork?.images || []);

  // Handling 'sold' status checkbox
  // DB stores 'status' enum, UI uses simpler checkboxes generally or logic
  // We'll treat 'sold' status as a boolean checkbox for simplicity here,
  // or a select if we want more options (available, sold, reserved, hidden).
  // User req said: "Status (Sold)" -> checkbox likely sufficient or simple select.
  // Planning doc said: "Status (Sold)".

  return (
    <form action={formAction} className="space-y-8 divide-y divide-gray-200">
      <div className="space-y-8 divide-y divide-gray-200">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {artwork ? '작품 수정' : '새 작품 등록'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">작품의 상세 정보를 입력해주세요.</p>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Hidden: Images JSON */}
            <input type="hidden" name="images" value={JSON.stringify(images)} />

            {/* Images Upload */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작품 이미지 (최대 5장) <span className="text-red-500">*</span>
              </label>
              <ImageUpload
                bucket="artworks"
                pathPrefix={artistId}
                maxFiles={5}
                defaultImages={images}
                onUploadComplete={setImages}
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

            {/* Shop URL */}
            <div className="sm:col-span-4">
              <label htmlFor="shop_url" className="block text-sm font-medium text-gray-700">
                구매 링크 (선택)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="shop_url"
                  id="shop_url"
                  defaultValue={artwork?.shop_url || ''}
                  placeholder="https://..."
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
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
                작품 설명 (노트)
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={artwork?.description || ''}
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="작품에 대한 간단한 설명을 적어주세요."
                />
              </div>
            </div>

            {/* Options */}
            <div className="sm:col-span-6 border-t border-gray-200 pt-4 flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <label htmlFor="status" className="text-sm font-medium text-gray-700">
                  판매 상태
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={artwork?.status || 'available'}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
          <Button href="/dashboard/artworks" variant="white">
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
