import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import SafeImage from '@/components/common/SafeImage';
import LinkButton from '@/components/ui/LinkButton';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';

import { CONTACT, OG_IMAGE, SITE_URL } from '@/lib/constants';
import { ARTIST_COUNT, LOAN_COUNT } from '@/lib/site-stats';
import { resolveLocale } from '@/lib/server-locale';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { getSupabaseStories } from '@/lib/supabase-data';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { STORY_CATEGORIES, type StoryCategory } from '@/types';

export const revalidate = 600;

interface Props {
  params: Promise<{ category: string }>;
}

type LocaleCode = 'ko' | 'en';

interface CategoryEditorial {
  title: string;
  description: string;
  heroTitle: string;
  heroDescription: string;
  keywords: string[];
  // 토픽 클러스터 강화용 큐레이션 인트로 — Hero와 글 그리드 사이 본문 섹션.
  // 각 단락 200~400자 정도, 자연스러운 키워드 분포.
  editorialIntro: string;
  editorialParagraphs: string[];
}

const CATEGORY_META: Record<LocaleCode, Record<StoryCategory, CategoryEditorial>> = {
  ko: {
    'artist-story': {
      title: '작가를 만나다 — 작가 인터뷰 & 스토리',
      description:
        '씨앗페 출품 작가들의 이야기를 만나보세요. 작품 세계관, 창작 과정, 작가 인터뷰를 통해 한국 현대미술의 깊이를 경험하세요.',
      heroTitle: '작가를 만나다',
      heroDescription: '작품 너머의 작가 이야기',
      keywords: [
        '작가 인터뷰',
        '한국 작가',
        '현대미술 작가',
        '작가 이야기',
        '씨앗페 작가',
        '미술 인터뷰',
      ],
      editorialIntro: `작품 한 점이 만들어지기까지, 작가는 어떤 시간을 보냈을까요. 씨앗페 2026에는 회화·판화·사진·조각으로 자신의 세계를 짓는 ${ARTIST_COUNT}명의 한국 작가가 모였습니다. 그들이 동료 예술인을 위해 작품을 내놓은 이유부터, 작업실의 일상과 작품 너머의 사유까지 — 한 작품을 진짜로 ‘본다’는 것은 그 작가를 아는 일에서 시작됩니다.`,
      editorialParagraphs: [
        '한국 현대미술 작가의 인터뷰는 미술관 도록이나 학술 글에 갇혀 있는 경우가 많습니다. 씨앗페 매거진의 작가 인터뷰는 그보다 가까운 거리에서, 작가 본인의 언어로 작품을 풀어냅니다. “이 색을 왜 골랐나요”, “이 작업을 멈추고 싶었던 순간이 있었나요” 같은 단순한 질문에서 작가의 결이 드러납니다. 처음 한국 작가의 작품을 만나는 분이라면, 작품 이미지보다 인터뷰 한 편을 먼저 읽는 쪽이 작품을 오래 사랑하게 만들기도 합니다.',
        '씨앗페 출품 작가들은 작품 판매 수익 일부를 동료 예술인을 위한 상호부조 기금에 내놓기로 한 “연대 작가”들입니다. 한국 예술인의 84.9%가 제1금융권 대출에서 배제되는 현실에서, 한 사람의 작가가 다른 작가를 떠받치는 작은 공동체를 만드는 시도에 동참한 사람들입니다. 그래서 이곳의 작가 이야기는 개인사이면서 동시에 한국 미술의 구조를 비추는 거울이기도 합니다.',
        '관심 가는 작가의 인터뷰를 읽으셨다면, 그 작가의 출품작 페이지에서 작품을 직접 만나보세요. 작품 옆에는 작가 약력과 다른 출품작 링크가 함께 놓여 있고, 마음에 드는 작품은 화랑 직매로 구매할 수 있습니다. 무료 배송과 7일 이내 반품으로 첫 작품 구매의 부담도 줄였습니다.',
      ],
    },
    'buying-guide': {
      title: '컬렉팅 시작하기 — 미술 작품 구매 가이드',
      description:
        '미술 작품 구매가 처음이신가요? 작품 선택부터 배송, 보관까지 컬렉팅에 필요한 모든 정보를 안내합니다.',
      heroTitle: '컬렉팅 시작하기',
      heroDescription: '작품 구매가 처음인 분을 위한 안내',
      keywords: [
        '미술 작품 구매',
        '그림 사는 법',
        '컬렉팅 가이드',
        '작품 구매 방법',
        '미술품 투자',
        '처음 미술 작품',
      ],
      editorialIntro:
        '“미술 작품을 사고 싶지만 어디서 어떻게 시작해야 할지 모르겠다.” 가장 많이 듣는 말입니다. 컬렉팅은 부유한 사람의 취미가 아니라, 좋아하는 작품 한 점을 자기 공간으로 들이는 결정에서 시작됩니다. 이 코너는 첫 작품을 사는 분을 위한 안내 — 가격은 무엇이 결정하는지, 원본과 판화의 차이는 무엇인지, 보증서와 보관은 어떻게 챙기는지를 부담 없는 분량으로 다룹니다.',
      editorialParagraphs: [
        '미술 작품 가격은 마법이 아닙니다. 작가의 이력과 시장에서의 거래 기록, 작품의 크기·매체·에디션 수가 가격의 골격을 만듭니다. 같은 작가라도 회화 원본과 한정 에디션 판화의 가격대가 다르고, 같은 매체라도 시리즈 안에서의 위치에 따라 다릅니다. 처음에는 “내가 매일 봐도 좋을 것 같은가”라는 단순한 기준으로 시작하시고, 익숙해지면 가격의 구조를 들여다보세요.',
        `씨앗페 온라인은 화랑 수수료가 끼지 않는 작가 직매 구조이고, 작품 판매 수익은 ${LOAN_COUNT}건의 저금리 대출(95% 상환율)로 운영된 예술인 상호부조 기금이 됩니다. 한 점을 사는 일이 한 명의 작가를 응원하는 것이 아니라, 한국 예술 생태계의 작은 안전망을 보태는 일이 됩니다. 그래서 “왜 이 갤러리에서 사야 하는가”에 대한 답이 가격표 너머에 있습니다.`,
        '구매 절차는 단순합니다: 마음에 드는 작품을 클릭 → 작가·재료·크기·가격을 확인 → 토스페이먼츠로 결제 → 4,000원 정액 배송비로 전국 배송. 7일 이내 반품도 가능합니다. 처음에는 가격대가 부담 없는 판화나 소형 회화로 시작하시는 분이 많습니다. 가격대별 필터로 예산에 맞는 작품을 추리고, 인테리어와 어울리는지 작품 옆 사진을 함께 확인해 보세요.',
      ],
    },
    'art-knowledge': {
      title: '미술 산책 — 가볍게 즐기는 미술 이야기',
      description:
        '미술 감상법, 미술사 이야기, 전시회 관람 팁까지. 일상에서 가볍게 즐기는 미술 이야기를 만나보세요.',
      heroTitle: '미술 산책',
      heroDescription: '가볍게 즐기는 미술 이야기',
      keywords: [
        '미술 감상',
        '미술 상식',
        '전시회 관람',
        '현대미술 이해',
        '미술 이야기',
        '미술 산책',
      ],
      editorialIntro:
        '미술이 어렵게 느껴지는 건 보는 사람의 잘못이 아닙니다. 너무 많은 “알아야 할 것”이 작품과 우리 사이를 가로막은 탓일 때가 많습니다. 미술 산책은 그 거리감을 줄이는 코너입니다. 한 작품을 어떻게 보면 좋은지, 미술사 속 어느 자리에 놓이는지, 전시장에서 무엇을 챙기면 더 잘 즐길 수 있는지 — 일상의 산책처럼 가볍게 건네는 미술 이야기들입니다.',
      editorialParagraphs: [
        '현대미술이 “이해 안 되는 그림”의 동의어처럼 쓰일 때가 있습니다. 그러나 작품을 이해하는 일은 정답을 맞히는 게 아니라 질문을 던지는 일에 가깝습니다. “이 작가는 왜 이 색을 골랐을까”, “왜 이 크기여야 했을까” 같은 작은 질문이 감상의 기본기입니다. 미술 산책의 글들은 한 작품을 두고 그런 질문을 함께 따라가는 식으로 쓰입니다.',
        '한국 현대미술의 흐름도 이 코너에서 가볍게 다룹니다. 1980년대 민중미술의 목판화, 1990년대 단색화의 부상, 2000년대 이후의 사진과 미디어 — 큰 사조의 윤곽을 알면 동시대 작가의 작업이 어디서 출발해 어디로 향하는지 보이기 시작합니다. 작가 한 사람의 인터뷰가 나무라면, 미술 산책의 글은 그 나무가 자란 숲의 풍경입니다.',
        `읽다가 마음에 닿는 작가나 매체가 생기면, 작품 갤러리에서 직접 그 결의 작품을 찾아보세요. 회화·판화·사진·조각 카테고리별로 ${ARTIST_COUNT}명 작가의 작품을 비교해 볼 수 있고, 가격대 필터로 부담 없이 시작할 수도 있습니다. 미술은 결국 좋아하는 작품을 한 점 들이는 데서 진짜로 시작됩니다.`,
      ],
    },
  },
  en: {
    'artist-story': {
      title: 'Meet the Artist — Interviews & Stories',
      description:
        'Discover the stories behind SAF artists. Explore their creative process, artistic philosophy, and journey through interviews and features.',
      heroTitle: 'Meet the Artist',
      heroDescription: 'Stories behind the artists and their works',
      keywords: [
        'artist interview',
        'Korean artist',
        'contemporary art',
        'artist story',
        'SAF artist',
      ],
      editorialIntro: `Behind every artwork is a life of decisions. SAF 2026 brings together ${ARTIST_COUNT} Korean artists who chose to put their work into a mutual-aid campaign for fellow artists. Their interviews, studio notes, and reflections give you the context that turns a passing glance into a lasting connection with a piece.`,
      editorialParagraphs: [
        'Korean contemporary artist interviews often live behind academic prose. The SAF magazine asks simpler questions in the artists’ own words, so first-time visitors can build a real sense of who made the work — and why.',
        'Every featured artist is a “solidarity artist”: they donated work knowing the proceeds would fund low-interest loans for peers excluded from primary banking (84.9% of Korean artists). Their stories are personal, but they also reveal the structural reality of Korean art-making.',
        'Found an artist you connect with? Their full SAF collection is one click away — original works, gallery-direct pricing, free shipping, and 7-day returns.',
      ],
    },
    'buying-guide': {
      title: 'Start Collecting — Art Buying Guide',
      description:
        'New to art collecting? From choosing artwork to shipping and care, everything you need to start your art collection.',
      heroTitle: 'Start Collecting',
      heroDescription: 'A guide for first-time art buyers',
      keywords: [
        'buy art',
        'art collecting guide',
        'how to buy art',
        'first art purchase',
        'art investment',
      ],
      editorialIntro:
        'Art collecting is not a hobby reserved for the wealthy. It starts with deciding to bring a piece you love into your space. This section is a no-pressure guide for first-time buyers: how prices are formed, the difference between originals and editions, and what to know about provenance and care.',
      editorialParagraphs: [
        'Artwork prices are shaped by the artist’s exhibition history, market record, size, medium, and edition count. Originals and limited-edition prints by the same artist sit in different price tiers — knowing the structure helps you read a price tag with confidence.',
        `SAF Online is artist-direct: there is no gallery markup. All proceeds become an artist mutual-aid fund — already ${LOAN_COUNT} loans deployed at 95% repayment. Buying one work supports one artist; buying through SAF strengthens a small safety net for Korean art as a whole.`,
        'The process is simple: pick a work, review the artist and details, check out via Toss Payments, and receive nationwide shipping at a flat ₩4,000. Returns are accepted within 7 days. Many first-time collectors begin with smaller prints or paintings — use the price filter to find a starting point.',
      ],
    },
    'art-knowledge': {
      title: 'Art Walk — Bite-sized Art Stories',
      description:
        'Art appreciation tips, art history stories, and exhibition guides. Enjoy art through bite-sized, accessible stories.',
      heroTitle: 'Art Walk',
      heroDescription: 'Enjoy art through bite-sized stories',
      keywords: [
        'art appreciation',
        'art knowledge',
        'exhibition guide',
        'contemporary art',
        'art stories',
      ],
      editorialIntro:
        'If contemporary art feels intimidating, that is rarely the viewer’s fault. The Art Walk section closes the distance with short pieces on how to look at a work, where it sits in art history, and how to get more out of a gallery visit.',
      editorialParagraphs: [
        'Understanding a work is less about “getting the right answer” and more about asking small questions: why this color, why this size, why this medium? The articles here walk you through those questions slowly, with one work at a time.',
        'We also map the broader currents of Korean contemporary art — from the 1980s minjung woodblock prints to the rise of Dansaekhwa, to the photography and media art of the 2000s — so you can see where today’s artists are coming from.',
        'When something resonates, follow the link to the gallery and explore that style up close. Browsing by medium or price range is the easiest way to start.',
      ],
    },
  },
};

