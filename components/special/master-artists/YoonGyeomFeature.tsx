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

// 작가 feature는 작가 페이지(/artworks/artist/윤겸)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const YOON_GYEOM_PATH = `/artworks/artist/${encodeURIComponent('윤겸')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isYoonGyeomArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '윤겸' ||
    n === 'yoon gyeom' ||
    n === 'yoon-gyeom' ||
    n === 'yun gyeom' ||
    n.replace(/[\s-]+/g, '') === 'yoongyeom' ||
    n.replace(/[\s-]+/g, '') === 'yungyeom'
  );
};

const PAGE_COPY = {
  ko: {
    title: '윤겸 — 평온의 요새를 짓는 회화',
    description:
      '회화 작가 윤겸. 대구대학교 회화과를 졸업하고, 회복과 평온의 정서를 유화의 부드러운 색채와 몽환적 형상으로 옮겨 온 작가다. 〈Serenity Fortress(평온의 요새)〉를 비롯한 작업으로 마음의 결을 풀어내며, 아르코미술관·메이크샵아트스페이스 등에 작품이 소장되어 있다. 씨앗페 온라인에서 윤겸의 작품을 만나보세요.',
    ogDescription:
      '회화 작가 윤겸. 회복과 평온의 정서를 유화의 부드러운 색채와 몽환적 풍경으로 옮긴다 — 마음이 머물 수 있는 한 채의 요새.',
    ogAlt: '윤겸 대표 작품',
    twitterTitle: '윤겸',
    twitterDescription: '평온의 요새를 짓는 회화 — 회화 작가 윤겸',
    keywords:
      '윤겸 화가, 윤겸 회화, Yoon Gyeom painter, 대구대학교 회화과, 평온의 요새, Serenity Fortress, 미확정요새, 유화 몽환 풍경, 씨앗페 온라인',
  },
  en: {
    title: 'Yoon Gyeom — Building a fortress of serenity in paint',
    description:
      'Selected works by Yoon Gyeom, a painter who translates the feeling of recovery and calm into the soft colour and dreamlike forms of oil painting. A graduate of the Department of Painting at Daegu University, his works — including 〈Serenity Fortress〉 — unspool the textures of everyday life and the inner mind. His paintings are held in collections including the Arko Art Center and Makeshop Art Space. View his works at SAF Online.',
    ogDescription:
      'Yoon Gyeom — a painter of recovery and calm. The soft colour and dreamlike landscapes of oil paint become a fortress where the mind can rest.',
    ogAlt: 'Yoon Gyeom — featured work',
    twitterTitle: 'Yoon Gyeom',
    twitterDescription: 'Building a fortress of serenity in paint — Yoon Gyeom, painter',
    keywords:
      'Yoon Gyeom painter, Korean contemporary painting, Serenity Fortress, dreamlike landscape oil painting, Daegu University painting',
  },
} as const;

