import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MasterArtistMediumSections from '@/components/special/MasterArtistMediumSections';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PaperGrain from '@/components/common/PaperGrain';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import { resolveLocale } from '@/lib/server-locale';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import type { Artwork, ArtworkListItem } from '@/types';

// 거장 작가 feature는 작가 페이지(/artworks/artist/김준권)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_JUNGWON_PATH = `/artworks/artist/${encodeURIComponent('김준권')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimJungwonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김준권' ||
    n === 'kim jungwon' ||
    n === 'kim jung-won' ||
    n.replace(/[\s-]+/g, '') === 'kimjungwon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김준권 — 나무에 스민 수묵, 칼끝의 산하',
    description:
      '수묵 목판화가 김준권(1956–). 홍익대 미술교육과를 졸업하고 미술교사로 일하다 1989년 전교조 해직 이후 판화가의 길로 들어선 그는 중국 루쉰미술대학에서 목판화를 연마하고 1997년 충북 진천에 한국목판문화연구소를 열었다. 40년을 한결같이 나무를 파온 수묵 목판화의 대가. 씨앗페 온라인에서 김준권의 작품을 만날 수 있습니다.',
    ogDescription:
      '수묵 목판화가 김준권. 나무에 스민 수묵, 칼끝의 산하 — 전교조 해직교사에서 수묵 목판화 거장으로, 40년 외길의 판화 인생과 한반도 국토를 담은 대작들.',
    ogAlt: '김준권 대표 수묵 목판화 작품',
    twitterTitle: '김준권',
    twitterDescription: '나무에 스민 수묵, 칼끝의 산하 — 수묵 목판화가 김준권',
    keywords:
      '김준권 판화가, 김준권 목판화, 수묵목판화, 수성 다색목판화, 한국 산하, 백두대간, 씨앗페 온라인, 한국목판문화원',
  },
  en: {
    title: 'Kim Jungwon — Ink in the Wood, Mountains at the Blade’s Edge',
    description:
      'Selected works by Kim Jungwon (b. 1956), Korean master of ink-wash woodblock printmaking. A graduate of Hongik University’s art education program, he became a full-time printmaker after being dismissed from teaching in 1989. He refined his craft at the Lu Xun Academy of Fine Arts in China and in 1997 established the Korean Woodblock Culture Research Institute in Jincheon, North Chungcheong Province. View his works at SAF Online.',
    ogDescription:
      'Kim Jungwon — Korean ink-wash woodblock printmaker. Forty years of carving the Korean landscape onto wood: from the minjung art movement to the peaks of Baekdudaegan.',
    ogAlt: 'Kim Jungwon — featured ink-wash woodblock print',
    twitterTitle: 'Kim Jungwon',
    twitterDescription:
      "Ink in the wood, mountains at the blade's edge — woodblock master Kim Jungwon",
    keywords:
      'Kim Jungwon printmaker, Korean woodblock, ink-wash woodcut, Korean landscape, Baekdudaegan, SAF Online',
  },
} as const;

