import Link from 'next/link';
import { requireExhibitor } from '@/lib/auth/guards';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AdminBadge } from '@/app/admin/_components/admin-ui';
import ExhibitorNav from './exhibitor-nav';

export default async function ExhibitorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireExhibitor();

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_38%,#f1f5f9_100%)]" />
      <nav className="fixed left-0 top-0 z-30 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <div className="flex shrink-0 items-center">
                <Link href="/exhibitor" className="text-xl font-bold text-slate-900">
                  SAF Exhibitor
                </Link>
              </div>
              <ExhibitorNav />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <AdminBadge tone="warning" className="hidden sm:inline-flex">
                전시 파트너 모드
              </AdminBadge>
              <span className="hidden max-w-[220px] truncate text-sm text-slate-500 sm:inline">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-16 max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
        {children}
      </main>
    </div>
  );
}
