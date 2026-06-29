import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import SafeImage from '@/components/common/SafeImage';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import { BRAND_COLORS } from '@/lib/colors';
import { Link } from '@/i18n/navigation';
import { getCardStatus, getHeroSlide, resolveHeroSoftTreatment } from '@/lib/now-showing';
import type { HeroImageQualityMap } from '@/lib/now-showing';
import heroImageQuality from '@/lib/hero-image-quality.generated.json';
import { getLiveStats } from '@/lib/live-stats';

/**
 * 홈 hero — 단일 정적 LCP 이미지 + 캠페인 메시지.
 *
 * **회귀 trauma 회피 설계 (2026-05-12, HeroSpotlight 폐기 후속)**:
 * 과거 hero 슬라이더(embla)에서 PSI mobile 4x throttle 환경 회귀 4종 발생 —
 * (1) server island + carousel overlay → LCP +1.5s (DOM 노드 교체)
 * (2) embla idleCallback lazy → TBT +1070ms
 * (3) DOM enhance (server + client enhancer) → Element render delay +1600ms (vanilla embla forced reflow)
 * (4) Pretendard `preload: false` → TBT +260ms
 *
 * 본질 해결책: **client carousel 자체를 hero에서 제거하고 단일 정적 hero로 대체**.
 * - `'use client'` 없음 — 순수 server component
 * - hydration 0
 * - 단일 LCP element = SafeImage (fetchPriority="high")
 * - h1 = 캠페인 정체성 메시지 (`slide.title`)
 *
 * 고정 히어로 (2026-06-29 PM): `getHeroSlide()`는 `heroOnly` 항목(`all-artworks`)을 항상 반환.
 * 큐레이션 자동전환은 폐지됐고, 특별전은 fold-below `NowShowing` 그리드가 전담한다.
 *
 * Header 투명화: `<div data-hero-sentinel="true">` 마커가 lib/hero-routes.ts isHeroRoute 와
 * 별개로 헤더 IntersectionObserver의 sentinel로 동작 (PageHero와 동일 패턴).
 *
 * Sawtooth: position="bottom" — 다음 섹션(NowShowing)이 충분한 top padding(py-16 md:py-20)을
 * 가지므로 SAWTOOTH_BOTTOM_SAFE_PADDING 별도 적용 불필요.
 */
