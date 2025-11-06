import type { Metadata } from 'next';
import Image from 'next/image';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { newsArticles } from '@/content/news';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';

const PAGE_URL = `${SITE_URL}/news`;

export const metadata: Metadata = {
  title: '언론 보도 | 씨앗:페 2026',
  description:
    '뉴스아트, 아시아경제 등 주요 매체가 전하는 씨앗:페 캠페인 소식을 모았습니다.',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: '언론 보도 | 씨앗:페 2026',
    description:
      '언론 보도를 통해 씨앗:페 상호부조 캠페인의 영향력과 협력 사례를 확인하세요.',
    url: PAGE_URL,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '씨앗:페 2026 언론 보도',
    description: '씨앗:페 캠페인을 다룬 최신 기사와 인터뷰를 한눈에 확인하세요.',
    images: [OG_IMAGE.url],
  },
};

const canonicalUrl = PAGE_URL;

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

const highlightQuotes = [
  {
    id: 'hani-20251105',
    label: '2025.11.5',
    source: '한겨레',
    excerpt:
      '제1금융권에서 거절당한 예술인은 고금리 대출로 향한다. 연극인 이수경씨는 과거 카드빚 600만원을 7년동안 갚은 기억을 전했다. 이씨는 “(이자 부담이 커) 갚은 돈이 1천만원을 넘는 것 같다”고 했다. 채권 추심도 피하지 못했다. “처음에는 전기료나 가스비 같은 공공요금에서 빼가다가 통장이 동결됐어요. 채권 추심 전화를 받는데 영화에서나 본 조폭 같은 목소리였습니다. 끔찍했어요.” 예술인들 사이에 흔한 얘기다.',
  },
  {
    id: 'mixing-20251106',
    label: '2025.11.6',
    source: '월간 믹싱',
    excerpt:
      '현재 예술인 집단의 대다수가 금융 사각지대에 놓여 있다는 것은 우리나라 문화예술의 기반을 위협하는 심각한 문제다. 금융기관과 예술 단체, 정부가 예술인의 복지 향상과 대안적 금융에 적극적으로 관심을 기울여야 한다.',
  },
  {
    id: 'newsart-20250522',
    label: '2025.05.22',
    source: '뉴스아트',
    excerpt:
      '대출금 상환 성과도 괄목할 만하다. 대위변제율은 금액 기준 5.10%로, 일반 금융기관의 저신용자 대출 연체율과 비교해 낮은 수준을 유지하고 있다. 이는 신용점수가 낮아도 예술인들의 상환 의지와 책임감이 결코 낮지 않다는 것을 증명한다.',
  },
  {
    id: 'asiae-20251105',
    label: '2025.11.5',
    source: '아시아경제',
    excerpt:
      '은행 문턱을 넘지 못한 예술인 상당수는 고금리 대부업체로 내몰렸으며, 응답자의 48.6%가 연 15% 이상 초고금리 대출을 경험한 것으로 조사됐다.',
  },
  {
    id: 'newsart-20251105',
    label: '2025.11.5',
    source: '뉴스아트',
    excerpt:
      "3단계, '파괴': 결국 빚의 무게는 삶의 기반을 무너뜨린다. 채권 추심을 경험한 예술인의 88.3%가 창작 활동을 중단하거나 현저히 위축됐다. 한 편의 시와 한 곡의 노래가 빚 독촉 전화에 짓밟히는 순간, K-문화의 미래 자산도 함께 소멸되고 있었다.",
  },
  {
    id: 'abcn-20230315',
    label: '2023.03.15',
    source: 'ABC뉴스',
    excerpt:
      '이에 다양한 예술인들이 더 많은 대출기금을 마련하기 위해 발 벗고 나섰는데, 입소문을 타면서 씨앗페의 규모가 훨씬 커졌다. 미술·음악·사진·무용 등 장르와 세대를 아우른 이번 축제는 코로나 이후 최대 규모로, 금융 소외 문제에 대한 사회적 관심을 불러일으킨다.',
  },
  {
    id: 'socialimpact-20230619',
    label: '2023.06.19',
    source: '소셜임팩트뉴스',
    excerpt:
      '“(불규칙한 소득 탓에) 신용점수는 낮을 수밖에 없죠. 신용점수가 낮으면 은행에서 대출 받는 게 정말 쉽지 않습니다. 설령 대출을 받는다 해도 저축은행이나 대부업체의 고금리 대출을 받거나 카드론에 손을 대는 게 다반사예요.” 서인형 이사장은 고금리에 빠지면 은행으로 돌아가기가 더 어려워지는 악순환을 지적했다.',
  },
  {
    id: 'newsart-20250918',
    label: '2025.09.18',
    source: '뉴스아트',
    excerpt:
      '이 대담한 뚝심은 예술인들과의 지속적인 관계 맺기가 있었기에 가능했다. 조합은 차가운 서류로 심사하는 기관이 아니다. 씨앗페 등 공동체 활동으로 연대감을 다진 관계금융이 책임감 있는 상환으로 이어졌고, “이번 7억 원 돌파는 예술인들이 스스로 금융 주권을 찾아가고 있다는 증거”라고 서인형 이사장은 말했다.',
  },
];

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
        backgroundClass="bg-accent-soft"
      >
        <ShareButtons
          url={canonicalUrl}
          title="언론 보도 | 씨앗:페 2026"
          description="씨앗:페 캠페인을 다룬 언론 보도를 한 눈에 확인해보세요."
        />
      </PageHero>

      <section className="py-12 md:py-16 bg-white">
        <div className="container-max flex flex-col gap-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-primary text-primary text-xs font-semibold tracking-wide uppercase">
              Press Highlights
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-watermelon font-bold text-gray-900 leading-tight">
              언론이 짚어낸 예술인 금융 위기의 핵심 메시지
            </h2>
            <p className="mt-3 text-base md:text-lg text-charcoal-muted leading-relaxed">
              최근 보도에서 반복적으로 등장한 증언과 수치를 통해, 예술인이 겪는 금융 사각지대의
              현실과 제도 개선의 절박함을 강조합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {highlightQuotes.map((item) => (
              <figure
                key={item.id}
                className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <figcaption className="text-xs font-semibold tracking-widest uppercase text-primary">
                  {item.label} · {item.source} 보도
                </figcaption>
                <blockquote className="mt-3 text-base md:text-lg text-gray-900 leading-relaxed">
                  {item.excerpt}
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-primary-surface">
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
                    <h3 className="font-watermelon text-xl font-bold leading-tight text-gray-900">
                      {article.title}
                    </h3>
                    <p className="text-sm text-charcoal-muted leading-relaxed">
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
