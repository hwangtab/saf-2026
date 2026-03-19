import { requireArtistActive } from '@/lib/auth/guards';
import DashboardNav from './dashboard-nav';
import { AdminBadge } from '@/app/admin/_components/admin-ui';
import PortalShell from '@/components/layout/PortalShell';
import { getTranslations } from 'next-intl/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('dashboard');
  const user = await requireArtistActive();

  return (
    <PortalShell
      title="SAF Artist"
      titleHref="/dashboard/artworks"
      nav={<DashboardNav />}
      badge={
        <AdminBadge tone="success" className="hidden sm:inline-flex">
          {t('modeLabel')}
        </AdminBadge>
      }
      rightSlot={<span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>}
    >
      {children}
    </PortalShell>
  );
}
