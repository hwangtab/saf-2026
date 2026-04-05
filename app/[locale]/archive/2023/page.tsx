import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import ExportedImage from 'next-image-export-optimizer';
import SafeImage from '@/components/common/SafeImage';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';
import VideoEmbed from '@/components/features/VideoEmbed';
import { saf2023Photos } from '@/content/saf2023-photos';
import { saf2023Artworks } from '@/content/saf2023-artworks';
import { supabase } from '@/lib/supabase';
import { videos as fallbackVideos } from '@/content/videos';
import { SITE_URL } from '@/lib/constants';
import { containsHangul } from '@/lib/search-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema, generateVideoSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';

export const revalidate = 3600;

const PAGE_URL = `${SITE_URL}/archive/2023`;
const PAGE_COPY = {
  ko: {
    title: '2023 아카이브',
    description:
      '2023년 씨앗페의 여정. 캠페인 영상, 현장 스케치, 그리고 우리가 함께 만든 변화의 기록들을 만나보세요.',
  },
  en: {
    title: '2023 Archive',
    description:
      'The SAF 2023 journey, including campaign videos, exhibition moments, and outcomes created through solidarity.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  return {
    ...createStandardPageMetadata(title, copy.description, PAGE_URL, '/archive/2023', locale),
    keywords:
      locale === 'en'
        ? 'SAF 2023 archive, Korean art 2023, artist solidarity, SAF campaign video, Insadong exhibition, artist mutual aid fund'
        : '씨앗페 2023, 씨앗페 아카이브, 인사동 전시, 예술인 연대, 씨앗페 캠페인 영상, 예술인 상호부조 기금',
  };
}

