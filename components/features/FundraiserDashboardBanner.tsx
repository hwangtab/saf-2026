'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';

const DISMISS_KEY = 'fundraiser-banner-dismissed:oh-yoon-terracotta';

// useSyncExternalStore: SSR은 getServerSnapshot(=false)으로 렌더,
// 마운트 후 getSnapshot()으로 localStorage 값 읽어 재렌더.
// setState-in-effect ESLint rule(react-hooks/set-state-in-effect) 위반 없음.
function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getDismissed(): boolean {
  return localStorage.getItem(DISMISS_KEY) === 'true';
}

export default function FundraiserDashboardBanner() {
  const t = useTranslations('dashboard.fundraiser');
  const pathname = usePathname();

  // SSR snapshot=false, 클라이언트 마운트 후 localStorage 읽기
  const dismissed = useSyncExternalStore(
    subscribeStorage,
    getDismissed,
    () => false // server snapshot: 항상 미dismiss 상태로 렌더 후, 마운트 시 재조정
  );

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    // storage 이벤트는 다른 탭에서만 발생 — 같은 탭은 강제 갱신 트리거
    window.dispatchEvent(new StorageEvent('storage', { key: DISMISS_KEY }));
  }, []);

  // 캠페인 비활성화 시 렌더 안 함
  if (!OH_YOON_TERRACOTTA_EXHIBITION.active) return null;

  // dismiss된 경우 숨김
  if (dismissed) return null;

  // 참여 페이지에서는 배너 숨김 (중복 방지)
  if (pathname === '/dashboard/fundraiser') return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary-surface px-4 py-3 text-sm">
      <span className="shrink-0 text-base" aria-hidden="true">
        🌱
      </span>
      <span className="min-w-0 flex-1 text-charcoal-deep">{t('bannerText')}</span>
      <Link
        href="/dashboard/fundraiser"
        className="shrink-0 font-medium text-primary-strong underline-offset-2 hover:underline"
      >
        {t('bannerCta')}
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('bannerDismiss')}
        className="shrink-0 text-charcoal-soft transition-colors hover:text-charcoal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}
