'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { UI_STRINGS } from '@/lib/ui-strings';

import { UserRole, UserStatus } from '@/types/database.types';

type Profile = {
  role: UserRole;
  status: UserStatus;
};

type AuthButtonsProps = {
  layout?: 'inline' | 'stacked';
  className?: string;
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'outline'
    | 'outline-white'
    | 'white'
    | 'ghost'
    | 'ghost-white';
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export default function AuthButtons({
  layout = 'inline',
  className = '',
  variant = 'white',
  size = 'md',
}: AuthButtonsProps) {
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

    const validRoles: UserRole[] = ['admin', 'artist', 'user', 'exhibitor'];
    const validStatuses: UserStatus[] = ['pending', 'active', 'suspended'];

    return (
      validRoles.includes(candidate.role as UserRole) &&
      validStatuses.includes(candidate.status as UserStatus)
    );
  };

  const isAbortError = (error: unknown): error is Error => {
    return error instanceof Error && error.name === 'AbortError';
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchProfileData = async (id: string, signal: AbortSignal, showLoading = false) => {
      if (showLoading) setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', id)
          .maybeSingle();

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
          // 세션 확인됨 -> 프로필 데이터 로드 (로딩 상태 유지)
          await fetchProfileData(currentId, controller.signal, true);
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
        <div
          className={`bg-gray-100/50 animate-pulse rounded-full ${size === 'xs' ? 'h-9 w-20' : 'h-10 w-24'}`}
        />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className={wrapperClassName}>
        <Button
          href="/login"
          variant={variant}
          size={size}
          className={layout === 'stacked' ? 'w-full justify-center' : ''}
        >
          {UI_STRINGS.NAV.ARTIST_MENU}
        </Button>
      </div>
    );
  }

  const dashboardLink = (() => {
    if (profile?.role === 'admin') {
      return { href: '/admin/dashboard', label: UI_STRINGS.NAV.ADMIN_DASHBOARD };
    }
    if (profile?.role === 'artist' && profile.status === 'active') {
      return { href: '/dashboard/artworks', label: '마이페이지' };
    }
    if (profile?.role === 'exhibitor') {
      return { href: '/exhibitor', label: '출품자 대시보드' };
    }
    if (profile?.status === 'pending') {
      return { href: '/dashboard/pending', label: '승인 대기' };
    }
    if (profile?.status === 'suspended') {
      return { href: '/dashboard/suspended', label: '계정 정지' };
    }
    if (profile?.role === 'user') {
      return { href: '/onboarding', label: '작가 등록' };
    }
    return null;
  })();

  return (
    <div className={wrapperClassName}>
      {dashboardLink ? (
        <Button
          href={dashboardLink.href}
          variant={variant}
          size={size}
          className={layout === 'stacked' ? 'w-full justify-center' : ''}
        >
          {dashboardLink.label}
        </Button>
      ) : (
        <Button
          variant={variant}
          size={size}
          disabled
          className={layout === 'stacked' ? 'w-full justify-center' : ''}
        >
          계정 확인 중...
        </Button>
      )}
    </div>
  );
}
