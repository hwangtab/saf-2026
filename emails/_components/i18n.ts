export type EmailLocale = 'ko' | 'en';

export function formatAmount(amount: number, locale: EmailLocale): string {
  return locale === 'en'
    ? `KRW ${amount.toLocaleString('en-US')}`
    : `₩${amount.toLocaleString('ko-KR')}`;
}

export function formatDate(isoString: string, locale: EmailLocale): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: locale === 'en' ? 'short' : 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const labels = {
  orderNo: { ko: '주문번호', en: 'Order No.' },
  artwork: { ko: '작품', en: 'Artwork' },
  amount: { ko: '결제금액', en: 'Amount' },
  paymentMethod: { ko: '결제수단', en: 'Payment Method' },
  bank: { ko: '은행', en: 'Bank' },
  accountNumber: { ko: '계좌번호', en: 'Account Number' },
  dueDate: { ko: '입금 기한', en: 'Due Date' },
  carrier: { ko: '배송사', en: 'Carrier' },
  trackingNumber: { ko: '운송장 번호', en: 'Tracking No.' },
  itemAmount: { ko: '상품가', en: 'Item Price' },
  shippingAmount: { ko: '배송료', en: 'Shipping Fee' },
  totalAmount: { ko: '총 결제금액', en: 'Total' },
  refundAmount: { ko: '환불금액', en: 'Refund Amount' },
  recipient: { ko: '수령인', en: 'Recipient' },
  recipientPhone: { ko: '수령인 연락처', en: 'Phone' },
  shippingAddress: { ko: '배송지', en: 'Shipping Address' },
  shippingMemo: { ko: '배송 메모', en: 'Delivery Note' },
} as const;

export function t(key: keyof typeof labels, locale: EmailLocale): string {
  return labels[key][locale];
}
