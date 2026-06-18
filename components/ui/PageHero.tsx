import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { BRAND_COLORS } from '@/lib/colors';
import {
  resolvePageHeroSoftTreatment,
  type PageHeroBackgroundTreatment,
  type PageHeroImageQualityMap,
} from '@/lib/page-hero-treatment';
import pageHeroImageQuality from '@/lib/page-hero-image-quality.generated.json';
import PageHeroBackground from './PageHeroBackground';
import SawtoothDivider from './SawtoothDivider';
import Breadcrumb from './Breadcrumb';
import type { BreadcrumbItem } from '@/types';

// ... (imports)

interface PageHeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
  /** Custom background image URL (Supabase Storage URL or /images/* public path) */
  customBackgroundImage?: string;
  /** 저화질/흐린 배경 이미지 보정 모드. 기본 auto는 빌드 타임 해상도 측정 결과를 따른다. */
  backgroundTreatment?: PageHeroBackgroundTreatment;
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
  backgroundTreatment,
  className,
  dividerColor = 'text-white',
  id,
  descriptionId,
  breadcrumbItems,
}: PageHeroProps) {
  const softTreatment = resolvePageHeroSoftTreatment(
    customBackgroundImage,
    backgroundTreatment,
    pageHeroImageQuality as PageHeroImageQualityMap
  );

  return (
    <>
      <section
        className={cn(
          // page-hero-min-h: vh fallback + svh override를 globals.css의 동일 selector에 두 줄로
          // 선언해 CSS cascade를 확정 (Tailwind arbitrary 클래스 2개는 순서 보장 X).
          'page-hero-min-h relative flex items-center justify-center pt-12 pb-12 md:pt-20 md:pb-20 overflow-hidden',
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
          <PageHeroBackground
            customImage={customBackgroundImage}
            seed={id || title}
            alt={title}
            softTreatment={softTreatment}
          />
        )}
        {customBackgroundImage && softTreatment && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10"
            style={{
              background: `radial-gradient(ellipse at center, transparent 36%, ${BRAND_COLORS.charcoal.deep}b8 100%)`,
            }}
          />
        )}
        {/* Dark Overlay — 그라디언트(상하단 진하고 중앙 옅게)로 이미지가 보이면서 텍스트
            가독성도 유지. 균일 black/60은 이미지를 단색처럼 보이게 만들어 hero 추가 의미가
            사라졌던 회귀 차단. 흰 텍스트 + drop-shadow-lg와 결합해 가독성 보장. */}
        {customBackgroundImage && (
          <div
            className={cn(
              'absolute inset-0 z-10 bg-gradient-to-b from-black/55 to-black/55',
              softTreatment ? 'via-black/50' : 'via-black/25'
            )}
          />
        )}

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
              className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg text-balance break-keep"
            >
              {description}
            </p>
          )}
          {children && <div className="mt-8 flex justify-center">{children}</div>}
        </div>
        <SawtoothDivider position="bottom" colorClass={dividerColor} />
      </section>
    </>
  );
}
