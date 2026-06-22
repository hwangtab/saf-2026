import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/security/get-client-ip';

export const runtime = 'nodejs';

// 이메일 prefetch bot(Outlook SafeLinks, Gmail Image Proxy 등)이 자동으로 unsub되는 사고 방지.
// RFC 8058 권고 패턴: GET은 확인 폼 노출, POST에서만 실제 suppression 처리.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) {
    return htmlResponse('잘못된 수신거부 링크입니다.', 400);
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return htmlResponse('링크가 유효하지 않거나 만료되었습니다.', 400);
  }

  return confirmFormResponse(token, parsed.channel);
}

export async function POST(request: NextRequest) {
  // 토큰은 HMAC으로 위변조 불가하나, 유효 토큰 유출 시 반복 POST 방어용 IP rate-limit(분산).
  const ip = getClientIp(request.headers);
  const rl = await rateLimit(`unsubscribe:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.success) {
    return htmlResponse('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);
  }

  // RFC 8058 List-Unsubscribe-Post: token은 form-data 또는 query에서 받음.
  const formData = await request.formData().catch(() => null);
  const token = formData?.get('t')?.toString() ?? request.nextUrl.searchParams.get('t') ?? null;

  if (!token) {
    return htmlResponse('잘못된 수신거부 링크입니다.', 400);
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return htmlResponse('링크가 유효하지 않거나 만료되었습니다.', 400);
  }

  const { emailHash, channel } = parsed;

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return htmlResponse('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }

  const { error: suppressError } = await supabase
    .from('email_suppressions')
    .upsert(
      { email_hash: emailHash, channel, reason: 'unsubscribe' },
      { onConflict: 'email_hash,channel', ignoreDuplicates: true }
    );

  if (suppressError) {
    console.error('[unsubscribe] suppression upsert error:', suppressError);
    return htmlResponse('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }

  return htmlResponse(
    channel === 'customer'
      ? '광고 이메일 수신거부가 완료되었습니다. 향후 씨앗페 마케팅 이메일을 받지 않습니다.'
      : '수신거부가 완료되었습니다. 해당 채널의 이메일을 더 이상 받지 않습니다.',
    200,
    true
  );
}

function confirmFormResponse(token: string, channel: string): NextResponse {
  const labels: Record<string, string> = {
    customer: '광고/마케팅',
    member: '작가·출품자 업무',
    petition: '청원 캠페인 알림',
    individual: '개별 발송',
  };
  const channelLabel = labels[channel] ?? channel;
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>수신거부 확인</title>
</head>
<body style="margin:0;padding:40px 20px;font-family:system-ui,sans-serif;background:#fafafc;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="font-size:36px;margin-bottom:16px;">📭</div>
    <h1 style="margin:0 0 12px;font-size:20px;color:#0E4ECF;">${channelLabel} 이메일 수신거부</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
      아래 버튼을 클릭하면 ${channelLabel} 채널의 이메일 수신이 즉시 중단됩니다.
    </p>
    <form method="POST" action="/api/email/unsubscribe">
      <input type="hidden" name="t" value="${token}">
      <button type="submit" style="display:inline-block;padding:12px 32px;background:#0E4ECF;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
        수신거부 확정
      </button>
    </form>
    <p style="margin:20px 0 0;font-size:12px;color:#888;">씨앗페 2026 · contact@kosmart.org</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function htmlResponse(message: string, status: number, success = false): NextResponse {
  const color = success ? '#2176FF' : '#cc3333';
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>수신거부 ${success ? '완료' : '오류'}</title>
</head>
<body style="margin:0;padding:40px 20px;font-family:system-ui,sans-serif;background:#fafafc;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="font-size:36px;margin-bottom:16px;">${success ? '✅' : '❌'}</div>
    <h1 style="margin:0 0 12px;font-size:20px;color:${color};">수신거부 ${success ? '완료' : '오류'}</h1>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">${message}</p>
    <p style="margin:20px 0 0;font-size:12px;color:#888;">씨앗페 2026 · contact@kosmart.org</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
