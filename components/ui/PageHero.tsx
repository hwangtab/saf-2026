import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import PageHeroBackground from './PageHeroBackground';
import SawtoothDivider from './SawtoothDivider';
import Breadcrumb from './Breadcrumb';
import type { BreadcrumbItem } from '@/types';

// ... (imports)

interface PageHeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
  /** Custom background image path (e.g., "/images/artworks/1.jpg") */
  customBackgroundImage?: string;
  className?: string;
  /** Color class for the sawtooth divider (default: "text-white") */
  dividerColor?: string;
  id?: string;
  descriptionId?: string;
  breadcrumbItems?: BreadcrumbItem[];
}

/**
 * 다크 hero 섹션 — 모든 서브페이지의 헤더. 하단에 SawtoothDivider position="bottom"이
 * 자동으로 박혀 마지막 24~40px가 톱니 패턴이 됩니다.
 *
 * ⚠️ 중요: 이 PageHero 직후의 Section이 작은 top padding(`pt-0/2/4` 등)으로 시작하면
 * 본문이 톱니 경계에 답답하게 붙습니다. Section 기본 padding(`py-12 md:py-20`)으로 두거나,
 * 명시 override 시 `SAWTOOTH_BOTTOM_SAFE_PADDING` 상수를 사용하세요.
 *
 * @see {@link './SawtoothDivider'.SAWTOOTH_BOTTOM_SAFE_PADDING}
 */

export default function PageHero({
  title,
  description,
  children,
  customBackgroundImage,
  className,
  dividerColor = 'text-white',
  id,
  descriptionId,
  breadcrumbItems,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative min-h-[60vh] flex items-center justify-center pt-12 pb-12 md:pt-20 md:pb-20 overflow-hidden',
        // Gallery White Cube: 다크 hero를 단색 charcoal-deep로 — Apple/Tesla 모델
        'bg-charcoal-deep',
        className
      )}
    >
      <div
        data-hero-sentinel="true"
        aria-hidden="true"
        className="absolute top-0 left-0 h-px w-px"
      />
      {/* 작품 이미지 배경 — customBackgroundImage 지정 시에만 (작가 페이지 등) */}
      {customBackgroundImage && (
        <PageHeroBackground customImage={customBackgroundImage} seed={id || title} />
      )}
      {/* Dark Overlay — 이미지 위 텍스트 가독성 확보, 이미지 없으면 그라디언트 그대로 */}
      {customBackgroundImage && <div className="absolute inset-0 bg-black/60 z-10" />}

      {/* Content */}
      <div className="relative z-10 container-max text-center w-full">
        {breadcrumbItems && breadcrumbItems.length >= 2 && (
          <div className="flex justify-center mb-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        )}
        <h1
          id={id}
          className="font-display font-black text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg break-keep text-balance"
        >
          {title}
        </h1>
        {description && (
          <p
            id={descriptionId}
            className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg text-balance"
          >
            {description}
          </p>
        )}
        {children && <div className="mt-8 flex justify-center">{children}</div>}
      </div>
      <SawtoothDivider position="bottom" colorClass={dividerColor} />
    </section>
  );
}
