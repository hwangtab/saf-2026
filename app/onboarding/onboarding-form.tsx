'use client';

import { useActionState } from 'react';
import Button from '@/components/ui/Button';
import { submitArtistApplication, type OnboardingState } from '@/app/actions/onboarding';
import { CheckMarkIcon } from '@/components/ui/Icons';

const initialState: OnboardingState = {
  message: '',
  error: false,
};

type OnboardingDefaults = {
  artist_name?: string | null;
  contact?: string | null;
  bio?: string | null;
} | null;

export function OnboardingForm({ defaultValues }: { defaultValues?: OnboardingDefaults }) {
  const [state, formAction, isPending] = useActionState(submitArtistApplication, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="artist_name" className="block text-sm font-medium text-gray-700">
          작가명 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="artist_name"
            name="artist_name"
            type="text"
            required
            defaultValue={defaultValues?.artist_name || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="활동명 또는 작가명"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
          연락처 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="contact"
            name="contact"
            type="text"
            required
            defaultValue={defaultValues?.contact || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="이메일 또는 전화번호"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          자기 소개 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <textarea
            id="bio"
            name="bio"
            rows={5}
            required
            defaultValue={defaultValues?.bio || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="간단한 소개를 입력해주세요."
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-end items-center gap-4">
          {state.error && <p className="text-red-500 text-sm">{state.message}</p>}
          {state.message && !state.error && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckMarkIcon />
              제출 완료
            </p>
          )}
          <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
            제출하기
          </Button>
        </div>
      </div>
    </form>
  );
}
