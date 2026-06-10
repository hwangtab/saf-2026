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

// 거장 작가 feature는 작가 페이지(/artworks/artist/한애규)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const HAN_AEGYU_PATH = `/artworks/artist/${encodeURIComponent('한애규')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isHanAegyuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '한애규' ||
    n === 'han ae-gyu' ||
    n === 'han aegyu' ||
    n.replace(/[\s-]+/g, '') === 'hanaegyu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '한애규 — 흙으로 빚은 여성과 대지',
    description:
      '한국 테라코타 조각의 대표 작가 한애규(b.1953). 유약 없이 불을 견딘 흙으로 풍만한 여인 군상을 빚어, 역사 속 이름 없는 여성과 대지의 모성을 형상화해 온 중견 조각가. 흙의 감정과 여정을 담은 한애규의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '한국 테라코타 조각의 대표 작가 한애규. 불을 견딘 흙으로 빚은 여인 군상 — 이름 없는 여성과 대지의 모성, 그리고 북방으로 이어지는 교류의 길.',
    ogAlt: '한애규 대표 작품',
    twitterTitle: '한애규',
    twitterDescription: '흙의 여정 — 테라코타에 새긴 여성과 대지, 한애규',
    keywords:
      '한애규 작가, 테라코타, 도예, 여성 조각, 대지의 모성, 한국 현대 조각, 흙의 여정, 씨앗페 온라인',
  },
  en: {
    title: 'Han Ae-gyu — Women and Earth, Shaped in Clay',
    description:
      'Selected works by Han Ae-gyu (b. 1953), a leading figure of Korean terracotta sculpture. Through unglazed, fire-hardened clay she shapes processions of full-figured women — giving form to the nameless women of history and the maternal force of the earth. View and collect her works at SAF Online.',
    ogDescription:
      'Han Ae-gyu — a leading figure of Korean terracotta sculpture. Full-figured women shaped in fire-hardened clay: the nameless women of history, the mother-earth, and the long road north.',
    ogAlt: 'Han Ae-gyu — featured work',
    twitterTitle: 'Han Ae-gyu',
    twitterDescription: 'The journey of clay — women and earth carved in terracotta',
    keywords:
      'Han Ae-gyu artist, terracotta sculpture, Korean ceramics, female figure, mother earth, contemporary Korean sculpture',
  },
} as const;

