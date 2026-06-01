'use client';

import { Link, usePathname } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface HeaderLogoProps {
  isDarkText: boolean;
}

export default function HeaderLogo({ isDarkText }: HeaderLogoProps) {
  const tA11y = useTranslations('a11y');
  const pathname = usePathname();
  // next-intl usePathname()은 locale prefix를 제거한 경로 반환 — '/' = 홈.
  const isHome = pathname === '/';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 홈에 있을 때 로고 클릭은 next.js Link가 no-op이라 사용자가 무반응으로 인식.
    // prevent + smooth scroll-to-top으로 "맨 위로 이동" 의도 만족.
    // prefers-reduced-motion: reduce인 사용자는 브라우저가 자동으로 instant 처리.
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      // 로고는 모든 페이지 chrome — viewport에 항상 들어오므로 prefetch 시
      // 홈 RSC payload(~35KB)가 routes 이동 없이 매번 fetch. PSI mobile network
      // audit에서 home self-prefetch가 138KB 차지. 로고 클릭은 사용자 의도적 행동이라
      // 100~300ms 지연 허용 가능. (카드 5 — RSC prefetch 축소)
      prefetch={false}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
    >
      <div className="relative h-9 w-40">
        {/*
          로고는 LCP element가 아니므로 priority 제거. 라이트/white 두 버전을
          opacity로 cross-fade 하면서 둘 다 priority를 걸면 첫 paint에서 보이지
          않는 쪽 preload가 LCP 히어로 작품 이미지의 모바일 자원 우선순위와
          경합해 LCP를 늦춤. fetchpriority="high" 없이도 webp 160x45 소형 자산은
          충분히 빠르게 로드됨.
        */}
        <SafeImage
          src="/images/logo/320pxX90px.webp"
          alt={tA11y('logoAlt')}
          width={160}
          height={45}
          className={clsx(
            'absolute inset-0 h-9 w-auto object-contain transition-opacity duration-300',
            isDarkText ? 'opacity-100' : 'opacity-0'
          )}
        />
        <span
          aria-hidden="true"
          className={clsx(
            'absolute inset-0 h-9 w-40 bg-[url("/images/logo/320pxX90px_white.webp")] bg-contain bg-left bg-no-repeat transition-opacity duration-300',
            isDarkText ? 'opacity-0' : 'opacity-100'
          )}
        />
      </div>
      <span className="sr-only">{tA11y('homeLink')}</span>
    </Link>
  );
}
