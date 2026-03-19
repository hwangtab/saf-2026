import { requireAdmin } from '@/lib/auth/guards';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminDesktopNav } from './admin-desktop-nav';
import PortalShell from '@/components/layout/PortalShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <PortalShell
      title="SAF Admin"
      titleHref="/admin/dashboard"
      mobileNav={<AdminMobileNav />}
      nav={<AdminDesktopNav />}
      badge={
        <span className="hidden sm:inline-flex mr-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 whitespace-nowrap">
          관리자 모드
        </span>
      }
    >
      {children}
    </PortalShell>
  );
}
