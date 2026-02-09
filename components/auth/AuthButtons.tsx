'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const userIdRef = useRef<string | null>(null);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const isProfile = (value: unknown): value is Profile => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;

    return (
      (candidate.role === 'admin' || candidate.role === 'artist' || candidate.role === 'user') &&
      (candidate.status === 'pending' ||
        candidate.status === 'active' ||
        candidate.status === 'suspended')
    );
  };

  const isAbortError = (error: unknown): error is Error => {
    return error instanceof Error && error.name === 'AbortError';
  };

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

        if (id !== userIdRef.current) {
          return;
        }

        setProfile(isProfile(data) ? data : null);
      } catch (err: unknown) {
        if (isAbortError(err)) return;
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
        userIdRef.current = currentId;
        setUserId(currentId);

        if (currentId) {
          // 세션 확인됨 -> 즉시 버튼을 보여주기 위해 로딩 종료 (상세 프로필은 백그라운드)
          setIsLoading(false);
          await fetchProfileData(currentId, controller.signal);
        } else {
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        console.error('Auth init error:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const newId = session?.user?.id || null;
      userIdRef.current = newId;

      // 유저가 실제로 바뀐 경우에만 로딩 상태를 트리거
      // (단순 토큰 갱신 시에는 버튼이 깜빡이지 않도록 함)
      setUserId((prevId) => {
        if (prevId !== newId) {
          if (newId) {
            fetchProfileData(newId, controller.signal, true);
          } else {
            userIdRef.current = null;
            setProfile(null);
            setIsLoading(false);
          }
        } else if (newId && !profileRef.current) {
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
  }, [supabase]);

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
      return { href: '/admin/dashboard', label: UI_STRINGS.NAV.ARTIST_MENU };
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
    </div>
  );
}
