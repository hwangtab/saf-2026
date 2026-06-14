'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LinkButton from '@/components/ui/LinkButton';
import AddToCartButton from '@/components/features/AddToCartButton';
import { trackEvent } from '@/lib/analytics/track';
import type { EditionType } from '@/types';
import { SHIPPING_THRESHOLD } from '@/lib/integrations/toss/config';
import TrustBadges from '@/components/features/TrustBadges';
import PurchaseGuide from '@/components/features/PurchaseGuide';
import {
  Phone,
  Mail,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  BadgeCheck,
  PackageCheck,
  RotateCcw,
  Landmark,
  MessageCircle,
} from 'lucide-react';

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
  /** 서버에서 getPaymentMode()로 판정 — 결제 모드 단일 출처 (2026-06-12 감사) */
  isTossEnabled: boolean;
  /** 작품 에디션 유형 — unique이면 장바구니 담기 시 수량 1로 고정 */
  editionType?: EditionType;
  /**
   * 서버에서 raw artwork.price를 파싱한 숫자 가격 (문의 작품은 null) — 배송비 분기용.
   * ⚠️ displayPrice(로케일 변환된 표시 문자열)에서 역파싱하지 말 것: EN 로케일은
   * 한글 포함 가격을 번역 라벨로 치환해 파싱이 null이 되고 무료배송으로 오표기된다
   * (2026-06-12 리뷰).
   */
  priceAmount: number | null;
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

