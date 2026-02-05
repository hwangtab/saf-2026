'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { createSupabaseBrowserClient } from '@/lib/auth/client';

type Profile = {
  role: 'admin' | 'artist' | 'user';
  status: 'pending' | 'active' | 'suspended';
};

type AuthButtonsProps = {
  layout?: 'inline' | 'stacked';
  className?: string;
};

export default function AuthButtons({ layout = 'inline', className = '' }: AuthButtonsProps) {
  const supabase = createSupabaseBrowserClient();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('role, status').eq('id', id).single();
    setProfile((data as Profile) || null);
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      const id = data.user?.id || null;
      setUserId(id);
      if (id) {
        await fetchProfile(id);
      }
      setIsLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user?.id || null;
      setUserId(id);
      if (id) {
        await fetchProfile(id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
  };

  const wrapperClassName =
    layout === 'stacked'
      ? `flex flex-col gap-3 w-full ${className}`
      : `flex items-center gap-3 ${className}`;

  if (isLoading) return null;

  if (!userId) {
    return (
      <div className={wrapperClassName}>
        <Button
          href="/login"
          variant="white"
          className={layout === 'stacked' ? 'w-full justify-center' : ''}
        >
          로그인
        </Button>
      </div>
    );
  }

  const dashboardLink = (() => {
    if (profile?.role === 'admin') {
      return { href: '/admin/users', label: '관리자' };
    }
    if (profile?.status === 'pending') {
      return { href: '/dashboard/pending', label: '승인 대기' };
    }
    if (profile?.status === 'suspended') {
      return { href: '/dashboard/suspended', label: '계정 정지' };
    }
    return { href: '/dashboard', label: '대시보드' };
  })();

  return (
    <div className={wrapperClassName}>
      <Button
        href={dashboardLink.href}
        variant="white"
        className={layout === 'stacked' ? 'w-full justify-center' : ''}
      >
        {dashboardLink.label}
      </Button>
      <button
        onClick={handleSignOut}
        className={
          layout === 'stacked'
            ? 'w-full min-h-[44px] rounded-lg border border-gray-200 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-200'
            : 'text-sm font-medium text-red-600 hover:text-red-700'
        }
        type="button"
      >
        로그아웃
      </button>
    </div>
  );
}
