'use client';

import { useActionState, useState } from 'react';
import { updateArtistProfile, type ActionState } from '@/app/actions/profile';
import Button from '@/components/ui/Button';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { CheckMarkIcon } from '@/components/ui/Icons';
import { AdminFieldLabel, AdminInput, AdminTextarea } from '@/app/admin/_components/admin-ui';

const initialState: ActionState = {
  message: '',
  error: false,
};

export function ProfileForm({ artist, userId }: { artist: any; userId: string }) {
  const [state, formAction, isPending] = useActionState(updateArtistProfile, initialState);
  const [profileImage, setProfileImage] = useState<string>(artist?.profile_image || '');

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
            작가명 (한글) <span className="text-red-500">*</span>
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
          <AdminFieldLabel htmlFor="name_en">작가명 (영문)</AdminFieldLabel>
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
          <AdminFieldLabel>프로필 이미지</AdminFieldLabel>
          <ImageUpload
            bucket="profiles"
            pathPrefix={userId} // User can only upload to their own folder due to RLS
            maxFiles={1}
            defaultImages={artist?.profile_image ? [artist.profile_image] : []}
            onUploadComplete={handleImageUpload}
          />
        </div>

        {/* Bio */}
        <div className="sm:col-span-6">
          <AdminFieldLabel htmlFor="bio">작가 소개 (Bio)</AdminFieldLabel>
          <div className="mt-1">
            <AdminTextarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={artist?.bio || ''}
              placeholder="자신을 소개하는 짧은 글을 작성해주세요."
            />
          </div>
        </div>

        {/* History */}
        <div className="sm:col-span-6">
          <AdminFieldLabel htmlFor="history">약력 / 전시 이력</AdminFieldLabel>
          <div className="mt-1">
            <AdminTextarea
              id="history"
              name="history"
              rows={8}
              defaultValue={artist?.history || ''}
              className="font-mono"
              placeholder={'2024 개인전 (서울)\n2023 단체전 (부산)'}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">줄바꿈으로 구분하여 입력해주세요.</p>
        </div>

        <div className="sm:col-span-6 border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">연락처/링크</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <AdminFieldLabel htmlFor="contact_email">연락처</AdminFieldLabel>
              <AdminInput
                type="text"
                name="contact_email"
                id="contact_email"
                defaultValue={artist?.contact_email || ''}
                className="mt-1"
                placeholder="이메일 또는 전화번호"
              />
            </div>
            <div>
              <AdminFieldLabel htmlFor="instagram">인스타그램</AdminFieldLabel>
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
              <AdminFieldLabel htmlFor="homepage">홈페이지</AdminFieldLabel>
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
          {state.error && <p className="text-red-500 text-sm">{state.message}</p>}
          {state.message && !state.error && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckMarkIcon />
              저장되었습니다
            </p>
          )}
          <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
            저장하기
          </Button>
        </div>
      </div>
    </form>
  );
}
