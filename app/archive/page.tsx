import type { Metadata } from 'next';
import Image from 'next/image';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import VideoEmbed from '@/components/features/VideoEmbed';
import { newsArticles } from '@/content/news';
import { saf2023Photos } from '@/content/saf2023-photos';
import { videos } from '@/content/videos';
import { EXTERNAL_LINKS } from '@/lib/constants';

export const metadata: Metadata = {
  title: '아카이브 | 씨앗:페 2026',
  description:
    '씨앗:페의 활동 기록, 언론 보도, 영상 아카이브. 지난 행사와 성과들을 기록합니다.',
  openGraph: {
    title: '아카이브 | 씨앗:페 2026',
    description:
      '씨앗:페의 활동 기록, 언론 보도, 영상 아카이브. 지난 행사와 성과들을 기록합니다.',
    url: 'https://saf2026.org/archive',
    images: ['/images/og-image.png'],
  },
};

export default function ArchivePage() {
  const currentUrl = 'https://saf2026.org/archive';
  const pageTitle = '아카이브 | 씨앗:페 2026';
  const pageDescription = '씨앗:페의 활동 기록과 성과들을 담아냅니다.';

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
      url: 'https://saf2026.org',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: newsArticles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'NewsArticle',
          headline: article.title,
          description: article.description || '',
          datePublished: new Date(article.date).toISOString(),
          author: {
            '@type': 'Organization',
            name: article.source,
          },
          image: article.thumbnail || 'https://saf2026.org/images/og-image.png',
          url: article.link,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <PageHero
        title="아카이브"
        description="씨앗:페의 발자취와 성과, 언론 보도를 기록합니다"
      />

      {/* Share Buttons */}
      <section className="py-8 bg-primary/5 border-b border-primary/20">
        <div className="container-max">
          <ShareButtons url={currentUrl} title={pageTitle} description={pageDescription} />
        </div>
      </section>

      {/* News Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12">📰 언론 보도</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {newsArticles.map((article) => (
              <a
                key={article.id}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex items-center justify-center">
                  {article.thumbnail ? (
                    <Image
                      src={article.thumbnail}
                      alt={article.title}
                      width={800}
                      height={450}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="text-gray-300 text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <p className="text-sm">이미지 없음</p>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-2">
                    {article.source} • {new Date(article.date).toLocaleDateString('ko-KR')}
                  </p>
                  <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  {article.description && (
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {article.description}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Past Events Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12">🎉 2023년 행사 기록</h2>
          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <h3 className="text-2xl font-bold mb-4">씨앗:페 2023 성과</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">7일</p>
                <p className="text-gray-600 text-sm">전시 기간</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">5일</p>
                <p className="text-gray-600 text-sm">공연 일정</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">50+</p>
                <p className="text-gray-600 text-sm">참여 예술인</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">1,253만원</p>
                <p className="text-gray-600 text-sm">모금액</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              2023년 3월 21일부터 3월 31일까지 서울시 종로구 인사동의 오디오가이 스튜디오와
              인디프레스 갤러리에서 전시와 공연이 펼쳐졌습니다. 국내 저명 뮤지션, 화가, 무용가
              등 50명 이상의 예술인이 참여하여 예술인 금융 위기의 심각성을 알리고, 1,253만원의
              기금을 모았습니다.
            </p>
            <a
              href={EXTERNAL_LINKS.KOSMERT_2023_GALLERY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary hover:bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg transition-colors"
            >
              2023년 출품작 보기 →
            </a>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-lg mb-4">📍 전시 장소</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  🎪 오디오가이 스튜디오 (서울시 종로구 효자로 23)
                </li>
                <li>
                  🎨 인디프레스 갤러리 (서울시 종로구 효자로 31)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">⏰ 공연 일정</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>3월 22-28일: 매일 다양한 뮤지션 공연</li>
                <li>30분 간격으로 번갈아가며 진행</li>
                <li>선착순 무료입장</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SAF 2023 Gallery Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12">📸 씨앗페 2023 현장</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {saf2023Photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <Image
                  src={`/images/saf2023/${photo.filename}`}
                  alt={photo.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 mt-12 text-sm">
            2023년 3월 21일부터 3월 31일까지 인사동에서 펼쳐진 씨앗페 2023의 생생한 현장 모습입니다.
          </p>
        </div>
      </section>

      {/* Video Archive Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12">📹 영상 아카이브</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <VideoEmbed id={video.youtubeId} title={video.title} />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{video.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 md:py-20 bg-primary/5">
        <div className="container-max text-center">
          <h2 className="text-3xl font-bold mb-6">이 역사에 당신도 함께하세요</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            씨앗:페 2026의 성공은 당신의 참여와 후원으로 만들어집니다.
          </p>
          <a
            href="https://www.socialfunch.org/SAF"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary hover:bg-yellow-500 text-black font-bold px-8 py-4 rounded-lg transition-colors"
          >
            지금 후원하기
          </a>
        </div>
      </section>
    </>
  );
}
