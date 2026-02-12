import { requireArtistActive } from '@/lib/auth/guards';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import DashboardNav from './dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Guard: Protects all dashboard routes
  // Checks if user is logged in AND is an active artist
  const user = await requireArtistActive();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0 left-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  SAF Dashboard
                </Link>
              </div>
              <DashboardNav />
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-4">{user.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mt-16 max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
