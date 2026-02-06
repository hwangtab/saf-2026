'use client';

import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-100 rounded-lg hover:bg-red-50 transition-all duration-200 group"
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
      로그아웃
    </button>
  );
}