function PurchaseConfidenceStrip({ priceAmount }: { priceAmount: number | null }) {
  const t = useTranslations('artworkDetail');
  // 20만원(SHIPPING_THRESHOLD) 미만 작품은 결제 단계에서 배송비 4,000원이 부과되는데
  // 무조건 '무료 배송'으로 표기하면 체크아웃에서 신뢰가 깨진다 (2026-06-12 감사).
  // 가격 미상(문의)은 기존 문구 유지.
  const isFreeShipping = priceAmount === null || priceAmount >= SHIPPING_THRESHOLD;
  const items = [
    {
      icon: PackageCheck,
      label: isFreeShipping
        ? t('confidenceFreeShipping')
        : t('confidenceShippingFee', { threshold: SHIPPING_THRESHOLD }),
    },
    { icon: RotateCcw, label: t('confidenceReturn') },
    { icon: BadgeCheck, label: t('confidenceCertificate') },
    { icon: Landmark, label: t('confidenceTransfer') },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-primary/10 bg-primary-surface p-3">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-xs font-semibold text-charcoal">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary-a11y" aria-hidden="true" />
          <span className="break-keep">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ConsultationButtons({
  artworkId,
  artworkTitle,
  artist,
}: {
  artworkId: string;
  artworkTitle: string;
  artist: string;
}) {
  const t = useTranslations('artworkDetail');
  const mailSubject = encodeURIComponent(`[씨앗페 작품 상담] ${artist} - ${artworkTitle}`);
  const mailBody = encodeURIComponent(
    `작품명: ${artworkTitle}\n작가: ${artist}\n작품 ID: ${artworkId}\n\n구매 상담을 요청합니다.`
  );

  function trackConsultation(channel: 'phone' | 'email') {
    trackEvent('purchase_consult_click', {
      artwork_id: artworkId,
      artwork_title: artworkTitle,
      artist,
      channel,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <LinkButton
        href="tel:02-764-3114"
        variant="outline"
        leadingIcon={<Phone className="h-4 w-4" />}
        iconLayout="fixed-left"
        onClick={() => trackConsultation('phone')}
      >
        <span className="text-sm font-bold text-center">{t('phoneConsult')}</span>
      </LinkButton>
      <LinkButton
        href={`mailto:contact@kosmart.org?subject=${mailSubject}&body=${mailBody}`}
        variant="outline"
        leadingIcon={<MessageCircle className="h-4 w-4" />}
        iconLayout="fixed-left"
        onClick={() => trackConsultation('email')}
      >
        <span className="text-sm font-bold text-center">{t('artworkConsult')}</span>
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
  isTossEnabled,
  editionType,
  priceAmount,
}: ArtworkPurchaseCTAProps) {
  const t = useTranslations('artworkDetail');
  const isUnique = editionType === 'unique';

  useEffect(() => {
    trackEvent('view_item', {
      artwork_id: artworkId,
      artwork_title: artworkTitle,
      artist,
    });
    // 마운트 1회만 — artworkId 변경은 페이지 전체 재마운트이므로 deps 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UUID 형식이 아닌 legacy static 작품은 Supabase DB에 없으므로 Toss 결제 불가
  const isDbArtwork = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    artworkId
  );
  const isTossMode = isTossEnabled && isDbArtwork;

  // E분기: reserved — 예약 중 안내
  if (reserved && !sold) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-gallery-card space-y-4">
        <div className="text-center">
          <Clock className="w-10 h-10 text-charcoal-muted mx-auto mb-3" />
          <p className="text-lg font-bold text-charcoal-deep mb-1">{t('reservedNotice')}</p>
          <p className="text-sm text-charcoal-soft mb-1">{t('reservedExplore')}</p>
          <p className="text-xs text-charcoal-soft">{t('reservedHint')}</p>
        </div>
        {/* 예약 해제 알림·구매 가능 여부 문의 동선 — 과거 일반 텍스트 전화번호뿐이라 모바일에서
            탭 연결이 불가능했다 (2026-06-12 감사). tel:/mailto: 상담 버튼 노출. */}
        <ConsultationButtons artworkId={artworkId} artworkTitle={artworkTitle} artist={artist} />
        <LinkButton href="/artworks" variant="outline" className="w-full">
          <span className="inline-flex items-center gap-1">
            {t('soldExploreAll')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </LinkButton>
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
          <p className="text-sm text-charcoal-soft mb-4">{t('soldExploreOther')}</p>
          <LinkButton href={fallbackHref} variant="outline" className="w-full">
            <span className="inline-flex items-center gap-1">
              {hasOtherWorks
                ? t('otherWorks', { artist })
                : hasSameCategoryWorks && category
                  ? t('sameCategoryBrowse', { category })
                  : t('soldExploreAll')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </LinkButton>
        </div>
      </div>
    );
  }

  // C분기: "문의" 가격 — 연락처 강조
  if (!hasActionablePrice) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary-surface to-white p-6 shadow-sm space-y-4">
        <div className="text-center">
          <p className="text-base font-bold text-charcoal mb-1">{t('inquiryTitle')}</p>
          <p className="text-sm text-charcoal-soft">{t('inquiryDescription')}</p>
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
          <PurchaseConfidenceStrip priceAmount={priceAmount} />

          <LinkButton
            href={`/checkout/${artworkId}`}
            variant="primary"
            size="lg"
            className="w-full gap-3 rounded-xl shadow-[0_0_20px_rgba(33,118,255,0.15)]"
            onClick={() =>
              trackEvent('purchase_click', {
                artwork_id: artworkId,
                artwork_title: artworkTitle,
                artist: artist,
                // mode: 자체 토스 결제(/checkout) vs 외부 쇼핑몰(legacy shopUrl) 분리.
                // 어드민 패널이 두 destination을 정확히 구분해 conversion 측정.
                mode: 'toss',
              })
            }
          >
            {t('buyOnline')}
          </LinkButton>

          <AddToCartButton artworkId={artworkId} isUnique={isUnique} disabled={sold} />

          <TrustBadges />

          <ConsultationButtons artworkId={artworkId} artworkTitle={artworkTitle} artist={artist} />

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
          <PurchaseConfidenceStrip priceAmount={priceAmount} />

          <LinkButton
            href={`${shopUrl}${shopUrl.includes('?') ? '&' : '?'}utm_source=saf2026&utm_medium=web&utm_campaign=artwork&utm_content=${artworkId}`}
            variant="primary"
            size="lg"
            external
            className="w-full text-lg gap-3 rounded-xl shadow-[0_0_20px_rgba(33,118,255,0.15)]"
            trailingIcon={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
            onClick={() =>
              trackEvent('purchase_click', {
                artwork_id: artworkId,
                artwork_title: artworkTitle,
                artist: artist,
                mode: 'external',
              })
            }
          >
            {t('buyExternal')}
          </LinkButton>
          <p className="text-xs text-center text-charcoal-soft">{t('externalShopNotice')}</p>

          <TrustBadges />

          <ConsultationButtons artworkId={artworkId} artworkTitle={artworkTitle} artist={artist} />

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
          <PurchaseConfidenceStrip priceAmount={priceAmount} />

          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600 break-keep leading-relaxed">
              {t('noShopDescription')}
              <br />
              <span className="font-semibold text-charcoal">{t('noShopContact')}</span>
              {t('noShopSuffix')}
              <br />
              {t.rich('noShopGuide', {
                highlight: (chunks) => (
                  <span className="text-primary-strong font-medium">{chunks}</span>
                ),
              })}
            </p>
          </div>

          <ContactButtons />

          <ConsultationButtons artworkId={artworkId} artworkTitle={artworkTitle} artist={artist} />

          <PurchaseGuide />
        </>
      )}
    </div>
  );
}
