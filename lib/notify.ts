/**
 * Payment notification and buyer confirmation emails via Resend API.
 * Reads RESEND_API_KEY from env — no-op when unset (safe for dev/test).
 *
 * Admin notifications (notifyEmail) use inline HTML.
 * Buyer emails (sendBuyerEmail) use React Email components.
 */

import { render } from '@react-email/render';
import * as React from 'react';

import PaymentConfirmedEmail from '@/emails/payment-confirmed';
import VirtualAccountIssuedEmail from '@/emails/virtual-account-issued';
import DepositConfirmedEmail from '@/emails/deposit-confirmed';
import ShippedEmail from '@/emails/shipped';
import DeliveredEmail from '@/emails/delivered';
import RefundedEmail from '@/emails/refunded';
import AutoCancelledEmail from '@/emails/auto-cancelled';

type NotifyLevel = 'payment' | 'warning' | 'error' | 'info';

const LEVEL_CONFIG: Record<NotifyLevel, { emoji: string; color: string }> = {
  payment: { emoji: '💳', color: '#22c55e' },
  warning: { emoji: '⚠️', color: '#f59e0b' },
  error: { emoji: '🚨', color: '#ef4444' },
  info: { emoji: 'ℹ️', color: '#3b82f6' },
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
        <td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap;border-bottom:1px solid #f3f4f6;">${escapeHtml(key)}</td>
        <td style="padding:6px 12px;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(value)}</td>
      </tr>`
        )
        .join('')
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${color};padding:16px 24px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${emoji} ${safeTitle}</p>
    </div>
    ${
      fieldsHtml
        ? `<table style="width:100%;border-collapse:collapse;">
        <tbody>${fieldsHtml}</tbody>
      </table>`
        : ''
    }
    <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">씨앗페 결제 시스템 • ${timestamp}</p>
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
}

const BUYER_EMAIL_SUBJECTS: Record<BuyerEmailType, string> = {
  payment_confirmed: '[씨앗페] 결제가 완료되었습니다',
  virtual_account_issued: '[씨앗페] 가상계좌 입금 안내',
  deposit_confirmed: '[씨앗페] 입금이 확인되었습니다',
  shipped: '[씨앗페] 작품이 발송되었습니다',
  delivered: '[씨앗페] 작품이 배송 완료되었습니다',
  refunded: '[씨앗페] 환불이 처리되었습니다',
  auto_cancelled: '[씨앗페] 주문이 자동 취소되었습니다',
};

/**
 * Sends a buyer-facing confirmation email via Resend using React Email components.
 * Silently no-ops if RESEND_API_KEY or RESEND_FROM_EMAIL is not set.
 * Never throws — payment flow must not fail because of an email error.
 */
export async function sendBuyerEmail(
  to: string,
  type: BuyerEmailType,
  data: BuyerEmailData
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
        });
        break;
      case 'deposit_confirmed':
        emailElement = React.createElement(DepositConfirmedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
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
        });
        break;
      case 'delivered':
        emailElement = React.createElement(DeliveredEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
        });
        break;
      case 'refunded':
        emailElement = React.createElement(RefundedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
        });
        break;
      case 'auto_cancelled':
        emailElement = React.createElement(AutoCancelledEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
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
      { apiKey, from, to, subject: BUYER_EMAIL_SUBJECTS[type], html },
      `[buyer-email:${type}]`
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
