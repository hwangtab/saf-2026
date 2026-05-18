'use client';

import { useTranslations } from 'next-intl';
import LinkButton from '@/components/ui/LinkButton';
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
}

/**
 * 모바일 전용 하단 fixed sticky CTA — 매뉴얼 7.2 [4] · 11.
 *
 * `md:hidden` — 태블릿·데스크탑에서는 사이드바 ArtworkPurchaseCTA가 스크롤과 함께 항상 노출되므로
 * 중복 표시 방지. 모바일에서만 fold-below 스크롤 시 CTA가 뷰포트 밖으로 벗어나는 문제 해결.
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
}: ArtworkPurchaseStickyMobileProps) {
  const t = useTranslations('artworkDetail');
  const paymentMode = process.env.NEXT_PUBLIC_PAYMENT_MODE;

  if (sold || reserved || !hasActionablePrice) return null;

  const isDbArtwork = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    artworkId
  );
  const isTossMode = paymentMode === 'toss' && isDbArtwork;

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
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
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
        <LinkButton
          href={href}
          variant="primary"
          size="md"
          external={!isTossMode}
          className="shrink-0 rounded-xl px-5 shadow-[0_0_16px_rgba(33,118,255,0.2)]"
          onClick={handleClick}
        >
          {t('stickyBuy')}
        </LinkButton>
      </div>
    </div>
  );
}
