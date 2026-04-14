import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 인증 세션 갱신이 필요한 경로만 매칭:
     * - 포탈 (admin, dashboard, exhibitor)
     * - 인증 관련 (login, signup, onboarding)
     * - checkout (로그인 사용자 식별)
     * - API routes (인증 필요한 것들)
     *
     * 제외: 정적 파일, 이미지, 공개 페이지
     */
    '/admin/:path*',
    '/dashboard/:path*',
    '/exhibitor/:path*',
    '/login',
    '/signup',
    '/onboarding/:path*',
    '/checkout/:path*',
    '/api/:path*',
  ],
};
