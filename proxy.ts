import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/exhibitor/:path*',
    '/onboarding/:path*',
    '/auth/:path*',
  ],
};
