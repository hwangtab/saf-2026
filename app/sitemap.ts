import type { MetadataRoute } from 'next';
import { SITE_URL, CAMPAIGN } from '@/lib/constants';
import { getSupabaseArtworks, getSupabaseNews, getSupabaseStories } from '@/lib/supabase-data';
import { videos as archiveVideos } from '@/content/videos';
import { CATEGORY_EN_MAP } from '@/lib/artwork-category';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { STORY_CATEGORIES } from '@/types';

export const revalidate = 3600;

// 영문 사이트는 운영하지 않음 — sitemap은 ko 단일 언어만 발행.
// /en/* 페이지는 layout 차원에서 noindex 처리되며, 디인덱스 완료 후
// robots.txt에서 /en/ 차단 추가 검토.
function koUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

function koAlternates(baseUrl: string, path: string) {
  const url = koUrl(baseUrl, path);
  return {
    languages: {
      'ko-KR': url,
      'x-default': url,
    },
  };
}

// Next.js 16의 sitemap.xml 직렬화는 <image:loc> 안의 query string `&`를 XML escape하지 않음
// → Supabase render URL의 `?width=1200&quality=80&resize=contain`이 그대로 들어가 XML 파싱 실패.
// 해결: query string 제거. Supabase render endpoint는 query 없어도 원본 이미지 반환하므로
// Google Image crawler 인덱싱에 영향 없음 (이미지가 1200px이든 원본이든 색인 자체는 동일).
function safeSitemapImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.split('?')[0];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const [allArtworks, allNews, allStories] = await Promise.all([
    getSupabaseArtworks(),
    getSupabaseNews(),
    getSupabaseStories(),
  ]);
  const now = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
    priority: number;
    lastModified?: Date;
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1.0, lastModified: now },
    {
      path: '/about',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-04-14'),
    },
    {
      path: '/our-reality',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-04-06'),
    },
    {
      path: '/our-proof',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-04-06'),
    },
    {
      path: '/transparency',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-04-06'),
    },
    {
      path: '/special/oh-yoon',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/archive/2026',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-03-15'),
    },
    {
      path: '/archive/2023',
      changeFrequency: 'yearly',
      priority: 0.7,
      lastModified: new Date('2023-12-31'),
    },
    {
      path: '/artworks',
      changeFrequency: 'weekly',
      priority: 0.9,
      lastModified: now,
    },
    {
      path: '/archive',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-03-15'),
    },
    {
      path: '/news',
      changeFrequency: 'weekly',
      priority: 0.85,
      lastModified: now,
    },
    {
      path: '/stories',
      changeFrequency: 'weekly',
      priority: 0.65,
      lastModified: now,
    },
  ];

  // 법적 페이지 (한국어 전용 — 영어는 "한국어 원문 참조" 안내만 있어 thin content)
  const legalPaths: Array<{
    path: string;
    changeFrequency: 'yearly';
    priority: number;
    lastModified: Date;
  }> = [
    {
      path: '/privacy',
      changeFrequency: 'yearly',
      priority: 0.4,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/terms',
      changeFrequency: 'yearly',
      priority: 0.4,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/terms/artist',
      changeFrequency: 'yearly',
      priority: 0.35,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/terms/exhibitor',
      changeFrequency: 'yearly',
      priority: 0.35,
      lastModified: new Date('2026-01-01'),
    },
  ];

  // 한국어 단일 언어로 발행 (영문 사이트는 noindex)
  const staticPages: MetadataRoute.Sitemap = staticPaths.map((page) => ({
    url: koUrl(baseUrl, page.path),
    lastModified: page.lastModified || now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: koAlternates(baseUrl, page.path),
  }));

  const legalPages: MetadataRoute.Sitemap = legalPaths.map((page) => ({
    url: koUrl(baseUrl, page.path),
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: koAlternates(baseUrl, page.path),
  }));

  // Dynamic artwork detail pages (both locales)
  // lastModified: 전시 종료일 고정 (updated_at 미제공 — 빌드마다 false freshness 방지)
  const exhibitionEndDate = new Date(CAMPAIGN.END_DATE);
  const artworkPages: MetadataRoute.Sitemap = allArtworks.flatMap((artwork) => {
    const artworkPath = `/artworks/${artwork.id}`;
    const isAvailable = !artwork.sold;
    // 판매 중인 작품: 더 높은 우선순위 + 주간 크롤링 (판매 완료 시 빠른 업데이트)
    // 판매 완료 작품: 낮은 우선순위 + 월간 크롤링
    const basePriority = isAvailable ? 0.8 : 0.55;
    const freq: 'weekly' | 'monthly' = isAvailable ? 'weekly' : 'monthly';

    // Image URL for Google Images indexing (절대 URL 필요)
    const rawImageUrl = artwork.images?.[0] ? resolveSeoArtworkImageUrl(artwork.images[0]) : null;
    const absoluteImageUrl = rawImageUrl
      ? rawImageUrl.startsWith('http')
        ? rawImageUrl
        : `${baseUrl}${rawImageUrl}`
      : null;

    // lastModified: 판매 완료 시 sold_at 날짜, 판매 중이면 전시 종료일
    const artworkLastModified = artwork.sold_at ? new Date(artwork.sold_at) : exhibitionEndDate;

    return [
      {
        url: koUrl(baseUrl, artworkPath),
        lastModified: artworkLastModified,
        changeFrequency: freq,
        priority: basePriority,
        alternates: koAlternates(baseUrl, artworkPath),
        ...(safeSitemapImageUrl(absoluteImageUrl)
          ? { images: [safeSitemapImageUrl(absoluteImageUrl)!] }
          : {}),
      },
    ];
  });

  // Artist pages (한국어 로케일만 — 영어 아티스트 페이지는 한국어 콘텐츠만 있어 thin content)
  const uniqueArtists = [...new Set(allArtworks.map((a) => a.artist))];
  const artistPages: MetadataRoute.Sitemap = uniqueArtists.map((artist) => {
    const encodedArtist = encodeURIComponent(artist);
    const artistPath = `/artworks/artist/${encodedArtist}`;
    // 작가 대표 이미지: 판매 중인 첫 번째 작품 이미지 (Google Images 인덱싱용)
    const artistWorks = allArtworks.filter((a) => a.artist === artist);
    const repWork = artistWorks.find((a) => !a.sold && a.images?.[0]) || artistWorks[0];
    const rawArtistImg = repWork?.images?.[0] ? resolveSeoArtworkImageUrl(repWork.images[0]) : null;
    const absoluteArtistImg = rawArtistImg
      ? rawArtistImg.startsWith('http')
        ? rawArtistImg
        : `${baseUrl}${rawArtistImg}`
      : null;

    return {
      url: koUrl(baseUrl, artistPath),
      lastModified: exhibitionEndDate,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
      alternates: koAlternates(baseUrl, artistPath),
      ...(safeSitemapImageUrl(absoluteArtistImg)
        ? { images: [safeSitemapImageUrl(absoluteArtistImg)!] }
        : {}),
    };
  });

  // News pages
  const newsPages: MetadataRoute.Sitemap = allNews.map((article) => {
    const newsPath = `/news/${article.id}`;
    return {
      url: koUrl(baseUrl, newsPath),
      lastModified: article.date ? new Date(article.date) : now,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
      alternates: koAlternates(baseUrl, newsPath),
    };
  });

  // Category landing pages (한국어 로케일만 — 카테고리명이 한국어이므로 영어 페이지는 thin content)
  const categoryPages: MetadataRoute.Sitemap = Object.keys(CATEGORY_EN_MAP).map((category) => {
    const encodedCategory = encodeURIComponent(category);
    const categoryPath = `/artworks/category/${encodedCategory}`;
    const categoryWorks = allArtworks.filter((a) => a.category === category);
    const repCatWork = categoryWorks.find((a) => !a.sold && a.images?.[0]) || categoryWorks[0];
    const rawCatImg = repCatWork?.images?.[0]
      ? resolveSeoArtworkImageUrl(repCatWork.images[0])
      : null;
    const absoluteCatImg = rawCatImg
      ? rawCatImg.startsWith('http')
        ? rawCatImg
        : `${baseUrl}${rawCatImg}`
      : null;

    return {
      url: koUrl(baseUrl, categoryPath),
      lastModified: exhibitionEndDate,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
      alternates: koAlternates(baseUrl, categoryPath),
      ...(safeSitemapImageUrl(absoluteCatImg)
        ? { images: [safeSitemapImageUrl(absoluteCatImg)!] }
        : {}),
    };
  });

  // Story category landing pages (SEO: 토픽 클러스터 — "작가 인터뷰", "미술 구매 가이드" 등)
  const storyCategoryPages: MetadataRoute.Sitemap = STORY_CATEGORIES.map((category) => {
    const categoryPath = `/stories/category/${category}`;
    return {
      url: koUrl(baseUrl, categoryPath),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: koAlternates(baseUrl, categoryPath),
    };
  });

  const storyPages: MetadataRoute.Sitemap = allStories.map((story) => {
    const storyPath = `/stories/${story.slug}`;

    // 이미지: thumbnail 우선, 없으면 body 마크다운 첫 번째 이미지
    let storyImageUrl: string | null = story.thumbnail || null;
    if (!storyImageUrl && story.body) {
      const match = story.body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
      storyImageUrl = match?.[1] ?? null;
    }
    const absoluteStoryImage =
      storyImageUrl && storyImageUrl.startsWith('http') ? storyImageUrl : null;

    return {
      url: koUrl(baseUrl, storyPath),
      lastModified: story.updated_at ? new Date(story.updated_at) : new Date(story.published_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: koAlternates(baseUrl, storyPath),
      ...(safeSitemapImageUrl(absoluteStoryImage)
        ? { images: [safeSitemapImageUrl(absoluteStoryImage)!] }
        : {}),
    };
  });

  const videoWatchPages: MetadataRoute.Sitemap = archiveVideos.map((video) => {
    const path = `/archive/2023/videos/${video.youtubeId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;

    return {
      url: koUrl(baseUrl, path),
      lastModified: new Date('2023-12-31'),
      changeFrequency: 'yearly' as const,
      priority: 0.72,
      alternates: koAlternates(baseUrl, path),
      images: [safeSitemapImageUrl(thumbnailUrl) ?? thumbnailUrl],
    };
  });

  return [
    ...staticPages,
    ...legalPages,
    ...categoryPages,
    ...storyCategoryPages,
    ...artworkPages,
    ...artistPages,
    ...newsPages,
    ...storyPages,
    ...videoWatchPages,
  ];
}
