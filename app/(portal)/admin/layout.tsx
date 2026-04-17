import { Suspense } from 'react';
import { requireAdmin } from '@/lib/auth/guards';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminDesktopNav } from './admin-desktop-nav';
import PortalShell from '@/components/layout/PortalShell';
import { getTranslations } from 'next-intl/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations('admin.common');
  return (
    <PortalShell
      title="SAF Admin"
      titleHref="/admin/dashboard"
      mobileNav={
        <Suspense fallback={null}>
          <AdminMobileNav />
        </Suspense>
      }
      nav={
        <Suspense fallback={null}>
          <AdminDesktopNav />
        </Suspense>
      }
      badge={
        <span className="hidden sm:inline-flex mr-1 rounded-full bg-primary-surface px-3 py-1 text-xs font-semibold text-primary-strong ring-1 ring-inset ring-primary-a11y/20 whitespace-nowrap">
          {t('modeLabel')}
        </span>
      }
    >
      {children}
    </PortalShell>
  );
}
