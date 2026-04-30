import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

import { BRAND_COLORS } from '@/lib/colors';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/constants';

export const runtime = 'nodejs';
export const alt = '오윤 구의동 벽화 시민 청원 — 차기 서울시장께';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: Props) {
  const { locale } = await params;

  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const muralPath = path.join(process.cwd(), 'public/images/petition-oh-yoon/mural-1.png');
  const muralBase64 = fs.readFileSync(muralPath).toString('base64');
  const muralDataUrl = `data:image/png;base64,${muralBase64}`;

  const isKo = locale === 'ko';
  const slogan = isKo
    ? '멸실 위기의 오윤 벽화,\n우리가 구하자. 우리의 품으로.'
    : "Save Oh Yoon's mural\nfrom demolition. Bring it home.";
  const subtitle = isKo
    ? '차기 서울시장께 드리는 시민 청원'
    : "A citizens' petition to Seoul's next mayor";
  const meta = isKo ? '2026.05.10 마감 · 1만 명' : 'By 2026-05-10 · 10,000 names';
  const brand = isKo ? '씨앗페 SAF2026' : 'SAF 2026';
  const host = SITE_URL.replace(/^https?:\/\//, '');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: 'NotoSansKR',
          color: BRAND_COLORS.light,
          backgroundColor: BRAND_COLORS.charcoal.deep,
        }}
      >
        {/* 배경 작품 사진 */}
        {}
        <img
          src={muralDataUrl}
          alt=""
          width={1200}
          height={630}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* 다크 그라디언트 오버레이 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(31,36,40,0.92) 0%, rgba(31,36,40,0.82) 50%, rgba(31,36,40,0.7) 100%)',
            display: 'flex',
          }}
        />
        {/* 콘텐츠 */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '56px 72px',
          }}
        >
          {/* Top — 청원 라벨 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 22,
              opacity: 0.9,
              letterSpacing: '0.05em',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {isKo ? '시민 청원' : 'Citizens’ Petition'}
            </span>
          </div>

          {/* Middle — 슬로건 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              maxWidth: 980,
            }}
          >
            <div
              style={{
                fontSize: 64,
                lineHeight: 1.2,
                fontWeight: 700,
                whiteSpace: 'pre-line',
                textShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}
            >
              {slogan}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                opacity: 0.95,
                marginTop: 8,
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Bottom — 메타 + 브랜드 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: 22,
              opacity: 0.9,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', fontSize: 24, fontWeight: 700 }}>{meta}</span>
              <span style={{ display: 'flex', opacity: 0.7, fontSize: 18 }}>{host}</span>
            </div>
            <span
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {brand}
            </span>
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
