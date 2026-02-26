'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import {
  submitExhibitorApplication,
  type ExhibitorOnboardingState,
} from '@/app/actions/exhibitor-onboarding';
import { CheckMarkIcon } from '@/components/ui/Icons';
import { EXHIBITOR_APPLICATION_TERMS_VERSION } from '@/lib/constants';

const initialState: ExhibitorOnboardingState = {
  message: '',
  error: false,
};

type OnboardingDefaults = {
  representative_name?: string | null;
  contact?: string | null;
  bio?: string | null;
  referrer?: string | null;
} | null;

export function ExhibitorOnboardingForm({ defaultValues }: { defaultValues?: OnboardingDefaults }) {
  const [state, formAction, isPending] = useActionState(submitExhibitorApplication, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="representative_name" className="block text-sm font-medium text-gray-700">
          대표명 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="representative_name"
            name="representative_name"
            type="text"
            required
            defaultValue={defaultValues?.representative_name || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="개인명 또는 단체명 (갤러리, 큐레이터 등)"
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
            placeholder="간단한 소개를 입력해주세요. (갤러리 소개, 활동 분야 등)"
          />
        </div>
      </div>

      <div>
        <label htmlFor="referrer" className="block text-sm font-medium text-gray-700">
          추천인 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <div className="mt-1">
          <input
            id="referrer"
            name="referrer"
            type="text"
            defaultValue={defaultValues?.referrer || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="추천인 이름 또는 연락처"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <input type="hidden" name="terms_version" value={EXHIBITOR_APPLICATION_TERMS_VERSION} />
        <div className="flex items-start gap-3">
          <input
            id="terms_accepted"
            name="terms_accepted"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <div className="text-sm">
            <label htmlFor="terms_accepted" className="font-medium text-gray-700">
              출품자 이용약관 및 개인정보처리방침에 동의합니다.{' '}
              <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-gray-500">
              제출 전에{' '}
              <Link href="/terms/exhibitor" className="underline underline-offset-2">
                출품자 이용약관
              </Link>{' '}
              과{' '}
              <Link href="/privacy" className="underline underline-offset-2">
                개인정보처리방침
              </Link>
              을 확인해주세요.
            </p>
          </div>
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
