import { requireArtistActive } from '@/lib/auth/guards';
import DashboardNav from './dashboard-nav';
import { AdminBadge } from '@/app/admin/_components/admin-ui';
import PortalShell from '@/components/layout/PortalShell';
import { getServerLocale } from '@/lib/server-locale';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const modeLabel = locale === 'en' ? 'Artist Mode' : '아티스트 모드';
  const user = await requireArtistActive();

  return (
    <PortalShell
      title="SAF Artist"
      titleHref="/dashboard/artworks"
      nav={<DashboardNav />}
      badge={
        <AdminBadge tone="success" className="hidden sm:inline-flex">
          {modeLabel}
        </AdminBadge>
      }
      rightSlot={<span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>}
    >
      {children}
    </PortalShell>
  );
}
