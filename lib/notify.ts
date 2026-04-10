/**
 * Payment notification and buyer confirmation emails via Resend API.
 * Reads RESEND_API_KEY from env — no-op when unset (safe for dev/test).
 */

type NotifyLevel = 'payment' | 'warning' | 'error' | 'info';

const LEVEL_CONFIG: Record<NotifyLevel, { emoji: string; color: string }> = {
  payment: { emoji: '💳', color: '#22c55e' },
  warning: { emoji: '⚠️', color: '#f59e0b' },
  error: { emoji: '🚨', color: '#ef4444' },
  info: { emoji: 'ℹ️', color: '#3b82f6' },
};

const TD_KEY =
  'padding:10px 14px;font-weight:600;color:#374151;background:#f9fafb;width:110px;border-bottom:1px solid #f3f4f6;vertical-align:top;';
const TD_VAL = 'padding:10px 14px;color:#111827;border-bottom:1px solid #f3f4f6;';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatKoreanDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
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
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) return;

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
      <p style="margin:0;font-size:12px;color:#9ca3af;">SAF 결제 시스템 • ${timestamp}</p>
    </div>
  </div>
</body>
</html>`;

  await resendFetch({ apiKey, from, to, subject: `${emoji} [SAF] ${title}`, html }, '[notify]');
}

type BuyerEmailType = 'payment_confirmed' | 'virtual_account_issued' | 'deposit_confirmed';

interface BuyerEmailData {
  orderNo: string;
  buyerName: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  paymentMethod?: string;
  virtualAccount?: { bankName?: string; accountNumber?: string; dueDate?: string };
}

/**
 * Sends a buyer-facing confirmation email via Resend.
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

  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const amountStr = `₩${data.amount.toLocaleString()}`;
  const safeArtwork = escapeHtml(`${data.artworkTitle} (${data.artistName})`);
  const safeName = escapeHtml(data.buyerName);
  const safeOrderNo = escapeHtml(data.orderNo);

  const SUBJECTS: Record<BuyerEmailType, string> = {
    payment_confirmed: '[씨앗페] 결제가 완료되었습니다',
    virtual_account_issued: '[씨앗페] 가상계좌 입금 안내',
    deposit_confirmed: '[씨앗페] 입금이 확인되었습니다',
  };

  const HEADER_COLORS: Record<BuyerEmailType, string> = {
    payment_confirmed: '#22c55e',
    virtual_account_issued: '#3b82f6',
    deposit_confirmed: '#22c55e',
  };

  const va = data.virtualAccount;
  const vaRows =
    type === 'virtual_account_issued' && va
      ? `
      <tr><td style="${TD_KEY}">은행</td><td style="${TD_VAL}">${escapeHtml(va.bankName ?? '')}</td></tr>
      <tr><td style="${TD_KEY}">계좌번호</td><td style="${TD_VAL}">${escapeHtml(va.accountNumber ?? '')}</td></tr>
      ${va.dueDate ? `<tr><td style="${TD_KEY}">입금 기한</td><td style="${TD_VAL}">${escapeHtml(formatKoreanDate(va.dueDate))}</td></tr>` : ''}
      `
      : '';

  const paymentMethodRow =
    type === 'payment_confirmed' && data.paymentMethod
      ? `<tr><td style="${TD_KEY}">결제수단</td><td style="${TD_VAL}">${escapeHtml(data.paymentMethod)}</td></tr>`
      : '';

  const bodyMessage: Record<BuyerEmailType, string> = {
    payment_confirmed: `${safeName}님의 결제가 정상적으로 완료되었습니다. 감사합니다.`,
    virtual_account_issued: `${safeName}님, 아래 가상계좌로 입금해 주시면 주문이 확정됩니다.`,
    deposit_confirmed: `${safeName}님의 입금이 확인되어 주문이 최종 확정되었습니다. 감사합니다.`,
  };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${HEADER_COLORS[type]};padding:20px 28px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">${SUBJECTS[type]}</p>
    </div>
    <div style="padding:20px 28px 8px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;">${bodyMessage[type]}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <tbody>
          <tr><td style="${TD_KEY}">주문번호</td><td style="${TD_VAL}">${safeOrderNo}</td></tr>
          <tr><td style="${TD_KEY}">작품</td><td style="${TD_VAL}">${safeArtwork}</td></tr>
          <tr><td style="${TD_KEY}">결제금액</td><td style="${TD_VAL};font-weight:700;">${escapeHtml(amountStr)}</td></tr>
          ${paymentMethodRow}
          ${vaRows}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 28px 20px;background:#f9fafb;border-top:1px solid #f3f4f6;margin-top:12px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">씨앗페 2026 • ${timestamp}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">문의: contact@kosmart.org</p>
    </div>
  </div>
</body>
</html>`;

  await resendFetch({ apiKey, from, to, subject: SUBJECTS[type], html }, `[buyer-email:${type}]`);
}

async function resendFetch(
  opts: { apiKey: string; from: string; to: string; subject: string; html: string },
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
