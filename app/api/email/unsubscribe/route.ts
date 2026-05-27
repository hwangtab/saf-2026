import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) {
    return htmlResponse('잘못된 수신거부 링크입니다.', 400);
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return htmlResponse('링크가 유효하지 않거나 만료되었습니다.', 400);
  }

  const { emailHash, channel } = parsed;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return htmlResponse('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500);
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;

  const { error: suppressError } = await supabase
    .from('email_suppressions')
    .upsert(
      { email_hash: emailHash, channel, reason: 'unsubscribe' },
      { onConflict: 'email_hash,channel', ignoreDuplicates: true }
    );

  if (suppressError) {
    console.error('[unsubscribe] suppression upsert error:', suppressError);
    return htmlResponse('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500);
  }

  return htmlResponse(
    channel === 'customer'
      ? '광고 이메일 수신거부가 완료되었습니다. 향후 씨앗페 마케팅 이메일을 받지 않습니다.'
      : '수신거부가 완료되었습니다. 해당 채널의 이메일을 더 이상 받지 않습니다.',
    200,
    true
  );
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
