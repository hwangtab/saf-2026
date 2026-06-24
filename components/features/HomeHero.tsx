import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import SafeImage from '@/components/common/SafeImage';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import { BRAND_COLORS } from '@/lib/colors';
import { Link } from '@/i18n/navigation';
import { getHeroSlides, resolveHeroSoftTreatment } from '@/lib/now-showing';
import type { HeroImageQualityMap } from '@/lib/now-showing';
import heroImageQuality from '@/lib/hero-image-quality.generated.json';
import { getLiveStats } from '@/lib/live-stats';

/**
 * 홈 hero — CSS-only 크로스페이드 autoplay (최대 3장) + 고정 캠페인 메시지.
 *
 * **회귀 trauma 회피 (2026-06-24, HomeHero 단일→autoplay 복귀)**:
 * 과거 embla(JS carousel) hero에서 PSI mobile 4x throttle 회귀 5종 발생(LCP/TBT/reflow).
 * 본 구현은 그 원인(JS carousel + hydration + idleCallback + forced reflow)을 회피하는
 * **순수 CSS @keyframes autoplay** — `'use client'` 없음, hydration 0, opacity-only(컴포지터).
 *
 * - 슬라이드를 absolute로 겹쳐 쌓고 animate-hero-crossfade-{2,3} + 음수 animation-delay로 순환.
 * - 1번 슬라이드: opacity:1 시작 + fetchPriority="high" → 단일 확정 LCP element 유지.
 * - 2·3번: 기본 opacity:0(reduced-motion·첫 페인트 안전) + fetchPriority="low".
 * - 켄번스(transform)는 슬라이드 내부 이미지에 별도 적용(opacity와 분리).
 * - 텍스트·CTA는 getHeroSlides와 무관한 범용 캠페인 메시지로 고정(home.hero.*), CTA → /artworks.
 *
 * 활성 슬라이드가 1장이면 크로스페이드 클래스 없이 정적 = 폐기 전 단일 hero와 동일.
 */
export default async function HomeHero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  const slides = getHeroSlides();
  const { artistCount, artworkCount } = await getLiveStats();

  const status = t('campaignStatus');
  const title = t('campaignTitle', { artistCount, artworkCount });
  const desc = t('campaignDesc', { artistCount, artworkCount });
  const cta = t('campaignCta');

  const slideCount = slides.length;
  // 1장은 정적(크로스페이드 없음). 2장/3장만 autoplay. delay step은 keyframe 주기/장수.
  const crossfadeClass =
    slideCount >= 3
      ? 'animate-hero-crossfade-3'
      : slideCount === 2
        ? 'animate-hero-crossfade-2'
        : '';
  const delayStep = slideCount >= 3 ? 6 : 7; // seconds (Task 2 keyframe 주기와 일치)

  return (
    <section
      aria-label="Hero"
      className="relative min-h-[70svh] md:min-h-[85svh] overflow-hidden bg-charcoal-deep"
    >
      {/* Header 투명화 sentinel — PageHero와 동일 패턴(헤더 IntersectionObserver 관찰 대상). */}
      <div
        data-hero-sentinel="true"
        aria-hidden="true"
        className="absolute top-0 left-0 h-px w-px"
      />

      <Link href="/artworks" className="block h-full" aria-label={`${title} — ${cta}`}>
        {/* 슬라이드 레이어 — 겹쳐 쌓아 opacity 크로스페이드. 첫 장만 보이는 상태로 시작. */}
        {slides.map((slide, i) => {
          const soft = resolveHeroSoftTreatment(slide, heroImageQuality as HeroImageQualityMap);
          return (
            <div
              key={slide.slug}
              aria-hidden={i > 0 ? 'true' : undefined}
              className={clsx('absolute inset-0', crossfadeClass)}
              style={{
                // 기본 opacity: 첫 장 1, 나머지 0 → reduced-motion(애니 0.01ms)·첫 페인트에서도
                // 첫 장만 노출되어 LCP 안전. 애니메이션이 이 기본값을 override.
                opacity: i === 0 ? 1 : 0,
                animationDelay: crossfadeClass ? `-${i * delayStep}s` : undefined,
              }}
            >
              <SafeImage
                src={slide.imageUrl}
                alt={i === 0 ? title : ''}
                fill
                priority={i === 0}
                fetchPriority={i === 0 ? 'high' : 'low'}
                quality={60}
                sizes="100vw"
                className="object-cover animate-ken-burns"
              />
              {/* 저해상도 작품 비네팅(soft) — 가장자리를 radial로 묻고 중앙 작품은 살림. */}
              {soft && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse at center, transparent 38%, ${BRAND_COLORS.charcoal.deep}b3 100%)`,
                  }}
                />
              )}
            </div>
          );
        })}

        {/* 다크 그라디언트 — 전역 단일. 상/하단 텍스트 가독성 확보, 중앙은 옅게 작품 노출. */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/85 via-charcoal-deep/30 to-charcoal-deep/70" />

        {/* 텍스트 블록 — 고정 캠페인 메시지. */}
        <div className="relative z-10 flex h-full min-h-[70svh] md:min-h-[85svh] flex-col items-center justify-center px-4 pt-24 pb-32 md:pb-40 text-center text-white">
          <span className="animate-hero-reveal mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-white backdrop-blur-sm">
            {status}
          </span>
          {/* h1은 reveal 애니 제외 — 텍스트 LCP 후보가 opacity:0 시작이면 LCP 밀릴 수 있어 즉시 완성. */}
          <h1 className="text-hero text-white mb-5 drop-shadow-lg break-keep text-balance max-w-4xl whitespace-pre-line">
            {title}
          </h1>
          <p className="animate-hero-reveal [animation-delay:220ms] text-body-large text-white/90 mb-8 max-w-2xl break-keep text-balance">
            {desc}
          </p>
          {/* CTA — solid primary-strong(6.98:1 AA). CLAUDE.md 색 규칙 준수. */}
          <span className="animate-hero-reveal [animation-delay:330ms] inline-flex items-center gap-2 rounded-lg bg-primary-strong px-7 py-3 text-base md:text-lg font-bold text-white shadow-lg transition-colors hover:bg-white hover:text-primary-strong">
            {cta}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
      </Link>

      {/* Sawtooth — 다음 섹션(MasterArtists) 배경(canvas-soft)으로 톱니 채움. */}
      <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
    </section>
  );
}
