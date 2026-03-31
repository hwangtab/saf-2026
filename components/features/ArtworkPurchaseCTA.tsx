'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import LinkButton from '@/components/ui/LinkButton';
import TrackClick from '@/components/common/TrackingLink';
import TrustBadges from '@/components/features/TrustBadges';
import { Phone, Mail, CheckCircle } from 'lucide-react';

const PurchaseGuide = dynamic(() => import('@/components/features/PurchaseGuide'), {
  loading: () => <div className="h-20 rounded-xl shimmer-loading" aria-hidden="true" />,
});

interface ArtworkPurchaseCTAProps {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  shopUrl?: string | null;
  sold?: boolean;
  hasActionablePrice: boolean;
  hasOtherWorks?: boolean;
  displayPrice?: string | null;
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
  hasActionablePrice,
  hasOtherWorks,
  displayPrice,
}: ArtworkPurchaseCTAProps) {
  const t = useTranslations('artworkDetail');

  // D분기: sold — 판매 완료 안내
  if (sold) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-green-50/50 to-white p-6 shadow-sm">
        <div className="text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-charcoal mb-1">{t('soldNotice')}</p>
          <p className="text-sm text-gray-500 mb-4">{t('soldExploreOther')}</p>
          {hasOtherWorks ? (
            <LinkButton
              href={`/artworks/artist/${encodeURIComponent(artist)}`}
              variant="outline"
              className="w-full"
            >
              {t('viewAll')} →
            </LinkButton>
          ) : (
            <LinkButton href="/artworks" variant="outline" className="w-full">
              {t('soldExploreAll')} →
            </LinkButton>
          )}
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
        <div className="text-center">
          <p className="text-2xl font-bold text-charcoal">{displayPrice}</p>
        </div>
      )}

      {/* A분기: 온라인 구매 가능 */}
      {shopUrl && (
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
              href={shopUrl}
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
            <span className="text-gray-400 text-sm">{t('orContactDirectly')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <ContactButtons />

          <PurchaseGuide />
        </>
      )}

      {/* B분기: shopUrl 없음 — 문의 안내 */}
      {!shopUrl && (
        <>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600 word-keep leading-relaxed">
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
