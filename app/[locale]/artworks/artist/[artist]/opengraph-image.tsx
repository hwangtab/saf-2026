import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import { parseArtworkPrice, resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { CATEGORY_EN_MAP } from '@/lib/artwork-category';
import { BRAND_COLORS } from '@/lib/colors';

export const runtime = 'nodejs';
export const alt =
  'Korean contemporary artist on SAF Online — full artwork collection with prices, mediums, and bio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; artist: string }>;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

export default async function Image({ params }: Props) {
  const { locale, artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artworks = await getSupabaseArtworksByArtist(artistName);

  const isEn = locale === 'en';
  const displayArtist = isEn && artworks[0]?.artist_en ? artworks[0].artist_en : artistName;
  const count = artworks.length;
  const availableCount = artworks.filter((a) => !a.sold).length;

  // 가격 범위
  const prices = artworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  // 대표 카테고리
  const categoryCounts = artworks.reduce<Record<string, number>>((acc, a) => {
    if (a.category) acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});
  const primaryCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const categoryLabel = primaryCategory
    ? isEn
      ? CATEGORY_EN_MAP[primaryCategory] || primaryCategory
      : primaryCategory
    : null;

  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const accentColor = BRAND_COLORS.primary.DEFAULT;
  const displayName = truncate(displayArtist, 24);

  // 대표 작품 이미지 — 판매 중 우선
  const repArtwork = artworks.find((a) => !a.sold && a.images?.[0]) || artworks[0];
  // ⚠️ raw object URL(92%가 .webp) 직결 금지 — Satori(@vercel/og)는 webp 미지원이라
  // 임베드 시 라우트 전체가 500. render 엔드포인트(jpeg 트랜스코드) 경유 + 포맷 가드.
  const rawImageUrl = repArtwork?.images?.[0];
  const imageUrl = rawImageUrl ? resolveSeoArtworkImageUrl(rawImageUrl) : undefined;

  let artworkImageData: string | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const mime = res.headers.get('content-type') ?? 'image/jpeg';
        const buf = Buffer.from(await res.arrayBuffer());
        if (mime.includes('webp') || mime.includes('avif')) {
          // Satori 미지원 포맷은 sharp로 jpeg 트랜스코드 (2026-06-12 리뷰 — 환경변수
          // 미설정으로 raw webp가 와도 카드 이미지가 조용히 소실되지 않도록)
          const sharp = (await import('sharp')).default;
          // 840px(카드 표시폭의 2x)로 리사이즈 — 풀해상도 트랜스코드 CPU/메모리 bound (2차 리뷰)
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
      // fallthrough (sharp 실패 포함 — 텍스트 카드로 폴백)
    }
  }

  const priceRangeText =
    minPrice !== null && maxPrice !== null
      ? minPrice === maxPrice
        ? `₩${minPrice.toLocaleString('ko-KR')}`
        : `₩${minPrice.toLocaleString('ko-KR')}~${maxPrice.toLocaleString('ko-KR')}`
      : null;

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
              alt={displayArtist}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: '60px', color: BRAND_COLORS.gray[400] }}>🎨</div>
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
          {/* Top: 카테고리 + 작품수 */}
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
              {isEn ? `${count} works` : `작품 ${count}점`}
            </div>
          </div>

          {/* Middle: 작가명 + 가격대 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              flex: 1,
              justifyContent: 'center',
              paddingTop: '24px',
              paddingBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                color: BRAND_COLORS.charcoal.muted,
                fontWeight: 400,
              }}
            >
              {isEn ? 'Artist' : '작가'}
            </div>
            <div
              style={{
                fontSize: displayName.length > 12 ? '60px' : '72px',
                fontWeight: 700,
                color: BRAND_COLORS.charcoal.deep,
                lineHeight: 1.15,
                letterSpacing: '-0.5px',
              }}
            >
              {displayName}
            </div>
            {priceRangeText && (
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: accentColor,
                  marginTop: '8px',
                }}
              >
                {priceRangeText}
              </div>
            )}
            {availableCount > 0 && (
              <div
                style={{
                  fontSize: '22px',
                  color: BRAND_COLORS.charcoal.muted,
                  fontWeight: 400,
                }}
              >
                {isEn
                  ? `${availableCount} available · Direct from artist`
                  : `${availableCount}점 구매 가능 · 작가 직매`}
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
