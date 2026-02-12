import { requireArtistActive } from '@/lib/auth/guards';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import DashboardNav from './dashboard-nav';
import { AdminBadge } from '@/app/admin/_components/admin-ui';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Guard: Protects all dashboard routes
  // Checks if user is logged in AND is an active artist
  const user = await requireArtistActive();

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_38%,#f1f5f9_100%)]" />
      <nav className="fixed left-0 top-0 z-30 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard/artworks" className="text-xl font-bold text-slate-900">
                  SAF Artist
                </Link>
              </div>
              <DashboardNav />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AdminBadge tone="success" className="hidden sm:inline-flex">
                아티스트 모드
              </AdminBadge>
              <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-16 max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-14">
        {children}
      </main>
    </div>
  );
}
