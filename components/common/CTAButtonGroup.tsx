'use client';

import { Handshake, Palette } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import LinkButton from '@/components/ui/LinkButton';
import { trackEvent } from '@/lib/analytics/track';

interface CTAButtonGroupProps {
  donateText?: string;
  purchaseText?: string;
  donateHref?: string;
  purchaseHref?: string;
  variant?: 'default' | 'large';
  className?: string;
  vertical?: boolean;
  /** 트래킹용 위치 식별자 (ex: 'home-hero', 'about-bottom'). 미지정 시 'cta-group'. */
  trackingPosition?: string;
}

/**
 * CTA Button Group - Donate & Purchase buttons
 *
 * Standardized component for displaying call-to-action buttons
 * for donations and artwork purchases across different pages.
 *
 * @example
 * ```tsx
 * <CTAButtonGroup />
 * <CTAButtonGroup variant="large" />
 * <CTAButtonGroup vertical className="max-w-md" />
 * ```
 */
export default function CTAButtonGroup({
  donateText,
  purchaseText,
  donateHref = EXTERNAL_LINKS.JOIN_MEMBER,
  purchaseHref = '/artworks',
  variant = 'default',
  className,
  vertical = false,
  trackingPosition = 'cta-group',
}: CTAButtonGroupProps) {
  const tCta = useTranslations('cta');
  const resolvedDonateText = donateText ?? tCta('donateNow');
  const resolvedPurchaseText = purchaseText ?? tCta('buyArt');

  const containerClasses = cn(
    'flex gap-4',
    vertical ? 'flex-col' : 'flex-col sm:flex-row',
    className
  );

  const buttonSize = variant === 'large' ? 'lg' : 'md';
  const isDonateExternal = donateHref?.startsWith('http');
  const isPurchaseExternal = purchaseHref?.startsWith('http');

  // 후원함(socialfunch)은 종료된 캠페인 — 조합원 가입(JOIN_MEMBER)만 단일 conversion target.
  // prop 이름 `donateHref`는 historical naming(미변경 회피)이지만 실제 의미는 가입 폼 이동.
  const handleDonateClick = () => {
    trackEvent('member_join_click', {
      position: trackingPosition,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  };

  return (
    <div className={containerClasses}>
      <LinkButton
        href={donateHref}
        external={isDonateExternal}
        variant="primary"
        size={buttonSize}
        leadingIcon={<Handshake className="h-5 w-5" />}
        onClick={handleDonateClick}
      >
        {resolvedDonateText}
      </LinkButton>
      <LinkButton
        href={purchaseHref}
        external={isPurchaseExternal}
        variant="secondary"
        size={buttonSize}
        leadingIcon={<Palette className="h-5 w-5" />}
      >
        {resolvedPurchaseText}
      </LinkButton>
    </div>
  );
}
