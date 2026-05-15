import { Section, Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { formatAmount, t, type EmailLocale } from './_components/i18n';
import { LOAN_COUNT } from '@/lib/site-stats';

export interface DepositConfirmedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  itemAmount?: number;
  shippingAmount?: number;
  shipping?: { name?: string; phone?: string; address?: string; memo?: string };
  locale?: EmailLocale;
}

/**
 * 입금 확인 이메일 — 계좌이체 흐름의 결제 완료 시점. 매뉴얼 8.6 자긍심 메시지 정합.
 * payment-confirmed(카드/간편결제) 흐름과 동일 톤 유지.
 */
export default function DepositConfirmedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  itemAmount,
  shippingAmount,
  shipping,
  locale = 'ko',
}: DepositConfirmedEmailProps) {
  const showItemized = typeof itemAmount === 'number' && typeof shippingAmount === 'number';
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
    ...(showItemized
      ? [
          { label: t('itemAmount', locale), value: formatAmount(itemAmount!, locale) },
          { label: t('shippingAmount', locale), value: formatAmount(shippingAmount!, locale) },
        ]
      : []),
    {
      label: t(showItemized ? 'totalAmount' : 'amount', locale),
      value: formatAmount(amount, locale),
      bold: true,
    },
    ...(shipping?.name ? [{ label: t('recipient', locale), value: shipping.name }] : []),
    ...(shipping?.phone ? [{ label: t('recipientPhone', locale), value: shipping.phone }] : []),
    ...(shipping?.address
      ? [{ label: t('shippingAddress', locale), value: shipping.address }]
      : []),
    ...(shipping?.memo ? [{ label: t('shippingMemo', locale), value: shipping.memo }] : []),
  ];

  const loanCountFormatted = LOAN_COUNT.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');

  const header =
    locale === 'en'
      ? '[SAF] Your deposit is confirmed — we are preparing your artwork'
      : '[씨앗페] 입금이 확인되었습니다. 작품을 준비하고 있습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your deposit is confirmed and the artwork is being prepared.`
      : `${buyerName}님의 입금이 확인되어 작품을 준비하고 있습니다.`;
  const greeting =
    locale === 'en'
      ? `Dear ${buyerName}, your deposit has been confirmed and your order is finalized. Your artwork is being prepared.`
      : `${buyerName}님, 입금이 확인되어 주문이 최종 확정되었습니다. 작품을 준비하고 있습니다.`;
  const trustNote =
    locale === 'en'
      ? 'A 7-day return policy applies, and the certificate of authenticity will ship together with your artwork.'
      : '7일 청약철회가 가능하며, 진품 보증서가 작품과 함께 발송됩니다.';
  const prideHead =
    locale === 'en' ? "A fellow artist's next month begins" : '동료 작가의 다음 한 달이 시작됩니다';
  const prideBody =
    locale === 'en'
      ? `Your decision today opened a new path for a fellow artist. You join ${loanCountFormatted} who have already walked this path of recovery.`
      : `오늘 당신의 결정으로 동료 작가에게 새로운 길이 열렸습니다. ${loanCountFormatted}명이 이미 걸은 회복의 길에 한 명이 더 함께합니다.`;

  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle={header}
      previewText={preview}
      locale={locale}
    >
      <Text style={bodyText}>{greeting}</Text>
      <Text style={trustNoteText}>{trustNote}</Text>
      <OrderInfoTable rows={rows} />
      <Section style={prideBoxStyle}>
        <Text style={prideHeadText}>{prideHead}</Text>
        <Text style={prideBodyText}>{prideBody}</Text>
      </Section>
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 12px',
  color: '#555E67',
  fontSize: '15px',
};

const trustNoteText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#73808C',
  fontSize: '14px',
  lineHeight: '1.55',
};

const prideBoxStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '18px 20px',
  border: '1px solid #E0E0E0',
  borderRadius: '10px',
  background: '#FAFAFC',
};

const prideHeadText: React.CSSProperties = {
  margin: '0 0 6px',
  color: '#1A1F24',
  fontSize: '14px',
  fontWeight: 600,
};

const prideBodyText: React.CSSProperties = {
  margin: 0,
  color: '#555E67',
  fontSize: '14px',
  lineHeight: '1.6',
};
