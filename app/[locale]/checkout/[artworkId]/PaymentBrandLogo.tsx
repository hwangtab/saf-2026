'use client';

import SafeImage from '@/components/common/SafeImage';

/**
 * 결제수단 브랜드 로고 식별자. null이면 텍스트 라벨 사용 (카드/계좌이체 등).
 *
 * `paypal`은 영문 체크아웃 페이지에서만 노출. 다른 브랜드는 한국어/영문 양쪽
 * 페이지에서 동일하게 사용.
 */
export type BrandKind = 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal' | null;

/**
 * 공식 브랜드 자산 (`public/images/payment/`).
 * width/height는 자산 자연 aspect — 표시 높이는 h-6(24px) CSS로 통일.
 *
 * 자체 여백 거의 없는 trimmed 상태 (Toss는 sharp.trim()으로 후처리).
 */
const BRAND_ASSETS: Record<
  Exclude<BrandKind, null>,
  { src: string; alt: string; width: number; height: number }
> = {
  kakaopay: { src: '/images/payment/kakaopay.png', alt: 'KakaoPay', width: 121, height: 50 },
  tosspay: { src: '/images/payment/tosspay.png', alt: 'Toss', width: 3000, height: 910 },
  naverpay: { src: '/images/payment/naverpay.svg', alt: 'NaverPay', width: 198, height: 66 },
  // PayPal 공식 wordmark는 라이선스 자산을 별도 호스팅하지 않고 텍스트 wordmark로 처리.
  // src를 빈 문자열로 두고 BrandLogo에서 brand === 'paypal'일 때 텍스트 렌더로 분기.
  paypal: { src: '', alt: 'PayPal', width: 0, height: 0 },
};

export function PaymentBrandLogo({ brand }: { brand: BrandKind }) {
  if (!brand) return null;
  if (brand === 'paypal') {
    // PayPal 공식 wordmark — Pay(다크블루) + Pal(라이트블루) 이탤릭, brand guideline 준수
    return (
      <span
        className="font-black italic text-base"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
      >
        <span className="text-[#003087]">Pay</span>
        <span className="text-[#009CDE]">Pal</span>
      </span>
    );
  }
  const asset = BRAND_ASSETS[brand];
  return (
    <SafeImage
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className="h-6 w-auto object-contain"
    />
  );
}
