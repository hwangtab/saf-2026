/**
 * 청원 영수증 / 안내 메일 발송 헬퍼.
 *
 * Resend API를 사용한다. RESEND_API_KEY가 설정되지 않은 환경(로컬·스테이징)에서는
 * 로그만 남기고 graceful skip 한다.
 */

interface SendReceiptParams {
  to: string;
  fullName: string;
  petitionUrl: string;
}

interface SendResult {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
}

const DEFAULT_FROM = '청원 운영팀 <petition@kosmart.org>';

export async function sendPetitionReceipt({
  to,
  fullName,
  petitionUrl,
}: SendReceiptParams): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PETITION_MAIL_FROM ?? DEFAULT_FROM;

  if (!apiKey) {
    console.warn('[petition/mail] RESEND_API_KEY 미설정 — 영수증 메일 발송 skip (to=%s)', to);
    return { ok: false, skipped: true };
  }

  const subject = '서명 확인 — 오윤 구의동 벽화 시민 청원';
  const html = receiptHtml({ fullName, petitionUrl });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(
        '[petition/mail] receipt send failed status=%s body=%s',
        res.status,
        body.slice(0, 200)
      );
      return { ok: false, status: res.status, error: body.slice(0, 200) };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    console.error('[petition/mail] receipt send error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

function receiptHtml(params: { fullName: string; petitionUrl: string }) {
  const safeName = escapeHtml(params.fullName);
  const safeUrl = escapeHtml(params.petitionUrl);
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>서명 확인 — 오윤 구의동 벽화 시민 청원</title></head>
<body style="margin:0;padding:24px;background:#FAFAFC;font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1F2428;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E0E0E0;">
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
      ${safeName} 님, 서명해 주셔서 감사합니다.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#31393C;margin:0 0 16px;">
      오윤이 1974년에 만든 테라코타가 50년 만에 멸실될 위기에 처해 있습니다.
      차기 서울시장께서 안전한 해체·보존·이관을 해결해 주시기를 청합니다.
      이 청원을 다섯 분께만 더 전해 주시면, 5월 10일까지 1만 명의 이름이 모입니다.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#31393C;margin:0 0 24px;">
      청원 진행 상황은 이 메일 주소로 정중히 알려드리겠습니다.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#0E4ECF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        청원 페이지로 이동
      </a>
    </p>
    <hr style="border:none;border-top:1px solid #E0E0E0;margin:24px 0;">
    <p style="font-size:12px;color:#707A84;margin:0;">
      한국스마트협동조합 (예술인협동조합) · 씨앗페 SAF2026 운영
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
