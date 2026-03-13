'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  updateExhibitorArtist,
  updateExhibitorArtistProfileImage,
  createExhibitorArtist,
} from '@/app/actions/exhibitor-artists';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { useToast } from '@/lib/hooks/useToast';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const ARTIST_FORM_COPY: Record<
  LocaleCode,
  {
    artistSaved: string;
    artistCreatedReturning: string;
    artistCreated: string;
    saveError: string;
    saveErrorToast: string;
    profileImageSaved: string;
    imageSaveError: string;
    imageSaveErrorToast: string;
    closeError: string;
    profileImageOptional: string;
    saving: string;
    profileImageGuide: string;
    editTitle: string;
    createTitle: string;
    nameKo: string;
    nameEn: string;
    email: string;
    homepage: string;
    bio: string;
    history: string;
    backToList: string;
    save: string;
  }
> = {
  ko: {
    artistSaved: '작가 정보를 저장했습니다.',
    artistCreatedReturning: '작가를 등록했습니다. 작품 등록 화면으로 이동합니다.',
    artistCreated: '작가를 등록했습니다.',
    saveError: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    saveErrorToast: '저장 중 오류가 발생했습니다.',
    profileImageSaved: '프로필 이미지를 저장했습니다.',
    imageSaveError: '이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    imageSaveErrorToast: '이미지 저장 중 오류가 발생했습니다.',
    closeError: '오류 메시지 닫기',
    profileImageOptional: '프로필 이미지 (선택)',
    saving: '저장 중...',
    profileImageGuide:
      '프로필 이미지는 선택 사항이며, 작가 정보를 먼저 저장한 뒤 필요할 때 등록할 수 있습니다.',
    editTitle: '작가 정보 수정',
    createTitle: '새 작가 등록',
    nameKo: '작가명 (한글)',
    nameEn: '작가명 (영문)',
    email: '이메일',
    homepage: '홈페이지',
    bio: '소개',
    history: '이력',
    backToList: '목록으로',
    save: '저장',
  },
  en: {
    artistSaved: 'Artist information saved.',
    artistCreatedReturning: 'Artist created. Returning to artwork registration.',
    artistCreated: 'Artist created.',
    saveError: 'An error occurred while saving. Please try again shortly.',
    saveErrorToast: 'An error occurred while saving.',
    profileImageSaved: 'Profile image saved.',
    imageSaveError: 'An error occurred while saving image. Please try again shortly.',
    imageSaveErrorToast: 'An error occurred while saving image.',
    closeError: 'Close error message',
    profileImageOptional: 'Profile image (optional)',
    saving: 'Saving...',
    profileImageGuide:
      'Profile image is optional. Save artist information first and upload it later if needed.',
    editTitle: 'Edit artist information',
    createTitle: 'Create new artist',
    nameKo: 'Artist name (Korean)',
    nameEn: 'Artist name (English)',
    email: 'Email',
    homepage: 'Homepage',
    bio: 'Bio',
    history: 'History',
    backToList: 'Back to list',
    save: 'Save',
  },
};

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
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = ARTIST_FORM_COPY[locale];
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
        toast.success(copy.artistSaved);
        router.push('/exhibitor/artists');
      } else {
        const result = await createExhibitorArtist(formData);
        if (result.success && result.id) {
          if (returnTo) {
            toast.success(copy.artistCreatedReturning);
            const separator = returnTo.includes('?') ? '&' : '?';
            router.push(`${returnTo}${separator}artist_id=${result.id}&artist_created=1`);
          } else {
            toast.success(copy.artistCreated);
            router.push(`/exhibitor/artists`);
          }
        }
      }
    } catch {
      setError(copy.saveError);
      toast.error(copy.saveErrorToast);
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
      toast.success(copy.profileImageSaved);
      router.refresh();
    } catch {
      setError(copy.imageSaveError);
      toast.error(copy.imageSaveErrorToast);
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
            aria-label={copy.closeError}
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
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {copy.profileImageOptional}
            {savingImage && <span className="ml-2 text-sm text-gray-500">{copy.saving}</span>}
          </h2>
          <ImageUpload
            bucket="profiles"
            pathPrefix={`exhibitor-artist-${artist.id}`}
            value={profileImage}
            onUploadComplete={handleImageChange}
            maxFiles={1}
          />
        </AdminCard>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {copy.profileImageGuide}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {copy.nameKo} <span className="text-red-500">*</span>
            </label>
            <input
              name="name_ko"
              defaultValue={artist.name_ko || ''}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{copy.nameEn}</label>
            <input
              name="name_en"
              defaultValue={artist.name_en || ''}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{copy.email}</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">{copy.homepage}</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">{copy.bio}</label>
          <textarea
            name="bio"
            defaultValue={artist.bio || ''}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{copy.history}</label>
          <textarea
            name="history"
            defaultValue={artist.history || ''}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/exhibitor/artists')}>
            {copy.backToList}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {copy.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
