import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { requireAdmin } from '@/lib/auth/guards';
import { getDeploymentId } from '@/lib/deployment';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminDesktopNav } from './admin-desktop-nav';
import PortalShell from '@/components/layout/PortalShell';
import { getWebVitalsRegressionCount } from '@/app/actions/admin-analytics';
import { getAdminNotifications } from '@/app/actions/admin-notifications';
import { AdminNotificationBell } from './_components/AdminNotificationBell';
import AdminDeploymentRefresh from './_components/AdminDeploymentRefresh';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations('admin.common');
  const deploymentId = getDeploymentId();
  // 두 fetch를 병렬로 — regressionCount는 nav dot, notifications는 벨 드롭다운.
  const [regressionCount, notifications] = await Promise.all([
    getWebVitalsRegressionCount(),
    getAdminNotifications().catch(() => [] as Awaited<ReturnType<typeof getAdminNotifications>>),
  ]);
  return (
    <PortalShell
      title="SAF Admin"
      mobileNav={
        <Suspense fallback={null}>
          <AdminMobileNav regressionCount={regressionCount} />
        </Suspense>
      }
      nav={
        <Suspense fallback={null}>
          <AdminDesktopNav regressionCount={regressionCount} />
        </Suspense>
      }
      badge={
        <span className="hidden sm:inline-flex mr-1 rounded-full bg-primary-surface px-3 py-1 text-xs font-semibold text-primary-strong ring-1 ring-inset ring-primary-a11y/20 whitespace-nowrap">
          {t('modeLabel')}
        </span>
      }
      rightSlot={<AdminNotificationBell notifications={notifications} />}
    >
      <AdminDeploymentRefresh deploymentId={deploymentId} />
      {children}
    </PortalShell>
  );
}
