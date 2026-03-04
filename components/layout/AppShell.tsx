'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import PageLoader from '@/components/common/PageLoader';
import ToastProvider from '@/components/providers/ToastProvider';
import { isProtectedSurfacePath } from '@/lib/path-rules';

const Header = dynamic(() => import('@/components/common/Header'));
const Footer = dynamic(() => import('@/components/common/Footer'));
const PageTransition = dynamic(() => import('@/components/common/PageTransition'));
const AnimationProvider = dynamic(() => import('@/components/providers/AnimationProvider'));

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortalPath = isProtectedSurfacePath(pathname);

  if (isPortalPath) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <AnimationProvider>
      <ToastProvider>
        <a href="#main-content" className="skip-to-main">
          메인 콘텐츠로 이동
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          <PageTransition>
            <Suspense fallback={<PageLoader />}>{children}</Suspense>
          </PageTransition>
        </main>
        <Footer />
      </ToastProvider>
    </AnimationProvider>
  );
}
