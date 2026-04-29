import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';
import { getSupabaseStories, getSupabaseStoryBySlug } from '@/lib/supabase-data';
import { routing } from '@/i18n/routing';
import { BRAND_COLORS } from '@/lib/colors';
import type { StoryCategory } from '@/types';

export const runtime = 'nodejs';
export const alt = 'SAF 매거진 기사';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 1800;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const stories = await getSupabaseStories();
  return stories.flatMap((story) =>
    routing.locales.map((locale) => ({ locale, slug: story.slug }))
  );
}

const CATEGORY_COLORS: Record<
  StoryCategory,
  { bg: string; accent: string; border: string; labelKo: string; labelEn: string }
> = {
  // Gallery White Cube: 카테고리별 차별화는 BRAND_COLORS 안에서 모노크롬+의미적 색으로.
  // artist-story = primary 블루 / buying-guide = charcoal 모노톤 / art-knowledge = success 그린.
  'artist-story': {
    bg: BRAND_COLORS.primary.surface,
    accent: BRAND_COLORS.primary.a11y,
    border: '#D2E1FF',
    labelKo: '작가를 만나다',
    labelEn: 'Artist Stories',
  },
  'buying-guide': {
    bg: '#FAFAFC', // gallery-pearl
    accent: BRAND_COLORS.charcoal.deep,
    border: '#E0E0E0', // gallery-hairline
    labelKo: '컬렉팅 시작하기',
    labelEn: 'Buying Guide',
  },
  'art-knowledge': {
    bg: '#EAFAF3', // success/10 hint
    accent: BRAND_COLORS.success.a11y,
    border: '#A5DEC7',
    labelKo: '미술 산책',
    labelEn: 'Art Knowledge',
  },
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

export default async function Image({ params }: Props) {
  const { locale, slug } = await params;
  const story = await getSupabaseStoryBySlug(slug);

  const isEn = locale === 'en';
  const title = (isEn && story?.title_en ? story.title_en : story?.title) ?? 'SAF Magazine';
  const excerpt = (isEn && story?.excerpt_en ? story.excerpt_en : story?.excerpt) ?? '';
  const category = (story?.category ?? 'art-knowledge') as StoryCategory;
  const colors = CATEGORY_COLORS[category];
  const categoryLabel = isEn ? colors.labelEn : colors.labelKo;
  const author = story?.author ?? '';

  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const displayTitle = truncate(title, 55);
  const displayExcerpt = truncate(excerpt, 80);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          backgroundColor: colors.bg,
          borderTop: `8px solid ${colors.accent}`,
          fontFamily: 'NotoSansKR',
        }}
      >
        {/* Top: Category badge */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              backgroundColor: colors.accent,
              color: 'white',
              padding: '8px 22px',
              borderRadius: '100px',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.3px',
            }}
          >
            {categoryLabel}
          </div>
          <div
            style={{
              marginLeft: '16px',
              fontSize: '22px',
              color: BRAND_COLORS.gray[500],
              fontWeight: 400,
            }}
          >
            SAF Magazine
          </div>
        </div>

        {/* Middle: Title + excerpt */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: 1,
            justifyContent: 'center',
            paddingTop: '32px',
            paddingBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: displayTitle.length > 30 ? '50px' : '58px',
              fontWeight: 700,
              color: BRAND_COLORS.charcoal.deep,
              lineHeight: 1.25,
              letterSpacing: '-1px',
            }}
          >
            {displayTitle}
          </div>
          {displayExcerpt && (
            <div
              style={{
                fontSize: '26px',
                color: BRAND_COLORS.charcoal.muted,
                lineHeight: 1.55,
                fontWeight: 400,
              }}
            >
              {displayExcerpt}
            </div>
          )}
        </div>

        {/* Bottom: Author + site branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${colors.border}`,
            paddingTop: '24px',
          }}
        >
          <div style={{ fontSize: '22px', color: BRAND_COLORS.gray[500], fontWeight: 400 }}>
            {author || '씨앗페 매거진'}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '24px',
              fontWeight: 700,
              color: colors.accent,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: colors.accent,
              }}
            />
            SAF 2026
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