export async function buildYoonGyeomMetadata({
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
  const pageUrl = buildLocaleUrl(YOON_GYEOM_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('윤겸');
  const artwork = allArtworks.find((a) => isYoonGyeomArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Yoon Gyeom`
      : `${artwork.title} — 윤겸`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(YOON_GYEOM_PATH, locale, true),
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

export default async function YoonGyeomFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(YOON_GYEOM_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('윤겸');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isYoonGyeomArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Yoon Gyeom' : '윤겸', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${YOON_GYEOM_PATH}#person-yoon-gyeom`,
    name: isEnglish ? 'Yoon Gyeom' : '윤겸',
    alternateName: isEnglish ? '윤겸' : 'Yoon Gyeom',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Yoon Gyeom (b. 1989) is a Korean painter who translates the feeling of recovery and calm into the soft colour and dreamlike forms of oil painting. A graduate of the Department of Painting at Daegu University (2014), his works — including the 〈Serenity Fortress〉 series — unspool the textures of everyday life and the inner mind. He has held solo exhibitions including 〈undecided fortress〉 (Informel Gallery, Seoul, 2023) and 〈in search of a place〉 (Loha Gallery, Seoul, 2025), and his paintings are held in collections including the Arko Art Center and Makeshop Art Space.'
      : '윤겸(1989년생)은 회복과 평온의 정서를 유화의 부드러운 색채와 몽환적 형상으로 옮겨 온 회화 작가입니다. 2014년 대구대학교 회화과를 졸업했으며, 〈Serenity Fortress(평온의 요새)〉 연작을 비롯한 작업으로 일상과 마음의 결을 풀어냅니다. 「미확정요새 undecided fortress」(앵포르멜갤러리, 서울, 2023), 「in search of a place」(로하갤러리, 서울, 2025) 등 다수의 개인전을 열었으며, 아르코미술관·메이크샵아트스페이스 등에 작품이 소장되어 있습니다.',
    birthDate: '1989',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Daegu University, College of Plastic Arts — Dept. of Painting (BFA)'
        : '대구대학교 조형예술대학 회화과 학사',
    },
    knowsAbout: ['Painting', 'Oil on canvas', 'Contemporary painting', 'Dreamlike landscape'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Yoon Gyeom — SAF Online' : '윤겸 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Yoon Gyeom from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 윤겸 작품들을 소개합니다.',
    url: pageUrl,
    eventStatus: 'https://schema.org/EventMovedOnline',
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
        {/* Hero Section — 평온의 요새, 부드러운 빛의 결 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 겹겹의 부드러운 안개 띠 — 몽환적 풍경의 시각적 은유 */}
          <div
            className="absolute top-16 left-0 right-0 h-24 bg-gradient-to-b from-white/6 to-transparent blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-12 left-0 right-0 h-32 bg-gradient-to-t from-primary/8 to-transparent blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-primary/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Yoon Gyeom' : '윤겸'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A fortress of serenity,
                  <br />
                  <span className="text-primary-soft">built of soft colour</span>
                </>
              ) : (
                <>
                  부드러운 색으로 짓는
                  <br />
                  <span className="text-primary-soft">평온의 요새</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A painter who carries recovery and calm onto canvas,
                  </span>
                  <span className="mt-2 block">
                    where dreamlike landscapes become a place the mind can rest.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">회복과 평온의 정서를 캔버스 위로 옮기는 화가.</span>
                  <span className="mt-2 block">
                    몽환의 풍경이 마음이 머무는 한 채의 요새가 된다.
                  </span>
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
                    From Daegu to Seoul —<br />
                    <span className="text-primary-strong">a painting of recovery</span>
                  </>
                ) : (
                  <>
                    대구에서 서울로 —<br />
                    <span className="text-primary-strong">회복의 회화</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Yoon Gyeom (b. 1989) graduated from the Department of Painting at Daegu
                      University in 2014, building the technical and conceptual foundation of his
                      practice in oil painting. From his first solo exhibition onward, his work has
                      pursued a single, sustained feeling: recovery — the slow, quiet process by
                      which a mind finds its way back to calm.
                    </p>
                    <p>
                      His paintings are landscapes, but landscapes of the interior as much as of the
                      world. Soft colour is laid down in delicate, breathing gradations; forms drift
                      between the recognisable and the dreamlike. The everyday and the inner mind
                      are unspooled together into{' '}
                      <strong className="font-bold text-charcoal-deep">
                        scenes that feel both remembered and imagined
                      </strong>
                      — neither wholly a place nor wholly a mood, but the texture of a feeling made
                      visible.
                    </p>
                    <p>
                      The image of the fortress runs through his work. A 2023 solo exhibition at
                      Informel Gallery in Seoul was titled 〈undecided fortress〉; later canvases
                      gather under the name 〈Serenity Fortress〉. A fortress is shelter and
                      enclosure both — a place built to protect what is fragile inside it. In Yoon
                      Gyeom&apos;s hands the metaphor turns inward: the painting becomes a structure
                      where calm can be kept safe, a refuge constructed stroke by stroke against the
                      noise of the day.
                    </p>
                    <p>
                      His exhibition history traces a steady, deepening practice — from 〈A Refined
                      World〉 (Suseong Artpia, Daegu, 2014) and 〈Vertigo〉 (2015–16), through
                      〈faint / aslant〉 (Makeshop Art Space, Paju, 2017) and 〈ENDLESS BOUNDARY〉
                      (artmora gallery, Seoul, 2019), to recent invited exhibitions 〈survival
                      harvest〉 (Artboda Gallery, Seoul, 2024), 〈in search of a place〉 (Loha
                      Gallery, Seoul, 2025), and 〈Blue Afterimage〉 (Woomoha Gallery, Yongin,
                      2025). His work has been shown in group exhibitions including ASYAAF (2020)
                      and 〈I Am an Unknown Artist〉 (Arko Art Center, 2015).
                    </p>
                    <p>
                      His practice has been recognised through awards and residencies — among them a
                      creative grant from the Incarnation Culture &amp; Arts Foundation (2022), the
                      bronze prize at the ART-236 competition at Playce Camp Jeju (2018), and
                      selection as a New Drawing Project artist (Yangju City Chang Ucchin Museum of
                      Art). His paintings are held in the collections of the Arko Art Center,
                      Makeshop Art Space, the Daegu University Industry-Academic Cooperation
                      Foundation, and the Seoul Culture Headquarters Museum Division.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      윤겸(1989년생)은 2014년 대구대학교 회화과를 졸업하며 유화 작업의 기술적·개념적
                      토대를 다졌다. 첫 개인전 이래 그의 작업은 하나의 지속된 정서를 추구해 왔다 —
                      회복. 마음이 다시 평온으로 돌아가는 느리고 조용한 과정이다.
                    </p>
                    <p>
                      그의 그림은 풍경이지만, 세계의 풍경인 만큼이나 내면의 풍경이다. 부드러운 색이
                      섬세하게, 숨 쉬듯 번지는 농담으로 깔리고, 형상은 알아볼 수 있는 것과 몽환적인
                      것 사이를 떠돈다. 일상과 마음의 결이 함께 풀려 나와{' '}
                      <strong className="font-bold text-charcoal-deep">
                        기억된 듯 상상된 듯한 장면
                      </strong>
                      이 된다 — 온전히 장소도, 온전히 감정도 아닌, 한 정서의 결이 눈에 보이게 된 것.
                    </p>
                    <p>
                      요새의 이미지가 그의 작업을 관통한다. 2023년 서울 앵포르멜갤러리 개인전의
                      제목은 「미확정요새 undecided fortress」였고, 이후의 화면들은 〈Serenity
                      Fortress(평온의 요새)〉라는 이름 아래 모인다. 요새는 피난처이자 둘러쌈이다 —
                      안의 연약한 것을 지키기 위해 지어진 곳. 윤겸의 손에서 이 은유는 안으로 향한다.
                      그림은 평온이 안전하게 지켜질 수 있는 구조가 되고, 하루의 소음에 맞서 붓질로
                      한 겹씩 지어 올린 피난처가 된다.
                    </p>
                    <p>
                      그의 전시 이력은 꾸준하고 깊어지는 작업을 보여준다 — 「정제된
                      세상」(수성아트피아, 대구, 2014), 「현기증」 연작(2015–16)에서
                      「아스라이」(메이크샵아트스페이스, 파주, 2017), 「망망(茫茫) ENDLESS
                      BOUNDARY」(artmora gallery, 서울, 2019)를 거쳐, 최근 초대전
                      「생존수확」(아트보다갤러리, 서울, 2024), 「in search of a place」(로하
                      갤러리, 서울, 2025), 「푸른 잔영」(우모하갤러리, 용인, 2025)에 이른다. ASYAAF
                      특별전(2020), 「나는무명작가다」(아르코미술관, 2015) 등 다수의 단체전에도
                      참여했다.
                    </p>
                    <p>
                      그의 작업은 여러 수상과 레지던시를 통해 주목받았다 — 인카네이션문화예술재단
                      창작지원금(2022), 플레이스캠프 제주 ART-236 동상(2018), 뉴드로잉프로젝트
                      선정작가(양주시립장욱진미술관) 등. 작품은 아르코미술관, 메이크샵아트스페이스,
                      대구대학교 산학협력단, 서울문화본부 박물관과 등에 소장되어 있다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Major themes' : '주요 테마'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Recovery and calm' : '회복과 평온'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The sustained emotional core of his work — the slow return of a mind to rest, carried onto canvas as feeling made visible.'
                          : '작업을 관통하는 정서의 중심 — 마음이 안식으로 돌아가는 느린 과정을, 눈에 보이는 정서로 화면에 옮긴다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Soft colour, dreamlike form' : '부드러운 색채, 몽환의 형상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Delicate, breathing gradations of oil paint, where forms drift between the recognisable and the imagined.'
                          : '숨 쉬듯 섬세하게 번지는 유화의 농담. 형상은 알아볼 수 있는 것과 상상된 것 사이를 떠돈다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The fortress as refuge' : '피난처로서의 요새'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From 〈undecided fortress〉 to 〈Serenity Fortress〉 — the painting as a structure built to keep what is fragile inside it safe.'
                          : '「미확정요새」에서 〈평온의 요새〉로 — 안의 연약한 것을 지키기 위해 지어진 구조로서의 회화.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born.' : '출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Painting, College of Plastic Arts, Daegu University. Solo exhibition 〈A Refined World〉, Suseong Artpia, Daegu.'
                        : '대구대학교 조형예술대학 회화과 졸업. 개인전 「정제된 세상」(수성아트피아, 대구).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015–16
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Vertiginous Landscape〉 (Guoldam Gallery, Incheon, 2015); 〈Vertigo — Dreamlike Scenery〉 (Gallery beone, Pangyo, 2016). 13th Emerging Artists Statement Exhibition Excellence Award (2016).'
                        : '「현기증 나는 풍경」(구올담갤러리, 인천, 2015); 「현기증 몽환의 풍경」(Gallerybeone, 판교, 2016). 제13회 신진작가발언전 우수상(2016).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016–17
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident artist, STUDIO M17, Makeshop Art Space, Paju. Solo exhibition 〈faint / aslant〉 (Makeshop Art Space, Paju, 2017).'
                        : '메이크샵아트스페이스 STUDIO M17 입주작가(파주). 개인전 「아스라이」(메이크샵아트스페이스, 파주, 2017).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2nd Playce Camp Jeju ART-236 — bronze prize. Selected as a 3rd New Drawing Project artist (Yangju City Chang Ucchin Museum of Art).'
                        : '제2회 플레이스캠프 제주 ART-236 동상. 제3회 뉴드로잉프로젝트 선정작가(양주시립장욱진미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019–20
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈ENDLESS BOUNDARY〉 (artmora gallery, Seoul, 2019). ASYAAF special exhibition (Hongik Museum of Art, 2020).'
                        : '「망망(茫茫) ENDLESS BOUNDARY」(artmora gallery, 서울, 2019). ASYAAF 특별전(홍익대현대미술관, 2020).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '5th Incarnation Culture & Arts Foundation creative grant.'
                        : '제5회 인카네이션문화예술재단 창작지원금 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈undecided fortress〉, Informel Gallery, Seoul.'
                        : '「미확정요새 undecided fortress」(앵포르멜갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈survival harvest〉, Artboda Gallery, Seoul.'
                        : '「생존수확」(아트보다갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited solo exhibitions 〈in search of a place〉 (Loha Gallery, Seoul) and 〈Blue Afterimage〉 (Woomoha Gallery, Yongin); Singapore Art Fair (artmora gallery).'
                        : '초대 개인전 「in search of a place」(로하갤러리, 서울)·「푸른 잔영」(우모하갤러리, 용인); Singapore Art Fair(artmora gallery).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '씨앗:페2026 (Insa Art Center, Seoul).'
                        : '씨앗:페2026(인사아트센터, 서울).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Awards, residencies & collections' : '수상·레지던시 및 주요 소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2022 Incarnation Culture & Arts Foundation (5th) — creative grant'
                        : '2022 제5회 인카네이션문화예술재단 창작지원금 수상'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2018 Playce Camp Jeju ART-236 (2nd) — bronze prize; New Drawing Project (3rd) selected artist, Yangju City Chang Ucchin Museum of Art'
                        : '2018 제2회 플레이스캠프 제주 ART-236 동상; 제3회 뉴드로잉프로젝트 선정작가(양주시립장욱진미술관)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2016 13th Emerging Artists Statement Exhibition — Excellence Award; STUDIO M17 resident artist, Makeshop Art Space (Paju)'
                        : '2016 제13회 신진작가발언전 우수상; 메이크샵아트스페이스 STUDIO M17 입주작가(파주)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Arko Art Center; Makeshop Art Space; Daegu University Industry-Academic Cooperation Foundation; Seoul Culture Headquarters Museum Division'
                        : '소장처: 아르코미술관; 메이크샵아트스페이스; 대구대학교 산학협력단; 서울문화본부 박물관과'}
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
                  <span className="text-charcoal-deep">on calm, colour, and the fortress</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">평온, 색채, 그리고 요새에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 회복의 정서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Recovery as a subject — painting the return to calm'
                    : '주제로서의 회복 — 평온으로 돌아가는 길을 그리다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Much contemporary painting takes rupture as its theme — the broken, the
                        urgent, the unresolved. Yoon Gyeom takes the opposite movement: the return.
                        His subject is recovery, the slow process by which a mind that has been
                        unsettled finds its way back toward calm. It is a quieter ambition, and a
                        harder one to paint, because calm resists drama. It must be built rather
                        than declared.
                      </p>
                      <p>
                        He builds it through atmosphere. Rather than depicting a single decisive
                        moment, his canvases hold a sustained mood — a softness of light, a
                        gentleness of transition, a sense that nothing here will startle. The
                        landscapes are not destinations so much as{' '}
                        <strong className="font-bold text-charcoal-deep">states of being</strong>:
                        places that exist to be rested in. To stand before one is to feel the
                        tension of the day begin, slowly, to loosen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        많은 현대회화가 파열을 주제로 삼는다 — 부서진 것, 긴박한 것, 해결되지 않은
                        것. 윤겸은 반대의 움직임을 택한다: 돌아옴. 그의 주제는 회복, 흔들린 마음이
                        다시 평온으로 향하는 느린 과정이다. 더 조용한 야심이고, 그리기에 더 어려운
                        주제다. 평온은 극적인 것을 거부하기 때문이다. 그것은 선언되는 것이 아니라
                        지어져야 한다.
                      </p>
                      <p>
                        그는 그것을 분위기로 짓는다. 하나의 결정적 순간을 묘사하기보다, 그의 화면은
                        지속되는 정서를 담는다 — 빛의 부드러움, 전이의 온화함, 이곳에서는 어떤 것도
                        놀라게 하지 않으리라는 감각. 풍경은 목적지라기보다{' '}
                        <strong className="font-bold text-charcoal-deep">하나의 상태</strong>다:
                        머물기 위해 존재하는 장소. 그 앞에 서면, 하루의 긴장이 천천히 풀리기
                        시작하는 것을 느끼게 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 부드러운 색채와 몽환의 형상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Soft colour, dreamlike form — the texture of feeling'
                    : '부드러운 색채와 몽환의 형상 — 정서의 결'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The feeling of Yoon Gyeom&apos;s work is carried by its surface. He paints
                        in oil, and uses the medium for its capacity to hold delicate, breathing
                        gradations — colour that shifts almost imperceptibly across the canvas, so
                        that the eye moves through it the way a thought moves through a quiet room.
                        Nothing is sharp; nothing is fixed. The softness is not vagueness but care.
                      </p>
                      <p>
                        Within that softness, forms drift. A landscape is suggested rather than
                        spelled out; a horizon, a mass, a glow may be recognisable, but they hover
                        at the edge of the dreamlike, never quite resolving into a single named
                        place. This is deliberate. By keeping the image{' '}
                        <strong className="font-bold text-charcoal-deep">
                          open between memory and imagination
                        </strong>
                        , he leaves room for the viewer&apos;s own calm to enter — the painting
                        becomes not a description of one place but a space anyone might rest inside.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        윤겸 작업의 정서는 그 표면이 실어 나른다. 그는 유화로 그리며, 섬세하고 숨
                        쉬는 농담을 담아내는 매체의 능력을 활용한다 — 캔버스를 가로질러 거의 알아챌
                        수 없게 변하는 색. 그래서 눈은, 고요한 방을 가로지르는 생각처럼 그 안을
                        지난다. 날카로운 것은 없고, 고정된 것도 없다. 그 부드러움은 모호함이 아니라
                        보살핌이다.
                      </p>
                      <p>
                        그 부드러움 안에서 형상은 떠돈다. 풍경은 또렷이 쓰이기보다 암시된다.
                        지평선이, 덩어리가, 빛무리가 알아볼 만하더라도, 그것들은 몽환의 가장자리에서
                        맴돌 뿐 결코 하나의 이름 붙은 장소로 굳어지지 않는다. 이는 의도된 것이다.
                        이미지를{' '}
                        <strong className="font-bold text-charcoal-deep">
                          기억과 상상 사이에 열어 둠
                        </strong>
                        으로써, 그는 보는 이 자신의 평온이 들어설 자리를 남긴다 — 회화는 한 장소의
                        묘사가 아니라, 누구든 그 안에서 쉴 수 있는 공간이 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 요새라는 은유 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The fortress — shelter built stroke by stroke'
                    : '요새라는 은유 — 붓질로 지어 올린 피난처'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The fortress is the recurring structure in Yoon Gyeom&apos;s recent work.
                        The 2023 exhibition was titled 〈undecided fortress〉; later canvases gather
                        under the name 〈Serenity Fortress〉. The progression in those titles is
                        itself telling — from a fortress not yet resolved to one that has found its
                        calm.
                      </p>
                      <p>
                        A fortress is a double thing: a wall that keeps danger out, and a shelter
                        that keeps something fragile safe within. Yoon Gyeom turns the metaphor
                        inward, away from defence and toward refuge. What is protected is not
                        territory but a state of mind — the calm that the day so easily erodes. The
                        painting itself becomes the structure: a place built, layer by layer, where
                        serenity can be kept.
                      </p>
                      <p>
                        There is something quietly generous in this. To build a fortress of calm and
                        then open its gate — to make the painting a place the viewer can enter and
                        rest — is to offer shelter rather than hoard it.{' '}
                        <strong className="font-bold text-charcoal-deep">
                          The work is built to be shared
                        </strong>
                        , and that disposition carries naturally into the reason Yoon Gyeom joins
                        this campaign at all.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        요새는 윤겸의 최근 작업에 반복되는 구조다. 2023년 전시의 제목은
                        「미확정요새」였고, 이후의 화면들은 〈평온의 요새〉라는 이름 아래 모인다. 그
                        제목의 변화 자체가 많은 것을 말한다 — 아직 정해지지 않은 요새에서, 평온을
                        찾은 요새로.
                      </p>
                      <p>
                        요새는 이중의 것이다: 위험을 막는 벽이자, 안의 연약한 것을 지키는 피난처.
                        윤겸은 이 은유를 안으로 돌린다. 방어가 아니라 피난 쪽으로. 지켜지는 것은
                        영토가 아니라 마음의 상태다 — 하루가 그토록 쉽게 무너뜨리는 평온. 회화 그
                        자체가 구조가 된다: 평온이 지켜질 수 있도록 한 겹씩 지어 올린 장소.
                      </p>
                      <p>
                        여기에는 조용한 너그러움이 있다. 평온의 요새를 짓고 그 문을 여는 것 — 회화를
                        보는 이가 들어와 쉴 수 있는 장소로 만드는 것 — 은 피난처를 움켜쥐기보다 내어
                        주는 일이다.{' '}
                        <strong className="font-bold text-charcoal-deep">
                          그의 작업은 나누기 위해 지어진다
                        </strong>
                        . 그리고 그 마음은, 윤겸이 이 캠페인에 함께하는 이유로 자연스럽게 이어진다.
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
                      From Daegu to Seoul, Yoon Gyeom has built a patient practice around a single
                      feeling — the return to calm — and made of it a fortress soft enough to enter.
                      He joins this campaign in solidarity with fellow artists, not as a subject of
                      its cause: so that the next generation might find a place of their own to rest
                      and work.
                    </>
                  ) : (
                    <>
                      대구에서 서울로. 윤겸은 하나의 정서 — 평온으로의 돌아옴 — 를 중심으로 인내하는
                      작업을 이어 왔고, 그것을 들어설 수 있을 만큼 부드러운 한 채의 요새로 지어
                      냈다. 그는 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대의 뜻으로
                      씨앗페에 함께한다 — 다음 세대의 예술인들도 쉬며 일할 자신의 자리를 찾을 수
                      있도록.
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
                {isEnglish ? 'Selected Works' : '주요 작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                FORTRESS
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
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Yoon Gyeom</span>
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
                    Yoon Gyeom joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    윤겸 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={YOON_GYEOM_PATH}
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
                        <span className="block">We are currently organizing the works.</span>
                        <span className="mt-1 block">
                          In the meantime, you are warmly invited to browse the rest of the
                          collection.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block">현재 작품 정보를 정리하고 있습니다.</span>
                        <span className="mt-1 block">
                          전체 출품작 목록에서 다른 작품들을 먼저 감상하실 수 있습니다.
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
