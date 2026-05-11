'use client';

import { trackEvent } from '@/lib/analytics/track';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import type { Artwork } from '@/types';

type ArtworkSource = 'inline' | 'artist-fallback' | 'recent-fallback';

interface Props {
  artwork: Artwork;
  isEn: boolean;
  storySlug: string;
  position: number;
  /**
   * 어떤 매칭 단계에서 추천된 작품인지.
   * - inline: 본문에 작가가 직접 인용 (가장 의도적)
   * - artist-fallback: 본문 인용 없을 때 artist-story → 작가 다른 작품
   * - recent-fallback: 작가 매칭도 실패 → 사이트 최신 판매중
   *
   * tier별 CTR 차이로 매칭 알고리즘 효과 측정.
   */
  source: ArtworkSource;
}

/**
 * 매거진(stories) 본문 끝의 "관련 작품" 카드.
 *
 * 클라이언트 컴포넌트로 분리한 이유: 매거진→작품 클릭률을 측정하려면 onClick에서
 * @vercel/analytics track()을 호출해야 함. server component에서는 onClick prop을
 * Link에 박을 수 없으므로 카드 자체를 client로 분리.
 *
 * track 이벤트(`story_to_artwork_click`)는 Vercel Analytics 대시보드에서 매거진별
 * conversion funnel 측정에 사용 — README가 짚은 "매거진 글 노출 0~3" 회귀 진단 후
 * 어떤 개선이 효과 있는지 측정 기반 의사결정을 위한 인프라.
 */
export default function RelatedArtworkCard({ artwork, isEn, storySlug, position, source }: Props) {
  const artTitle = isEn && artwork.title_en ? artwork.title_en : artwork.title;
  const artArtist = isEn && artwork.artist_en ? artwork.artist_en : artwork.artist;
  const imgUrl = resolveArtworkImageUrl(artwork.images[0] ?? '');

  function handleClick() {
    // trackEvent는 내부에서 try/catch — navigation 막지 않음 + Vercel/GA4 이중 송신.
    trackEvent('story_to_artwork_click', {
      story_slug: storySlug,
      artwork_id: artwork.id,
      artist: artwork.artist,
      position,
      source,
    });
  }

  return (
    <Link
      href={`/artworks/${artwork.id}`}
      onClick={handleClick}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover motion-safe:opacity-0 motion-safe:animate-fade-in-up"
      style={{
        animationDelay: `${position * 0.1}s`,
        animationFillMode: 'forwards',
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-canvas-soft">
        {imgUrl ? (
          <SafeImage
            src={imgUrl}
            alt={artTitle}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-charcoal-muted/20 text-4xl font-display font-bold">M</span>
          </div>
        )}

        {/* 판매 가능 상태 badge — 매거진에서 들어온 사용자에게 즉시 "구매 가능" 신호.
            sold·reserved일 때는 카드 하단에 이미 상태 텍스트가 있어 중복 표시 회피. */}
        {!artwork.sold && !artwork.reserved && (
          <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success-a11y" aria-hidden="true" />
            <span className="text-[10px] font-semibold tracking-wide text-charcoal">
              {isEn ? 'Available' : '판매중'}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-charcoal line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {artTitle}
        </h3>
        <p className="text-xs text-charcoal-muted mt-1">{artArtist}</p>
        <p className="text-xs font-semibold text-primary mt-2">
          {artwork.sold ? (isEn ? 'Sold' : '판매 완료') : artwork.price}
        </p>
      </div>
    </Link>
  );
}
