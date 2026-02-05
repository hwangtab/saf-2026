import type { Metadata } from 'next';
import ExportedImage from 'next-image-export-optimizer';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';
import VideoEmbed from '@/components/features/VideoEmbed';
import { saf2023Photos } from '@/content/saf2023-photos';
import { saf2023Artworks } from '@/content/saf2023-artworks';
import { supabase } from '@/lib/supabase';
import { videos as fallbackVideos } from '@/content/videos';
import { SITE_URL, escapeJsonLdForScript, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema, generateVideoSchema } from '@/lib/seo-utils';

const PAGE_URL = `${SITE_URL}/archive/2023`;

export const metadata: Metadata = createPageMetadata(
  '2023 아카이브',
  '2023년 씨앗페의 여정. 캠페인 영상, 현장 스케치, 그리고 우리가 함께 만든 변화의 기록들을 만나보세요.',
  '/archive/2023'
);

export default async function Archive2023Page() {
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

  const currentUrl = PAGE_URL;

  const pageTitle = '2023 아카이브 | 씨앗페 2026';
  const pageDescription = '씨앗페의 활동 기록과 성과들을 담아냅니다.';

  // JSON-LD Schema for CollectionPage with Articles
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '씨앗페 2026 아카이브',
    description: pageDescription,
    url: currentUrl,
    publisher: {
      '@type': 'Organization',
      name: '한국스마트협동조합',
      url: SITE_URL,
    },
  };

  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS['/archive']]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLdForScript(JSON.stringify(collectionSchema)),
        }}
      />
      <PageHero
        title="2023 오프라인 전시"
        description="씨앗페의 발자취와 성과, 언론 보도를 기록합니다"
        dividerColor="text-sun-soft"
      >
        <ShareButtons url={currentUrl} title={pageTitle} description={pageDescription} />
      </PageHero>

      {/* Past Events Section */}
      <Section variant="sun-soft" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">🎉 2023년 행사 기록</SectionTitle>

          {/* 2023 SAF Poster */}
          <div className="mb-12">
            <ExportedImage
              src="/images/saf2023/saf2023poster.png"
              alt="씨앗페 2023 공식 포스터"
              width={1200}
              height={1700}
              className="w-full rounded-2xl shadow-xl"
              priority
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <h3 className="text-card-title mb-4">씨앗페 2023 성과</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">7일</p>
                <p className="text-charcoal-muted text-sm">전시 기간</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">5일</p>
                <p className="text-charcoal-muted text-sm">공연 일정</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">120+</p>
                <p className="text-charcoal-muted text-sm">참여 예술인</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">3,400만원</p>
                <p className="text-charcoal-muted text-sm">기금 마련</p>
              </div>
            </div>
            <p className="text-charcoal-muted mb-4">
              2023년 3월 21일부터 3월 31일까지 서울시 종로구 인사동의 오디오가이 스튜디오와
              인디프레스 갤러리에서 전시와 공연이 펼쳐졌습니다. 국내 저명 뮤지션, 화가, 무용가 등
              50명 이상의 예술인이 참여하여 예술인 금융 위기의 심각성을 알리고, 작품 판매 수익을
              포함해 총 6,000만원을 조성하여 화가들에게 작품비를 지급하고, 대관 등 행사진행비를
              제외하고 3,400만원의 기금을 조성하였습니다.
            </p>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-card-title mb-4">📍 전시 장소</h4>
              <ul className="space-y-2 text-charcoal-muted">
                <li>🎪 오디오가이 스튜디오 (서울시 종로구 효자로 23)</li>
                <li>🎨 인디프레스 갤러리 (서울시 종로구 효자로 31)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-card-title mb-4">⏰ 공연 일정</h4>
              <ul className="space-y-2 text-charcoal-muted text-sm">
                <li>3월 22-28일: 매일 다양한 뮤지션 공연</li>
                <li>30분 간격으로 번갈아가며 진행</li>
                <li>선착순 무료입장</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* SAF 2023 Artworks Section */}
      <Section variant="gray" prevVariant="sun-soft">
        <div className="container-max">
          <SectionTitle className="mb-12">🎨 2023년 출품작</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {saf2023Artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="bg-white rounded-lg shadow-md overflow-hidden group flex flex-col"
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <ExportedImage
                    src={artwork.imageUrl}
                    alt={`${artwork.artist} - ${artwork.title}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="font-sans font-bold text-xl mb-2">{artwork.title}</h3>
                  <p className="text-primary font-semibold mb-3">{artwork.artist}</p>
                  <p className="text-charcoal-muted text-sm mb-4 flex-grow">
                    {artwork.description}
                  </p>
                  {artwork.details && (
                    <p className="text-xs text-charcoal-soft mt-auto pt-4 border-t border-gray-200">
                      {artwork.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SAF 2023 Gallery Section */}
      <Section variant="white" prevVariant="gray">
        <div className="container-max">
          <SectionTitle className="mb-12">📸 씨앗페 2023 현장</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {saf2023Photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <ExportedImage
                  src={`/images/saf2023/${photo.filename}`}
                  alt={photo.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-charcoal-muted mt-12 text-sm">
            2023년 3월 21일부터 3월 31일까지 인사동에서 펼쳐진 씨앗페 2023의 생생한 현장 모습입니다.
          </p>
        </div>
      </Section>

      {/* Video Archive Section */}
      <Section variant="accent-soft" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">📹 영상 아카이브</SectionTitle>
          {/* VideoObject JSON-LD for each video */}
          {videos.map((video) => (
            <JsonLdScript
              key={`video-schema-${video.id}`}
              data={generateVideoSchema({
                ...video,
                youtubeId: video.youtube_id, // Map database field to component expected field
              })}
            />
          ))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <VideoEmbed id={video.youtube_id} title={video.title} />
                <div className="p-6">
                  <h3 className="font-sans font-bold text-xl mb-2">{video.title}</h3>
                  <p className="text-charcoal-muted text-sm mb-4 line-clamp-2">
                    {video.description}
                  </p>

                  {video.transcript && (
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
            ))}
          </div>
        </div>
      </Section>

      {/* Call to Action */}
      <Section variant="primary-soft" prevVariant="accent-soft" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-6">이 역사에 당신도 함께하세요</SectionTitle>
          <p className="text-lg text-charcoal-muted mb-8 max-w-2xl mx-auto text-balance">
            씨앗페의 역사는 당신의 참여와 연대로 이어집니다. <br className="hidden md:block" />
            조합원 가입과 작품 구매로 예술인 상호부조의 미래를 함께 만들어주세요.
          </p>
          <CTAButtonGroup variant="large" className="justify-center" />
        </div>
      </Section>
    </>
  );
}
