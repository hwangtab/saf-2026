'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { updateArtist, updateArtistProfileImage } from '@/app/actions/admin-artists';
import { ImageUpload } from '@/components/dashboard/ImageUpload';

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

type ArtistEditFormProps = {
  artist: Artist;
};

export function ArtistEditForm({ artist }: ArtistEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string[]>(
    artist.profile_image ? [artist.profile_image] : []
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSaving(true);
    try {
      await updateArtist(artist.id, formData);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (newImages: string[]) => {
    setProfileImage(newImages);
    setError(null);
    setSavingImage(true);
    try {
      await updateArtistProfileImage(artist.id, newImages[0] || null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile Image Section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          프로필 이미지
          {savingImage && <span className="ml-2 text-sm text-gray-500">저장 중...</span>}
        </h2>
        <ImageUpload
          bucket="profiles"
          pathPrefix={`admin-artist-${artist.id}`}
          value={profileImage}
          onChange={handleImageChange}
          onUploadComplete={handleImageChange}
          maxFiles={1}
        />
      </div>

      {/* Details Section */}
      <form action={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-900">작가 정보</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작가명 (한글) *</label>
            <input
              name="name_ko"
              defaultValue={artist.name_ko || ''}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작가명 (영문)</label>
            <input
              name="name_en"
              defaultValue={artist.name_en || ''}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={artist.contact_email || ''}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <input
              name="instagram"
              defaultValue={artist.instagram || ''}
              placeholder="@username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">홈페이지</label>
            <input
              name="homepage"
              type="url"
              defaultValue={artist.homepage || ''}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <input type="hidden" name="profile_image" value={profileImage[0] || ''} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">소개</label>
          <textarea
            name="bio"
            defaultValue={artist.bio || ''}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이력</label>
          <textarea
            name="history"
            defaultValue={artist.history || ''}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="white" onClick={() => router.push('/admin/artists')}>
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
