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
import BankTransferIssuedEmail from '@/emails/bank-transfer-issued';
import DepositConfirmedEmail from '@/emails/deposit-confirmed';
import ShippedEmail from '@/emails/shipped';
import DeliveredEmail from '@/emails/delivered';
import RefundedEmail from '@/emails/refunded';
import AutoCancelledEmail from '@/emails/auto-cancelled';
import type { EmailLocale } from '@/emails/_components/i18n';
import { signOrderAccessToken } from '@/lib/email/order-access-token';
import { buildReplyToAddress } from '@/lib/email/inbound';
import { createSupabaseAdminClient } from '@/lib/auth/server';

type NotifyLevel = 'payment' | 'warning' | 'error' | 'info';

/**
 * 트랜잭션 이메일 발송 결과를 email_logs에 기록(실패 가시성·재발송). sms_logs 대칭.
 * 기록 실패가 이메일 발송 결과에 영향 주지 않도록 삼킨다. service-role write.
 */
async function recordEmailLog(entry: {
  orderNo?: string | null;
  to: string;
  type: string;
  subject: string;
  result: ResendResult;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('email_logs').insert({
      order_no: entry.orderNo ?? null,
      to_email: entry.to,
      type: entry.type,
      subject: entry.subject,
      provider: 'resend',
      provider_message_id: entry.result.id,
      status: entry.result.ok ? 'sent' : 'failed',
      error: entry.result.error,
    });
  } catch (err) {
    console.error(`[email-log:${entry.type}] insert failed:`, err);
  }
}

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
 * 알림 필드 값(value)을 HTML로 렌더한다.
 * 1) http(s) URL을 클릭 가능한 <a>로 → 2) 나머지는 escape로 XSS 방지 → 3) 줄바꿈(\n)을 <br>로.
 * 관리자페이지 링크가 모든 알림 메일에서 클릭 가능해지고, 만료 알림처럼 한 항목에
 * 여러 줄(작품/구매자/금액/링크)을 담는 멀티라인 값도 표현 가능.
 *
 * 보안: URL은 escape 이전의 RAW 값에서 URL-safe 문자만(따옴표·꺾쇠·공백 제외) 매칭하므로
 * 속성 경계를 깰 문자가 매칭에 포함될 수 없다. href와 표시 텍스트 모두 escapeHtml로 인코딩
 * (escapeHtml은 `&`도 `&amp;`로 변환 → entity가 속성 안에서 `"`로 디코딩되는 탈출도 차단).
 * 비-URL 구간도 escapeHtml 처리.
 */
