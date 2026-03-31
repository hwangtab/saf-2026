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
}

function ContactButtons() {
  const t = useTranslations('artworkDetail');

  return (
    <div className="grid grid-cols-2 gap-4">
      <LinkButton
        href="tel:02-764-3114"
        variant="accent"
        leadingIcon={<Phone className="w-4 h-4" />}
        iconLayout="fixed-left"
      >
        <span className="text-sm font-bold text-center">02-764-3114</span>
      </LinkButton>
      <LinkButton
        href="mailto:contact@kosmart.org"
        variant="accent"
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
}: ArtworkPurchaseCTAProps) {
  const t = useTranslations('artworkDetail');

  // sold 상태: 판매 완료 안내 + 다른 작품 유도
  if (sold) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <CheckCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-charcoal mb-1">{t('soldNotice')}</p>
          <p className="text-sm text-gray-500">{t('soldExploreOther')}</p>
        </div>
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
    );
  }

  // "문의" 가격 (hasActionablePrice=false): 연락처만 표시
  if (!hasActionablePrice) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
          <p className="text-base font-bold text-charcoal mb-1">{t('inquiryTitle')}</p>
          <p className="text-sm text-gray-500">{t('inquiryDescription')}</p>
        </div>
        <ContactButtons />
      </div>
    );
  }

  // 구매 가능 작품
  return (
    <div className="space-y-6">
      {/* Branch A: 온라인 구매 가능 */}
      {shopUrl && (
        <>
          <PurchaseGuide className="mb-4" />

          <div className="flex flex-col gap-3">
            <TrustBadges />
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
                className="w-full text-lg gap-3 rounded-xl"
              >
                {t('buyOnline')}
              </LinkButton>
            </TrackClick>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">{t('orContactDirectly')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </>
      )}

      {/* Branch B: 구매 링크 없음 - 문의 안내 */}
      {!shopUrl && (
        <>
          <PurchaseGuide className="mb-6" />

          <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-charcoal mb-4">{t('wantToBuy')}</h3>
            <div className="flex justify-center items-center gap-2 text-xs text-gray-500 mb-6">
              <div className="flex flex-col items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-primary shadow-sm">
                  1
                </span>
                <span>{t('stepInquiry')}</span>
              </div>
              <div className="w-12 h-px bg-gray-300 mb-4"></div>
              <div className="flex flex-col items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                  2
                </span>
                <span>{t('stepPayment')}</span>
              </div>
              <div className="w-12 h-px bg-gray-300 mb-4"></div>
              <div className="flex flex-col items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                  3
                </span>
                <span>{t('stepDelivery')}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-0 word-keep leading-relaxed">
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
        </>
      )}

      {/* 공통: 연락처 */}
      <ContactButtons />
    </div>
  );
}
