/**
 * Payment notification and buyer confirmation emails via Resend API.
 * Reads RESEND_API_KEY from env — no-op when unset (safe for dev/test).
 *
 * Admin notifications (notifyEmail) use inline HTML.
 * Buyer emails (sendBuyerEmail) use React Email components.
 */

import { render } from '@react-email/render';
import * as React from 'react';

import { BRAND_COLORS } from '@/lib/colors';
import PaymentConfirmedEmail from '@/emails/payment-confirmed';
import VirtualAccountIssuedEmail from '@/emails/virtual-account-issued';
import DepositConfirmedEmail from '@/emails/deposit-confirmed';
import ShippedEmail from '@/emails/shipped';
import DeliveredEmail from '@/emails/delivered';
import RefundedEmail from '@/emails/refunded';
import AutoCancelledEmail from '@/emails/auto-cancelled';
import type { EmailLocale } from '@/emails/_components/i18n';

type NotifyLevel = 'payment' | 'warning' | 'error' | 'info';

/** orders.metadata 에서 buyer locale 추출. 기본값 'ko'. */
export function extractBuyerLocale(metadata: unknown): EmailLocale {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'ko';
  const locale = (metadata as Record<string, unknown>).locale;
  return locale === 'en' ? 'en' : 'ko';
}

// Gallery 모노톤: warning은 charcoal-deep로 (노란/주황 대신).
// payment/error는 의미적 색 보존 (성공 그린/에러 빨강은 universal).
const LEVEL_CONFIG: Record<NotifyLevel, { emoji: string; color: string }> = {
  payment: { emoji: '💳', color: BRAND_COLORS.success.a11y },
  warning: { emoji: '⚠️', color: BRAND_COLORS.charcoal.deep },
  error: { emoji: '🚨', color: BRAND_COLORS.danger.a11y },
  info: { emoji: 'ℹ️', color: BRAND_COLORS.primary.strong },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sends a payment notification email via Resend.
 * Silently no-ops if RESEND_API_KEY or NOTIFY_EMAIL_TO is not set.
 * Never throws — payment flow must not fail because of a notification error.
 *
 * @param level  - visual severity level
 * @param title  - email subject heading (e.g. "결제 승인 완료")
 * @param fields - key-value pairs shown as table rows (e.g. { 주문번호: "SAF-20260410-0001" })
 */
export async function notifyEmail(
  level: NotifyLevel,
  title: string,
  fields?: Record<string, string>
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toRaw = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !toRaw || !from) return;
  const to = toRaw.includes(',')
    ? toRaw
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
    : toRaw;

  const { emoji, color } = LEVEL_CONFIG[level];
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const safeTitle = escapeHtml(title);

  const fieldsHtml = fields
    ? Object.entries(fields)
        .map(
          ([key, value]) => `
      <tr>
        <td style="padding:6px 12px;font-weight:600;color:${BRAND_COLORS.charcoal.muted};white-space:nowrap;border-bottom:1px solid ${BRAND_COLORS.gallery.hairline};">${escapeHtml(key)}</td>
        <td style="padding:6px 12px;color:${BRAND_COLORS.charcoal.deep};border-bottom:1px solid ${BRAND_COLORS.gallery.hairline};">${escapeHtml(value)}</td>
      </tr>`
        )
        .join('')
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND_COLORS.canvas.DEFAULT};font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI','Malgun Gothic','Noto Sans KR',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:${BRAND_COLORS.gallery.canvas};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${color};padding:16px 24px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLORS.light};">${emoji} ${safeTitle}</p>
    </div>
    ${
      fieldsHtml
        ? `<table style="width:100%;border-collapse:collapse;">
        <tbody>${fieldsHtml}</tbody>
      </table>`
        : ''
    }
    <div style="padding:12px 24px;background:${BRAND_COLORS.canvas.DEFAULT};border-top:1px solid ${BRAND_COLORS.gallery.hairline};">
      <p style="margin:0;font-size:12px;color:${BRAND_COLORS.gray[400]};">씨앗페 결제 시스템 • ${timestamp}</p>
    </div>
  </div>
