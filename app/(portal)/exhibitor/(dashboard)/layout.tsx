import { requireExhibitor } from '@/lib/auth/guards';
import { AdminBadge } from '@/app/admin/_components/admin-ui';
import ExhibitorNav from './exhibitor-nav';
import PortalShell from '@/components/layout/PortalShell';
import { getTranslations } from 'next-intl/server';

export default async function ExhibitorLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('exhibitor');
  const user = await requireExhibitor();

  return (
    <PortalShell
      title="SAF Exhibitor"
      titleHref="/exhibitor"
      nav={<ExhibitorNav />}
      badge={
        <AdminBadge tone="warning" className="hidden sm:inline-flex">
          {t('modeLabel')}
        </AdminBadge>
      }
      rightSlot={
        <span className="hidden max-w-[220px] truncate text-sm text-gray-500 sm:inline">
          {user.email}
        </span>
      }
    >
      {children}
    </PortalShell>
  );
}
