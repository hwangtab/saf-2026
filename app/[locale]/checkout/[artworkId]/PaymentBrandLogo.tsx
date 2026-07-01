import SafeImage from '@/components/common/SafeImage';
import { BRAND_COLORS } from '@/lib/colors';

/**
 * 결제수단 브랜드 로고 식별자. null이면 텍스트 라벨 사용 (카드/계좌이체 등).
 *
 * `paypal`은 영문 체크아웃 페이지에서만 노출. 다른 브랜드는 한국어/영문 양쪽
 * 페이지에서 동일하게 사용.
 */
export type BrandKind =
  | 'kakaopay'
  | 'tosspay'
  | 'naverpay'
  | 'payco'
  | 'applepay'
  | 'paypal'
  | null;

/**
 * 공식 브랜드 자산 (`public/images/payment/`).
 * width/height는 자산 자연 aspect — 표시 높이는 h-6(24px) CSS로 통일.
 *
 * 자체 여백 거의 없는 trimmed 상태 (Toss는 sharp.trim()으로 후처리).
 */
// 이미지 자산이 있는 브랜드만. paypal·payco·applepay는 라이선스 자산을 호스팅하지 않고
// 아래 PaymentBrandLogo에서 텍스트 wordmark로 분기 렌더한다.
const BRAND_ASSETS: Record<
  'kakaopay' | 'tosspay' | 'naverpay',
  { src: string; alt: string; width: number; height: number }
> = {
  kakaopay: { src: '/images/payment/kakaopay.png', alt: 'KakaoPay', width: 121, height: 50 },
  tosspay: { src: '/images/payment/tosspay.png', alt: 'Toss', width: 3000, height: 910 },
  naverpay: { src: '/images/payment/naverpay.svg', alt: 'NaverPay', width: 198, height: 66 },
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
        <span style={{ color: BRAND_COLORS.external.paypalDark }}>Pay</span>
        <span style={{ color: BRAND_COLORS.external.paypalLight }}>Pal</span>
      </span>
    );
  }
  if (brand === 'payco') {
    // 페이코 wordmark 텍스트 폴백 (이미지 자산 도입 전까지). 브랜드 색 리터럴 대신 중립 토큰.
    return (
      <span className="text-base font-extrabold tracking-tight text-charcoal-deep">PAYCO</span>
    );
  }
  if (brand === 'applepay') {
    //  Pay — 애플 로고 글리프(U+F8FF)는 애플페이 노출 환경(Safari/iOS)의 시스템 폰트에서 렌더됨.
    return (
      <span
        className="text-base font-semibold tracking-tight text-charcoal-deep"
        style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}
      >
        {'\uF8FF'} Pay
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
