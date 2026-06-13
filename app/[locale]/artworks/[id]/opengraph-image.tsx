import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { getTranslations } from 'next-intl/server';
import { getSupabaseArtworkById } from '@/lib/supabase-data';
import { parseArtworkPrice, resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { getCategoryLabel } from '@/lib/artwork-category';
import { BRAND_COLORS } from '@/lib/colors';

export const runtime = 'nodejs';
export const alt =
  'Korean contemporary artwork on SAF Online — original painting, print, photography, or sculpture';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function formatPrice(price: string | null | undefined): string | null {
  if (!price) return null;
  const num = parseArtworkPrice(price);
  if (num === null) return null;
  return `₩${num.toLocaleString('ko-KR')}`;
}

export default async function Image({ params }: Props) {
  const { locale, id } = await params;
  const [artwork, tCard] = await Promise.all([
    getSupabaseArtworkById(id),
    getTranslations({ locale, namespace: 'artworkCard' }),
  ]);

  const isEn = locale === 'en';
  const title = (isEn && artwork?.title_en ? artwork.title_en : artwork?.title) ?? 'SAF 2026';
  const artist = (isEn && artwork?.artist_en ? artwork.artist_en : artwork?.artist) ?? '';
  const category = artwork?.category ?? '';
  const categoryLabel = category ? getCategoryLabel(category, isEn ? 'en' : 'ko') : '';
  const price = formatPrice(artwork?.price);
  const isSold = artwork?.sold ?? false;
  // ⚠️ raw object URL(92%가 .webp) 직결 금지 — Satori(@vercel/og)는 png/apng/jpeg/gif/svg만
  // 지원해 webp 임베드 시 'Unsupported image type' throw로 라우트 전체가 500이 된다
  // (2026-06-12 라이브 실측). Supabase render 엔드포인트는 format 미지정 시 jpeg로
  // 트랜스코드해 반환하므로 SEO 이미지 해상 함수를 경유한다.
  const rawImageUrl = artwork?.images?.[0];
  const imageUrl = rawImageUrl ? resolveSeoArtworkImageUrl(rawImageUrl) : undefined;

  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const accentColor = BRAND_COLORS.primary.DEFAULT;
  const displayTitle = truncate(title, 40);
  const displayArtist = truncate(artist, 30);

  // Fetch artwork image for embedding
  let artworkImageData: string | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const mime = res.headers.get('content-type') ?? 'image/jpeg';
        const buf = Buffer.from(await res.arrayBuffer());
        if (mime.includes('webp') || mime.includes('avif')) {
          // Satori 미지원 포맷은 sharp로 jpeg 트랜스코드 — render 엔드포인트가
          // NEXT_PUBLIC_SUPABASE_RENDER_TRANSFORM 미설정 환경에서 raw webp를 그대로
          // 반환해도 카드 이미지가 조용히 소실되지 않도록 (2026-06-12 리뷰).
          const sharp = (await import('sharp')).default;
          // 840px(카드 표시폭 420px의 2x)로 리사이즈 — render 엔드포인트 미경유 시 수 MB
          // 원본이 올 수 있어, 풀해상도 트랜스코드+base64 임베드의 CPU/메모리를 bound (2차 리뷰)
          const jpeg = await sharp(buf)
            .resize({ width: 840, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          artworkImageData = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
        } else {
          artworkImageData = `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
    } catch {
      // Fallback: no artwork image (sharp 실패 포함 — 텍스트 카드로 폴백)
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BRAND_COLORS.gallery.canvas,
          fontFamily: 'NotoSansKR',
        }}
      >
        {/* Left: Artwork image */}
        <div
          style={{
            width: '420px',
            height: '100%',
            flexShrink: 0,
            backgroundColor: BRAND_COLORS.gallery.parchment,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {artworkImageData ? (
            <img
              src={artworkImageData}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                fontSize: '60px',
                color: BRAND_COLORS.gray[400],
              }}
            >
              🎨
            </div>
          )}
        </div>

        {/* Right: Text content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '52px 56px',
            borderLeft: `6px solid ${accentColor}`,
          }}
        >
          {/* Top: Category + SOLD badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {categoryLabel && (
              <div
                style={{
                  backgroundColor: accentColor,
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '100px',
                  fontSize: '20px',
                  fontWeight: 700,
                }}
              >
                {categoryLabel}
              </div>
            )}
            {isSold && (
              <div
                style={{
                  backgroundColor: BRAND_COLORS.charcoal.deep,
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '100px',
                  fontSize: '20px',
                  fontWeight: 700,
                }}
              >
                {tCard('soldBadge')}
              </div>
            )}
          </div>

          {/* Middle: Title + Artist */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
              justifyContent: 'center',
              paddingTop: '24px',
              paddingBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: displayTitle.length > 20 ? '44px' : '52px',
                fontWeight: 700,
                color: BRAND_COLORS.charcoal.deep,
                lineHeight: 1.25,
                letterSpacing: '-0.5px',
              }}
            >
              {displayTitle}
            </div>
            {displayArtist && (
              <div
                style={{
                  fontSize: '28px',
                  color: BRAND_COLORS.charcoal.muted,
                  fontWeight: 400,
                }}
              >
                {displayArtist}
              </div>
            )}
            {price && !isSold && (
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: accentColor,
                  marginTop: '8px',
                }}
              >
                {price}
              </div>
            )}
          </div>

          {/* Bottom: SAF branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${BRAND_COLORS.gallery.hairline}`,
              paddingTop: '20px',
            }}
          >
            <div style={{ fontSize: '20px', color: BRAND_COLORS.gray[400], fontWeight: 400 }}>
              {isEn ? 'SAF Online Gallery' : '씨앗페 온라인 갤러리'}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '22px',
                fontWeight: 700,
                color: accentColor,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: accentColor,
                }}
              />
              SAF 2026
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'NotoSansKR',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  );
}
