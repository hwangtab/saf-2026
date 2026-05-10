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
 * 후원/가입 CTA — 자동 `donate_click` 트래킹.
 *
 * server component(homepage·transparency·our-proof·archive 등)에서 LinkButton을 직접
 * 쓰면 onClick으로 트래킹을 못 박는다. 이 컴포넌트는 'use client'라 onClick 가능 +
 * `target` 파라미터(donate vs join_member)는 href로 자동 분기.
 *
 * `position` prop은 필수 — admin 패널의 position×target 분포에서 호출처를 식별하기 위함.
 * 같은 position이 여러 호출처에서 쓰이면 분포가 의미 없어짐. 호출처마다 고유 식별자 부여.
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
  const target =
    href === EXTERNAL_LINKS.DONATE
      ? 'donate'
      : href === EXTERNAL_LINKS.JOIN_MEMBER
        ? 'join_member'
        : 'other';

  const handleClick = () => {
    trackEvent('donate_click', {
      position,
      target,
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
