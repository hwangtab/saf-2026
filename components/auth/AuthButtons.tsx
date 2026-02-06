'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { UI_STRINGS } from '@/lib/ui-strings';

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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error.message);
      }
      setProfile((data as Profile) || null);
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        const id = session?.user?.id || null;
        setUserId(id);
        if (id) {
          await fetchProfile(id);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setIsLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user?.id || null;
      if (!isMounted) return;

      setUserId(id);
      if (id) {
        setIsLoading(true);
        await fetchProfile(id);
      } else {
        setProfile(null);
        setIsLoading(false);
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

  // Loading state placeholder to prevent layout shift and handle slow profile fetch
  if (isLoading) {
    return (
      <div className={wrapperClassName}>
        <div className="h-10 w-24 bg-gray-100/50 animate-pulse rounded-full" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className={wrapperClassName}>
        <Button
          href="/login"
          variant="white"
          className={layout === 'stacked' ? 'w-full justify-center' : ''}
        >
          {UI_STRINGS.NAV.ARTIST_MENU}
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
    // Default to main dashboard if role/status is not yet loaded or user is regular active user
    return { href: '/dashboard', label: '마이페이지' };
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
            ? 'w-full min-h-[44px] rounded-lg border border-gray-200 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-200 transition-colors'
            : 'text-sm font-medium text-red-600 hover:text-red-700 transition-colors px-2'
        }
        type="button"
      >
        로그아웃
      </button>
    </div>
  );
}
