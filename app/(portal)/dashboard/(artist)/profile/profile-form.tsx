'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
  const locale = useLocale();
  const t = useTranslations('dashboard.profileForm');
  const [state, formAction, isPending] = useActionState(updateArtistProfile, initialState);
  const [profileImage, setProfileImage] = useState<string>(artist?.profile_image || '');
  const actionMessage =
    locale === 'en' && state.message && /[가-힣]/.test(state.message)
      ? t('genericError')
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
            {t('nameKo')} <span className="text-red-500">*</span>
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
          <AdminFieldLabel htmlFor="name_en">{t('nameEn')}</AdminFieldLabel>
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
          <AdminFieldLabel>{t('profileImage')}</AdminFieldLabel>
          <ImageUpload
            bucket="profiles"
            pathPrefix={userId} // User can only upload to their own folder due to RLS
            maxFiles={1}
            defaultImages={artist?.profile_image ? [artist.profile_image] : []}
            onUploadComplete={handleImageUpload}
          />
          <p className="mt-2 text-sm text-gray-500">{t('profileImageHint')}</p>
        </div>

        {/* Bio */}
        <div className="sm:col-span-6">
          <AdminFieldLabel htmlFor="bio">{t('bio')}</AdminFieldLabel>
          <div className="mt-1">
            <AdminTextarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={artist?.bio || ''}
              placeholder={t('bioPlaceholder')}
            />
          </div>
        </div>

        {/* History */}
        <div className="sm:col-span-6">
          <AdminFieldLabel htmlFor="history">{t('history')}</AdminFieldLabel>
          <div className="mt-1">
            <AdminTextarea
              id="history"
              name="history"
              rows={8}
              defaultValue={artist?.history || ''}
              className="font-mono"
              placeholder={t('historyPlaceholder')}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">{t('historyHint')}</p>
        </div>

        <div className="sm:col-span-6 border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('contactLinks')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <AdminFieldLabel htmlFor="contact_email">{t('contact')}</AdminFieldLabel>
              <AdminInput
                type="text"
                name="contact_email"
                id="contact_email"
                defaultValue={artist?.contact_email || ''}
                className="mt-1"
                placeholder={t('contactPlaceholder')}
              />
            </div>
            <div>
              <AdminFieldLabel htmlFor="instagram">{t('instagram')}</AdminFieldLabel>
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
              <AdminFieldLabel htmlFor="homepage">{t('homepage')}</AdminFieldLabel>
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
              {t('saved')}
            </p>
          )}
          <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
            {t('save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
