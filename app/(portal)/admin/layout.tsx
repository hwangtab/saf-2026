import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { requireAdmin } from '@/lib/auth/guards';
import { getDeploymentId } from '@/lib/deployment';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminDesktopNav } from './admin-desktop-nav';
import PortalShell from '@/components/layout/PortalShell';
import { getWebVitalsRegressionCount } from '@/app/actions/admin-analytics';
import { getAdminNotifications } from '@/app/actions/admin-notifications';
import { getAdminNavBadges } from '@/app/actions/admin-nav-badges';
import { AdminNotificationBell } from './_components/AdminNotificationBell';
import { AdminGlobalSearch } from './_components/AdminGlobalSearch';
import AdminDeploymentRefresh from './_components/AdminDeploymentRefresh';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations('admin.common');
  const deploymentId = getDeploymentId();
  // 세 fetch 병렬 — regressionCount는 nav dot, notifications는 벨, navBadges는 nav 처리대기 뱃지.
  const [regressionCount, notifications, navBadges] = await Promise.all([
    getWebVitalsRegressionCount(),
    getAdminNotifications().catch(() => [] as Awaited<ReturnType<typeof getAdminNotifications>>),
    getAdminNavBadges().catch(() => ({
      pendingReview: 0,
      ordersActionNeeded: 0,
      openFeedback: 0,
    })),
  ]);

  // nav item href → 처리 대기 건수. NavDropdown이 이 맵을 읽어 그룹/항목 뱃지를 표시.
  const navItemBadges: Record<string, number> = {
    '/admin/users?status=pending': navBadges.pendingReview,
    '/admin/orders': navBadges.ordersActionNeeded,
    '/admin/feedback': navBadges.openFeedback,
  };
  return (
    <PortalShell
      title="SAF Admin"
      mobileNav={
        <Suspense fallback={null}>
          <AdminMobileNav regressionCount={regressionCount} badges={navItemBadges} />
        </Suspense>
      }
      nav={
        <Suspense fallback={null}>
          <AdminDesktopNav regressionCount={regressionCount} badges={navItemBadges} />
        </Suspense>
      }
      badge={
        <span className="hidden sm:inline-flex mr-1 rounded-full bg-primary-surface px-3 py-1 text-xs font-semibold text-primary-strong ring-1 ring-inset ring-primary-a11y/20 whitespace-nowrap">
          {t('modeLabel')}
        </span>
      }
      rightSlot={
        <div className="flex items-center gap-2">
          <AdminGlobalSearch />
          <AdminNotificationBell notifications={notifications} />
        </div>
      }
    >
      <AdminDeploymentRefresh deploymentId={deploymentId} />
      {children}
    </PortalShell>
  );
}
