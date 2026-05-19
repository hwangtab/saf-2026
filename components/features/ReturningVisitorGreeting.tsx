'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/hooks/useToast';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { recordAndGetVisit } from '@/lib/visit-state';

/**
 * 재방문자 + 비어있지 않은 위시리스트 조합일 때 토스트로 환영 메시지를 표시.
 * 매뉴얼 6.7 — "위시리스트가 비어 있으면 표시 안 함" 조건 준수.
 * 레이아웃에 마운트되어 페이지 전환 없이 첫 mount 1회만 실행.
 */
export default function ReturningVisitorGreeting() {
  const { ids, mounted } = useWishlist();
  const toast = useToast();
  const t = useTranslations('wishlist');
  const fired = useRef(false);

  useEffect(() => {
    if (!mounted || fired.current) return;
    fired.current = true;

    const { isReturning } = recordAndGetVisit();
    if (!isReturning || ids.length === 0) return;

    // 3.5초 후 자동 닫힘
    toast.info(t('returningGreeting', { count: ids.length }), { duration: 3500 });
  }, [mounted, ids.length, t, toast]);

  return null;
}
