import Link from 'next/link';
import { requireExhibitor } from '@/lib/auth/guards';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function ExhibitorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireExhibitor();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-canvas">
      <aside className="w-full md:w-64 bg-white border-r border-stone-200 flex-shrink-0">
        <div className="p-6 border-b border-stone-100">
          <Link href="/exhibitor" className="text-xl font-bold text-primary">
            SAF Exhibitor
          </Link>
          <div className="mt-2 text-sm text-stone-500 truncate">{user.email}</div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/exhibitor"
            className="flex items-center px-4 py-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors font-medium"
          >
            대시보드
          </Link>
          <Link
            href="/exhibitor/artists"
            className="flex items-center px-4 py-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors font-medium"
          >
            작가 관리
          </Link>
          <Link
            href="/exhibitor/artworks"
            className="flex items-center px-4 py-3 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors font-medium"
          >
            작품 관리
          </Link>
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="px-4 py-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
