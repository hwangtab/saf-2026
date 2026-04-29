import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { getSupabaseArtworkById } from '@/lib/supabase-data';
import { parseArtworkPrice } from '@/lib/schemas/utils';
import { getCategoryLabel } from '@/lib/artwork-category';

export const runtime = 'nodejs';
export const alt = 'SAF 작품 상세';
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
  const artwork = await getSupabaseArtworkById(id);

  const isEn = locale === 'en';
  const title = (isEn && artwork?.title_en ? artwork.title_en : artwork?.title) ?? 'SAF 2026';
  const artist = (isEn && artwork?.artist_en ? artwork.artist_en : artwork?.artist) ?? '';
  const category = artwork?.category ?? '';
  const categoryLabel = category ? getCategoryLabel(category, isEn ? 'en' : 'ko') : '';
  const price = formatPrice(artwork?.price);
  const isSold = artwork?.sold ?? false;
  const imageUrl = artwork?.images?.[0];

  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const accentColor = '#2176FF'; // BRAND_COLORS.primary.DEFAULT
  const displayTitle = truncate(title, 40);
  const displayArtist = truncate(artist, 30);

  // Fetch artwork image for embedding
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
      // Fallback: no artwork image
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#FFFFFF',
          fontFamily: 'NotoSansKR',
        }}
      >
        {/* Left: Artwork image */}
        <div
          style={{
            width: '420px',
            height: '100%',
            flexShrink: 0,
            backgroundColor: '#F5F5F7',
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
                color: '#8F98A5',
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
                  backgroundColor: '#1F2428',
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '100px',
                  fontSize: '20px',
                  fontWeight: 700,
                }}
              >
                {isEn ? 'SOLD' : '판매완료'}
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
                color: '#1F2428',
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
                  color: '#555E67',
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
              borderTop: '1px solid #E0E0E0',
              paddingTop: '20px',
            }}
          >
            <div style={{ fontSize: '20px', color: '#8F98A5', fontWeight: 400 }}>
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
