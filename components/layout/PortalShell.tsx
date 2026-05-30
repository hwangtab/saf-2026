import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import { SignOutButton } from '@/components/auth/SignOutButton';
import FeedbackButton from '@/components/feedback/FeedbackButton';

interface PortalShellProps {
  /** 로고 alt / 스크린리더용 포털 식별 라벨 (예: "SAF Artist") — 화면에는 로고 이미지가 노출됨 */
  title: string;
  nav: React.ReactNode;
  mobileNav?: React.ReactNode;
  badge?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export default function PortalShell({
  title,
  nav,
  mobileNav,
  badge,
  rightSlot,
  children,
}: PortalShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-portal" />
      <nav className="fixed left-0 top-0 z-30 w-full border-b border-gray-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              {mobileNav && <div className="xl:hidden">{mobileNav}</div>}
              <div className="flex shrink-0 items-center ml-2 sm:ml-0">
                {/* 로고 클릭 시 씨앗페 공개 메인(/)으로 이동 */}
                <Link
                  href="/"
                  className="flex items-center rounded transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <SafeImage
                    src="/images/logo/320pxX90px.webp"
                    alt={title}
                    width={160}
                    height={45}
                    className="h-9 w-auto object-contain"
                  />
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