const CATEGORY_LABELS: Record<LocaleCode, Record<StoryCategory, string>> = {
  ko: {
    'artist-story': '작가를 만나다',
    'buying-guide': '컬렉팅 시작하기',
    'art-knowledge': '미술 산책',
  },
  en: {
    'artist-story': 'Artist Stories',
    'buying-guide': 'Buying Guide',
    'art-knowledge': 'Art Knowledge',
  },
};

function isValidCategory(category: string): category is StoryCategory {
  return (STORY_CATEGORIES as readonly string[]).includes(category);
}

/** body 마크다운에서 첫 번째 이미지 URL 추출 */
function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

export async function generateStaticParams() {
  return STORY_CATEGORIES.flatMap((category) =>
    routing.locales.map((locale) => ({ locale, category }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const { category } = await params;

  if (!isValidCategory(category)) {
    return { title: 'Not Found' };
  }

  const meta = CATEGORY_META[locale][category];
  const categoryPath = `/stories/category/${category}`;

  const allStories = await getSupabaseStories();
  const stories = allStories.filter((s) => s.category === category);

  // 대표 이미지: 첫 번째 스토리 썸네일
  const representativeImage =
    stories[0]?.thumbnail || extractFirstImage(stories[0]?.body) || undefined;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: createLocaleAlternates(categoryPath, locale),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: buildLocaleUrl(categoryPath, locale),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      images: [
        {
          url: representativeImage || OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt:
            locale === 'en'
              ? `${meta.heroTitle} — SAF Magazine`
              : `씨앗페 매거진 — ${meta.heroTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: representativeImage || OG_IMAGE.url,
          alt:
            locale === 'en'
              ? `${meta.heroTitle} — SAF Magazine`
              : `씨앗페 매거진 — ${meta.heroTitle}`,
        },
      ],
    },
  };
}

export default async function StoryCategoryPage({ params }: Props) {
  const locale = resolveLocale(await getLocale());
  const { category } = await params;

  if (!isValidCategory(category)) {
    notFound();
  }

  const meta = CATEGORY_META[locale][category];
  const categoryPath = `/stories/category/${category}`;
  const pageUrl = buildLocaleUrl(categoryPath, locale);

  const allStories = await getSupabaseStories();
  const stories = allStories.filter((s) => s.category === category);

  // Breadcrumbs
  const breadcrumbItems = [
    { name: locale === 'en' ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
    { name: locale === 'en' ? 'Magazine' : '매거진', url: buildLocaleUrl('/stories', locale) },
    { name: meta.heroTitle, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  // CollectionPage JSON-LD
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: {
      '@type': 'Thing',
      name: meta.heroTitle,
    },
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    ...(stories.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            '@id': `${pageUrl}#item-list`,
            numberOfItems: stories.length,
            itemListElement: stories.map((story, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: buildLocaleUrl(`/stories/${story.slug}`, locale),
              name: locale === 'en' && story.title_en ? story.title_en : story.title,
            })),
          },
        }
      : {}),
  };

  // 다른 카테고리
  const otherCategories = STORY_CATEGORIES.filter((c) => c !== category).map((c) => ({
    category: c,
    label: CATEGORY_LABELS[locale][c],
    count: allStories.filter((s) => s.category === c).length,
    path: `/stories/category/${c}`,
  }));

  return (
    <>
      <JsonLdScript data={[collectionSchema, breadcrumbSchema]} />

      <PageHero
        title={meta.heroTitle}
        description={meta.heroDescription}
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={`${SITE_URL}${categoryPath}`}
          title={meta.title}
          description={meta.description}
        />
      </PageHero>

      {/* 큐레이션 인트로 — 토픽 권위(topical authority) 확보를 위한 editorial body.
          단순 글 그리드만 있던 thin content 페이지에 250~400자 본문을 추가해
          검색 엔진이 카테고리의 주제를 명확히 인식하도록 함.
          PageHero가 charcoal-deep 그라디언트라 Section의 prevVariant 토큰으로 매칭 불가 →
          그라디언트 생략하고 단색 white로 시작 (다른 페이지의 hero→section 전환과 동일).
          padding="none"로 Section의 기본 py-12 md:py-20 비활성화 → className의 pt-12 pb-8가 단독 적용. */}
      <Section variant="white" padding="none" className="pt-12 pb-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-lg leading-relaxed text-charcoal-deep break-keep mb-6 font-medium">
            {meta.editorialIntro}
          </p>
          <div className="space-y-5 text-base leading-relaxed text-charcoal break-keep">
            {meta.editorialParagraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </Section>

      {stories.length === 0 ? (
        <Section variant="canvas" prevVariant="white">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-charcoal mb-1">
              {locale === 'en' ? 'No stories available yet.' : '아직 등록된 글이 없습니다.'}
            </p>
            <p className="text-sm text-charcoal-muted">
              {locale === 'en' ? 'New stories are coming soon.' : '곧 새로운 글이 찾아옵니다.'}
            </p>
          </div>
        </Section>
      ) : (
        <Section variant="white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stories.map((story, i) => {
                const title = locale === 'en' && story.title_en ? story.title_en : story.title;
                const excerpt =
                  locale === 'en' && story.excerpt_en ? story.excerpt_en : story.excerpt;
                const cardImg = story.thumbnail || extractFirstImage(story.body);

                return (
                  <Link
                    key={story.id}
                    href={`/stories/${story.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.08}s`,
                      animationFillMode: 'forwards',
                    }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {cardImg ? (
                        <>
                          <SafeImage
                            src={cardImg}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-canvas to-canvas-soft flex items-center justify-center">
                          <span className="text-charcoal-muted/20 text-5xl font-display font-black">
                            M
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-card-title text-charcoal line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-300">
                        {title}
                      </h3>
                      {excerpt && (
                        <p className="text-sm text-charcoal-muted line-clamp-2 mb-4 leading-relaxed">
                          {excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-charcoal-muted/60">
                        <span>{story.published_at}</span>
                        {story.author && (
                          <>
                            <span>·</span>
                            <span>{story.author}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* 다른 카테고리 내부 링크 — 토픽 클러스터 강화 */}
      <Section
        variant="white"
        prevVariant={stories.length === 0 ? 'canvas-soft' : 'white'}
        className="pb-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-gray-500">
              {locale === 'en' ? 'More in Magazine' : '매거진 더 보기'}
            </p>
            <Link
              href="/stories"
              className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {locale === 'en' ? 'All Stories' : '전체 보기'}
            </Link>
            {otherCategories
              .filter((c) => c.count > 0)
              .map((cat) => (
                <Link
                  key={cat.category}
                  href={cat.path}
                  className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {cat.label}
                  <span className="ml-1 opacity-60">{cat.count}</span>
                </Link>
              ))}
          </div>
        </div>
      </Section>

      {/* 작품 갤러리 교차 링크 — 매거진에서 작품 구매로 전환 유도 */}
      <Section variant="canvas" prevVariant="white" className="pb-16">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-lg font-display font-bold text-charcoal">
              {locale === 'en'
                ? 'Ready to start your collection?'
                : '마음에 드는 작품을 찾아보세요'}
            </p>
            <p className="text-sm text-charcoal-muted mt-1">
              {locale === 'en'
                ? `${ARTIST_COUNT} artists, artworks available online.`
                : `${ARTIST_COUNT}명의 작가, 지금 바로 구매 가능한 작품들`}
            </p>
          </div>
          <LinkButton
            href="/artworks"
            variant="primary"
            size="sm"
            className="shrink-0 px-6 py-3 shadow-sm hover:shadow-md min-h-[48px]"
          >
            {locale === 'en' ? 'Browse Artworks' : '작품 갤러리 보기'} →
          </LinkButton>
        </div>
      </Section>
    </>
  );
}
