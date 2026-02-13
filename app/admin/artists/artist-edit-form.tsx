'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  updateArtist,
  updateArtistProfileImage,
  createAdminArtist,
  searchUsersByName,
  linkArtistToUser,
  unlinkArtistFromUser,
} from '@/app/actions/admin-artists';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils';

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
  user_id: string | null;
  profiles: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type ArtistEditFormProps = {
  artist?: Partial<Artist>;
  returnTo?: string;
};

export function ArtistEditForm({ artist = {}, returnTo }: ArtistEditFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string[]>(
    artist.profile_image ? [artist.profile_image] : []
  );
  const [error, setError] = useState<string | null>(null);

  // User connection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Confirmation Modals
  const [showLinkConfirm, setShowLinkConfirm] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [selectedUserForLink, setSelectedUserForLink] = useState<any>(null);

  // Form Field States
  const [nameKo, setNameKo] = useState(artist.name_ko || '');
  const [showErrors, setShowErrors] = useState(false);

  const isEditing = !!artist.id;

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setShowErrors(true);

    if (!nameKo.trim()) {
      toast.error('필수 정보를 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && artist.id) {
        await updateArtist(artist.id, formData);
        toast.success('작가 정보가 저장되었습니다.');
        router.refresh();
      } else {
        const result = await createAdminArtist(formData);
        if (result.success && result.id) {
          if (returnTo) {
            toast.success('작가가 생성되었습니다. 작품 등록 화면으로 돌아갑니다.');
            const separator = returnTo.includes('?') ? '&' : '?';
            router.push(`${returnTo}${separator}artist_id=${result.id}&artist_created=1`);
          } else {
            toast.success('작가가 생성되었습니다. 프로필 이미지는 필요 시 등록할 수 있습니다.');
            router.push(`/admin/artists/${result.id}`);
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
      await updateArtistProfileImage(artist.id, newImages[0] || null);
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

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchUsersByName(q);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };
  // end handleSearchUsers

  const handleLinkUser = async () => {
    if (!artist.id || !selectedUserForLink) return;

    setIsLinking(true);
    setError(null);
    try {
      const result = await linkArtistToUser(artist.id, selectedUserForLink.id);
      if (result.success) {
        toast.success(`${selectedUserForLink.name} 사용자가 작가 계정으로 연결되었습니다.`);
        setSearchQuery('');
        setSearchResults([]);
        setShowLinkConfirm(false);
        setSelectedUserForLink(null);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkUser = async () => {
    if (!artist.id) return;
    setIsLinking(true);
    setError(null);
    try {
      const result = await unlinkArtistFromUser(artist.id);
      if (result.success) {
        toast.success('사용자 계정 연결이 해제되었습니다.');
        setShowUnlinkConfirm(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
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

      {/* Profile Image Section */}
      {isEditing && artist.id ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              프로필 이미지 (선택)
              {savingImage && <span className="ml-2 text-sm text-gray-500">저장 중...</span>}
            </h2>
            <ImageUpload
              bucket="profiles"
              pathPrefix={`admin-artist-${artist.id}`}
              value={profileImage}
              onUploadComplete={handleImageChange}
              maxFiles={1}
            />
          </AdminCard>

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              사용자 계정 연결
              {isLinking && <span className="ml-2 text-sm text-gray-500">처리 중...</span>}
            </h2>

            {artist.profiles ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">{artist.profiles.name}</p>
                      <p className="text-sm text-green-700">{artist.profiles.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="white"
                      size="sm"
                      onClick={() => setShowUnlinkConfirm(true)}
                      disabled={isLinking}
                      className="text-red-600 hover:text-red-700 border-red-200"
                    >
                      연결 해제
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  이 작가 프로필은 현재 위 사용자 계정과 연결되어 있습니다. 해당 사용자는 작가
                  대시보드를 사용할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사용자 검색 (이름 또는 이메일)
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="연결할 사용자 검색..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    disabled={isLinking}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-[38px]">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white shadow-sm">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForLink(user);
                            setShowLinkConfirm(true);
                          }}
                          disabled={isLinking}
                        >
                          연결
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-sm text-slate-500 italic">검색 결과가 없습니다.</p>
                )}

                <p className="text-xs text-slate-500 leading-relaxed">
                  사용자의 이름을 검색하여 이 작가 프로필과 연결하세요. <br />
                  연결된 사용자는 해당 작가 권한으로 로그인하여 작품을 관리할 수 있습니다.
                </p>
              </div>
            )}
          </AdminCard>
        </div>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          프로필 이미지 및 사용자 연동은 작가 정보를 먼저 저장한 뒤 진행할 수 있습니다.
        </div>
      )}

      {/* Confirmation Modals */}
      <AdminConfirmModal
        isOpen={showLinkConfirm}
        onClose={() => setShowLinkConfirm(false)}
        onConfirm={handleLinkUser}
        title="사용자 계정 연결 확인"
        confirmText="연결하기"
        variant="warning"
        isLoading={isLinking}
        description={
          selectedUserForLink
            ? `'${selectedUserForLink.name}' 사용자를 이 작가 프로필에 연결하시겠습니까?\n\n` +
              `수행되는 작업:\n` +
              `1. 작가 프로필에 사용자 계정 ID(${selectedUserForLink.email})를 등록합니다.\n` +
              `2. 해당 사용자의 권한을 'Artist'로 변경합니다.\n` +
              `3. 해당 사용자의 계정 상태를 'Active'로 변경합니다.`
            : ''
        }
      />

      <AdminConfirmModal
        isOpen={showUnlinkConfirm}
        onClose={() => setShowUnlinkConfirm(false)}
        onConfirm={handleUnlinkUser}
        title="계정 연결 해제"
        description="이 작가 프로필과 사용자 계정의 연결을 해제하시겠습니까?\n해제하더라도 사용자의 계정 권한은 유지됩니다."
        confirmText="연결 해제"
        variant="danger"
        isLoading={isLinking}
      />

      {/* Details Section */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm"
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
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              required
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors',
                showErrors && !nameKo.trim() ? 'border-red-500 bg-red-50' : 'border-gray-300'
              )}
            />
            {showErrors && !nameKo.trim() && (
              <p className="mt-1 text-xs text-red-600">작가 이름을 입력해주세요.</p>
            )}
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
