'use client';

import { trackEvent } from '@/lib/analytics/track';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { localizeStoryAuthor } from '@/lib/story-author';
import type { StoryLight } from '@/lib/supabase-data';

interface Props {
  story: StoryLight & { body?: string | null };
  isEn: boolean;
  artworkId: string;
  artworkArtist: string;
  position: number;
}

/**
 * 작품 detail의 사이드바 "관련 매거진" 카드.
 *
 * RelatedArtworkCard와 짝을 이루는 반대 방향 funnel 측정 — 작품→매거진 클릭 시
 * artwork_to_story_click 이벤트 발화. 양방향 데이터로 어느 쪽 funnel이 약한지 진단.
 *
 * client component 분리 이유: server page에서는 Link에 onClick prop을 박지 못해
 * track() 호출 불가.
 */
function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

export default function RelatedMagazineCard({
  story,
  isEn,
  artworkId,
  artworkArtist,
  position,
}: Props) {
  const storyTitle = isEn && story.title_en ? story.title_en : story.title;
  const storyExcerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
  const thumbUrl = story.thumbnail || extractFirstImage(story.body);

  function handleClick() {
    // trackEvent는 내부에서 try/catch — navigation 막지 않음 + Vercel/GA4 이중 송신.
    trackEvent('artwork_to_story_click', {
      artwork_id: artworkId,
      artwork_artist: artworkArtist,
      story_slug: story.slug,
      story_category: story.category,
      position,
    });
  }

  return (
    <Link
      href={`/stories/${story.slug}`}
      onClick={handleClick}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:shadow-lg"
    >
      {thumbUrl && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <SafeImage
            src={thumbUrl}
            alt={storyTitle}
            fill
            sizes="(max-width: 1024px) 100vw, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-primary-strong">
          {isEn ? 'Magazine' : '매거진'}
        </span>
        <h3 className="text-sm font-bold mt-1.5 line-clamp-2 group-hover:text-primary-strong transition-colors duration-300">
          {storyTitle}
        </h3>
        {storyExcerpt && (
          <p className="text-xs text-charcoal-muted mt-1.5 line-clamp-2 leading-relaxed">
            {storyExcerpt}
          </p>
        )}
        <span className="text-[10px] text-charcoal-soft mt-2 block">
          {story.published_at
            ? `${new Date(story.published_at).toLocaleDateString(isEn ? 'en-US' : 'ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })} · `
            : ''}
          {localizeStoryAuthor(null, isEn ? 'en' : 'ko')}
        </span>
      </div>
    </Link>
  );
}
