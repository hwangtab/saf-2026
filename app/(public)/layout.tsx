import { Suspense } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import PageLoader from '@/components/common/PageLoader';
import PageTransition from '@/components/common/PageTransition';
import AnimationProvider from '@/components/providers/AnimationProvider';
import ToastProvider from '@/components/providers/ToastProvider';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
