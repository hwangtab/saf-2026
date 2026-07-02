'use client';

import LinkButton from '@/components/ui/LinkButton';

/**
 * 공개 출품 랜딩의 "출품하러 가기" 버튼.
 * 클릭 시 '출품 의도' 쿠키(불리언 플래그)를 심고 /dashboard/fundraiser로 이동한다.
 * - 로그인 상태면 가드를 통과해 바로 참여 화면.
 * - 로그아웃 상태면 가드가 /login으로 보내고, 로그인 성공 시 login/OAuth-callback이
 *   이 쿠키를 보고 /dashboard/fundraiser로 안내한다(쿠키 없으면 기존 동작과 100% 동일).
 * 쿠키는 경로 하드코딩(플래그만 저장)이라 open-redirect 위험이 없다. 10분 만료.
 */
export default function FundraiserSubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <LinkButton
      href="/dashboard/fundraiser"
      variant="primary"
      onClick={() => {
        document.cookie = 'fundraiser_submit_intent=1; path=/; max-age=600; samesite=lax';
      }}
    >
      {children}
    </LinkButton>
  );
}