export default async function Archive2023Page() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl('/archive/2023', locale);
  const archiveUrl = buildLocaleUrl('/archive', locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const isEnglish = locale === 'en';

  const fallbackVideoRows = fallbackVideos.map((video) => ({
    ...video,
    youtube_id: video.youtubeId,
  }));

  let videos = fallbackVideoRows;
  if (supabase) {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      videos = data;
    }
  }

  const localizeVideoTitle = (title: string, index: number): string => {
    if (!isEnglish) return title;
    if (containsHangul(title)) {
      return `SAF 2023 Campaign Video #${index + 1}`;
    }
    return title;
  };
  const localizeArtworkTitle = (title: string, index: number): string => {
    if (!isEnglish) return title;
    if (containsHangul(title)) {
      return `SAF 2023 Artwork #${index + 1}`;
    }
    return title;
  };
  const localizeArtworkArtist = (artist: string): string => {
    if (!isEnglish) return artist;
    if (containsHangul(artist)) {
      return 'Participating Artist';
    }
    return artist;
  };

  const currentUrl = PAGE_URL;

  const pageTitle = `${PAGE_COPY[locale].title} | ${isEnglish ? 'SAF 2026' : '씨앗페 2026'}`;
  const pageDescription = isEnglish
    ? 'A look back at SAF 2023 exhibitions, performances, and campaign outcomes.'
    : '씨앗페의 활동 기록과 성과들을 담아냅니다.';

  // JSON-LD Schema for CollectionPage with Articles
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isEnglish ? 'SAF 2026 Archive' : '씨앗페 2026 아카이브',
    description: pageDescription,
    url: currentUrl,
    publisher: {
      '@type': 'Organization',
      name: isEnglish ? 'Korea Smart Cooperative' : '한국스마트협동조합',
      url: SITE_URL,
    },
  };

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('archive'), url: archiveUrl },
    { name: tBreadcrumbs('archive2023'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionSchema} />
      <PageHero
        title={isEnglish ? 'SAF 2023 Offline Exhibition' : '2023 오프라인 전시'}
        description={
          isEnglish
            ? 'A record of SAF milestones, outcomes, and media coverage.'
            : '씨앗페의 발자취와 성과, 언론 보도를 기록합니다'
        }
        dividerColor="text-sun-soft"
        className="py-24 md:py-32"
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper url={currentUrl} title={pageTitle} description={pageDescription} />
      </PageHero>

      {/* Past Events Section */}
      <Section variant="sun-soft">
        <div className="container-max">
          <SectionTitle className="mb-12">
            {isEnglish ? '🎉 2023 Event Highlights' : '🎉 2023년 행사 기록'}
          </SectionTitle>

          {/* 2023 SAF Poster */}
          <div className="mb-12">
            <ExportedImage
              src="/images/saf2023/saf2023poster.png"
              alt={isEnglish ? 'Official SAF 2023 poster' : '씨앗페 2023 공식 포스터'}
              width={1200}
              height={1700}
              className="w-full rounded-2xl shadow-xl"
              priority
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <h3 className="text-card-title mb-4">
              {isEnglish ? 'SAF 2023 Outcomes' : '씨앗페 2023 성과'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{isEnglish ? '7 days' : '7일'}</p>
                <p className="text-charcoal-muted text-sm">
                  {isEnglish ? 'Exhibition days' : '전시 기간'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{isEnglish ? '5 days' : '5일'}</p>
                <p className="text-charcoal-muted text-sm">
                  {isEnglish ? 'Performance days' : '공연 일정'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">120+</p>
                <p className="text-charcoal-muted text-sm">
                  {isEnglish ? 'Participating artists' : '참여 예술인'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {isEnglish ? 'KRW 34M' : '3,400만원'}
                </p>
                <p className="text-charcoal-muted text-sm">
                  {isEnglish ? 'Fund raised' : '기금 마련'}
                </p>
              </div>
            </div>
            <p className="text-charcoal-muted mb-4">
              {isEnglish
                ? 'From March 21 to 31, 2023, exhibitions and performances were held in Insadong, Seoul. More than 50 artists across music, visual art, and dance joined the campaign and helped raise KRW 34 million for the mutual-aid fund after event operating costs.'
                : '2023년 3월 21일부터 3월 31일까지 서울시 종로구 인사동의 오디오가이 스튜디오와 인디프레스 갤러리에서 전시와 공연이 펼쳐졌습니다. 국내 저명 뮤지션, 화가, 무용가 등 50명 이상의 예술인이 참여하여 예술인 금융 위기의 심각성을 알리고, 작품 판매 수익을 포함해 총 6,000만원을 조성하여 화가들에게 작품비를 지급하고, 대관 등 행사진행비를 제외하고 3,400만원의 기금을 조성하였습니다.'}
            </p>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-card-title mb-4">{isEnglish ? '📍 Venues' : '📍 전시 장소'}</h4>
              <ul className="space-y-2 text-charcoal-muted">
                <li>
                  {isEnglish
                    ? '🎪 Audioguy Studio (23 Hyoja-ro, Jongno-gu, Seoul)'
                    : '🎪 오디오가이 스튜디오 (서울시 종로구 효자로 23)'}
                </li>
                <li>
                  {isEnglish
                    ? '🎨 Indiepress Gallery (31 Hyoja-ro, Jongno-gu, Seoul)'
                    : '🎨 인디프레스 갤러리 (서울시 종로구 효자로 31)'}
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-card-title mb-4">
                {isEnglish ? '⏰ Performance Schedule' : '⏰ 공연 일정'}
              </h4>
              <ul className="space-y-2 text-charcoal-muted text-sm">
                <li>
                  {isEnglish
                    ? 'Mar 22-28: daily performances by diverse musicians'
                    : '3월 22-28일: 매일 다양한 뮤지션 공연'}
                </li>
                <li>
                  {isEnglish ? 'Rotating sets every 30 minutes' : '30분 간격으로 번갈아가며 진행'}
                </li>
                <li>
                  {isEnglish ? 'Free admission (first come, first served)' : '선착순 무료입장'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* SAF 2023 Artworks Section */}
      <Section variant="gray" prevVariant="sun-soft">
        <div className="container-max">
          <SectionTitle className="mb-12">
            {isEnglish ? '🎨 2023 Featured Works' : '🎨 2023년 출품작'}
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {saf2023Artworks.map((artwork, index) => {
              const localizedArtworkTitle = localizeArtworkTitle(artwork.title, index);
              const localizedArtworkArtist = localizeArtworkArtist(artwork.artist);

              return (
                <div
                  key={artwork.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden group flex flex-col"
                >
                  <div className="relative aspect-square w-full overflow-hidden">
                    <SafeImage
                      src={artwork.imageUrl}
                      alt={`${localizedArtworkArtist} - ${localizedArtworkTitle}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="font-sans font-bold text-xl mb-2">{localizedArtworkTitle}</h3>
                    <p className="text-primary font-semibold mb-3">{localizedArtworkArtist}</p>
                    <p className="text-charcoal-muted text-sm mb-4 flex-grow">
                      {isEnglish ? 'Artwork presented during SAF 2023.' : artwork.description}
                    </p>
                    {artwork.details && !isEnglish && (
                      <p className="text-xs text-charcoal-soft mt-auto pt-4 border-t border-gray-200">
                        {artwork.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* SAF 2023 Gallery Section */}
      <Section variant="white" prevVariant="gray">
        <div className="container-max">
          <SectionTitle className="mb-12">
            {isEnglish ? '📸 SAF 2023 On-site Moments' : '📸 씨앗페 2023 현장'}
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {saf2023Photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <ExportedImage
                  src={`/images/saf2023/${photo.filename}`}
                  alt={isEnglish ? `SAF 2023 photo ${photo.id}` : photo.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-charcoal-muted mt-12 text-sm">
            {isEnglish
              ? 'Scenes from SAF 2023 in Insadong (Mar 21-31, 2023).'
              : '2023년 3월 21일부터 3월 31일까지 인사동에서 펼쳐진 씨앗페 2023의 생생한 현장 모습입니다.'}
          </p>
        </div>
      </Section>

      {/* Video Archive Section */}
      <Section variant="accent-soft" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">
            {isEnglish ? '📹 Video Archive' : '📹 영상 아카이브'}
          </SectionTitle>
          {/* VideoObject JSON-LD for each video */}
          {videos.map((video, index) => (
            <JsonLdScript
              key={`video-schema-${video.id}`}
              data={generateVideoSchema({
                ...video,
                title: localizeVideoTitle(video.title, index),
                description: isEnglish ? 'Campaign video from SAF 2023.' : video.description,
                transcript: isEnglish ? undefined : video.transcript,
                youtubeId: video.youtube_id, // Map database field to component expected field
              })}
            />
          ))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {videos.map((video, index) => {
              const localizedVideoTitle = localizeVideoTitle(video.title, index);

              return (
                <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <VideoEmbed id={video.youtube_id} title={localizedVideoTitle} />
                  <div className="p-6">
                    <h3 className="font-sans font-bold text-xl mb-2">{localizedVideoTitle}</h3>
                    <p className="text-charcoal-muted text-sm mb-4 line-clamp-2">
                      {isEnglish ? 'Campaign video from SAF 2023.' : video.description}
                    </p>

                    {video.transcript && !isEnglish && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary/30">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                          🎞️ 영상 기록 요약
                        </h4>
                        <p className="text-xs md:text-sm text-charcoal leading-relaxed">
                          {video.transcript}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Call to Action */}
      <Section variant="primary-soft" prevVariant="accent-soft" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-6">
            {isEnglish ? 'Be part of this ongoing history' : '이 역사에 당신도 함께하세요'}
          </SectionTitle>
          <p className="text-lg text-charcoal-muted mb-8 max-w-2xl mx-auto text-balance">
            {isEnglish
              ? 'SAF grows through participation and solidarity.'
              : '씨앗페의 역사는 당신의 참여와 연대로 이어집니다.'}{' '}
            <br className="hidden md:block" />
            {isEnglish
              ? 'Join the cooperative and purchase artworks to strengthen mutual-aid finance for artists.'
              : '조합원 가입과 작품 구매로 예술인 상호부조의 미래를 함께 만들어주세요.'}
          </p>
          <CTAButtonGroup
            variant="large"
            className="justify-center"
            donateText={isEnglish ? '🤝 Join the Co-op' : undefined}
            purchaseText={isEnglish ? '🎨 Browse Artworks' : undefined}
          />
        </div>
      </Section>
    </>
  );
}
