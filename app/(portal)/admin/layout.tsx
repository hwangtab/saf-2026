import { requireAdmin } from '@/lib/auth/guards';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminDesktopNav } from './admin-desktop-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_38%,#f1f5f9_100%)]" />
      <nav className="fixed left-0 top-0 z-30 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile Menu Button - Show up to 2xl screens */}
              <div className="2xl:hidden">
                <AdminMobileNav />
              </div>
              <div className="flex-shrink-0 flex items-center ml-2 sm:ml-0">
                <Link href="/admin/dashboard" className="text-xl font-bold text-slate-900">
                  SAF Admin
                </Link>
              </div>
              <AdminDesktopNav />
            </div>
            <div className="hidden sm:flex items-center ml-4">
              <span className="mr-4 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 whitespace-nowrap">
                관리자 모드
              </span>
              <div className="whitespace-nowrap">
                <SignOutButton />
              </div>
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
