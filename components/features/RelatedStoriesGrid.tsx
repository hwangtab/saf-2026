import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { getSupabaseStoriesLight } from '@/lib/supabase-data';
import { localizeStoryAuthor } from '@/lib/story-author';

/**
 * 큐레이션 slug 리스트를 받아 관련 스토리 카드 그리드를 렌더하는 서버 컴포넌트.
 *
 * MagazineSection과 동일한 카드 마크업이나, 최신순 고정이 아닌
 * 편집자 지정 slug 순서를 보존합니다. 존재하지 않거나 미발행된
 * slug는 flatMap에서 자연 탈락합니다(graceful degradation).
 *
 * 사용처: /our-reality, /our-proof 등 내부링크 토픽 클러스터 구성.
 */

interface RelatedStoriesGridProps {
  slugs: string[];
  locale: string;
  eyebrow: { ko: string; en: string };
  title: { ko: string; en: string };
}

const CATEGORY_LABEL: Record<string, { ko: string; en: string }> = {
  'artist-story': { ko: '작가 이야기', en: 'Artist Story' },
  'buying-guide': { ko: '컬렉팅 가이드', en: 'Buying Guide' },
  'art-knowledge': { ko: '미술 산책', en: 'Art Knowledge' },
  interview: { ko: '작가 인터뷰', en: 'Interview' },
  guide: { ko: '컬렉팅 가이드', en: 'Guide' },
  review: { ko: '미술 산책', en: 'Review' },
  news: { ko: '뉴스', en: 'News' },
  other: { ko: '아티클', en: 'Article' },
};

export default async function RelatedStoriesGrid({
  slugs,
  locale,
  eyebrow,
  title,
}: RelatedStoriesGridProps) {
  const isEn = locale === 'en';
  const allStories = await getSupabaseStoriesLight();

  // slug 순서 보존: 큐레이션 리스트 기준으로 필터·정렬
  const stories = slugs.flatMap((slug) => {
    const s = allStories.find((st) => st.slug === slug);
    return s ? [s] : [];
  });

  if (stories.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-canvas-strong border-t border-gallery-divider">
      <div className="container-max">
        {/* 헤딩 */}
        <div className="mb-8 md:mb-10">
          <p className="text-eyebrow text-primary-strong mb-2">{isEn ? eyebrow.en : eyebrow.ko}</p>
          <h2 className="text-2xl md:text-3xl font-bold text-charcoal-deep break-keep">
            {isEn ? title.en : title.ko}
          </h2>
        </div>

        {/* 카드 그리드 — DESIGN.md §4 Card 패턴 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {stories.map((story) => {
            const storyTitle = isEn && story.title_en ? story.title_en : story.title;
            const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
            const catKey = story.category ?? 'other';
            const catLabel =
              (isEn ? CATEGORY_LABEL[catKey]?.en : CATEGORY_LABEL[catKey]?.ko) ??
              (isEn ? 'Article' : '아티클');
            const dateStr = story.published_at
              ? new Date(story.published_at).toLocaleDateString(isEn ? 'en-US' : 'ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '';

            return (
              <Link
                key={story.id}
                href={`/stories/${story.slug}`}
                className="group block overflow-hidden rounded-2xl border border-gallery-hairline bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {story.thumbnail && (
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <SafeImage
                      src={story.thumbnail}
                      alt={storyTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5">
                  <span className="text-eyebrow text-primary-strong">{catLabel}</span>
                  <h3 className="text-sm font-bold mt-1.5 line-clamp-2 text-charcoal-deep group-hover:text-primary-strong transition-colors duration-300 break-keep">
                    {storyTitle}
                  </h3>
                  {excerpt && (
                    <p className="text-xs text-charcoal-muted mt-1.5 line-clamp-2 leading-relaxed break-keep">
                      {excerpt}
                    </p>
                  )}
                  <span className="text-[10px] text-charcoal-soft mt-3 block">
                    {dateStr ? `${dateStr} · ` : ''}
                    {localizeStoryAuthor(null, locale as 'ko' | 'en')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
