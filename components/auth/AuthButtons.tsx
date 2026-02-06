'use client';

import { useEffect, useState, useMemo } from 'react';
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
  // Memoize client to ensure it's stable across renders
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const TIMEOUT_MS = 3000;

    const fetchProfileData = async (id: string, signal: AbortSignal, showLoading = false) => {
      if (showLoading) setIsLoading(true);

      const timeoutId = setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, TIMEOUT_MS);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', id)
          .single();

        if (signal.aborted || !isMounted) return;

        if (error) {
          console.warn('Profile fetch error:', error.message);
        }
        setProfile((data as Profile) || null);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Unexpected error in fetchProfile:', err);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted && !signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        const currentId = session?.user?.id || null;
        setUserId(currentId);

        if (currentId) {
          // 세션 확인됨 -> 즉시 버튼을 보여주기 위해 로딩 종료 (상세 프로필은 백그라운드)
          setIsLoading(false);
          await fetchProfileData(currentId, controller.signal);
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Auth init error:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const newId = session?.user?.id || null;

      // 유저가 실제로 바뀐 경우에만 로딩 상태를 트리거
      // (단순 토큰 갱신 시에는 버튼이 깜빡이지 않도록 함)
      setUserId((prevId) => {
        if (prevId !== newId) {
          if (newId) {
            fetchProfileData(newId, controller.signal, true);
          } else {
            setProfile(null);
            setIsLoading(false);
          }
        } else if (newId && !profile) {
          // 아이디는 같으나 프로필 정보가 없는 경우 백그라운드 재시도
          fetchProfileData(newId, controller.signal, false);
        }
        return newId;
      });
    });

    return () => {
      isMounted = false;
      controller.abort();
      authListener.subscription.unsubscribe();
    };
  }, [supabase, profile]); // profile is needed for the logic in onAuthStateChange

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