function renderFieldValue(value: string): string {
  const urlRe = /https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/g;
  let html = '';
  let lastIndex = 0;
  for (let m = urlRe.exec(value); m !== null; m = urlRe.exec(value)) {
    html += escapeHtml(value.slice(lastIndex, m.index));
    const url = m[0];
    html += `<a href="${escapeHtml(url)}" style="color:${BRAND_COLORS.primary.strong};text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a>`;
    lastIndex = m.index + url.length;
  }
  html += escapeHtml(value.slice(lastIndex));
  return html.replace(/\n/g, '<br>');
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
        <td style="padding:6px 12px;font-weight:600;color:${BRAND_COLORS.charcoal.muted};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${BRAND_COLORS.gallery.hairline};">${escapeHtml(key)}</td>
        <td style="padding:6px 12px;color:${BRAND_COLORS.charcoal.deep};word-break:break-word;border-bottom:1px solid ${BRAND_COLORS.gallery.hairline};">${renderFieldValue(value)}</td>
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
  | 'bank_transfer_issued'
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
  virtualAccount?: {
    bankName?: string;
    accountNumber?: string;
    holderName?: string;
    dueDate?: string;
  };
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
    payment_confirmed: '[씨앗페] 감사합니다. 작품을 준비하고 있습니다',
    virtual_account_issued: '[씨앗페] 가상계좌 입금 안내',
    bank_transfer_issued: '[씨앗페] 계좌이체 입금 안내',
    deposit_confirmed: '[씨앗페] 입금이 확인되었습니다. 작품을 준비하고 있습니다',
    shipped: '[씨앗페] 작품이 발송되었습니다',
    delivered: '[씨앗페] 작품이 배송 완료되었습니다',
    refunded: '[씨앗페] 환불이 처리되었습니다',
    auto_cancelled: '[씨앗페] 주문이 자동 취소되었습니다',
  },
  en: {
    payment_confirmed: "[SAF] Thank you. We're preparing your artwork",
    virtual_account_issued: '[SAF] Virtual account deposit instructions',
    bank_transfer_issued: '[SAF] Bank transfer deposit instructions',
    deposit_confirmed: '[SAF] Deposit confirmed — preparing your artwork',
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
): Promise<ResendResult | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return null;

  // 이메일 → 원클릭 주문조회 링크. 서명 토큰이라 로그인·재입력 없이 상세로 직행.
  // 진행형 5종에만 전달(환불·취소는 종료 주문이라 제외). secret 미설정 시 undefined → 버튼 미표시.
  const orderToken = signOrderAccessToken(data.orderNo);
  const orderUrl = orderToken
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com'}/orders?token=${orderToken}`
    : undefined;

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
          orderUrl,
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
          orderUrl,
          locale,
        });
        break;
      case 'bank_transfer_issued':
        emailElement = React.createElement(BankTransferIssuedEmail, {
          buyerName: data.buyerName,
          orderNo: data.orderNo,
          artworkTitle: data.artworkTitle,
          artistName: data.artistName,
          amount: data.amount,
          bankTransfer: data.virtualAccount ?? {},
          orderUrl,
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
          orderUrl,
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
          orderUrl,
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
          orderUrl,
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
        return null;
      }
    }

    const html = await render(emailElement);
    const subject = BUYER_EMAIL_SUBJECTS[locale][type];
    const result = await resendFetch(
      {
        apiKey,
        from,
        to,
        subject,
        html,
        reply_to: buildReplyToAddress(),
      },
      `[buyer-email:${type}:${locale}]`
    );
    await recordEmailLog({ orderNo: data.orderNo, to, type, subject, result });
    return result;
  } catch (err) {
    console.error(`[buyer-email:${type}] render/send failed:`, err);
    const errResult: ResendResult = {
      ok: false,
      id: null,
      error: err instanceof Error ? err.message : String(err),
    };
    await recordEmailLog({
      orderNo: data.orderNo,
      to,
      type,
      subject: BUYER_EMAIL_SUBJECTS[locale]?.[type] ?? '',
      result: errResult,
    });
    return errResult;
  }
}

/**
 * 작가 계정 활성화 안내 이메일을 작가 본인에게 발송한다.
 * admin 알림(notifyEmail)과 달리 NOTIFY_EMAIL_TO가 아닌 지정 수신자에게 발송.
 */
