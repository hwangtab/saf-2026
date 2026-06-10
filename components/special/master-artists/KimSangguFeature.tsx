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

// 거장 작가 feature는 작가 페이지(/artworks/artist/김상구)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_SANGGU_PATH = `/artworks/artist/${encodeURIComponent('김상구')}`;

const KIM_SANGGU_ARTIST_KEYS = new Set([
  '김상구',
  'kim sang-gu',
  'kim sanggu',
  'kim sang-koo',
  'kim sangkoo',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isKimSangguArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    KIM_SANGGU_ARTIST_KEYS.has(normalized) ||
    compact === '김상구' ||
    compact === 'kimsanggu' ||
    compact === 'kimsangkoo'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김상구 — 수공 목판화의 장인',
    description:
      '목판화가 김상구(1945–). 기계화 시대에 역행하듯 철저한 수공의 목판 공정을 고수해 온 작가. 투박함과 단순함, 흑백의 대비와 여백의 미 — 토담 같은 서민의 정서를 새긴 김상구의 목판화를 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '목판화가 김상구. 기계화 시대에 역행하는 철저한 수공의 목판 — 흑백의 대비와 여백, 토담 같은 서민적 정서를 새긴 우직한 장인의 세계.',
    ogAlt: '김상구 대표 작품',
    twitterTitle: '김상구',
    twitterDescription: '수공의 목판 — 여백과 흑백의 미, 목판화의 장인 김상구',
    keywords: '김상구 화가, 김상구 목판화, 한국 목판화, 다색판화, 판화, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Sang-gu — Master Artisan of the Handmade Woodblock',
    description:
      'Selected works by Kim Sang-gu (b. 1945), a woodblock print artist who has held fast to a wholly handmade carving process, as if running counter to the age of mechanization. The contrast of black and white, the beauty of empty space, and a humble folk sensibility carved like an earthen wall — view and collect his woodblock prints at SAF Online.',
    ogDescription:
      'Kim Sang-gu — woodblock print artist. A wholly handmade craft running against the mechanized age: black-and-white contrast, the beauty of empty space, and a humble folk sensibility.',
    ogAlt: 'Kim Sang-gu — featured work',
    twitterTitle: 'Kim Sang-gu',
    twitterDescription:
      'The handmade woodblock — emptiness and the play of black and white, master Kim Sang-gu',
    keywords:
      'Kim Sang-gu artist, Korean woodblock prints, woodcut, multicolor woodblock, printmaking, SAF Online',
  },
} as const;