export async function buildHanAegyuMetadata({
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
  const pageUrl = buildLocaleUrl(HAN_AEGYU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('한애규');
  const artwork = allArtworks.find((a) => isHanAegyuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Han Ae-gyu`
      : `${artwork.title} — 한애규`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(HAN_AEGYU_PATH, locale, true),
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

export default async function HanAegyuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(HAN_AEGYU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('한애규');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isHanAegyuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Han Ae-gyu' : '한애규', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${HAN_AEGYU_PATH}#person-han-aegyu`,
    name: isEnglish ? 'Han Ae-gyu' : '한애규',
    alternateName: isEnglish ? '한애규' : 'Han Ae-gyu',
    jobTitle: isEnglish ? 'Sculptor · Ceramic Artist' : '조각가 · 도예가',
    description: isEnglish
      ? 'Han Ae-gyu (b. 1953) is a leading figure of Korean terracotta sculpture who shapes processions of full-figured women in unglazed, fire-hardened clay, giving form to the nameless women of history and the maternal force of the earth.'
      : '한애규(b.1953)는 유약 없이 불을 견딘 흙으로 풍만한 여인 군상을 빚어, 역사 속 이름 없는 여성과 대지의 모성을 형상화해 온 한국 테라코타 조각의 대표 작가입니다.',
    birthDate: '1953',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Seoul National University, Dept. of Applied Arts'
          : '서울대학교 응용미술과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? "École des Beaux-Arts d'Angoulême, France" : '프랑스 앙굴렘 미술학교',
      },
    ],
    knowsAbout: ['Terracotta sculpture', 'Ceramic art', 'Female figure', 'Mother earth'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Han Ae-gyu — SAF Online' : '한애규 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Han Ae-gyu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 한애규 작품들을 소개합니다.',
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

          {/* Horizontal strata lines — 대지의 지층·흙의 결 모티프 */}
          <div className="absolute left-0 top-12 w-full h-px bg-white/10" />
          <div className="absolute left-0 bottom-16 w-full h-px bg-white/10" />
          <div className="absolute left-0 bottom-10 w-full h-px bg-primary/30" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Han Ae-gyu · b. 1953' : '한애규 · b.1953'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The earth remembers
                  <br />
                  <span className="text-primary-soft">the women it carried</span>
                </>
              ) : (
                <>
                  흙은 기억한다
                  <br />
                  <span className="text-primary-soft">자신이 품은 여인들을</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Full-figured women, shaped in unglazed clay and hardened by fire.
                  </span>
                  <span className="mt-2 block">
                    The nameless women of history, and the maternal weight of the earth.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">유약 없이, 오직 불로 단단해진 흙의 여인들.</span>
                  <span className="mt-2 block">
                    역사 속 이름 없는 여성과, 대지가 짊어진 모성의 무게.
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
                    The journey of clay —<br />
                    <span className="text-primary-strong">women, earth, and the road north</span>
                  </>
                ) : (
                  <>
                    흙의 여정 —<br />
                    <span className="text-primary-strong">여성과 대지, 그리고 북방의 길</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Han Ae-gyu (b. 1953) studied applied arts and ceramics at Seoul National
                      University and its graduate school, and later graduated from the École des
                      Beaux-Arts in Angoulême, France. Across more than four decades she has worked
                      almost entirely in one material —{' '}
                      <strong className="font-bold text-charcoal-deep">terracotta</strong>: clay
                      shaped by hand and hardened by fire, most often left unglazed so the warm,
                      earthen body of the material itself remains visible.
                    </p>
                    <p>
                      Her central subject has been, for a long time, women. Not idealized figures,
                      but full-figured, robust, unstylized bodies — women with rounded bellies and
                      strong shoulders, gathered into{' '}
                      <strong className="font-bold text-charcoal">processions</strong>. Critics have
                      called her a matriarch of Korean terracotta; her own concern is plainer. These
                      are the women who, she says, surely existed and had to exist — the ones
                      without whom history could not have continued, yet whose names history did not
                      keep.
                    </p>
                    <p>
                      Around her figures she places horses and wolves, animals whose curves echo the
                      bodies of the women. Through them she traces a longer geography: routes of{' '}
                      <strong className="font-bold text-charcoal">exchange</strong> reaching north
                      across the divided peninsula toward the continent. Her women are, in her own
                      words, daughters of that continent — figures who endured displacement, carried
                      burdens, tended the wounded, and pressed on through hardship.
                    </p>
                    <p>
                      Where much of her generation pursued refined glaze and porcelain whiteness,
                      Han chose a deliberately tactile, unpolished surface. The roughness is the
                      point: it refuses conventional standards of beauty and lets emotion and
                      cultural memory rise directly from the clay. The result is a body of work that
                      is at once ancient and forward-looking — terracotta, the oldest of fired
                      materials, enlisted to imagine a primordial yet open future.
                    </p>
                    <p>
                      Her practice has unfolded through a sustained run of solo exhibitions — among
                      them 《A Person Holding a Flower》 (Gana Art Center, 2008), 《Encounter》
                      (POSCO Art Museum, 2009), 《From the Ruins》 (Artside Gallery Beijing, 2010),
                      《The Blue Road》 (Artside Gallery Seoul, 2018), 《Beside》 (Artside Gallery
                      Seoul, 2022), and 《The Emotion of Earth, the Journey of Form》 (Gallery
                      Sejul, 2024) — each extending the same patient inquiry into clay, women, and
                      memory.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      한애규(b.1953)는 서울대학교 응용미술과와 동 대학원에서 도예를 전공하고, 이후
                      프랑스 앙굴렘 미술학교를 졸업했다. 40여 년에 걸쳐 그는 거의 한 가지 재료만을
                      고집해 왔다 —{' '}
                      <strong className="font-bold text-charcoal-deep">테라코타</strong>. 손으로
                      빚고 불로 구워 단단해진 흙을, 대개 유약을 입히지 않은 채 그대로 두어 따뜻하고
                      투박한 흙 본연의 몸을 드러낸다.
                    </p>
                    <p>
                      그의 오랜 주제는 여성이다. 이상화된 형상이 아니라, 풍만하고 강인하며
                      정형화되지 않은 몸 — 배가 나오고 어깨가 단단한 여인들이 모여{' '}
                      <strong className="font-bold text-charcoal">행렬</strong>을 이룬다. 비평계는
                      그를 한국 테라코타의 대모라 부르지만, 작가 자신의 관심은 더 담백하다. 분명
                      존재했고 존재할 수밖에 없던 여성들 — 그들이 없었다면 역사는 지속될 수
                      없었으나, 역사가 그 이름을 기억하지 않은 이들이다.
                    </p>
                    <p>
                      그는 여인들 곁에 말과 늑대를 놓는다. 여성의 곡선을 닮은 짐승들이다. 이들을
                      통해 그는 더 긴 지리를 그린다: 끊어진 한반도 너머 북방으로, 대륙으로 이어지는{' '}
                      <strong className="font-bold text-charcoal">교류</strong>의 길. 그의 여인들은
                      작가의 말을 빌리면 그 대륙의 딸들 — 유랑을 견디고, 짐을 지고, 다친 이를 돌보며
                      고난을 묵묵히 통과해 온 존재들이다.
                    </p>
                    <p>
                      세대의 많은 작가가 정제된 유약과 백자의 흰빛을 좇을 때, 한애규는 의도적으로
                      투박하고 거친 표면을 택했다. 그 거칠음이 핵심이다: 그것은 통념적 아름다움의
                      기준을 거부하고, 감정과 문화적 기억이 흙에서 곧바로 솟아오르게 한다. 그렇게
                      태어난 작업은 가장 오래된 동시에 앞을 향한다 — 가장 오래된 소성(燒成) 재료인
                      테라코타로, 원시적이면서도 열린 미래를 상상한다.
                    </p>
                    <p>
                      그의 작업은 꾸준한 개인전으로 이어져 왔다 — 《꽃을 든 사람》(가나 아트 센터,
                      2008), 《조우》(포스코 미술관, 2009), 《폐허에서》(아트사이드 갤러리 베이징,
                      2010), 《푸른 길》(아트사이드 갤러리 서울, 2018), 《Beside》(아트사이드 갤러리
                      서울, 2022), 《흙의 감정, 형태의 여정》(갤러리세줄, 2024) — 그 모두가 흙과
                      여성과 기억을 향한 같은 물음의 연장이다.
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
                        {isEnglish ? 'Unglazed terracotta' : '유약 없는 테라코타'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Hand-shaped clay hardened by fire, left bare — a deliberately tactile, unpolished surface that lets the warmth of earth itself remain.'
                          : '손으로 빚어 불로 구운 흙을 그대로 둔다. 의도적으로 투박한 표면이 흙 본연의 따뜻함을 남긴다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Women and the mother-earth' : '여성과 대지의 모성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Full-figured, unstylized women gathered into processions — the nameless figures without whom history could not have continued.'
                          : '풍만하고 정형화되지 않은 여인들이 행렬을 이룬다. 그들이 없었다면 역사가 지속될 수 없었던 이름 없는 존재들.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The road north' : '북방으로의 길'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Horses and wolves, their curves echoing the women, trace routes of exchange reaching north across the peninsula toward the continent.'
                          : '여성의 곡선을 닮은 말과 늑대가, 끊어진 한반도 너머 북방·대륙으로 이어지는 교류의 길을 그린다.'}
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
                      1953
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Korea.' : '출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      SNU
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studies applied arts at Seoul National University, then ceramics at its graduate school.'
                        : '서울대학교 응용미술과 졸업, 동 대학원 도예 전공.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      FR
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Graduates from the École des Beaux-Arts d'Angoulême, France."
                        : '프랑스 앙굴렘 미술학교 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《A Person Holding a Flower》, Gana Art Center.'
                        : '개인전 《꽃을 든 사람》, 가나 아트 센터.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Encounter》, POSCO Art Museum.'
                        : '개인전 《조우》, 포스코 미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《From the Ruins》, Artside Gallery Beijing.'
                        : '개인전 《폐허에서》, 아트사이드 갤러리 베이징.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《The Blue Road》, Artside Gallery Seoul.'
                        : '개인전 《푸른 길》, 아트사이드 갤러리 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Beside》, Artside Gallery Seoul — a procession of new terracotta figures.'
                        : '개인전 《Beside》, 아트사이드 갤러리 서울 — 테라코타 여인 행렬 신작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《The Emotion of Earth, the Journey of Form》, Gallery Sejul.'
                        : '개인전 《흙의 감정, 형태의 여정》, 갤러리세줄.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition: 《Special Exhibition of Korean Coloured Painting》, MMCA Gwacheon (2022)'
                        : '단체전: 《한국의 채색화 특별전》, 국립현대미술관 과천 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition: 《Terracotta, Primitive Future》, Clayarch Gimhae Museum (2011); 《Saturday Exhibition》 (2012–2020); 《Long Breath》, SOMA Museum (2014)'
                        : '단체전: 《테라코타, 원시적 미래》, 클레이아크 김해미술관 (2011); 《토요일展》 (2012–2020); 《긴 호흡》, 소마미술관 (2014)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: National Museum of Modern and Contemporary Art (MMCA); Seoul Museum of Art; Seoul Museum of History; Daejeon Museum of Art; Jeonbuk Museum of Art; Seoul City Hall; Ewha Womans University Museum; Korea University Museum, and others'
                        : '소장: 국립현대미술관; 서울시립미술관; 서울역사박물관; 대전시립미술관; 전북도립미술관; 서울시청; 이화여자대학교 박물관; 고려대학교 박물관 등'}
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
                  <span className="text-charcoal-deep">on clay, women, and memory</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">흙과 여성, 그리고 기억에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 흙이라는 선택 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Why clay — the choice of an unglazed surface'
                    : '왜 흙인가 — 유약 없는 표면이라는 선택'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Terracotta is the oldest of fired materials — earth shaped by hand and made
                        permanent by fire. For a sculptor it is also the most exposing: there is no
                        glaze to hide behind, no porcelain whiteness to lend cool refinement. What
                        remains is the body of the clay itself, with its grain, its warmth, and the
                        marks of the hand that pressed it.
                      </p>
                      <p>
                        Han Ae-gyu chose this exposure deliberately. Where much of her generation
                        pursued smooth glazes and the prestige of porcelain, she kept her surfaces
                        rough and bare. The roughness is not neglect; it is argument. A polished
                        surface flatters; an unglazed one tells the truth of its making. In her
                        hands the medium becomes a way of insisting that emotion and memory belong
                        to matter — that feeling can be pressed directly into earth.
                      </p>
                      <p>
                        This is why critics have described her, across four decades, as a matriarch
                        of Korean terracotta: not because she invented the material, but because she
                        trusted it more fully than almost anyone of her time — long enough, and
                        patiently enough, to build an entire body of work from a single, humble
                        substance.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        테라코타는 가장 오래된 소성 재료다 — 손으로 빚어 불로 영구히 굳힌 흙. 조각가
                        에게 그것은 또한 가장 정직한 재료다: 뒤에 숨을 유약도 없고, 차고 정제된
                        백자의 흰빛도 빌릴 수 없다. 남는 것은 흙 자체의 몸 — 그 결, 그 따뜻함,
                        그리고 그것을 누른 손의 자국이다.
                      </p>
                      <p>
                        한애규는 이 노출을 의도적으로 택했다. 세대의 많은 작가가 매끄러운 유약과
                        백자의 권위를 좇을 때, 그는 표면을 거칠고 헐벗은 채로 두었다. 그 거칠음은
                        방치가 아니라 주장이다. 매끄러운 표면은 꾸미고, 유약 없는 표면은 그 제작의
                        진실을 말한다. 그의 손에서 이 매체는, 감정과 기억이 물질에 속한다는 것 —
                        느낌이 흙에 곧바로 새겨질 수 있다는 것을 고집하는 방식이 된다.
                      </p>
                      <p>
                        비평계가 40년에 걸쳐 그를 한국 테라코타의 대모라 부른 까닭이 여기 있다.
                        재료를 발명해서가 아니라, 당대 누구보다 그 재료를 온전히 신뢰했기 때문이다 —
                        하나의 소박한 물질로 한 작가의 전 작업을 세울 만큼, 오래도록 그리고 끈기
                        있게.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 이름 없는 여인들의 행렬 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'A procession of nameless women' : '이름 없는 여인들의 행렬'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her women do not conform to inherited ideals of beauty. They are
                        full-bodied, broad-shouldered, with rounded bellies — strong and steadfast
                        rather than delicate. Gathered side by side, they form processions: not a
                        single heroine but a multitude, moving together.
                      </p>
                      <p>
                        The choice is pointed. These are, as the artist has put it, the women who
                        surely existed and had to exist — the ones without whom history could not
                        have continued, yet whom history declined to name. In giving them rounded,
                        weighty bodies and placing them in procession, Han restores to them a kind
                        of monumentality usually reserved for kings and generals. The protagonist of
                        history, her figures argue, is not the great man but the woman who bore the
                        weight of survival.
                      </p>
                      <p>
                        It is here that the maternal force of the earth becomes literal as well as
                        symbolic: the women are made of the same clay we walk on, fired into
                        permanence. To stand before them is to be reminded that the ground itself
                        has carried, fed, and outlasted generations of unrecorded lives.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 여인들은 물려받은 미의 이상을 따르지 않는다. 풍만한 몸, 넓은 어깨, 나온
                        배 — 가녀린 대신 강인하고 묵묵하다. 나란히 모여 그들은 행렬을 이룬다. 한
                        명의 영웅이 아니라, 함께 움직이는 다수다.
                      </p>
                      <p>
                        선택은 분명하다. 작가의 말처럼 이들은 분명 존재했고 존재할 수밖에 없던
                        여성들 — 그들이 없었다면 역사는 지속될 수 없었으나, 역사가 그 이름을
                        부르기를 거부한 이들이다. 둥글고 무게 있는 몸을 주고 행렬에 세움으로써,
                        한애규는 보통 왕과 장군에게만 허락되던 기념비성을 그들에게 되돌린다. 역사의
                        주인공은 위인이 아니라 생존의 무게를 짊어진 여성이라고, 그의 형상들은
                        말한다.
                      </p>
                      <p>
                        대지의 모성이 상징이자 동시에 문자 그대로가 되는 지점이 여기다: 여인들은
                        우리가 밟는 바로 그 흙으로 빚어져, 불로 영원해졌다. 그들 앞에 서는 일은,
                        땅이야말로 기록되지 않은 무수한 삶을 품고 먹이고 살아남게 했음을 다시
                        떠올리는 일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 북방으로 이어지는 길 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The road north — horses, wolves, and exchange'
                    : '북방으로 이어지는 길 — 말, 늑대, 그리고 교류'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Among her women Han places animals — horses and wolves whose curving bodies
                        rhyme with the women&apos;s own. They are not decoration. They are vectors
                        of movement, carriers of a geography that the women belong to: the long
                        routes of exchange that once ran north from the peninsula across the
                        continent.
                      </p>
                      <p>
                        In her account, her women are daughters of that continent — figures who
                        endured displacement, who carried their burdens and tended the wounded as
                        they moved. The procession is therefore also a migration, and the road it
                        follows reaches toward a north now severed by division. The hope for
                        eventual reunification is folded quietly into the imagery: the broken
                        peninsula imagined whole again, its old continental roads reopened.
                      </p>
                      <p>
                        This is what gives her primitive forms their forward charge. The
                        archaeological imagination — clay figures, ancient animals, prehistoric
                        weight — is not nostalgia but a way of picturing a future: primordial and
                        open at once, a world in which the severed paths are joined and the unnamed
                        are finally counted.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        여인들 사이에 한애규는 짐승을 놓는다 — 여인의 몸과 운(韻)을 맞추듯 곡선을
                        가진 말과 늑대다. 장식이 아니다. 그것은 움직임의 벡터이자, 여인들이 속한
                        지리의 운반자다: 한때 한반도에서 북으로, 대륙을 가로질러 뻗어 있던 교류의 긴
                        길.
                      </p>
                      <p>
                        작가의 서술에서 그의 여인들은 그 대륙의 딸들이다 — 유랑을 견디고, 짐을 지고,
                        움직이며 다친 이를 돌본 존재들. 그러므로 행렬은 곧 이주이며, 그 길은 지금
                        분단 으로 끊어진 북방을 향한다. 언젠가의 통일에 대한 바람이 이미지 안에
                        조용히 접혀 있다: 끊어진 반도가 다시 온전해지고, 옛 대륙의 길이 다시 열리는
                        상상.
                      </p>
                      <p>
                        그의 원시적 형상에 미래를 향한 추동을 주는 것이 바로 이것이다. 흙 인형,
                        오래된 짐승, 선사의 무게로 이어지는 고고학적 상상력은 향수가 아니라 미래를
                        그리는 방식이다 — 원시적이면서 동시에 열린, 끊어진 길이 이어지고 이름 없던
                        이들이 마침내 헤아려지는 세계.
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
                      From Seoul to Angoulême and back, across four decades of a single material,
                      Han Ae-gyu&apos;s work has pursued one patient question: how does the earth
                      remember the lives it carried? Her answer is a multitude of clay women, fired
                      into permanence and set walking toward the continent. She joins this campaign
                      not as a subject of its cause but as a fellow artist in solidarity — so that
                      the artists who come after might keep working with the same freedom she has
                      claimed for clay.
                    </>
                  ) : (
                    <>
                      서울에서 앙굴렘으로, 그리고 다시 돌아와, 한 가지 재료로 보낸 40년에 걸쳐
                      한애규의 작업은 하나의 끈질긴 물음을 추구해 왔다: 흙은 자신이 품은 삶들을
                      어떻게 기억하는가. 그의 대답은 불로 영원해져 대륙을 향해 걷는 무수한 흙의
                      여인들이다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                      연대자로서 함께한다 — 다음 세대의 예술인들이, 그가 흙에서 일군 그 자유로 계속
                      작업할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Han Ae-gyu</span>
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
                    Han Ae-gyu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    한애규 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={HAN_AEGYU_PATH}
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
