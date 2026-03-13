'use client';

import { useActionState, useState } from 'react';
import { usePathname } from 'next/navigation';
import { updateArtistProfile, type ActionState } from '@/app/actions/profile';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { CheckMarkIcon } from '@/components/ui/Icons';
import { AdminFieldLabel, AdminInput, AdminTextarea } from '@/app/admin/_components/admin-ui';
import { resolveClientLocale } from '@/lib/client-locale';

const initialState: ActionState = {
  message: '',
  error: false,
};

type LocaleCode = 'ko' | 'en';

const PROFILE_FORM_COPY: Record<
  LocaleCode,
  {
    nameKo: string;
    nameEn: string;
    profileImage: string;
    profileImageHint: string;
    bio: string;
    bioPlaceholder: string;
    history: string;
    historyPlaceholder: string;
    historyHint: string;
    contactLinks: string;
    contact: string;
    contactPlaceholder: string;
    instagram: string;
    homepage: string;
    saved: string;
    save: string;
    genericError: string;
  }
> = {
  ko: {
    nameKo: '작가명 (한글)',
    nameEn: '작가명 (영문)',
    profileImage: '프로필 이미지 (선택)',
    profileImageHint:
      '프로필 이미지는 선택 사항입니다. 업로드하지 않아도 프로필 저장과 작가 활동이 가능합니다.',
    bio: '작가 소개 (Bio)',
    bioPlaceholder: '자신을 소개하는 짧은 글을 작성해주세요.',
    history: '약력 / 전시 이력',
    historyPlaceholder: '2024 개인전 (서울)\n2023 단체전 (부산)',
    historyHint: '줄바꿈으로 구분하여 입력해주세요.',
    contactLinks: '연락처/링크',
    contact: '연락처',
    contactPlaceholder: '이메일 또는 전화번호',
    instagram: '인스타그램',
    homepage: '홈페이지',
    saved: '저장되었습니다',
    save: '저장하기',
    genericError: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
  en: {
    nameKo: 'Artist name (Korean)',
    nameEn: 'Artist name (English)',
    profileImage: 'Profile image (optional)',
    profileImageHint:
      'Profile image is optional. You can save profile and continue artist activity without it.',
    bio: 'Artist bio',
    bioPlaceholder: 'Write a short introduction about yourself.',
    history: 'CV / Exhibition history',
    historyPlaceholder: '2024 Solo Exhibition (Seoul)\n2023 Group Exhibition (Busan)',
    historyHint: 'Use line breaks to separate entries.',
    contactLinks: 'Contact / Links',
    contact: 'Contact',
    contactPlaceholder: 'Email or phone number',
    instagram: 'Instagram',
    homepage: 'Homepage',
    saved: 'Saved successfully',
    save: 'Save',
    genericError: 'An error occurred while saving. Please try again shortly.',
  },
};

export function ProfileForm({ artist, userId }: { artist: any; userId: string }) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = PROFILE_FORM_COPY[locale];
  const [state, formAction, isPending] = useActionState(updateArtistProfile, initialState);
  const [profileImage, setProfileImage] = useState<string>(artist?.profile_image || '');
  const actionMessage =
    locale === 'en' && state.message && /[가-힣]/.test(state.message)
      ? copy.genericError
      : state.message;

  const handleImageUpload = (urls: string[]) => {
    if (urls.length > 0) {
      setProfileImage(urls[0]);
    } else {
      setProfileImage('');
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden input for profile_image */}
      <input type="hidden" name="profile_image" value={profileImage} />

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Name KO */}
        <div className="sm:col-span-3">
          <AdminFieldLabel htmlFor="name_ko">
            {copy.nameKo} <span className="text-red-500">*</span>
          </AdminFieldLabel>
          <div className="mt-1">
            <AdminInput
              type="text"
              name="name_ko"
              id="name_ko"
              required
              defaultValue={artist?.name_ko || ''}
            />
          </div>
        </div>

        {/* Name EN */}
        <div className="sm:col-span-3">
          <AdminFieldLabel htmlFor="name_en">{copy.nameEn}</AdminFieldLabel>
          <div className="mt-1">
            <AdminInput
              type="text"
              name="name_en"
              id="name_en"
              defaultValue={artist?.name_en || ''}
            />
          </div>
        </div>

        {/* Profile Image */}
        <div className="sm:col-span-6">
          <AdminFieldLabel>{copy.profileImage}</AdminFieldLabel>
          <ImageUpload
            bucket="profiles"
            pathPrefix={userId} // User can only upload to their own folder due to RLS
            maxFiles={1}
            defaultImages={artist?.profile_image ? [artist.profile_image] : []}
            onUploadComplete={handleImageUpload}
          />
          <p className="mt-2 text-sm text-gray-500">{copy.profileImageHint}</p>
        </div>

        {/* Bio */}
        <div className="sm:col-span-6">
          <AdminFieldLabel htmlFor="bio">{copy.bio}</AdminFieldLabel>
          <div className="mt-1">
            <AdminTextarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={artist?.bio || ''}
              placeholder={copy.bioPlaceholder}
            />
          </div>
        </div>

        {/* History */}
        <div className="sm:col-span-6">
          <AdminFieldLabel htmlFor="history">{copy.history}</AdminFieldLabel>
          <div className="mt-1">
            <AdminTextarea
              id="history"
              name="history"
              rows={8}
              defaultValue={artist?.history || ''}
              className="font-mono"
              placeholder={copy.historyPlaceholder}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">{copy.historyHint}</p>
        </div>

        <div className="sm:col-span-6 border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{copy.contactLinks}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <AdminFieldLabel htmlFor="contact_email">{copy.contact}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="contact_email"
                id="contact_email"
                defaultValue={artist?.contact_email || ''}
                className="mt-1"
                placeholder={copy.contactPlaceholder}
              />
            </div>
            <div>
              <AdminFieldLabel htmlFor="instagram">{copy.instagram}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="instagram"
                id="instagram"
                defaultValue={artist?.instagram || ''}
                className="mt-1"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <AdminFieldLabel htmlFor="homepage">{copy.homepage}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="homepage"
                id="homepage"
                defaultValue={artist?.homepage || ''}
                className="mt-1"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-gray-200">
        <div className="flex justify-end items-center gap-4">
          {state.error && actionMessage && <p className="text-red-500 text-sm">{actionMessage}</p>}
          {state.message && !state.error && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckMarkIcon />
              {copy.saved}
            </p>
          )}
          <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
            {copy.save}
          </Button>
        </div>
      </div>
    </form>
  );
}
