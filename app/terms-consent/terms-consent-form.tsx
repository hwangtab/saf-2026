'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import Button from '@/components/ui/Button';
import { submitTermsConsent, type TermsConsentState } from '@/app/actions/terms-consent';

const initialState: TermsConsentState = {
  message: '',
  error: false,
};

type TermsConsentFormProps = {
  nextPath: string;
  needsArtistConsent: boolean;
  needsExhibitorConsent: boolean;
};

export function TermsConsentForm({
  nextPath,
  needsArtistConsent,
  needsExhibitorConsent,
}: TermsConsentFormProps) {
  const [state, formAction, isPending] = useActionState(submitTermsConsent, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next_path" value={nextPath} />

      {needsArtistConsent && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <input
              id="agree_artist"
              name="agree_artist"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <div className="text-sm">
              <label htmlFor="agree_artist" className="font-medium text-gray-700">
                아티스트 이용약관에 동의합니다. <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-gray-500">
                <Link href="/terms/artist" className="underline underline-offset-2">
                  약관 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {needsExhibitorConsent && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <input
              id="agree_exhibitor"
              name="agree_exhibitor"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <div className="text-sm">
              <label htmlFor="agree_exhibitor" className="font-medium text-gray-700">
                출품자 이용약관에 동의합니다. <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-gray-500">
                <Link href="/terms/exhibitor" className="underline underline-offset-2">
                  약관 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        개인정보 처리 기준은{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        에서 확인할 수 있습니다.
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {state.error && <p className="text-sm text-red-600">{state.message}</p>}
        <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
          동의하고 계속하기
        </Button>
      </div>
    </form>
  );
}
