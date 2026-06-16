'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import { trackEvent } from '@/lib/analytics/track';

interface ArtworkPurchaseStickyMobileProps {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  shopUrl?: string | null;
  sold?: boolean;
  reserved?: boolean;
  hasActionablePrice: boolean;
  displayPrice?: string | null;
  /** 서버에서 getPaymentMode()로 판정 — 결제 모드 단일 출처 (2026-06-12 감사) */
  isTossEnabled: boolean;
}

/**
 * 모바일·태블릿 하단 fixed sticky CTA — 매뉴얼 7.2 [4] · 11.
 *
 * `lg:hidden` — 상세 grid가 lg:grid-cols-2이므로 lg 미만(모바일+태블릿)은 단일 컬럼이라
 * 스크롤 시 CTA가 뷰포트 밖으로 벗어남 → 하단 sticky 바가 필요. lg 이상은 좌측 컬럼이
 * lg:sticky로 따라오므로 중복 표시 방지 (2026-06-12 감사: 과거 md:hidden은 md~lg 태블릿
 * 구간에서 사이드바도 sticky 바도 없는 사각지대를 만들었다).
 *
 * z-30 — 헤더(z-30 sticky) 아래에 위치하도록. 이미지 모달이나 overlay보다는 낮게.
 * safe-area-inset-bottom — iOS Safari 홈 인디케이터 영역 침범 방지.
 *
 * sold·reserved·hasActionablePrice=false 시 미렌더 → ArtworkPurchaseCTA와 동일 분기 유지.
 */
export default function ArtworkPurchaseStickyMobile({
  artworkId,
  artworkTitle,
  artist,
  shopUrl,
  sold,
  reserved,
  hasActionablePrice,
  displayPrice,
  isTossEnabled,
}: ArtworkPurchaseStickyMobileProps) {
  const t = useTranslations('artworkDetail');

  if (sold || reserved || !hasActionablePrice) return null;

  const isDbArtwork = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    artworkId
  );
  const isTossMode = isTossEnabled && isDbArtwork;

  if (!isTossMode && !shopUrl) return null;

  const href = isTossMode
    ? `/checkout/${artworkId}`
    : `${shopUrl}${shopUrl!.includes('?') ? '&' : '?'}utm_source=saf2026&utm_medium=web&utm_campaign=artwork_sticky&utm_content=${artworkId}`;

  function handleClick() {
    trackEvent('purchase_click', {
      artwork_id: artworkId,
      artwork_title: artworkTitle,
      artist,
      mode: isTossMode ? 'toss_sticky' : 'external_sticky',
    });
  }

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {displayPrice && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-charcoal-muted uppercase tracking-wider leading-none mb-0.5">
              {t('artworkPrice')}
            </p>
            <p className="text-lg font-bold text-charcoal truncate">{displayPrice}</p>
          </div>
        )}
        {/* 위시리스트 하트 — 구매 CTA 왼쪽에 나란히. 아이콘만 표시(공간 절약). */}
        <WishlistHeartButton
          artworkId={artworkId}
          artworkTitle={artworkTitle}
          variant="overlay"
          className="static w-10 h-10 shrink-0 rounded-xl bg-gray-100 backdrop-blur-none shadow-none"
        />
        <LinkButton
          href={href}
          variant="primary"
          size="md"
          external={!isTossMode}
          className="shrink-0 rounded-xl px-5 shadow-[0_0_16px_rgba(33,118,255,0.2)]"
          trailingIcon={
            !isTossMode ? <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> : undefined
          }
          onClick={handleClick}
        >
          {t('stickyBuy')}
        </LinkButton>
      </div>
    </div>
  );
}
