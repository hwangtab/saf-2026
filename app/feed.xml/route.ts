import { SITE_URL, CONTACT } from '@/lib/constants';
import { getSupabaseStoriesLight } from '@/lib/supabase-data';

/**
 * RSS 2.0 feed — 씨앗페 매거진(stories) 통합 피드.
 *
 * 한국어 콘텐츠 기준 (영문은 자동 fallback 수준이라 미포함). 매거진 글만 발행 — 뉴스는
 * 외부 링크라 별도 RSS 부적합. published_at 내림차순, 최근 50건.
 *
 * 사용처: 네이버 서치콘솔 RSS 등록 / Feedly·구독 서비스 / 외부 사이트 syndication.
 * cache: revalidate 1시간 — 신규 매거진 발행 1시간 내 자동 반영.
 */

export const revalidate = 3600;

// XML entity escape — title·excerpt에 `&`, `<`, `>`, `"`, `'` 포함 시 XML 파서 깨지지 않게.
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// CDATA wrapper — HTML 본문 포함하는 description은 CDATA가 더 안전.
function cdata(text: string): string {
  // CDATA 내부의 `]]>` 시퀀스만 분할 처리 (드물지만 안전망).
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

export async function GET() {
  // RSS 항목은 title/link/excerpt/category/published_at만 필요 — body·body_en 제외 light fetch
  // 사용해 빌드 시 statement timeout 회귀를 차단. getSupabaseStoriesLight는 이미
  // is_published=true + published_at <= now 필터를 query 단계에서 적용함.
  const stories = await getSupabaseStoriesLight();

  const publishedStories = stories.slice(0, 50);

  const siteUrl = SITE_URL.replace(/\/$/, '');
  const feedUrl = `${siteUrl}/feed.xml`;
  const lastBuildDate = publishedStories[0]?.published_at
    ? new Date(publishedStories[0].published_at).toUTCString()
    : new Date().toUTCString();

  const items = publishedStories
    .map((story) => {
      const link = `${siteUrl}/stories/${story.slug}`;
      const pubDate = new Date(story.published_at).toUTCString();
      const description = story.excerpt || '';
      return `    <item>
      <title>${escapeXml(story.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(story.category)}</category>
      ${story.author ? `<author>${escapeXml(CONTACT.EMAIL)} (${escapeXml(story.author)})</author>` : ''}
      <description>${cdata(description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>씨앗페 매거진 — 한국 현대미술 이야기</title>
    <link>${siteUrl}/stories</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <description>한국 작가 인터뷰·작품 구매 가이드·미술 산책 등 씨앗페 2026 매거진의 글을 모은 피드. 한국 현대미술의 작가·작품·이야기를 정기적으로 만나보세요.</description>
    <language>ko-KR</language>
    <copyright>© ${new Date().getFullYear()} 씨앗페 SAF 2026</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Next.js — saf2026.com</generator>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
