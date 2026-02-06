import { requireAdmin } from '@/lib/auth/guards';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AdminMobileNav } from './admin-mobile-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0 left-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <AdminMobileNav />
              <div className="flex-shrink-0 flex items-center ml-2 sm:ml-0">
                <Link href="/admin/users" className="text-xl font-bold text-indigo-600">
                  SAF Admin
                </Link>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/admin/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  대시보드
                </Link>
                <Link
                  href="/admin/users"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  사용자 관리
                </Link>
                <Link
                  href="/admin/content"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  콘텐츠 관리
                </Link>
                <Link
                  href="/admin/artists"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  작가 관리
                </Link>
                <Link
                  href="/admin/artworks"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  작품 관리
                </Link>
                <Link
                  href="/admin/logs"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  활동 로그
                </Link>
              </div>
            </div>
            <div className="hidden sm:flex items-center">
              <span className="text-sm text-gray-500 mr-4">관리자 모드</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto pt-6 pb-8 px-4 sm:px-6 lg:px-8 mt-16">{children}</main>
    </div>
  );
}
