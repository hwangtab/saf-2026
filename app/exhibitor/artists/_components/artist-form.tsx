'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  updateExhibitorArtist,
  updateExhibitorArtistProfileImage,
  createExhibitorArtist,
} from '@/app/actions/exhibitor-artists';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { useToast } from '@/lib/hooks/useToast';

type Artist = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  bio: string | null;
  history: string | null;
  profile_image: string | null;
  contact_email: string | null;
  instagram: string | null;
  homepage: string | null;
};

type ArtistFormProps = {
  artist?: Partial<Artist>;
  returnTo?: string;
};

export function ArtistForm({ artist = {}, returnTo }: ArtistFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string[]>(
    artist.profile_image ? [artist.profile_image] : []
  );
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!artist.id;

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSaving(true);
    try {
      if (isEditing && artist.id) {
        await updateExhibitorArtist(artist.id, formData);
        toast.success('작가 정보가 저장되었습니다.');
        router.refresh();
      } else {
        const result = await createExhibitorArtist(formData);
        if (result.success && result.id) {
          if (returnTo) {
            toast.success('작가가 생성되었습니다. 작품 등록 화면으로 돌아갑니다.');
            const separator = returnTo.includes('?') ? '&' : '?';
            router.push(`${returnTo}${separator}artist_id=${result.id}&artist_created=1`);
          } else {
            toast.success('작가가 생성되었습니다.');
            router.push(`/exhibitor/artists`);
          }
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

  const handleImageChange = async (newImages: string[]) => {
    if (!artist.id) return;
    setProfileImage(newImages);
    setError(null);
    setSavingImage(true);
    try {
      await updateExhibitorArtistProfileImage(artist.id, newImages[0] || null);
      toast.success('프로필 이미지가 저장되었습니다.');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '이미지 저장 중 오류가 발생했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {isEditing && artist.id ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            프로필 이미지 (선택)
            {savingImage && <span className="ml-2 text-sm text-gray-500">저장 중...</span>}
          </h2>
          <ImageUpload
            bucket="profiles"
            pathPrefix={`exhibitor-artist-${artist.id}`}
            value={profileImage}
            onUploadComplete={handleImageChange}
            maxFiles={1}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          프로필 이미지는 선택 사항이며, 작가 정보를 먼저 저장한 뒤 필요할 때 등록할 수 있습니다.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? '작가 정보 수정' : '새 작가 등록'}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              작가명 (한글) <span className="text-red-500">*</span>
            </label>
            <input
              name="name_ko"
              defaultValue={artist.name_ko || ''}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">작가명 (영문)</label>
            <input
              name="name_en"
              defaultValue={artist.name_en || ''}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={artist.contact_email || ''}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
            <input
              name="instagram"
              defaultValue={artist.instagram || ''}
              placeholder="@username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">홈페이지</label>
            <input
              name="homepage"
              type="url"
              defaultValue={artist.homepage || ''}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <input type="hidden" name="profile_image" value={profileImage[0] || ''} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">소개</label>
          <textarea
            name="bio"
            defaultValue={artist.bio || ''}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">이력</label>
          <textarea
            name="history"
            defaultValue={artist.history || ''}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/exhibitor/artists')}>
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