export async function sendArtistApprovalEmail(to: string, artistName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return;

  const safeArtistName = escapeHtml(artistName);
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com'}/dashboard`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND_COLORS.canvas.DEFAULT};font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI','Malgun Gothic','Noto Sans KR',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:${BRAND_COLORS.gallery.canvas};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${BRAND_COLORS.primary.strong};padding:16px 24px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">씨앗페 2026 작가 계정 안내</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:${BRAND_COLORS.charcoal.deep};">${safeArtistName} 선생님, 안녕하세요.</p>
      <p style="margin:0 0 16px;font-size:14px;color:${BRAND_COLORS.charcoal.DEFAULT};line-height:1.6;">
        씨앗페 작가 대시보드 이용 안내를 드립니다.<br>
        아래 링크에서 작품을 등록하고 프로필을 관리할 수 있습니다.
      </p>
      <a href="${dashboardUrl}" style="display:inline-block;background:${BRAND_COLORS.primary.DEFAULT};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">작가 대시보드 바로가기</a>
    </div>
    <div style="padding:12px 24px;background:${BRAND_COLORS.canvas.DEFAULT};border-top:1px solid ${BRAND_COLORS.gallery.hairline};">
      <p style="margin:0;font-size:12px;color:${BRAND_COLORS.gray[400]};">씨앗페 2026 · 한국스마트협동조합 · 문의: contact@kosmart.org</p>
    </div>
  </div>
</body>
</html>`;

  // 작가 승인 이메일은 관리자가 명시적으로 발송하는 액션 — 실패 시 throw해서 감사 로그에 허위 성공 기록 방지
  const subject = '[씨앗페] 작가 대시보드 이용 안내';
  const result = await resendFetch(
    {
      apiKey,
      from,
      to,
      subject,
      html,
      reply_to: buildReplyToAddress(),
    },
    '[artist-approval]'
  );
  await recordEmailLog({ to, type: 'artist_approval', subject, result });
  if (!result.ok) throw new Error('이메일 발송에 실패했습니다. Resend API 응답을 확인하세요.');
}

/**
 * 작가 신청 반려 안내 메일. 승인 메일 레이아웃을 미러하되 사유는 담지 않고 정중히 안내한다.
 * rejectUser의 after() 안에서 비차단 호출되므로 실패해도 throw하지 않는다(반려 DB는 이미 커밋).
 */
export async function sendArtistRejectionEmail(to: string, artistName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return;

  const safeArtistName = escapeHtml(artistName);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND_COLORS.canvas.DEFAULT};font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI','Malgun Gothic','Noto Sans KR',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:${BRAND_COLORS.gallery.canvas};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${BRAND_COLORS.primary.strong};padding:16px 24px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">씨앗페 2026 작가 신청 안내</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:${BRAND_COLORS.charcoal.deep};">${safeArtistName} 선생님, 안녕하세요.</p>
      <p style="margin:0 0 16px;font-size:14px;color:${BRAND_COLORS.charcoal.DEFAULT};line-height:1.6;">
        씨앗페 2026 작가 신청에 관심을 가져주셔서 진심으로 감사드립니다.<br>
        신중히 검토한 결과, 이번에는 함께하기 어렵게 되었음을 정중히 안내드립니다.<br>
        보내주신 관심에 다시 한 번 깊이 감사드리며, 다음 기회에 다시 뵙기를 바랍니다.
      </p>
      <p style="margin:0;font-size:14px;color:${BRAND_COLORS.charcoal.DEFAULT};line-height:1.6;">
        문의사항은 <a href="mailto:contact@kosmart.org" style="color:${BRAND_COLORS.primary.strong};">contact@kosmart.org</a> 로 연락 주시면 정성껏 답변드리겠습니다.
      </p>
    </div>
    <div style="padding:12px 24px;background:${BRAND_COLORS.canvas.DEFAULT};border-top:1px solid ${BRAND_COLORS.gallery.hairline};">
      <p style="margin:0;font-size:12px;color:${BRAND_COLORS.gray[400]};">씨앗페 2026 · 한국스마트협동조합 · 문의: contact@kosmart.org</p>
    </div>
  </div>
</body>
</html>`;

  const subject = '[씨앗페] 작가 신청 안내';
  const result = await resendFetch(
    {
      apiKey,
      from,
      to,
      subject,
      html,
      reply_to: buildReplyToAddress(),
    },
    '[artist-rejection]'
  );
  await recordEmailLog({ to, type: 'artist_rejection', subject, result });
  // after() 비차단 발송이므로 실패해도 throw하지 않고 로그만 남긴다.
  if (!result.ok) {
    console.error('[artist-rejection] 이메일 발송 실패:', result.error);
  }
}

/** Resend 이메일 전송 — 5초 타임아웃 + 429/5xx·네트워크 1회 재시도. never throw, boolean 반환. */
export type ResendResult = { ok: boolean; id: string | null; error: string | null };

export async function resendFetch(
  opts: {
    apiKey: string;
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    reply_to?: string;
  },
  logPrefix: string
): Promise<ResendResult> {
  let lastError: string | null = null;
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
          ...(opts.reply_to ? { reply_to: opts.reply_to } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { id?: string } | null;
        return { ok: true, id: json?.id ?? null, error: null };
      }

      const body = await res.text();
      lastError = `${res.status}: ${body.slice(0, 300)}`;

      // 429 또는 5xx → 1회 재시도
      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(`${logPrefix} Resend ${res.status}, retrying in 1s: ${body.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      console.error(`${logPrefix} Resend returned ${res.status}: ${body.slice(0, 500)}`);
      return { ok: false, id: null, error: lastError };
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err.message : String(err);

      // 타임아웃/네트워크 에러 → 1회 재시도
      if (attempt === 0) {
        console.error(`${logPrefix} Resend failed, retrying in 1s:`, err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      console.error(`${logPrefix} Resend email failed after retry:`, err);
      return { ok: false, id: null, error: lastError };
    }
  }
  return { ok: false, id: null, error: lastError ?? 'unknown' };
}
