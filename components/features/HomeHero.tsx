import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import { Link } from '@/i18n/navigation';
import { getCardStatus, getHeroSlide } from '@/lib/now-showing';
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
 * 특별전 자동 교체: `getHeroSlide()`가 `heroPriority` 최대값을 선택.
 * 평상시엔 강석태 fallback("예술인 동료를 위해 내놓은 작품"), 특별전 활성 시 자동 교체.
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
        className="object-cover"
      />

      {/* 다크 그라디언트 — 작품 이미지 가시성 우선. PM 결정(2026-05-13): primary-strong 베일은
          작품 색감을 해친다 → 단일 charcoal-deep tonal로 복귀. 상단/하단만 텍스트 가독성 확보,
          중간은 옅어 작품이 그대로 노출. */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/85 via-charcoal-deep/30 to-charcoal-deep/70" />

      {/* 텍스트 블록 — 중앙 정렬, hero 톤 */}
      <div className="relative z-10 flex h-full min-h-[70svh] md:min-h-[85svh] flex-col items-center justify-center px-4 pt-24 pb-32 md:pb-40 text-center text-white">
        <span
          className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
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
        <h1 className="text-hero text-white mb-5 drop-shadow-lg break-keep text-balance max-w-4xl">
          {title}
        </h1>
        <p className="text-body-large text-white/90 mb-8 max-w-2xl break-keep text-balance">
          {desc}
        </p>
        <span
          className={`inline-flex items-center gap-2 rounded-lg border-2 border-white/80 px-7 py-3 text-base md:text-lg font-bold backdrop-blur-sm transition-colors ${
            slide.href ? 'bg-white/10 hover:bg-white hover:text-charcoal-deep' : 'bg-white/5'
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
        <div className="block h-full cursor-not-allowed">{inner}</div>
      )}

      {/* Sawtooth divider — 다음 섹션(NowShowing)이 canvas-soft 배경이므로 그 색으로 톱니 채움. */}
      <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
    </section>
  );
}
