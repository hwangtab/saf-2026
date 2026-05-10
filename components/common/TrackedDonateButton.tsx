'use client';

import LinkButton from '@/components/ui/LinkButton';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics/track';
import type { ButtonStyleProps, IconLayout } from '@/components/ui/button-base';

interface TrackedDonateButtonProps extends ButtonStyleProps {
  children: React.ReactNode;
  /** 어느 위치에서 발화한 클릭인지 — 어드민 패널에서 conversion source 식별. 필수. */
  position: string;
  /** default JOIN_MEMBER. socialfunch 후원 페이지로 가려면 EXTERNAL_LINKS.DONATE 명시. */
  href?: string;
  leadingIcon?: React.ReactNode;
  iconLayout?: IconLayout;
  className?: string;
}

/**
 * 조합원 가입 CTA — 자동 `member_join_click` 트래킹.
 *
 * server component(homepage·transparency·our-proof·archive 등)에서 LinkButton을 직접
 * 쓰면 onClick으로 트래킹을 못 박는다. 이 컴포넌트는 'use client'라 onClick 가능.
 *
 * 후원함(socialfunch)은 이미 종료된 캠페인이라 측정 대상 아님. 단일 conversion target은
 * 조합원 가입 폼(JOIN_MEMBER). `position` prop은 필수 — admin 패널의 position 분포에서
 * 호출처를 식별. 같은 position이 여러 호출처에서 쓰이면 분포 무의미.
 */
export default function TrackedDonateButton({
  children,
  position,
  href = EXTERNAL_LINKS.JOIN_MEMBER,
  variant,
  size,
  leadingIcon,
  iconLayout,
  className,
}: TrackedDonateButtonProps) {
  const handleClick = () => {
    trackEvent('member_join_click', {
      position,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  };

  return (
    <LinkButton
      href={href}
      external
      variant={variant}
      size={size}
      leadingIcon={leadingIcon}
      iconLayout={iconLayout}
      className={className}
      onClick={handleClick}
    >
      {children}
    </LinkButton>
  );
}
