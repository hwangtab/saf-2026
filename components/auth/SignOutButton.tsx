'use client';

import { useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useToast } from '@/lib/hooks/useToast';

const SIGN_OUT_COPY: Record<
  'ko' | 'en',
  {
    error: string;
    success: string;
    signingOut: string;
    signOut: string;
  }
> = {
  ko: {
    error: '로그아웃 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    success: '로그아웃되었습니다.',
    signingOut: '로그아웃 중...',
    signOut: '로그아웃',
  },
  en: {
    error: 'An error occurred while signing out. Please try again shortly.',
    success: 'Signed out.',
    signingOut: 'Signing out...',
    signOut: 'Sign out',
  },
};

export function SignOutButton() {
  const locale = useLocale();
  const copy = SIGN_OUT_COPY[locale as 'ko' | 'en'];
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const toast = useToast();

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        toast.error(copy.error);
        setIsSigningOut(false);
        return;
      }

      toast.success(copy.success);
      setIsSigningOut(false);
      router.replace('/');
      router.refresh();
    } catch (error) {
      toast.error(copy.error);
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-100 rounded-lg hover:bg-red-50 transition-colors duration-200 group"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      {isSigningOut ? copy.signingOut : copy.signOut}
    </button>
  );
}
