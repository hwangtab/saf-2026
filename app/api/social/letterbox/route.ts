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
 * 보안(공개 라우트):
 * - SSRF: `src` 호스트를 우리 Supabase 프로젝트·사이트 도메인으로 정확히 화이트리스트.
 * - DoS: 원본 응답 크기(Content-Length·실측)와 sharp 입력 픽셀 수를 상한.
 * - XSS: 응답 Content-Type을 sharp가 판정한 이미지 포맷으로 강제 + nosniff
 *        (upstream Content-Type 그대로 통과 금지 — text/html 주입 차단).
 */

/** 원본 이미지 최대 크기. 작품 사진 기준 넉넉(보통 수백 KB~수 MB). */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** sharp 디코딩 픽셀 상한(decompression bomb 방어). */
const MAX_INPUT_PIXELS = 60_000_000; // 60MP

/** sharp 포맷명 → 안전한 image/* Content-Type. 매핑에 없으면 이미지로 취급하지 않음. */
const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  tiff: 'image/tiff',
};

/** 우리가 fetch를 허용하는 정확한 호스트 집합(SSRF 방어). */
function allowedHosts(): Set<string> {
  const hosts = new Set<string>(['saf2026.com', 'www.saf2026.com']);
  for (const raw of [SITE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      // 파싱 실패 무시
    }
  }
  return hosts;
}

function isAllowedSrc(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  return allowedHosts().has(url.hostname);
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) {
    return NextResponse.json({ error: 'src 파라미터가 필요합니다.' }, { status: 400 });
  }
  if (!isAllowedSrc(src)) {
    return NextResponse.json({ error: '허용되지 않은 이미지 호스트입니다.' }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(src, { redirect: 'error' });
  } catch {
    return NextResponse.json({ error: '원본 이미지를 가져오지 못했습니다.' }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `원본 이미지 응답 오류 (${upstream.status}).` },
      { status: 502 }
    );
  }

  // 크기 상한: 헤더 사전 거부 + 실측 재확인.
  const declaredLength = Number(upstream.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: '원본 이미지가 너무 큽니다.' }, { status: 413 });
  }
  const inputBuffer = Buffer.from(await upstream.arrayBuffer());
  if (inputBuffer.byteLength > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: '원본 이미지가 너무 큽니다.' }, { status: 413 });
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(inputBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    return NextResponse.json({ error: '이미지를 해석하지 못했습니다.' }, { status: 422 });
  }

  const mime = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  if (!mime) {
    // 이미지로 판정되지 않으면(또는 미지원 포맷) 거부 — text/html 등 주입 차단.
    return NextResponse.json({ error: '지원하지 않는 이미지 포맷입니다.' }, { status: 415 });
  }

  // CDN/Instagram 캐시: 하루. 변환·통과 공통. Content-Type은 항상 우리가 판정한 이미지 타입.
  const baseHeaders: Record<string, string> = {
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'X-Content-Type-Options': 'nosniff',
  };

  const hasDimensions = Number.isFinite(meta.width) && Number.isFinite(meta.height);

  // 차원을 알고 허용 범위 안이면 원본 그대로 통과(재인코딩 없음 → 화질 보존).
  // 차원을 모르면(fail-safe) 통과시키지 않고 아래 letterbox 변환으로 강제.
  if (hasDimensions && !needsLetterbox(meta.width as number, meta.height as number)) {
    return new NextResponse(new Uint8Array(inputBuffer), {
      status: 200,
      headers: { ...baseHeaders, 'Content-Type': mime },
    });
  }

  // 1:1 흰 캔버스에 contain 패딩(letterbox) → JPEG.
  let output: Buffer;
  try {
    output = await sharp(inputBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
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
    headers: { ...baseHeaders, 'Content-Type': 'image/jpeg' },
  });
}