export async function buildKimSangguMetadata({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl(KIM_SANGGU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김상구');
  const artwork = allArtworks.find((a) => isKimSangguArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Sang-gu`
      : `${artwork.title} — 김상구`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_SANGGU_PATH, locale, true),
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

export default async function KimSangguFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_SANGGU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김상구');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimSangguArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Sang-gu' : '김상구', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_SANGGU_PATH}#person-kim-sanggu`,
    name: isEnglish ? 'Kim Sang-gu' : '김상구',
    alternateName: isEnglish ? '김상구' : 'Kim Sang-gu',
    jobTitle: isEnglish ? 'Woodblock Print Artist' : '목판화가',
    description: isEnglish
      ? 'Kim Sang-gu (b. 1945) is a Korean woodblock print artist who has held fast to a wholly handmade carving process, as if running counter to the age of mechanization — a craft of plainness, simplicity, black-and-white contrast, and the beauty of empty space.'
      : '김상구(1945–)는 기계화 시대에 역행하듯 철저한 수공의 목판 공정을 고수해 온 목판화가입니다. 투박함과 단순함, 흑백의 대비와 여백의 미를 새겨 온 우직한 장인입니다.',
    birthDate: '1945',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Seoul, South Korea' : '서울',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Western Painting' : '홍익대학교 서양화과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Korean Printmakers Association' : '한국판화가협회',
    },
    knowsAbout: ['Woodblock printmaking', 'Woodcut', 'Korean printmaking', 'Multicolor woodblock'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Sang-gu — SAF Online' : '김상구 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Sang-gu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김상구 작품들을 소개합니다.',
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
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 목판 결 모티프 — 수공으로 새긴 결의 흔적 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Sang-gu · b. 1945' : '김상구 · 1945–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Carved by hand,
                  <br />
                  <span className="text-primary-soft">where emptiness speaks</span>
                </>
              ) : (
                <>
                  손으로 새긴 목판,
                  <br />
                  <span className="text-primary-soft">여백이 말을 건다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A wholly handmade craft, against the mechanized age.
                  </span>
                  <span className="mt-2 block">
                    Plainness and the play of black and white, like an earthen wall.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">기계화 시대에 역행하는 철저한 수공의 목판.</span>
                  <span className="mt-2 block">토담 같은 투박함, 흑백의 대비와 여백의 미.</span>
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
                    The handmade woodblock —<br />
                    <span className="text-primary-strong">
                      plainness, contrast, and empty space
                    </span>
                  </>
                ) : (
                  <>
                    수공의 목판 —<br />
                    <span className="text-primary-strong">투박함, 흑백의 대비, 그리고 여백</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Sang-gu (b. 1945) was born in Seoul. He studied Western painting at Hongik
                      University, earning his bachelor&apos;s degree in 1967, and went on to
                      complete a master&apos;s degree at the university&apos;s Graduate School of
                      Art Education.
                    </p>
                    <p>
                      Since the late 1970s, he has built his life&apos;s work in the woodblock print
                      — and he has done so by holding fast to a wholly handmade process, as if
                      running counter to the mechanized age of industrial society. Where machines
                      promise speed and reproduction, Kim has kept to the slow discipline of the
                      hand: carving, inking, and pressing the block himself.
                    </p>
                    <p>
                      His woodblock world has been distilled as a sensibility of{' '}
                      <strong className="font-bold text-charcoal">
                        the plain over the splendid, the simple rather than the complex
                      </strong>{' '}
                      — something that seeps in like an earthen wall; of the flat over the
                      three-dimensional, the contrast of black and white, and the beauty of empty
                      space rather than a surface filled to its edges.
                    </p>
                    <p>
                      In this, there is the Eastern sense of the artisan — the integrity of
                      plainness and simplicity — together with a humble, folk quality. His more
                      recent work has expanded into{' '}
                      <strong className="font-bold text-charcoal-deep">
                        multicolor woodblock prints
                      </strong>
                      , yet the same conviction holds: that a thing made slowly, by hand, carries a
                      warmth no machine can press.
                    </p>
                    <p>
                      A member of the Korean Printmakers Association and a juror for the Grand Art
                      Exhibition of Korea, he has held twenty solo exhibitions between 1978 and
                      2009. Across half a century, his has been the steady, unhurried labour of a
                      master who lets the wood, the knife, and the empty ground do the speaking.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김상구(1945–)는 서울에서 태어났다. 홍익대학교에서 서양화를 전공해 1967년 학사
                      학위를 받았고, 이어 같은 대학 미술교육대학원에서 석사 과정을 마쳤다.
                    </p>
                    <p>
                      그는 1970년대 후반 이래 목판화를 평생의 작업으로 삼아 왔다. 그리고 그 작업을,
                      현대 산업사회의 기계화 시대에 역행하듯{' '}
                      <strong className="font-bold text-charcoal-deep">철저한 수공의 공정</strong>을
                      고수하며 이어 왔다. 기계가 속도와 복제를 약속하는 시대에, 그는 손의 느린
                      규율을 지켰다 — 직접 판을 새기고, 먹을 올리고, 찍어 낸다.
                    </p>
                    <p>
                      그의 목판화 세계는{' '}
                      <strong className="font-bold text-charcoal">
                        화려한 것보다는 투박한 것, 복잡한 것보다는 단순한 가운데 스며드는 토담과
                        같은 것
                      </strong>
                      , 입체적 표현보다는 평면적인 것, 흑백의 대비, 가득 차 있는 것보다는 여백의
                      미로 함축된다.
                    </p>
                    <p>
                      거기에는 우직함과 단순함이라는 동양적 장인정신과 함께, 토담 같은 서민적 속성이
                      깃들어 있다. 근작에 이르러 그의 작업은{' '}
                      <strong className="font-bold text-charcoal-deep">다색판화</strong>로
                      확장되었지만, 그 바탕의 신념은 한결같다 — 손으로 더디게 만든 것에는, 기계가
                      찍어 낼 수 없는 온기가 있다는 믿음.
                    </p>
                    <p>
                      한국판화가협회 회원이자 대한민국미술대전 심사위원으로, 그는 1978년부터
                      2009년까지 스무 차례의 개인전을 열었다. 반세기에 걸친 그의 작업은, 나무와 칼과
                      여백이 스스로 말하도록 내버려 두는 우직하고 서두르지 않는 장인의 노동이었다.
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
                        {isEnglish ? 'The wholly handmade woodblock' : '철저한 수공의 목판'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A carving process held to by hand, as if running counter to the mechanized age — the slow integrity of plainness and simplicity.'
                          : '기계화 시대에 역행하듯 손으로 지켜 온 목판 공정. 투박함과 단순함을 지키는 우직한 장인정신.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Black, white, and empty space' : '흑백의 대비와 여백'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Flat rather than three-dimensional, the contrast of black and white, and the beauty of empty space rather than a surface filled to its edges.'
                          : '입체보다 평면, 흑백의 대비, 가득 채우기보다 여백의 미. 단순한 가운데 토담처럼 스며드는 정서.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Toward multicolor prints' : '다색판화로의 확장'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His more recent work expands into multicolor woodblock prints, while keeping the same handmade conviction at its core.'
                          : '근작에서 다색판화로 확장되는 화면. 그러면서도 수공의 신념은 한결같이 바탕에 남는다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1945
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Seoul.' : '서울 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1962–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Special selection and encouragement prizes at the Shinsanghoe open call (1962–63); repeated selections at the National Art Exhibition (1962–65).'
                        : '신상회 공모전 특선·장려상(1962–63); 국전 입선 다수(1962–65).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1967
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Earns a bachelor’s degree in Western painting from Hongik University; later completes a master’s at its Graduate School of Art Education.'
                        : '홍익대학교 서양화 학사; 이후 미술교육대학원 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1978–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins presenting woodblock prints; takes part in the Contemporary Printmakers Association exhibitions (through 1992).'
                        : '목판화 발표 시작; 현대판화가협회전 참여(~1992).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1978–81
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul International Print Exchange Exhibition, National Museum of Modern and Contemporary Art.'
                        : '서울국제판화교류전, 국립현대미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Development and Transformation of Korean Prints》, Daejeon Museum of Art.'
                        : '《한국판화의 전개와 변모》, 대전시립미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Korea–China–Japan Woodblock Print Exhibition, Kim Nae-hyun Gallery.'
                        : '한·중·일 목판화전, 김내현화랑.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Kim Sang-gu Woodblock Prints》, Insa Art Center; 《Woodblock Prints》, Bundo Gallery.'
                        : '《김상구 목판화전》, 인사아트센터; 《목판전》, 분도화랑.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1978–2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Twenty solo exhibitions in all; member of the Korean Printmakers Association and juror for the Grand Art Exhibition of Korea.'
                        : '개인전 20회; 한국판화가협회 회원·대한민국미술대전 심사위원.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & career' : '주요 전시 및 활동'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Contemporary Printmakers Association exhibitions (1978–1992); Seoul International Print Exchange Exhibition, MMCA (1978–1981).'
                        : '현대판화가협회전 (1978–1992); 서울국제판화교류전, 국립현대미술관 (1978–1981).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Development and Transformation of Korean Prints》, Daejeon Museum of Art (2000); Korea–China–Japan Woodblock Print Exhibition, Kim Nae-hyun Gallery (2001).'
                        : '《한국판화의 전개와 변모》, 대전시립미술관 (2000); 한·중·일 목판화전, 김내현화랑 (2001).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Kim Sang-gu Woodblock Prints》, Insa Art Center, and 《Woodblock Prints》, Bundo Gallery (2005).'
                        : '《김상구 목판화전》, 인사아트센터 · 《목판전》, 분도화랑 (2005).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Twenty solo exhibitions (1978–2009); member of the Korean Printmakers Association; juror for the Grand Art Exhibition of Korea.'
                        : '개인전 20회 (1978–2009); 한국판화가협회 회원; 대한민국미술대전 심사위원.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Early honours: special selection and encouragement prizes at the Shinsanghoe open call (1962–63); repeated selections at the National Art Exhibition (1962–65).'
                        : '초기 수상: 신상회 공모전 특선·장려상 (1962–63); 국전 입선 다수 (1962–65).'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 신학철 패턴 차용, 김상구 수공 목판 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the hand, the block, and the void</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">손과 목판, 그리고 여백에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 기계화 시대에 역행하는 손 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'The hand against the machine' : '기계에 맞선 손 — 수공의 선택'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Sang-gu trained as a Western painter at Hongik University, taking his
                        bachelor&apos;s degree in 1967 and later a master&apos;s at its Graduate
                        School of Art Education. Yet his life&apos;s medium became the woodblock —
                        and from the late 1970s onward, he committed to it as a wholly handmade
                        discipline.
                      </p>
                      <p>
                        The choice reads almost as a quiet argument with his era. Industrial society
                        was promising mechanization, speed, and endless reproduction; Kim turned the
                        other way, keeping to the slow labour of carving and pressing the block by
                        hand. The integrity of plainness and simplicity — an Eastern sense of the
                        artisan — is the ground on which the whole body of work stands.
                      </p>
                      <p>
                        There is nothing nostalgic for nostalgia&apos;s sake in this. It is, rather,
                        a conviction held in the body: that a thing carved slowly, by hand, carries
                        a warmth that no machine can press. The plainness is not a lack of skill but
                        a chosen restraint.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김상구는 홍익대학교에서 서양화를 익혔다. 1967년 학사, 이후 미술교육대학원
                        석사. 그러나 그의 평생 매체가 된 것은 목판이었고, 1970년대 후반 이래 그는
                        그것을 철저한 수공의 규율로 삼았다.
                      </p>
                      <p>
                        그 선택은 시대를 향한 조용한 항변처럼 읽힌다. 산업사회는 기계화와 속도,
                        끝없는 복제를 약속하고 있었다. 김상구는 반대편으로 돌아서, 손으로 새기고
                        찍는 더딘 노동을 지켰다. 우직함과 단순함이라는 동양적 장인정신이, 그의 작업
                        전체가 서 있는 바탕이다.
                      </p>
                      <p>
                        여기에 향수를 위한 향수는 없다. 그것은 차라리 몸에 새긴 신념이다 — 손으로
                        더디게 새긴 것에는, 기계가 찍어 낼 수 없는 온기가 있다는. 투박함은 기량의
                        부족이 아니라, 스스로 택한 절제다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 흑백과 여백의 형식 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Black, white, and the beauty of empty space'
                    : '흑백과 여백 — 비움의 형식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        His woodblock world has been summed up in a single, careful sentence: the
                        plain over the splendid; the simple, with something that seeps in like an
                        earthen wall, over the complex; the flat over the three-dimensional; the
                        contrast of black and white; and the beauty of empty space over a surface
                        filled to its edges.
                      </p>
                      <p>
                        Each clause is a refusal. He refuses ornament, refuses depth-illusion,
                        refuses the horror of the void that drives so much picture-making to fill
                        every corner. In the woodblock, where a single carved line either prints or
                        does not, this economy is not decoration but structure: the white ground is
                        as deliberate as the black mark.
                      </p>
                      <p>
                        The word that recurs is <em>toldam</em> — the low earthen wall of the old
                        Korean village. It names a sensibility: humble, weathered, unpretentious,
                        and warm. In Kim&apos;s prints the empty space is never merely blank; it is
                        the breathing room in which the plain folk feeling of the earthen wall can
                        settle.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 목판화 세계는 신중한 한 문장으로 함축된다 — 화려한 것보다는 투박한 것,
                        복잡한 것보다는 단순한 가운데 스며드는 토담과 같은 것, 입체적 표현보다는
                        평면적인 것, 흑백의 대비, 가득 차 있는 것보다는 여백의 미.
                      </p>
                      <p>
                        각 구절은 하나의 거절이다. 그는 장식을 거절하고, 깊이의 환영을 거절하며,
                        화면의 모든 구석을 메우게 만드는 여백 공포를 거절한다. 새긴 한 획이 찍히거나
                        찍히지 않거나로 갈리는 목판에서, 이 절제는 장식이 아니라 구조다 — 흰 바탕은
                        검은 자국만큼이나 의도된 것이다.
                      </p>
                      <p>
                        거듭 떠오르는 말은 토담이다 — 옛 마을의 낮은 흙담. 그것은 하나의 정서를
                        부른다: 소박하고, 풍상에 닳았고, 꾸밈없고, 따뜻한. 김상구의 판화에서 여백은
                        결코 단지 비어 있지 않다. 그것은 토담 같은 서민의 정서가 내려앉을 수 있는,
                        숨 쉬는 자리다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 다색판화로의 확장 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Into colour — the recent multicolor prints'
                    : '색으로 — 근작의 다색판화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For decades the black-and-white print was Kim Sang-gu&apos;s home ground. In
                        his more recent work, that ground opens toward colour: the multicolor
                        woodblock print, in which separate blocks are carved and registered for each
                        hue, layer by layer, by hand.
                      </p>
                      <p>
                        The technique is more demanding, not less. Multicolor woodblock printing
                        asks for exact registration across repeated impressions — a discipline that
                        only deepens the handmade conviction rather than easing it. The colour does
                        not arrive as decoration; it arrives as another carved layer, subject to the
                        same restraint that governed the black and the white.
                      </p>
                      <p>
                        And so the recent prints are not a departure but a widening. The plainness
                        remains, the empty space remains, the patient labour of the hand remains.
                        The master simply allows a little more of the world&apos;s colour to settle,
                        at last, into the toldam.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        수십 년 동안 흑백의 판화는 김상구의 본거지였다. 근작에 이르러 그 바탕은
                        색으로 열린다 — 색마다 별개의 판을 새기고 맞춰 한 겹 한 겹 손으로 찍어 내는
                        다색판화로.
                      </p>
                      <p>
                        기법은 덜 까다로워지는 것이 아니라 더 까다로워진다. 다색판화는 반복되는 인쇄
                        사이의 정확한 맞춤을 요구한다 — 그 규율은 수공의 신념을 덜어 내기는커녕 더
                        깊게 한다. 색은 장식으로 도착하지 않는다. 그것은 흑과 백을 다스리던 같은
                        절제 아래, 또 하나의 새긴 겹으로 도착한다.
                      </p>
                      <p>
                        그리하여 근작의 판화는 이탈이 아니라 넓힘이다. 투박함이 남고, 여백이 남고,
                        손의 인내로운 노동이 남는다. 장인은 다만 세상의 색을 조금 더, 마침내 토담
                        안으로 내려앉도록 허락할 따름이다.
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
                      From the late 1970s to today, Kim Sang-gu&apos;s work has pursued a single,
                      unhurried question: what can the hand still say that the machine cannot? The
                      answer, carved over half a century, is a body of woodblock prints in which
                      plainness, black-and-white contrast, and the beauty of empty space hold their
                      ground. He joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that those who come after might keep working by
                      hand.
                    </>
                  ) : (
                    <>
                      1970년대 후반부터 오늘까지, 김상구의 작업은 서두르지 않는 하나의 물음을 추구해
                      왔다: 기계가 할 수 없는 무엇을 손은 여전히 말할 수 있는가. 반세기에 걸쳐
                      새겨진 대답이, 투박함과 흑백의 대비와 여백의 미가 제자리를 지키는 목판화의
                      세계다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                      연대자로서 함께한다 — 다음 세대의 예술인들이 손으로 계속 일할 수 있도록.
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
                ARCHIVE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Sang-gu</span>
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
                    Kim Sang-gu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김상구 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_SANGGU_PATH}
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
