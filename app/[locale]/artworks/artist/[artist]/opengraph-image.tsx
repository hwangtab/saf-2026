import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import { parseArtworkPrice } from '@/lib/schemas/utils';
import { CATEGORY_EN_MAP } from '@/lib/artwork-category';
import { BRAND_COLORS } from '@/lib/colors';

export const runtime = 'nodejs';
export const alt = 'SAF 작가 페이지';
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
  const imageUrl = repArtwork?.images?.[0];

  let artworkImageData: string | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString('base64');
        const mime = res.headers.get('content-type') ?? 'image/jpeg';
        artworkImageData = `data:${mime};base64,${b64}`;
      }
    } catch {
      // fallthrough
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
                  ? `${availableCount} available · Direct from gallery`
                  : `${availableCount}점 구매 가능 · 화랑 직매`}
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
