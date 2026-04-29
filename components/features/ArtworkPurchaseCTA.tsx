'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import LinkButton from '@/components/ui/LinkButton';
import TrackClick from '@/components/common/TrackingLink';
import TrustBadges from '@/components/features/TrustBadges';
import { Phone, Mail, CheckCircle, Clock } from 'lucide-react';

const PurchaseGuide = dynamic(() => import('@/components/features/PurchaseGuide'), {
  loading: () => <div className="h-20 rounded-xl shimmer-loading" aria-hidden="true" />,
});

interface ArtworkPurchaseCTAProps {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  shopUrl?: string | null;
  sold?: boolean;
  reserved?: boolean;
  hasActionablePrice: boolean;
  hasOtherWorks?: boolean;
  displayPrice?: string | null;
  category?: string;
  hasSameCategoryWorks?: boolean;
}

function ContactButtons() {
  const t = useTranslations('artworkDetail');

  return (
    <div className="grid grid-cols-2 gap-3">
      <LinkButton
        href="tel:02-764-3114"
        variant="outline"
        leadingIcon={<Phone className="w-4 h-4" />}
        iconLayout="fixed-left"
      >
        <span className="text-sm font-bold text-center">02-764-3114</span>
      </LinkButton>
      <LinkButton
        href="mailto:contact@kosmart.org"
        variant="outline"
        leadingIcon={<Mail className="w-4 h-4" />}
        iconLayout="fixed-left"
      >
        <span className="text-sm font-bold text-center">{t('emailInquiry')}</span>
      </LinkButton>
    </div>
  );
}

export default function ArtworkPurchaseCTA({
  artworkId,
  artworkTitle,
  artist,
  shopUrl,
  sold,
  reserved,
  hasActionablePrice,
  hasOtherWorks,
  displayPrice,
  category,
  hasSameCategoryWorks,
}: ArtworkPurchaseCTAProps) {
  const t = useTranslations('artworkDetail');
  const paymentMode = process.env.NEXT_PUBLIC_PAYMENT_MODE;

  // UUID 형식이 아닌 legacy static 작품은 Supabase DB에 없으므로 Toss 결제 불가
  const isDbArtwork = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    artworkId
  );
  const isTossMode = paymentMode === 'toss' && isDbArtwork;

  // E분기: reserved — 예약 중 안내
  if (reserved && !sold) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-gallery-card">
        <div className="text-center">
          <Clock className="w-10 h-10 text-charcoal-muted mx-auto mb-3" />
          <p className="text-lg font-bold text-charcoal-deep mb-1">{t('reservedNotice')}</p>
          <p className="text-sm text-charcoal-soft mb-4">{t('reservedExplore')}</p>
          <LinkButton href="/artworks" variant="outline" className="w-full">
            {t('soldExploreAll')} →
          </LinkButton>
        </div>
      </div>
    );
  }

  // D분기: sold — 판매 완료 안내
  if (sold) {
    // 우선순위: 작가의 다른 작품 → 같은 카테고리 → 전체 갤러리
    const fallbackHref = hasOtherWorks
      ? `/artworks/artist/${encodeURIComponent(artist)}`
      : hasSameCategoryWorks && category
        ? `/artworks/category/${encodeURIComponent(category)}`
        : '/artworks';

    return (
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-success/10 to-white p-6 shadow-sm">
        <div className="text-center">
          <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-lg font-bold text-charcoal mb-1">{t('soldNotice')}</p>
          <p className="text-sm text-gray-500 mb-4">{t('soldExploreOther')}</p>
          <LinkButton href={fallbackHref} variant="outline" className="w-full">
            {hasOtherWorks
              ? `${t('otherWorks', { artist })} →`
              : hasSameCategoryWorks && category
                ? `${t('sameCategoryBrowse', { category })} →`
                : `${t('soldExploreAll')} →`}
          </LinkButton>
        </div>
      </div>
    );
  }

  // C분기: "문의" 가격 — 연락처 강조
  if (!hasActionablePrice) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/5 to-white p-6 shadow-sm space-y-4">
        <div className="text-center">
          <p className="text-base font-bold text-charcoal mb-1">{t('inquiryTitle')}</p>
          <p className="text-sm text-gray-500">{t('inquiryDescription')}</p>
        </div>
        <ContactButtons />
      </div>
    );
  }

  // A분기 + B분기: 가격 있는 작품
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      {/* 가격 — 최상단 */}
      {displayPrice && (
        <div className="text-center pb-4">
          <p className="text-xs text-charcoal-soft uppercase tracking-wider mb-1">
            {t('artworkPrice')}
          </p>
          <p className="text-3xl font-bold text-charcoal">{displayPrice}</p>
        </div>
      )}

      {/* A분기: toss 결제 모드 + DB 작품 — 내부 체크아웃 */}
      {isTossMode && hasActionablePrice && (
        <>
          <TrackClick
            event="purchase_click"
            properties={{
              artwork_id: artworkId,
              artwork_title: artworkTitle,
              artist: artist,
            }}
          >
            <LinkButton
              href={`/checkout/${artworkId}`}
              variant="primary"
              size="lg"
              className="w-full gap-3 rounded-xl shadow-[0_0_20px_rgba(33,118,255,0.15)]"
            >
              {t('buyOnline')}
            </LinkButton>
          </TrackClick>

          <TrustBadges />

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-charcoal-soft text-sm">{t('orContactDirectly')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <ContactButtons />

          <PurchaseGuide />
        </>
      )}

      {/* A분기: legacy 작품 — 외부 링크 */}
      {!isTossMode && shopUrl && (
        <>
          <TrackClick
            event="purchase_click"
            properties={{
              artwork_id: artworkId,
              artwork_title: artworkTitle,
              artist: artist,
            }}
          >
            <LinkButton
              href={`${shopUrl}${shopUrl.includes('?') ? '&' : '?'}utm_source=saf2026&utm_medium=web&utm_campaign=artwork&utm_content=${artworkId}`}
              variant="primary"
              size="lg"
              external
              className="w-full text-lg gap-3 rounded-xl shadow-[0_0_20px_rgba(33,118,255,0.15)]"
            >
              {t('buyOnline')}
            </LinkButton>
          </TrackClick>

          <TrustBadges />

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-charcoal-soft text-sm">{t('orContactDirectly')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <ContactButtons />

          <PurchaseGuide />
        </>
      )}

      {/* B분기: shopUrl 없음 또는 가격 없음 — 문의 안내 */}
      {!isTossMode && !shopUrl && (
        <>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600 break-keep leading-relaxed">
              {t('noShopDescription')}
              <br />
              <span className="font-semibold text-charcoal">{t('noShopContact')}</span>
              {t('noShopSuffix')}
              <br />
              {t.rich('noShopGuide', {
                highlight: (chunks) => <span className="text-primary font-medium">{chunks}</span>,
              })}
            </p>
          </div>

          <ContactButtons />

          <PurchaseGuide />
        </>
      )}
    </div>
  );
}
