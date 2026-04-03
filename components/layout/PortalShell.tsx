import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import FeedbackButton from '@/components/feedback/FeedbackButton';

interface PortalShellProps {
  title: string;
  titleHref: string;
  nav: React.ReactNode;
  mobileNav?: React.ReactNode;
  badge?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export default function PortalShell({
  title,
  titleHref,
  nav,
  mobileNav,
  badge,
  rightSlot,
  children,
}: PortalShellProps) {
  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-portal" />
      <nav className="fixed left-0 top-0 z-30 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              {mobileNav && <div className="xl:hidden">{mobileNav}</div>}
              <div className="flex shrink-0 items-center ml-2 sm:ml-0">
                <Link href={titleHref} className="text-xl font-bold text-slate-900">
                  {title}
                </Link>
              </div>
              {nav}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {badge}
              {rightSlot}
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
      <FeedbackButton />
    </div>
  );
}
