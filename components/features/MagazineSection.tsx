import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { getSupabaseStoriesLight } from '@/lib/supabase-data';
import { ArrowRight } from 'lucide-react';

/**
 * 메인 페이지 [K] 매거진 섹션 — 매뉴얼 6.4 [K].
 *
 * 최신 발행 기사 3건을 StoryLight 경량 타입으로 서버에서 fetch.
 * SSG force-static + revalidate=3600 하 캐시 HIT.
 */
export default async function MagazineSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.magazine' });
  const isEn = locale === 'en';

  const allStories = await getSupabaseStoriesLight();
  const stories = allStories.slice(0, 3);

  if (stories.length === 0) return null;

  const categoryLabel: Record<string, string> = {
    interview: isEn ? 'Interview' : '작가 인터뷰',
    guide: isEn ? 'Guide' : '컬렉팅 가이드',
    review: isEn ? 'Review' : '미술 산책',
    news: isEn ? 'News' : '뉴스',
    'artist-story': isEn ? 'Artist Story' : '작가 이야기',
    'buying-guide': isEn ? 'Buying Guide' : '컬렉팅 가이드',
    'art-knowledge': isEn ? 'Art Knowledge' : '미술 산책',
    other: isEn ? 'Article' : '아티클',
  };

  return (
    <Section variant="canvas" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <SectionTitle className="mb-3">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance">{t('subtitle')}</p>
        </div>

        {/* 3열 그리드 (모바일 1열 → 태블릿 3열) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
          {stories.map((story) => {
            const title = isEn && story.title_en ? story.title_en : story.title;
            const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
            const catLabel = categoryLabel[story.category] ?? categoryLabel.other;
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
                className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {story.thumbnail && (
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <SafeImage
                      src={story.thumbnail}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5">
                  <span className="text-eyebrow text-primary">{catLabel}</span>
                  <h3 className="text-sm font-bold mt-1.5 line-clamp-2 text-charcoal-deep group-hover:text-primary transition-colors duration-300 break-keep">
                    {title}
                  </h3>
                  {excerpt && (
                    <p className="text-xs text-charcoal-muted mt-1.5 line-clamp-2 leading-relaxed break-keep">
                      {excerpt}
                    </p>
                  )}
                  {dateStr && (
                    <span className="text-[10px] text-charcoal-muted/60 mt-3 block">{dateStr}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* viewAll CTA */}
        <div className="mt-10 md:mt-12 flex justify-center">
          <Link
            href="/stories"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm md:text-base font-semibold border border-charcoal/20 text-charcoal bg-white hover:bg-canvas hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,background-color] duration-300"
          >
            {t('viewAll')}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </Section>
  );
}
