import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import PageHero from '@/components/ui/PageHero';
import VideoPlayer from '@/components/features/VideoPlayer';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { videos as fallbackVideos } from '@/content/videos';
import { SITE_URL, CONTACT } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { containsHangul } from '@/lib/search-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema, generateVideoSchema } from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';

type ArchiveVideo = {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  transcript?: string;
  duration?: string;
  created_at?: string;
};

const toArchiveVideo = (video: (typeof fallbackVideos)[number]): ArchiveVideo => ({
  id: video.id,
  title: video.title,
  description: video.description,
  youtube_id: video.youtubeId,
  transcript: video.transcript,
  duration: video.duration,
});

const getArchiveVideos = async (): Promise<ArchiveVideo[]> => {
  const fallbackRows = fallbackVideos.map(toArchiveVideo);

  if (!supabase) return fallbackRows;

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return fallbackRows;

  // Supabase에 duration 컬럼이 없을 수 있으므로 fallback 데이터에서 병합
  const fallbackDurationMap = new Map(fallbackVideos.map((v) => [v.youtubeId, v.duration]));
  return (data as ArchiveVideo[]).map((row) => ({
    ...row,
    duration: row.duration || fallbackDurationMap.get(row.youtube_id),
  }));
};

const localizeVideoTitle = (title: string, locale: 'ko' | 'en', index = 0): string => {
  if (locale === 'ko') return title;
  if (containsHangul(title)) {
    return `SAF 2023 Campaign Video #${index + 1}`;
  }
  return title;
};

export function generateStaticParams() {
  return fallbackVideos.map((video) => ({ youtubeId: video.youtubeId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ youtubeId: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const { youtubeId } = await params;
  const videos = await getArchiveVideos();
  const videoIndex = videos.findIndex((video) => video.youtube_id === youtubeId);
  const video = videos[videoIndex];

  if (!video) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const localizedTitle = localizeVideoTitle(video.title, locale, videoIndex);
  const pageTitle =
    locale === 'en'
      ? `${localizedTitle} | SAF 2023 Video Archive`
      : `${localizedTitle} | 씨앗페 2023 영상 아카이브`;
  const pageDescription =
    locale === 'en' ? 'Dedicated watch page for SAF 2023 campaign video.' : video.description;
  const pagePath = `/archive/2023/videos/${youtubeId}`;
  const pageUrl = buildLocaleUrl(pagePath, locale);

  const base = createStandardPageMetadata(pageTitle, pageDescription, pageUrl, pagePath, locale);
  if (locale === 'en') {
    return {
      ...base,
      alternates: createLocaleAlternates(pagePath, locale, true),
      robots: { index: false, follow: true },
    };
  }
  return base;
}

export default async function Archive2023VideoWatchPage({
  params,
}: {
  params: Promise<{ youtubeId: string }>;
}) {
  const locale = resolveLocale(await getLocale());
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const { youtubeId } = await params;
  const videos = await getArchiveVideos();
  const videoIndex = videos.findIndex((video) => video.youtube_id === youtubeId);
  const video = videos[videoIndex];

  if (!video) {
    notFound();
  }

  const pagePath = `/archive/2023/videos/${youtubeId}`;
  const pageUrl = buildLocaleUrl(pagePath, locale);
  const archive2023Path = '/archive/2023';
  const localizedTitle = localizeVideoTitle(video.title, locale, videoIndex);
  const isEnglish = locale === 'en';

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('archive'), url: buildLocaleUrl('/archive', locale) },
    { name: tBreadcrumbs('archive2023'), url: buildLocaleUrl(archive2023Path, locale) },
    { name: localizedTitle, url: pageUrl },
  ];

  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const videoSchema = generateVideoSchema({
    title: localizedTitle,
    description: isEnglish ? 'Campaign video from SAF 2023.' : video.description,
    transcript: isEnglish ? undefined : video.transcript,
    duration: video.duration,
    youtubeId: video.youtube_id,
    locale,
    watchPageUrl: pageUrl,
    uploadDate: video.created_at,
  });

  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, videoSchema]} />
      <PageHero
        title={isEnglish ? 'Video Watch Page' : '영상 시청 페이지'}
        description={localizedTitle}
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="white">
        <div className="container-max max-w-4xl">
          <SectionTitle className="mb-6">{localizedTitle}</SectionTitle>
          <div className="overflow-hidden rounded-xl bg-black shadow-lg">
            <VideoPlayer id={video.youtube_id} title={localizedTitle} />
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-charcoal-muted leading-relaxed">
              {isEnglish ? 'Campaign video from SAF 2023.' : video.description}
            </p>
            {video.transcript && !isEnglish && (
              <div className="mt-4 border-l-4 border-primary/30 bg-white p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  🎞️ 영상 기록 요약
                </h3>
                <p className="text-sm leading-relaxed text-charcoal">{video.transcript}</p>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section variant="canvas-soft" prevVariant="white" className="pb-20">
        <div className="container-max max-w-4xl text-sm text-charcoal-muted">
          {isEnglish
            ? `Video publisher: ${CONTACT.ORGANIZATION_NAME_EN}`
            : `영상 제공: ${CONTACT.ORGANIZATION_NAME}`}
          <span className="mx-2">·</span>
          <a href={SITE_URL} className="text-primary hover:text-primary/80">
            {isEnglish ? 'Back to SAF Home' : '씨앗페 홈으로 이동'}
          </a>
        </div>
      </Section>
    </>
  );
}