</body>
</html>`;

  await resendFetch({ apiKey, from, to, subject: `${emoji} [씨앗페] ${title}`, html }, '[notify]');
}

export type BuyerEmailType =
  | 'payment_confirmed'
  | 'virtual_account_issued'
  | 'deposit_confirmed'
  | 'shipped'
  | 'delivered'
  | 'refunded'
  | 'auto_cancelled';

export interface BuyerEmailData {
  orderNo: string;
  buyerName: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  paymentMethod?: string;
  virtualAccount?: { bankName?: string; accountNumber?: string; dueDate?: string };
  carrier?: string;
  trackingNumber?: string;
  itemAmount?: number;
  shippingAmount?: number;
  shipping?: {
    name?: string;
    phone?: string;
    address?: string;
    memo?: string;
  };
}

const BUYER_EMAIL_SUBJECTS: Record<EmailLocale, Record<BuyerEmailType, string>> = {
  ko: {
    payment_confirmed: '[씨앗페] 결제가 완료되었습니다',
    virtual_account_issued: '[씨앗페] 가상계좌 입금 안내',
    deposit_confirmed: '[씨앗페] 입금이 확인되었습니다',
    shipped: '[씨앗페] 작품이 발송되었습니다',
    delivered: '[씨앗페] 작품이 배송 완료되었습니다',
    refunded: '[씨앗페] 환불이 처리되었습니다',
    auto_cancelled: '[씨앗페] 주문이 자동 취소되었습니다',
  },
  en: {
    payment_confirmed: '[SAF] Your payment is complete',
    virtual_account_issued: '[SAF] Virtual account deposit instructions',
    deposit_confirmed: '[SAF] Your deposit has been confirmed',
    shipped: '[SAF] Your artwork has shipped',
    delivered: '[SAF] Your artwork has been delivered',
    refunded: '[SAF] Your refund has been processed',
    auto_cancelled: '[SAF] Your order has been auto-cancelled',
  },
};

/**
 * Sends a buyer-facing confirmation email via Resend using React Email components.
 * Silently no-ops if RESEND_API_KEY or RESEND_FROM_EMAIL is not set.
 * Never throws — payment flow must not fail because of an email error.
 */
export async function sendBuyerEmail(
  to: string,
  type: BuyerEmailType,
  data: BuyerEmailData,
  locale: EmailLocale = 'ko'
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return;

  try {
    let emailElement: React.ReactElement;

    switch (type) {
      case 'payment_confirmed':
        emailElement = React.createElement(PaymentConfirmedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          itemAmount: data.itemAmount,
          shippingAmount: data.shippingAmount,
          shipping: data.shipping,
          locale,
        });
        break;
      case 'virtual_account_issued':
        emailElement = React.createElement(VirtualAccountIssuedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
          virtualAccount: data.virtualAccount ?? {},
          locale,
        });
        break;
      case 'deposit_confirmed':
        emailElement = React.createElement(DepositConfirmedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
          itemAmount: data.itemAmount,
          shippingAmount: data.shippingAmount,
          shipping: data.shipping,
          locale,
        });
        break;
      case 'shipped':
        emailElement = React.createElement(ShippedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          carrier: data.carrier ?? '',
          trackingNumber: data.trackingNumber,
          shipping: data.shipping,
          locale,
        });
        break;
      case 'delivered':
        emailElement = React.createElement(DeliveredEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          shipping: data.shipping,
          locale,
        });
        break;
      case 'refunded':
        emailElement = React.createElement(RefundedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
          itemAmount: data.itemAmount,
          shippingAmount: data.shippingAmount,
          locale,
        });
        break;
      case 'auto_cancelled':
        emailElement = React.createElement(AutoCancelledEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
          locale,
        });
        break;
      default: {
        const _exhaustive: never = type;
        console.error(`[buyer-email] Unknown email type: ${_exhaustive}`);
        return;
      }
    }

    const html = await render(emailElement);
    await resendFetch(
      { apiKey, from, to, subject: BUYER_EMAIL_SUBJECTS[locale][type], html },
      `[buyer-email:${type}:${locale}]`
    );
  } catch (err) {
    console.error(`[buyer-email:${type}] render/send failed:`, err);
  }
}

async function resendFetch(
  opts: { apiKey: string; from: string; to: string | string[]; subject: string; html: string },
  logPrefix: string
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: opts.from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return;

      const body = await res.text();

      // 429 또는 5xx → 1회 재시도
      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(`${logPrefix} Resend ${res.status}, retrying in 1s: ${body.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      console.error(`${logPrefix} Resend returned ${res.status}: ${body.slice(0, 500)}`);
      return;
    } catch (err) {
      clearTimeout(timeout);

      // 타임아웃/네트워크 에러 → 1회 재시도
      if (attempt === 0) {
        console.error(`${logPrefix} Resend failed, retrying in 1s:`, err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      console.error(`${logPrefix} Resend email failed after retry:`, err);
      return;
    }
  }
}
