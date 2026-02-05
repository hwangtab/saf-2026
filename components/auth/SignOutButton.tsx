'use client';

import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-800 font-medium">
      로그아웃
    </button>
  );
}
