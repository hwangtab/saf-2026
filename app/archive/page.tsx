import type { Metadata } from 'next';
import Image from 'next/image';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import VideoEmbed from '@/components/features/VideoEmbed';
import { saf2023Photos } from '@/content/saf2023-photos';
import { videos } from '@/content/videos';
import { EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';

const PAGE_URL = `${SITE_URL}/archive`;
const OG_IMAGE_URL = `${SITE_URL}/images/saf2023/IMG_0327.png`;

export const metadata: Metadata = {
  title: '아카이브 | 씨앗:페 2026',
  description:
    '씨앗:페 2023 성과, 언론 보도, 영상 기록을 모아둔 공식 아카이브입니다.',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: '아카이브 | 씨앗:페 2026',
    description:
      '씨앗:페 캠페인의 기록과 언론 보도, 영상 아카이브를 한 곳에서 확인하세요.',
    url: PAGE_URL,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: '씨앗페 2023 전시와 공연 현장을 기록한 사진 모음',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '씨앗:페 2026 아카이브',
    description: '씨앗:페 캠페인의 기록과 영상, 언론 보도를 아카이브에서 확인하세요.',
    images: [OG_IMAGE_URL],
  },
};

export default function ArchivePage() {
  const currentUrl = PAGE_URL;
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
      url: SITE_URL,
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
      >
        <ShareButtons url={currentUrl} title={pageTitle} description={pageDescription} />
      </PageHero>

      {/* Past Events Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="font-partial text-3xl mb-12">🎉 2023년 행사 기록</h2>
          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <h3 className="font-watermelon text-2xl font-bold mb-4">씨앗:페 2023 성과</h3>
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
                <p className="text-3xl font-bold text-primary">3,000만원</p>
                <p className="text-gray-600 text-sm">기금 마련</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              2023년 3월 21일부터 3월 31일까지 서울시 종로구 인사동의 오디오가이 스튜디오와
              인디프레스 갤러리에서 전시와 공연이 펼쳐졌습니다. 국내 저명 뮤지션, 화가, 무용가
              등 50명 이상의 예술인이 참여하여 예술인 금융 위기의 심각성을 알리고, 작품 판매 수익을
              포함해 총 3,000만원의 기금을 마련했습니다.
            </p>
            <a
              href={EXTERNAL_LINKS.KOSMERT_2023_GALLERY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent hover:bg-accent-strong text-light font-bold px-6 py-2 rounded-lg transition-colors"
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
          <h2 className="font-partial text-3xl mb-12">📸 씨앗페 2023 현장</h2>
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
          <h2 className="font-partial text-3xl mb-12">📹 영상 아카이브</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <VideoEmbed id={video.youtubeId} title={video.title} />
                <div className="p-6">
                  <h3 className="font-watermelon text-xl font-bold mb-2">{video.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 md:py-20 bg-primary/20">
        <div className="container-max text-center">
          <h2 className="font-partial text-3xl mb-6">이 역사에 당신도 함께하세요</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            씨앗:페 2026의 성공은 당신의 참여와 후원으로 만들어집니다.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href={EXTERNAL_LINKS.DONATE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-light font-bold px-8 py-4 rounded-lg transition-colors"
            >
              ❤️ 지금 후원하기
            </a>
            <a
              href={EXTERNAL_LINKS.ONLINE_GALLERY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-lg transition-colors"
            >
              🎨 작품 구매하기
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
