import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { BRAND_COLORS } from '@/lib/colors';

export const runtime = 'nodejs';
export const alt = '오윤 40주기 추도식 — 2026년 7월 5일, 인사동';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

// 오윤 〈칼노래〉(1985) — 대표 목판화. raw object URL은 .webp라 Satori 직임베드 불가 →
// render 엔드포인트(jpeg) 경유 + 포맷 가드(아래 fetch 블록).
const KALNORAE_IMG =
  'https://khtunrybrzntlnowlahb.supabase.co/storage/v1/object/public/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8/151__original.webp';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Image({ params }: Props) {
  const { locale } = await params;
  const isEn = locale === 'en';

  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const accent = BRAND_COLORS.primary.DEFAULT;

  // 대표 작품 이미지 로드 (webp/avif는 sharp로 jpeg 트랜스코드 — Satori 미지원)
  let artImage: string | null = null;
  try {
    const res = await fetch(resolveSeoArtworkImageUrl(KALNORAE_IMG), {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const mime = res.headers.get('content-type') ?? 'image/jpeg';
      const buf = Buffer.from(await res.arrayBuffer());
      if (mime.includes('webp') || mime.includes('avif')) {
        const sharp = (await import('sharp')).default;
        const jpeg = await sharp(buf)
          .resize({ width: 880, withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        artImage = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
      } else {
        artImage = `data:${mime};base64,${buf.toString('base64')}`;
      }
    }
  } catch {
    // 텍스트 카드로 폴백
  }

  const title = isEn ? 'Oh Yoon 40th Memorial' : '오윤 40주기 추도식';
  const dateLine = isEn ? 'Sun, Jul 5, 2026 · departs Insadong' : '2026. 7. 5. (일) · 인사동 출발';
  const sub = isEn
    ? 'Oh Yoon 1946–1986 · Master of Korean Minjung art'
    : '오윤 1946–1986 · 한국 민중미술의 거장';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BRAND_COLORS.charcoal.deep,
          fontFamily: 'NotoSansKR',
        }}
      >
        {/* Left: 칼노래 */}
        <div
          style={{
            width: '440px',
            height: '100%',
            flexShrink: 0,
            backgroundColor: BRAND_COLORS.gallery.well,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {artImage ? (
            <img
              src={artImage}
              alt="오윤 칼노래"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '40px' }}
            />
          ) : (
            <div style={{ fontSize: '64px' }}>🕯️</div>
          )}
        </div>

        {/* Right: 텍스트 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 60px',
            borderLeft: `6px solid ${accent}`,
          }}
        >
          <div
            style={{
              alignSelf: 'flex-start',
              backgroundColor: accent,
              color: 'white',
              padding: '8px 22px',
              borderRadius: '100px',
              fontSize: '24px',
              fontWeight: 700,
            }}
          >
            {isEn ? 'Memorial' : '추도식'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                fontSize: '76px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, color: BRAND_COLORS.sun.DEFAULT }}>
              {dateLine}
            </div>
            <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.75)' }}>{sub}</div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '22px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: accent,
              }}
            />
            {isEn ? 'SAF 2026' : '씨앗페 2026'}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'NotoSansKR', data: fontData, style: 'normal', weight: 700 }],
    }
  );
}
