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
// 이미지 자산이 있는 브랜드. paypal만 라이선스 wordmark를 호스팅하지 않고 아래에서 텍스트 렌더.
// payco·applepay는 공식 SVG(Wikimedia) — payco는 브랜드 레드(#fa2829), applepay는 검정 마크.
//
// heightClass — 로고마다 자산 여백·글자 비율이 달라 같은 높이로 렌더하면 시각 크기가 제각각.
// 카카오페이(pill 배경 안에 작은 심볼+pay) 콘텐츠 크기를 기준으로 각 로고의 렌더 높이를
// 개별 보정해 글자 크기를 균일하게 맞춘다. (Tailwind JIT 스캔용 완전한 클래스 리터럴)
const BRAND_ASSETS: Record<
  'kakaopay' | 'tosspay' | 'naverpay' | 'payco' | 'applepay',
  { src: string; alt: string; width: number; height: number; heightClass: string }
> = {
  kakaopay: {
    src: '/images/payment/kakaopay.png',
    alt: 'KakaoPay',
    width: 121,
    height: 50,
    heightClass: 'h-6',
  },
  tosspay: {
    src: '/images/payment/tosspay.png',
    alt: 'Toss',
    width: 3000,
    height: 910,
    heightClass: 'h-5',
  },
  naverpay: {
    src: '/images/payment/naverpay.svg',
    alt: 'NaverPay',
    width: 198,
    height: 66,
    heightClass: 'h-5',
  },
  payco: {
    src: '/images/payment/payco.svg',
    alt: 'PAYCO',
    width: 1022,
    height: 265,
    heightClass: 'h-4',
  },
  applepay: {
    src: '/images/payment/applepay.svg',
    alt: 'Apple Pay',
    width: 512,
    height: 210,
    heightClass: 'h-5',
  },
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
  const asset = BRAND_ASSETS[brand];
  return (
    <SafeImage
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className={`${asset.heightClass} w-auto object-contain`}
    />
  );
}
