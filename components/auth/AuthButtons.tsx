'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { useLocale } from 'next-intl';
import { createSupabaseBrowserClient } from '@/lib/auth/client';

import { UserRole, UserStatus } from '@/types/database.types';

type Profile = {
  role: UserRole;
  status: UserStatus;
};

type AuthButtonsProps = {
  layout?: 'inline' | 'stacked';
  className?: string;
  /** 내부 Button 자체에 추가될 className. shape/색 override 용도 (예: 알약 스타일). */
  buttonClassName?: string;
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'outline-white'
    | 'white'
    | 'ghost'
    | 'ghost-white';
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export default memo(function AuthButtons({
  layout = 'inline',
  className = '',
  buttonClassName = '',
  variant = 'white',
  size = 'md',
}: AuthButtonsProps) {
  const stackedClass = layout === 'stacked' ? 'w-full justify-center' : '';
  const mergedButtonClass = [stackedClass, buttonClassName].filter(Boolean).join(' ');
  const locale = useLocale();
  const copy =
    locale === 'en'
      ? {
          signInSignUp: 'Sign in / Sign up',
          adminDashboard: 'Admin',
          myPage: 'My page',
          exhibitorDashboard: 'Exhibitor dashboard',
          pendingApproval: 'Pending approval',
          accountSuspended: 'Account suspended',
          registerArtist: 'Register as artist',
          checkingAccount: 'Checking account...',
        }
      : {
          signInSignUp: '로그인 / 회원가입',
          adminDashboard: '관리자 대시보드',
          myPage: '마이페이지',
          exhibitorDashboard: '출품자 대시보드',
          pendingApproval: '승인 대기',
          accountSuspended: '계정 정지',
          registerArtist: '작가 등록',
          checkingAccount: '계정 확인 중...',
        };

  // Memoize client to ensure it's stable across renders
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  /** role='user' + status='pending' 사용자에 한해 lazy 조회: 출품자 신청서 보유 여부 */
  const [hasExhibitorApp, setHasExhibitorApp] = useState<boolean | null>(null);
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

        const resolvedProfile = isProfile(data) ? data : null;
        setProfile(resolvedProfile);

        // role='user' + pending 사용자만: 출품자 신청자인지 구분해 헤더 버튼 목적지 결정.
        // 승인 전 전이 상태라 소수인 이 케이스에만 추가 쿼리 발생.
        if (resolvedProfile?.role === 'user' && resolvedProfile.status === 'pending') {
          try {
            const { data: exhibitorRow } = await supabase
              .from('exhibitor_applications')
              .select('user_id')
              .eq('user_id', id)
              .maybeSingle();
            if (isMounted && !signal.aborted && id === userIdRef.current) {
              setHasExhibitorApp(!!exhibitorRow);
            }
          } catch {
            // 조회 실패 시 null 유지 → /dashboard/pending fallback
          }
        } else {
          setHasExhibitorApp(null);
        }
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
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        const currentId = user?.id || null;
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
            setHasExhibitorApp(null);
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
        <Button href="/login" variant={variant} size={size} className={mergedButtonClass}>
          {copy.signInSignUp}
        </Button>
      </div>
    );
  }

  const dashboardLink = (() => {
    if (profile?.role === 'admin') {
      return { href: '/admin/dashboard', label: copy.adminDashboard };
    }
    if (profile?.role === 'artist' && profile.status === 'active') {
      return { href: '/dashboard/artworks', label: copy.myPage };
    }
    if (profile?.role === 'exhibitor') {
      if (profile.status === 'suspended') {
        return { href: '/exhibitor/suspended', label: copy.accountSuspended };
      }
      if (profile.status !== 'active') {
        return { href: '/exhibitor/pending', label: copy.pendingApproval };
      }
      return { href: '/exhibitor', label: copy.exhibitorDashboard };
    }
    if (profile?.status === 'pending') {
      return {
        href: hasExhibitorApp ? '/exhibitor/pending' : '/dashboard/pending',
        label: copy.pendingApproval,
      };
    }
    if (profile?.status === 'suspended') {
      return { href: '/dashboard/suspended', label: copy.accountSuspended };
    }
    if (profile?.role === 'user') {
      return { href: '/mypage', label: copy.myPage };
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
          className={mergedButtonClass}
        >
          {dashboardLink.label}
        </Button>
      ) : (
        <Button variant={variant} size={size} disabled className={mergedButtonClass}>
          {copy.checkingAccount}
        </Button>
      )}
    </div>
  );
});