export default async function HomeHero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.nowShowing' });
  const slide = getHeroSlide();
  const softTreatment = resolveHeroSoftTreatment(slide, heroImageQuality as HeroImageQualityMap);
  const slideStatus = getCardStatus(slide);
  const { artistCount, artworkCount } = await getLiveStats();

  const status = t(`${slide.i18nKey}Status` as 'allArtworksStatus');
  const title = t(`${slide.i18nKey}Title` as 'allArtworksTitle', {
    artistCount,
    artworkCount,
  });
  const desc = t(`${slide.i18nKey}Desc` as 'allArtworksDesc', { artistCount, artworkCount });
  const cta = t(`${slide.i18nKey}Cta` as 'allArtworksCta');

  const inner = (
    <>
      {/* LCP element — 단일 정적 작품 이미지.
          - priority + fetchPriority="high": next/image priority가 자동으로 박지만 PSI 진단에서
            누락 신호가 잡힌 적이 있어 명시. Vercel Edge가 자동으로 `<link rel="preload" as="image">`
            를 HTML head에 삽입.
          - quality=60: 다크 그라디언트가 위에 깔리고 텍스트 가독성을 위해 어둡게 보이므로 압축에
            가장 둔감. PSI "이미지 압축률" 항목 완화.
          - sizes="100vw": 풀폭 hero. */}
      <SafeImage
        src={slide.imageUrl}
        alt={title}
        fill
        priority
        fetchPriority="high"
        quality={60}
        sizes="100vw"
        className="object-cover animate-ken-burns"
      />

      {/* 저해상도/흐린 작품 사진(softTreatment) 비네팅 — 블러는 작품을 죽이므로 폐기(2026-06-17 PM).
          가장자리(업스케일 깨짐이 가장 잘 드러나는 곳)를 radial로 어둡게 묻고 중앙 작품은 살린다.
          색은 charcoal.deep(#1F2428) + alpha hex(b3≈70%) — Tailwind에 radial gradient arbitrary가
          없어 inline style + BRAND_COLORS 참조(차트·런타임 hex 정책). 정상 해상도면 미렌더. */}
      {softTreatment && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 38%, ${BRAND_COLORS.charcoal.deep}b3 100%)`,
          }}
        />
      )}

      {/* 다크 그라디언트 — 작품 이미지 가시성 우선. PM 결정(2026-05-13): primary-strong 베일은
          작품 색감을 해친다 → 단일 charcoal-deep tonal로 복귀. 상단/하단만 텍스트 가독성 확보,
          중간은 옅어 작품이 그대로 노출. softTreatment면 중앙(via)을 진하게 해 추가로 어둡게. */}
      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-b from-charcoal-deep/85 to-charcoal-deep/70',
          softTreatment ? 'via-charcoal-deep/55' : 'via-charcoal-deep/30'
        )}
      />

      {/* 텍스트 블록 — 중앙 정렬, hero 톤 */}
      <div className="relative z-10 flex h-full min-h-[70svh] md:min-h-[85svh] flex-col items-center justify-center px-4 pt-24 pb-32 md:pb-40 text-center text-white">
        <span
          className={`animate-hero-reveal mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
            slideStatus === 'on'
              ? 'bg-success/90 text-white'
              : 'bg-white/15 text-white backdrop-blur-sm'
          }`}
        >
          {slideStatus === 'on' && (
            <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          )}
          {status}
        </span>
        {/* h1은 reveal 애니 제외 — LCP element 후보(텍스트)가 opacity:0에서 시작하면 LCP가
            밀릴 수 있어 이론적 리스크를 0으로. 제목은 즉시 완성, 주변(뱃지·desc·CTA)만 staggered. */}
        <h1 className="text-hero text-white mb-5 drop-shadow-lg break-keep text-balance max-w-4xl whitespace-pre-line">
          {title}
        </h1>
        <p className="animate-hero-reveal [animation-delay:220ms] text-body-large text-white/90 mb-8 max-w-2xl break-keep text-balance">
          {desc}
        </p>
        {/* Variant B(2026-06-17, PM 패널 #5): ghost → solid primary CTA로 행동 유도 강화.
            bg-primary-strong (6.98:1 AA) — CLAUDE.md 색 규칙(bg-primary+text-white small text 금지) 준수.
            hover는 white 반전으로 AA 유지. */}
        <span
          className={`animate-hero-reveal [animation-delay:330ms] inline-flex items-center gap-2 rounded-lg px-7 py-3 text-base md:text-lg font-bold shadow-lg transition-colors ${
            slide.href
              ? 'bg-primary-strong text-white hover:bg-white hover:text-primary-strong'
              : 'bg-white/20 text-white'
          }`}
        >
          {cta}
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </>
  );

  return (
    <section
      aria-label="Hero"
      className="relative min-h-[70svh] md:min-h-[85svh] overflow-hidden bg-charcoal-deep"
    >
      {/* Header 투명화 sentinel — PageHero와 동일 패턴. lib/hero-routes.ts isHeroRoute('/')는
          홈 경로용으로 별도 등록되어 있지 않지만, 헤더 IntersectionObserver는 이 sentinel을
          관찰해 페이지 상단에서 투명/스크롤 후 솔리드로 전환. */}
      <div
        data-hero-sentinel="true"
        aria-hidden="true"
        className="absolute top-0 left-0 h-px w-px"
      />

      {slide.href ? (
        <Link href={slide.href} className="block h-full" aria-label={`${title} — ${cta}`}>
          {inner}
        </Link>
      ) : (
        // 비활성 CTA — 실제 nav는 일어나지 않으므로 링크 역할을 부여하지 않는다.
        <div
          aria-disabled="true"
          aria-label={`${title} — ${cta}`}
          className="block h-full cursor-not-allowed"
        >
          {inner}
        </div>
      )}

      {/* Sawtooth divider — 다음 섹션(NowShowing)이 canvas-soft 배경이므로 그 색으로 톱니 채움. */}
      <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
    </section>
  );
}
