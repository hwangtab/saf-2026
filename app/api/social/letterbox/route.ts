import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { SITE_URL } from '@/lib/constants';
import { LETTERBOX_BACKGROUND, LETTERBOX_SIZE, needsLetterbox } from '@/lib/social/letterbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Instagram 게시용 이미지 종횡비 안전화 프록시.
 *
 * Instagram Graph가 `image_url`로 이 라우트를 fetch한다. 원본 이미지의 픽셀 종횡비가
 * Instagram 허용 범위(0.8~1.91:1)를 벗어나면(가로/세로로 긴 작품) "The aspect ratio is
 * not supported." 로 거부되므로, 1:1 흰 캔버스에 contain 패딩(letterbox)해 반환한다.
 * 허용 범위 안이면 원본을 그대로 통과(불필요한 재인코딩 회피).
 *
 * `src`는 임의 URL fetch(SSRF) 방지를 위해 신뢰 호스트만 허용한다.
 */

function isAllowedHost(src: string): boolean {
  let host: string;
  try {
    host = new URL(src).hostname;
  } catch {
    return false;
  }
  if (host.endsWith('.supabase.co')) return true;
  try {
    const siteHost = new URL(SITE_URL).hostname;
    if (host === siteHost) return true;
  } catch {
    // SITE_URL 파싱 실패는 무시
  }
  return host === 'saf2026.com' || host === 'www.saf2026.com';
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) {
    return NextResponse.json({ error: 'src 파라미터가 필요합니다.' }, { status: 400 });
  }
  if (!isAllowedHost(src)) {
    return NextResponse.json({ error: '허용되지 않은 이미지 호스트입니다.' }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(src);
  } catch {
    return NextResponse.json({ error: '원본 이미지를 가져오지 못했습니다.' }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `원본 이미지 응답 오류 (${upstream.status}).` },
      { status: 502 }
    );
  }

  const inputBuffer = Buffer.from(await upstream.arrayBuffer());

  let meta: sharp.Metadata;
  try {
    meta = await sharp(inputBuffer).metadata();
  } catch {
    return NextResponse.json({ error: '이미지를 해석하지 못했습니다.' }, { status: 422 });
  }

  // CDN/Instagram 캐시: 하루. 변환·통과 공통.
  const cacheControl = 'public, max-age=86400, s-maxage=86400';

  // 허용 범위 안이면 원본 그대로 통과(재인코딩 없음).
  if (!needsLetterbox(meta.width ?? 0, meta.height ?? 0)) {
    return new NextResponse(new Uint8Array(inputBuffer), {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': cacheControl,
      },
    });
  }

  // 1:1 흰 캔버스에 contain 패딩(letterbox) → JPEG.
  let output: Buffer;
  try {
    output = await sharp(inputBuffer)
      .resize(LETTERBOX_SIZE, LETTERBOX_SIZE, {
        fit: 'contain',
        background: LETTERBOX_BACKGROUND,
      })
      .flatten({ background: LETTERBOX_BACKGROUND }) // 투명 PNG 등 알파 제거 → 흰 배경
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: '이미지 변환에 실패했습니다.' }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(output), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': cacheControl,
    },
  });
}
