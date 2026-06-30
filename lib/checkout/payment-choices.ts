import { CreditCard, Landmark, type LucideIcon } from 'lucide-react';

import type { BrandKind } from '@/app/[locale]/checkout/[artworkId]/PaymentBrandLogo';

/**
 * 국내(KRW) 결제 수단 정의 — 단건(CheckoutClient)·장바구니(CartCheckoutClient) 공통 단일 출처.
 *
 * 과거 두 클라이언트에 PAYMENT_CHOICES/PaymentChoiceConfig/MethodHintKey가 그대로 복제돼 있어
 * 수단·hintKey·아이콘 변경 시 두 곳을 동시에 고쳐야 했고(한쪽 누락 시 missing-translation 또는
 * UI 분기) 회귀 위험이 있었다. 여기로 추출해 양쪽이 import한다.
 *
 * cardOptions에 따라 Toss 결제창이 분기:
 * - CARD: cardOptions undefined → 통합결제창(picker, flowMode='DEFAULT').
 * - KAKAOPAY/TOSSPAY/NAVERPAY: `card: { flowMode: 'DIRECT', easyPay: '한국어 enum' }`로 자체창 직행.
 *   easyPay 영문 enum('KAKAOPAY' 등)은 Toss 검증 단계에서 거부됨.
 * - TRANSFER: 토스 퀵계좌이체 (method: 'TRANSFER'). 실시간 출금 후 DONE으로 즉시 완료.
 *   가상계좌(WAITING_FOR_DEPOSIT) 아님.
 */
export type PaymentChoice = 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'NAVERPAY' | 'TRANSFER';

export type KoBrand = Extract<BrandKind, 'kakaopay' | 'tosspay' | 'naverpay'> | null;

export type EasyPayKo = '카카오페이' | '토스페이' | '네이버페이';

export interface CardOptions {
  flowMode: 'DIRECT';
  easyPay: EasyPayKo;
}

export type MethodHintKey =
  | 'methodCardHint'
  | 'methodTransferHint'
  | 'methodKakaopayHint'
  | 'methodTosspayHint'
  | 'methodNaverpayHint';

export interface PaymentChoiceConfig {
  value: PaymentChoice;
  labelKey: 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodNaverpay' | 'methodTransfer';
  /** 선택 시 셀렉터 하단에 노출되는 한 줄 안내 메시지 키 */
  hintKey: MethodHintKey;
  /** 브랜드 로고 렌더링 식별자 — null이면 텍스트 라벨 사용 */
  brand: KoBrand;
  /** 브랜드 로고가 없는 수단(카드·계좌이체)의 단색 아이콘 — 행 시각 균형 통일 */
  icon?: LucideIcon;
  /** Toss SDK v2 requestPayment의 method. 간편결제 4종은 'CARD'+cardOptions, 퀵계좌이체는 'TRANSFER'. */
  tossMethod: 'CARD' | 'TRANSFER';
  /** Toss SDK v2 자체창 직행 옵션. undefined면 통합결제창 (DEFAULT). */
  cardOptions?: CardOptions;
}

export const PAYMENT_CHOICES: PaymentChoiceConfig[] = [
  {
    value: 'CARD',
    labelKey: 'methodCard',
    hintKey: 'methodCardHint',
    brand: null,
    icon: CreditCard,
    tossMethod: 'CARD',
  },
  {
    value: 'TRANSFER',
    labelKey: 'methodTransfer',
    hintKey: 'methodTransferHint',
    brand: null,
    icon: Landmark,
    tossMethod: 'TRANSFER',
  },
  {
    value: 'KAKAOPAY',
    labelKey: 'methodKakaopay',
    hintKey: 'methodKakaopayHint',
    brand: 'kakaopay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '카카오페이' },
  },
  {
    value: 'TOSSPAY',
    labelKey: 'methodTosspay',
    hintKey: 'methodTosspayHint',
    brand: 'tosspay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '토스페이' },
  },
  {
    value: 'NAVERPAY',
    labelKey: 'methodNaverpay',
    hintKey: 'methodNaverpayHint',
    brand: 'naverpay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '네이버페이' },
  },
];
