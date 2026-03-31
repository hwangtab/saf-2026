'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import LinkButton from '@/components/ui/LinkButton';
import TrackClick from '@/components/common/TrackingLink';
import TrustBadges from '@/components/features/TrustBadges';
import { Phone, Mail } from 'lucide-react';

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
}

export default function ArtworkPurchaseCTA({
  artworkId,
  artworkTitle,
  artist,
  shopUrl,
  sold,
  hasActionablePrice,
}: ArtworkPurchaseCTAProps) {
  const t = useTranslations('artworkDetail');

  if (sold || !hasActionablePrice) return null;

  return (
    <div className="space-y-6">
      {/* Branch A: 온라인 구매 가능 */}
      {shopUrl && (
        <>
          <PurchaseGuide className="hidden lg:block mb-4" />

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
          <PurchaseGuide className="hidden lg:block mb-6" />

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
    </div>
  );
}
