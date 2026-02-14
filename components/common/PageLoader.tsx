'use client';

import { usePathname } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const isProtectedSurface =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/exhibitor');

  return (
    <div
      className={
        isProtectedSurface
          ? 'relative flex min-h-screen w-full items-center justify-center bg-[var(--admin-bg)]'
          : 'flex w-full items-center justify-center'
      }
      style={isProtectedSurface ? undefined : { minHeight: 'calc(100vh - 200px)' }}
    >
      {isProtectedSurface && (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_38%,#f1f5f9_100%)]" />
      )}
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full animate-spin [animation-duration:0.8s] border-t-transparent"></div>
      </div>
    </div>
  );
}