export async function buildKimJungwonMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl(KIM_JUNGWON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김준권');
  const artwork = allArtworks.find((a) => isKimJungwonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Jungwon`
      : `${artwork.title} — 김준권`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_JUNGWON_PATH, locale, true),
    ...(locale === 'en' ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: copy.title,
      description: copy.ogDescription,
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: [{ url: ogImageUrl, alt: ogImageAlt }],
    },
  };
}

export default async function KimJungwonFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_JUNGWON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김준권');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimJungwonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Jungwon' : '김준권', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_JUNGWON_PATH}#person-kim-jungwon`,
    name: isEnglish ? 'Kim Jungwon' : '김준권',
    alternateName: isEnglish ? '김준권' : 'Kim Jungwon',
    jobTitle: isEnglish ? 'Printmaker' : '판화가',
    description: isEnglish
      ? "Kim Jungwon (b. 1956) is a Korean master of ink-wash woodblock printmaking. He graduated from Hongik University's art education program in 1982, worked as an art teacher, and became a full-time printmaker after being dismissed in 1989. After studying at China's Lu Xun Academy of Fine Arts (1994–1997), he established the Korean Woodblock Culture Research Institute in Jincheon in 1997 and has been carving the Korean landscape onto wood for over four decades."
      : '김준권(1956–)은 한국의 수묵 목판화 거장이다. 1982년 홍익대 미술교육과를 졸업하고 미술교사로 일하다 1989년 해직 후 전업 판화가가 됐다. 중국 루쉰미술대학에서 목판화를 연마(1994–1997)한 뒤 1997년 충북 진천에 한국목판문화연구소를 열고, 40여 년을 국토의 산하를 수묵 목판에 새겨왔다.',
    birthDate: '1956',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Yeongam, South Jeolla Province, South Korea' : '전남 영암',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Art Education' : '홍익대학교 미술교육과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Korea Woodblock Culture Center' : '한국목판문화원',
    },
    knowsAbout: [
      'Korean woodblock printmaking',
      'Ink-wash woodcut',
      'Korean landscape',
      'Minjung art',
    ],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Jungwon — SAF Online' : '김준권 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected ink-wash woodblock prints by Kim Jungwon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김준권 작품을 소개합니다.',
    url: pageUrl,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: pageUrl },
    startDate: '2026-01-14',
    organizer: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    about: artistPerson,
    isAccessibleForFree: true,
  };

  const itemListSchema = generateArtworkListSchema(
    fullArtworks,
    locale,
    fullArtworks.length,
    pageUrl
  );
  const aggregateOfferSchema = generateGalleryAggregateOffer(fullArtworks, locale, pageUrl);

  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, exhibitionEventSchema, itemListSchema]} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      <PaperGrain />
      <div className="w-full bg-canvas-soft min-h-screen font-sans">
        {/* Hero Section — 수묵의 농담, 나무결 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden bg-charcoal-deep">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Ink-wash gradation suggestion — horizontal wash lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-[20%] left-0 w-[60%] h-px bg-white/5" />
          <div className="absolute top-[45%] left-[15%] w-[70%] h-px bg-white/5" />
          <div className="absolute top-[70%] left-0 w-[50%] h-px bg-white/5" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-white/10" />
          {/* Blade-grain vertical accents */}
          <div className="absolute top-0 left-[12%] h-full w-px bg-white/6 rotate-[1.5deg]" />
          <div className="absolute top-0 right-[18%] h-full w-px bg-white/4 -rotate-[1deg]" />
          <div className="absolute top-0 left-[55%] h-full w-px bg-white/4 rotate-[0.5deg]" />

          {/* Ink-wash tone block — far background */}
          <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Jungwon · 1956–' : '김준권 · 1956–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Ink in the wood,
                  <br />
                  <span className="text-primary-soft">mountains at the blade&apos;s edge</span>
                </>
              ) : (
                <>
                  나무에 스민 수묵,
                  <br />
                  <span className="text-primary-soft">칼끝의 산하</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He carves Korea&apos;s mountains in ink — water, blade, and wood as one breath.
                  </span>
                  <span className="mt-2 block">
                    Forty years of woodblock printmaking rooted in the Korean landscape and
                    solidarity.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    수묵으로 한국의 산을 새기는 목판화가 — 물과 칼과 나무가 한 호흡.
                  </span>
                  <span className="mt-2 block">국토의 산하와 연대에 뿌리내린 40년 목판 외길.</span>
                </>
              )}
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    Wood remembers water —<br />
                    <span className="text-primary-strong">
                      the printmaker who carved Korea into ink
                    </span>
                  </>
                ) : (
                  <>
                    나무는 물을 기억한다 —<br />
                    <span className="text-primary-strong">수묵으로 한국을 새긴 판화가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Jungwon was born in 1956 in Yeongam, South Jeolla Province, and graduated
                      from Hongik University&apos;s Department of Art Education in 1982. He became
                      an art teacher, and through teaching came to the art education movement of the
                      1980s — a period of intense social and political ferment in Korea. His
                      involvement with the Korean Teachers and Educational Workers Union (전교조)
                      led to his forced dismissal from teaching in 1989.
                    </p>
                    <p>
                      That turning point became the beginning of his life as a full-time printmaker.
                      Moving through the Minjung art movement&apos;s organizational circles — 민미협
                      and 민예총 — he found the blade as his permanent instrument. Where teaching
                      had been one form of public commitment, printmaking became another: linoleum
                      and wood cuts that spoke to the Korean people directly, in images that could
                      be reproduced, distributed, and held.
                    </p>
                    <p>
                      From 1994 to 1997, Kim Jungwon studied at the Lu Xun Academy of Fine Arts in
                      China, one of the foremost institutions of printmaking in East Asia. There he
                      deepened his command of water-based multi-color woodblock technique — the
                      process of building tone through successive layers of ink and water pressed
                      onto wood. This encounter with the East Asian ink-wash tradition reshaped his
                      aesthetic: where much Korean woodblock printing had been defined by strong
                      black line and flat colour, Kim was developing a practice of gradation —
                      mountain mist rendered as layers of water-ink, the kind of atmospheric depth
                      associated with traditional 수묵화 (ink-wash painting) but translated into the
                      medium of the carved block.
                    </p>
                    <p>
                      In 1997, he established the Korean Woodblock Culture Research Institute
                      (한국목판문화연구소) in Baekgok-myeon, Jincheon, North Chungcheong Province —
                      a base from which he has worked ever since. It became more than a studio: a
                      site of research, teaching, and advocacy for woodblock as a living tradition.
                      Since 2017, he has served as Director of the Korea Woodblock Culture Center
                      (한국목판문화원) and leads the Community Woodblock University, a programme
                      dedicated to passing the craft on.
                    </p>
                    <p>
                      His work gained extraordinary public visibility on 27 April 2018, when his
                      large-scale woodblock print <em>Sanuun (山韻)-0901</em> — a depiction of the
                      Baekdudaegan mountain spine rendered in layered ink tones, completed in 2009
                      using 48 woodblocks — hung on the wall of the Peace House at Panmunjom as
                      North Korean Chairman Kim Jong-un signed the visitor&apos;s book during the
                      inter-Korean summit. The image of the two Koreas meeting against a backdrop of
                      their shared mountain range, rendered in ink-wash woodblock, was seen by a
                      global audience. His works are held in the collections of the National Museum
                      of Modern and Contemporary Art (MMCA), the Government Art Bank, Seoul Museum
                      of Art, Gwangju Museum of Art, Cheongju Museum of Art, and other public
                      institutions in Korea and China.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김준권은 1956년 전남 영암에서 태어나 1982년 홍익대 미술교육과를 졸업했다. 그는
                      미술교사가 됐고, 가르치는 일을 통해 1980년대 미술교육운동에 합류했다 — 한국
                      사회가 격렬하게 들끓던 시절. 전국교직원노동조합(전교조)에 가입한 일이 1989년
                      강제 해직으로 이어졌다.
                    </p>
                    <p>
                      그 전환점이 전업 판화가의 삶을 열었다. 민미협과 민예총의 조직 활동을 거치며
                      그는 칼을 영원한 도구로 삼았다. 가르치는 일이 하나의 공적 헌신이었다면, 판화는
                      또 다른 헌신이었다: 복사·배포·손에 쥘 수 있는 이미지로 한국 민중에게 직접 말을
                      건네는 리놀륨·목판 작업.
                    </p>
                    <p>
                      1994년부터 1997년까지, 김준권은 동아시아 판화의 최고 기관 중 하나인 중국
                      루쉰미술대학에서 목판화를 수련했다. 그곳에서 수성 다색목판화 기법 — 나무판
                      위에 물과 먹을 겹겹이 눌러 음조를 쌓아가는 방법 — 에 대한 이해를 깊였다.
                      동아시아 수묵 전통과의 이 만남이 그의 미학을 바꾸었다: 한국 목판화가 강한 검은
                      선과 평면적 색으로 정의되던 곳에서, 김준권은 그라데이션의 판화를 개척하기
                      시작했다 — 산안개를 물·먹의 겹으로 표현하고, 전통 수묵화의 대기적 깊이를 새긴
                      판에 옮겨놓는 것.
                    </p>
                    <p>
                      1997년, 그는 충북 진천군 백곡면에 한국목판문화연구소를 개설하고 지금껏 그곳을
                      거점으로 삼고 있다. 작업실이 아니라 연구·교육·전통 계승의 현장이 되었다.
                      2017년부터는 한국목판문화원 원장으로 활동하며 커뮤니티 목판대학을 이끌고,
                      목판화를 살아있는 전통으로 다음 세대에 전하는 일을 해오고 있다.
                    </p>
                    <p>
                      그의 작업이 전 세계에 알려진 것은 2018년 4월 27일이다. 2009년 48개의 판목으로
                      완성한 대작 〈산운(山韻)-0901〉 — 백두대간의 장대한 능선을 겹겹이 쌓인 먹의
                      농담으로 표현한 수묵 목판화 — 이 판문점 평화의 집 벽면에 내걸린 채, 김정은
                      국무위원장이 그 그림 앞에서 방명록에 서명하는 장면이 전 세계로 중계됐다.
                      분단된 두 나라의 지도자가 공통의 산맥 앞에서 만나는 장면이, 수묵 목판화의
                      언어로 담겼다. 그의 작품은 국립현대미술관, 정부미술은행, 서울시립미술관,
                      광주시립미술관, 청주시립미술관 등 국내외 주요 기관에 소장되어 있다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Artistic themes card */}
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'What the ink and the blade do' : '수묵과 칼이 하는 일'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Water and wood as one medium' : '물과 나무, 하나의 매체'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Kim Jungwon's water-based multi-color woodblock technique layers ink-wash tones onto carved wood, building atmospheric depth — mountain mist, ridge shadows, the gradations of light — in the manner of traditional ink-wash painting, but achieved through the physical resistance of the woodblock."
                          : '김준권의 수성 다색목판화는 새긴 나무 위에 수묵의 음조를 겹겹이 쌓아 대기적 깊이를 만든다 — 산안개, 능선 그림자, 빛의 농담을 전통 수묵화의 방식으로, 그러나 목판의 물리적 저항을 통해 실현한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The Korean landscape as subject' : '한국의 산하를 주제로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "The Baekdudaegan mountain spine — Korea's great ridge running from north to south — is the recurring subject of Kim's major works. His sustained field journeys across Korean mountains accumulate into prints that carry geographical, historical, and political weight in equal measure."
                          : '백두산에서 지리산까지 이어지는 백두대간 — 한반도의 거대한 능선 — 이 김준권의 주요 작업에서 반복되는 주제다. 한국의 산야를 직접 답사하며 쌓은 현장 경험이, 지리적·역사적·정치적 무게를 동시에 담은 판화로 이어진다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Tradition renewed by craft' : '장인정신으로 잇는 전통'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Each major woodblock print requires carving and printing five or more separate blocks. This intense labour is inseparable from Kim's understanding of his art: the woodblock tradition as a living practice, kept alive by the Korea Woodblock Culture Center and Community Woodblock University he founded and leads."
                          : '주요 목판화 한 점에 다섯 판 이상의 새기기와 찍기가 담긴다. 이 강도 높은 노동은 김준권이 이해하는 예술과 분리될 수 없다: 한국목판문화원과 커뮤니티 목판대학을 통해 살아있는 전통으로 이어가는 목판화.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Timeline card */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1956
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Yeongam, South Jeolla Province.' : '전남 영암 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1982
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Dept. of Art Education (Western Painting); works as an art teacher.'
                        : '홍익대학교 미술교육과(서양화) 졸업. 미술교사로 활동.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Dismissed from teaching due to membership in the Korean Teachers and Educational Workers Union (전교조); turns to full-time printmaking via the Minjung art movement (민미협, 민예총).'
                        : '전교조 가입으로 교직 강제해직. 민미협·민예총 활동을 통해 전업 판화가의 길로.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1994–97
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Woodblock researcher and visiting professor at Lu Xun Academy of Fine Arts, China; refines water-based multi-color woodblock technique.'
                        : '중국 루쉰(魯迅)미술대학 목판화 연구원·객원교수. 수성 다색목판화 기법 연마.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1997
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Establishes the Korean Woodblock Culture Research Institute (한국목판문화연구소) in Baekgok-myeon, Jincheon, North Chungcheong Province.'
                        : '충북 진천군 백곡면에 한국목판문화연구소 개설.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes 〈Sanuun (山韻)-0901〉 using 48 woodblocks — a large-scale ink-wash depiction of the Baekdudaegan mountain range.'
                        : '48개의 판목으로 〈산운(山韻)-0901〉 완성 — 백두대간을 수묵으로 담은 대작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Appointed Director of the Korea Woodblock Culture Center; launches the Community Woodblock University.'
                        : '한국목판문화원 원장 취임. 커뮤니티 목판대학 개설.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "〈Sanuun (山韻)-0901〉 displayed at Panmunjom Peace House during the inter-Korean summit; seen by a global audience as the backdrop for Kim Jong-un's signing of the visitor's book."
                        : '〈산운(山韻)-0901〉이 판문점 평화의 집에 내걸린 채 남북정상회담 현장 배경으로 전 세계에 중계됨.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Song of the Mountain〉 at Seoul Arts Center; retrospective at Gimhae Culture Center Yunseul Museum (1985–2022).'
                        : '서울 예술의전당 개인전 〈산의 노래〉. 김해문화의전당 윤슬미술관 회고전(1985–2022).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in SAF Online in solidarity with fellow artists.'
                        : '동료 예술인과의 연대로 씨앗페 온라인 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* Collections / exhibitions card */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <em>Song of the Mountain</em>, Seoul Arts Center (2022)
                        </>
                      ) : (
                        <>서울 예술의전당 〈산의 노래〉 (2022)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <em>Kim Joon Kwon: Walking the Motherland</em>, Saenggeo Print Art Museum,
                          Jincheon (2022–2023)
                        </>
                      ) : (
                        <>진천 생거판화미술관 〈김준권 WALKING THE MOTHERLAND〉 (2022–2023)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          1985–2022 Retrospective{' '}
                          <em>Song of the Knife, Song of the Block, Song of Life</em>, Gimhae
                          Culture Center Yunseul Museum (2022)
                        </>
                      ) : (
                        <>
                          김해문화의전당 윤슬미술관 회고전 〈칼의 노래, 판의 노래, 삶의 노래〉
                          (2022)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Collections: MMCA (National Museum of Modern and Contemporary Art),
                          Government Art Bank, Seoul Museum of Art, Gwangju Museum of Art, Cheongju
                          Museum of Art, and other major institutions in Korea and China
                        </>
                      ) : (
                        <>
                          소장처: 국립현대미술관, 정부미술은행, 서울시립미술관, 광주시립미술관,
                          청주시립미술관 등 국내외 주요 기관
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Honorary Associate Professor, Lu Xun Academy of Fine Arts, China (from
                          1996); Director, Korea Woodblock Culture Center (from 2017)
                        </>
                      ) : (
                        <>중국 루쉰미술대학 명예 부교수(1996~); 한국목판문화원 원장(2017~)</>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on ink, land, and the long way</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">수묵과 산하와 40년 외길에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 수묵의 정신을 새긴 목판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'The spirit of ink-wash carved in wood' : '수묵의 정신을 새긴 목판'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Korean woodblock printmaking, in its modern form, inherited two quite
                        different traditions. One was the black-line print of political urgency —
                        reproducible, distributable, made to be held and read quickly. The other was
                        the slow, layered, atmospheric tradition of East Asian ink-wash painting,
                        where tone and gradation matter more than outline. Kim Jungwon&apos;s
                        singular contribution has been to bring these two traditions together in a
                        single practice.
                      </p>
                      <p>
                        The technique he developed — water-based multi-color woodblock printing —
                        works not with the single impression of a block but with successive
                        layerings: carving multiple blocks and printing them in sequence, each layer
                        adding a register of tone. The ink is water-based and therefore responsive:
                        it bleeds slightly, feathers at the edges, creates the atmospheric depth
                        that characterises ink-wash without the spontaneity of the brush. Instead,
                        the gradations are planned and carved — each tonal shift a decision made
                        before the first impression is pulled.
                      </p>
                      <p>
                        The result is a form of printmaking that the critic Park Young-taek has
                        described as occupying a singular position in Korean contemporary art —
                        comparable in aesthetic lineage to the true-view landscape painting
                        (진경산수) of Jeong Seon and Kim Hongdo in the late Joseon period, but
                        achieved through a medium that carries the physical discipline of carving
                        and the democratic potential of the printed multiple. Water and wood, in
                        Kim&apos;s practice, are not opposites but partners.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        한국의 근현대 목판화는 크게 두 가지 전통을 물려받았다. 하나는 정치적
                        긴박함의 검은 선 판화 — 복사·배포가 가능하고 빠르게 읽힐 수 있도록 만들어진.
                        다른 하나는 윤곽선보다 음조와 농담이 중요한 동아시아 수묵화의 느리고 겹겹이
                        쌓인 대기적 전통. 김준권의 독보적 기여는 이 두 전통을 하나의 실천 안에서
                        통합했다.
                      </p>
                      <p>
                        그가 개척한 기법 — 수성 다색목판화 — 은 하나의 판으로 한 번 찍는 것이 아니라
                        겹겹이 쌓아가는 방식으로 작동한다: 여러 판목을 새기고 순서대로 찍어, 각
                        레이어가 하나의 음조 층위를 더한다. 먹은 수성이라 반응이 살아있다 — 약간
                        번지고, 가장자리에서 깃털처럼 퍼지며, 붓의 즉흥성 없이도 수묵화를 특징짓는
                        대기적 깊이를 만든다. 대신, 농담은 계획되고 새겨진다 — 각각의 음조 변화가 첫
                        번째 인쇄 전에 이미 결정된 선택이다.
                      </p>
                      <p>
                        평론가 박영택은 김준권의 수성 다색목판화가 한국 현대 산수화의 방향을 제시할
                        만큼 독보적 위치를 점유한다고 평했다 — 조선 후기 진경산수화의 겸재 정선과
                        단원 김홍도의 미학적 계보와 맞닿아 있으면서도, 새기는 신체적 규율과 복수
                        인쇄의 민주적 가능성을 담은 매체로 실현된다. 물과 나무는, 김준권의 실천에서,
                        대립이 아니라 짝이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 한국의 산하 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The Korean landscape' : '한국의 산하'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The subject of Kim Jungwon&apos;s mature work is the Korean landscape —
                        specifically the Baekdudaegan, the great mountain spine that runs from
                        Baekdusan in the north to Jirisan in the south, forming the skeletal ridge
                        of the Korean peninsula. His sustained fieldwork — walking, sketching,
                        living inside the terrain — accumulates into prints that are not scenic
                        depictions but topographic arguments: this land exists, in its full
                        geological weight, across the artificial line of division.
                      </p>
                      <p>
                        The political charge of this subject is inseparable from Kim&apos;s
                        biography. A former participant in the Minjung art movement, he came of age
                        politically in a South Korea where the division of the peninsula was a
                        structuring fact of everyday life. To paint the Baekdudaegan as one
                        continuous ridge — to render Baekdusan in ink-wash, when Baekdusan is
                        technically in the North — is an act of artistic reunification. The
                        mountains do not recognise the border.
                      </p>
                      <p>
                        When his large-scale woodblock print <em>Sanuun (山韻)-0901</em> — completed
                        in 2009 — hung at the Peace House in Panmunjom during the 2018 inter-Korean
                        summit, this political reading became inescapable. The image of the two
                        Koreas&apos; leaders meeting against a backdrop of their shared mountain
                        range, rendered in forty-eight layers of ink-wash woodblock, condensed
                        decades of Kim&apos;s practice into a single globally televised moment. The
                        mountain, in ink, said what the diplomats were still negotiating.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김준권 성숙기 작업의 주제는 한국의 산하 — 구체적으로 백두산에서 지리산까지
                        이어지는 백두대간, 한반도의 척추를 이루는 거대한 산줄기다. 걷고 스케치하고
                        지형 안에서 머물며 쌓은 지속적 현장 답사는, 풍경의 묘사가 아니라 지형적
                        주장으로서의 판화가 된다: 이 땅은, 그 온전한 지질학적 무게로, 인위적인
                        분단선을 가로질러 존재한다.
                      </p>
                      <p>
                        이 주제의 정치적 무게는 김준권의 전기와 분리될 수 없다. 민중미술 운동에
                        참여했던 그는, 반도의 분단이 일상의 구조적 사실이던 한국에서 예술가로
                        성장했다. 백두대간을 하나의 연속된 능선으로 그리는 것 — 기술적으로 북한 땅인
                        백두산을 수묵으로 표현하는 것 — 은 예술적 통일의 행위다. 산은 국경을 알지
                        못한다.
                      </p>
                      <p>
                        2009년 완성한 대작 〈산운(山韻)-0901〉이 2018년 남북정상회담 당시 판문점
                        평화의 집에 내걸렸을 때, 이 정치적 해석은 피할 수 없게 됐다. 두 나라의
                        지도자가 공통의 산맥을 배경으로 만나는 장면이, 48개 층위의 수묵 목판화로
                        담겨 전 세계로 중계됐다. 산은, 먹의 언어로, 외교관들이 아직 협상 중이던 것을
                        이미 말하고 있었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 교사에서 판화가로, 40년 외길 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From teacher to printmaker — forty years on one road'
                    : '교사에서 판화가로, 40년 외길'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Jungwon&apos;s path to printmaking began in the classroom. He taught art
                        in secondary school after graduating from Hongik University, and through
                        teaching became part of the art education movement — an effort, in the
                        1980s, to make art education in Korean schools less rote and more connected
                        to the social reality of students&apos; lives. That involvement led him to
                        the Korean Teachers and Educational Workers Union (전교조), and in 1989,
                        when joining the union became an act of political consequence, he was
                        dismissed.
                      </p>
                      <p>
                        The dismissal removed one kind of public role and opened another. Through
                        the Minjung art movement&apos;s organisational network — the 민미협 (Korean
                        People&apos;s Artists Federation) and the 민예총 (Korean Federation of Arts
                        and Culture) — Kim worked as a full-time artist and movement organiser. The
                        printmaking skills he had been developing deepened as a practice of making
                        images that could be circulated, like the ideas the movement was
                        circulating.
                      </p>
                      <p>
                        The four years in China (1994–1997) were a second turning point: not a
                        departure from commitment but a deepening of craft. On returning, he chose
                        Jincheon, Chungcheong Province, rather than Seoul — a choice that embedded
                        his practice in a particular landscape rather than an art-market geography.
                        The Korean Woodblock Culture Research Institute he established there in 1997
                        has since become the Korea Woodblock Culture Center: a national institution
                        for the preservation and transmission of woodblock as a living craft. Forty
                        years after his first woodcut, Kim Jungwon is still at the block in Jincheon
                        — carving the mountain, one layer at a time.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김준권이 판화가의 길로 들어선 출발점은 교실이었다. 홍익대를 졸업하고 중학교
                        미술교사로 일하던 그는, 가르치는 일을 통해 1980년대 미술교육운동에 합류했다
                        — 한국 학교의 미술 교육을 암기식에서 학생들의 사회적 현실과 연결된 방향으로
                        바꾸려는 노력. 그 참여가 그를 전교조로 이끌었고, 1989년 가입이 정치적 결과를
                        낳자 해직됐다.
                      </p>
                      <p>
                        해직은 하나의 공적 역할을 닫고 또 다른 역할을 열었다. 민미협과 민예총의 조직
                        네트워크를 통해 김준권은 전업 예술가이자 운동 조직자로 일했다. 키워오던 판화
                        기술이 운동이 유통시키는 이념처럼, 유통될 수 있는 이미지를 만드는 실천으로
                        깊어졌다.
                      </p>
                      <p>
                        중국에서 보낸 4년(1994–1997)은 두 번째 전환점이었다: 헌신으로부터의 이탈이
                        아니라 기술의 심화. 귀국 후 그는 서울이 아닌 충청북도 진천을 선택했다 —
                        미술시장의 지리가 아닌 특정 풍경 안에 실천을 뿌리내리는 선택. 1997년 개설한
                        한국목판문화연구소는 한국목판문화원으로 성장해, 목판화를 살아있는 공예로
                        보존·전승하는 국가적 기관이 됐다. 첫 목판 작업에서 40년이 지난 지금도,
                        김준권은 진천의 작업실에서 산을 새기고 있다 — 한 층씩, 한 번에.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium">
                  {isEnglish ? (
                    <>
                      From the woodcuts of the 1980s protest movements to the summit wall at
                      Panmunjom, Kim Jungwon has pursued the same practice: carving what Korea looks
                      like — in its mountains, its seasons, its long political weather — into the
                      grain of wood, and pressing it onto paper for others to hold. He joins this
                      campaign not as a subject of financial hardship but as a fellow artist in
                      solidarity — so that those who come after can work with the same freedom that
                      his forty years of carving have been in service of.
                    </>
                  ) : (
                    <>
                      1980년대 민중판화에서 판문점 평화의 집 벽면까지, 김준권은 같은 실천을
                      이어왔다: 한국이 어떻게 생겼는지 — 산과 계절과 긴 정치의 날씨로 — 를 나무결에
                      새기고, 종이에 찍어 다른 이들이 손에 쥘 수 있게 하는 일. 씨앗페에는 금융
                      차별의 당사자로서가 아니라, 동료 예술인과의 연대자로 함께한다 — 40년의 판화가
                      섬겨온 자유 안에서 다음 세대의 예술인들이 일할 수 있도록.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="relative py-20 bg-charcoal text-white">
          <div className="max-w-[1440px] mx-auto px-4 mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/20 pb-8">
            <div className="relative">
              <h2 className="text-4xl md:text-5xl mb-4 text-white font-black font-display text-balance">
                {isEnglish ? 'Works' : '작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                WOODBLOCK
              </div>
              <p className="text-base sm:text-lg text-white/70 font-medium">
                {isEnglish ? (
                  <>
                    <span className="text-white font-bold text-xl">{artworkCountLabel}</span> works
                    are featured here.
                  </>
                ) : (
                  <>
                    총 <span className="text-white font-bold text-xl">{artworkCountLabel}</span>
                    점의 작품을 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Jungwon</span>
              <span className="text-sm text-white/60">
                {isEnglish
                  ? 'Click a work to view its details'
                  : '작품을 클릭하여 상세 정보를 확인하세요'}
              </span>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-4 mb-12">
            <div className="bg-white/5 border border-white/20 p-6 md:p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 bg-primary rotate-45" />
                <span className="text-xs text-white/60 uppercase tracking-widest font-medium">
                  {isEnglish ? 'Artist mutual-aid' : '예술인 상호부조'}
                </span>
              </div>
              <p className="text-base md:text-lg text-white/90 leading-relaxed break-keep font-medium">
                {isEnglish ? (
                  <>
                    Kim Jungwon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김준권 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
                    수익은 전액 <strong className="text-white">예술인 상호부조 대출 기금</strong>
                    으로 이어집니다. 작품 한 점의 구매가, 오늘 금융 차별을 겪는 예술인 한 사람의
                    다음 한 달이 됩니다.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-4">
            {ARTWORKS.length > 0 ? (
              <MasterArtistMediumSections
                artworks={ARTWORKS}
                isEnglish={isEnglish}
                returnTo={KIM_JUNGWON_PATH}
              />
            ) : (
              <section className="py-24 text-center">
                <div className="inline-block rounded-xl border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-white text-balance mb-4">
                    {isEnglish ? 'Artwork data is being prepared' : '작품 데이터 준비 중입니다'}
                  </h3>
                  <p className="text-white/60 text-balance mb-8 break-keep">
                    {isEnglish ? (
                      <>
                        <span className="block">We are currently organising the works.</span>
                        <span className="mt-1 block">
                          In the meantime, you are warmly invited to browse the rest of the
                          collection.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block">작품 정보를 정리 중입니다.</span>
                        <span className="mt-1 block">
                          전체 출품작 목록에서 다른 작품을 먼저 감상할 수 있습니다.
                        </span>
                      </>
                    )}
                  </p>
                  <Link
                    href="/artworks"
                    className="inline-flex items-center justify-center px-6 py-3 border border-white/30 rounded text-white hover:bg-white hover:text-charcoal transition-colors font-medium"
                  >
                    {isEnglish ? 'Browse all artworks' : '전체 작품 보러 가기'}
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
