import type { Metadata } from 'next';
import Image from 'next/image';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { newsArticles } from '@/content/news';

export const metadata: Metadata = {
  title: '언론 보도 | 씨앗:페 2026',
  description:
    '뉴스아트 등 주요 매체가 보도한 씨앗:페 캠페인 소식을 한 곳에서 확인하세요.',
  openGraph: {
    title: '언론 보도 | 씨앗:페 2026',
    description:
      '뉴스아트 등 주요 매체가 보도한 씨앗:페 캠페인 소식을 한 곳에서 확인하세요.',
    url: 'https://saf2026.org/news',
    images: ['/images/og-image.png'],
  },
};

const canonicalUrl = 'https://saf2026.org/news';

const sortedArticles = [...newsArticles].sort((a, b) => {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
});

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: '씨앗:페 2026 언론 보도',
  description:
    '뉴스아트 등 주요 매체가 보도한 씨앗:페 캠페인의 최신 기사 모음입니다.',
  url: canonicalUrl,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: sortedArticles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'NewsArticle',
        headline: article.title,
        datePublished: article.date,
        image: article.thumbnail,
        url: article.link,
        publisher: {
          '@type': 'Organization',
          name: article.source,
        },
        description: article.description,
      },
    })),
  },
};

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function NewsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <PageHero
        title="언론 보도"
        description="씨앗:페 캠페인을 조명한 기사와 인터뷰를 모았습니다."
        backgroundGradient="from-primary/10 via-primary/5 to-white"
      />

      <section className="py-8 bg-primary/5 border-b border-primary/20">
        <div className="container-max">
          <ShareButtons
            url={canonicalUrl}
            title="언론 보도 | 씨앗:페 2026"
            description="씨앗:페 캠페인을 다룬 언론 보도를 한 눈에 확인해보세요."
          />
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sortedArticles.map((article) => (
              <article
                key={article.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col h-full"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {article.thumbnail ? (
                      <Image
                        src={article.thumbnail}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <span className="text-4xl mb-2">📰</span>
                        <span className="text-sm">이미지 없음</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                      <span>{article.source}</span>
                      <span>{formatDate(article.date)}</span>
                    </div>
                    <h3 className="font-partial text-xl leading-tight text-gray-900">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {article.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      자세히 보기
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
