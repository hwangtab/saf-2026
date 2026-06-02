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

// 거장 작가 feature는 작가 페이지(/artworks/artist/박재동)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_JAEDONG_PATH = `/artworks/artist/${encodeURIComponent('박재동')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isParkJaedongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '박재동' ||
    n === 'park jae-dong' ||
    n === 'park jaedong' ||
    n.replace(/[\s-]+/g, '') === 'parkjaedong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박재동 — 한국 시사만화의 대부',
    description:
      '한국 시사만화의 대부 박재동(1952–). 1988년 한겨레신문 창간과 함께 8년간 연재한 「한겨레 그림판」으로 "한국의 시사만화는 박재동 이전과 이후로 나뉜다"는 평을 받은 만화가. 날카로운 캐리커처와 풍자로 한국 언론 민주화의 역사에 선 굵은 자취를 남긴 그의 그림을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '한국 시사만화의 대부 박재동. 1988년 한겨레 창간과 함께 8년간 「한겨레 그림판」을 연재하며 시사만화의 새 지평을 열었다.',
    ogAlt: '박재동 대표 작품',
    twitterTitle: '박재동',
    twitterDescription: '매일 아침, 한 칸의 진실 — 한국 시사만화의 대부 박재동',
    keywords:
      '박재동 만화가, 한겨레 그림판, 시사만화, 한국 시사만화, 한겨레신문, 한국예술종합학교, 씨앗페 온라인',
  },
  en: {
    title: 'Park Jae-dong — The Godfather of Korean Editorial Cartooning',
    description:
      "Selected works by Park Jae-dong (b. 1952), the godfather of Korean editorial cartooning. His 8-year run of the Hankyoreh Geurimpan column from the newspaper's founding in 1988 is credited with redefining Korean editorial cartooning. View and collect his works at SAF Online.",
    ogDescription:
      'Park Jae-dong — the godfather of Korean editorial cartooning. Eight years of the Hankyoreh Geurimpan redefined the genre.',
    ogAlt: 'Park Jae-dong — featured work',
    twitterTitle: 'Park Jae-dong',
    twitterDescription: 'Every morning, the truth in a single frame — Park Jae-dong',
    keywords:
      'Park Jae-dong cartoonist, Hankyoreh editorial cartoon, Korean comics, minjung art, KARTS',
  },
} as const;

export async function buildParkJaedongMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_JAEDONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박재동');
  const artwork = allArtworks.find((a) => isParkJaedongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Jae-dong`
      : `${artwork.title} — 박재동`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_JAEDONG_PATH, locale, true),
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

export default async function ParkJaedongFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_JAEDONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박재동');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkJaedongArtist(artwork.artist)
  );
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Park Jae-dong' : '박재동', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_JAEDONG_PATH}#person-park-jaedong`,
    name: isEnglish ? 'Park Jae-dong' : '박재동',
    alternateName: isEnglish ? '박재동' : 'Park Jae-dong',
    jobTitle: isEnglish ? 'Cartoonist' : '만화가',
    description: isEnglish
      ? "Park Jae-dong (b. 1952) is the godfather of Korean editorial cartooning. His eight-year run of the Hankyoreh Geurimpan column, begun at the newspaper's founding in 1988, set a new standard for political satire in Korea. He is a professor emeritus of animation at the Korea National University of Arts."
      : '박재동(1952–)은 한국 시사만화의 대부다. 1988년 한겨레신문 창간과 함께 시작한 「한겨레 그림판」 8년 연재는 한국 시사만화의 새 기준을 세웠다. 한국예술종합학교 영상원 애니메이션학과 교수를 역임했다.',
    birthDate: '1952-12-20',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Seoul National University, Dept. of Painting' : '서울대학교 회화과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish
        ? 'Korea National University of Arts (KARTS), School of Film, TV & Multimedia'
        : '한국예술종합학교 영상원',
    },
    knowsAbout: ['Editorial cartoon', 'Korean cartoon', 'Animation', 'Political satire'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Jae-dong — SAF Online' : '박재동 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Jae-dong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박재동 작품들을 소개합니다.',
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
        {/* Hero Section — 펜 선·신문 컷 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Horizontal panel lines — 만화 컷 구분선 모티프 */}
          <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-12 left-0 w-full h-px bg-white/5" />
          <div className="absolute bottom-12 left-0 w-full h-px bg-white/5" />
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 right-8 h-full w-px bg-white/10" />
          {/* Pen-nib accent shape */}
          <div className="absolute top-8 right-16 w-2 h-16 bg-primary/40 rotate-12" />
          <div className="absolute bottom-8 left-16 w-2 h-16 bg-primary/30 -rotate-12" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Park Jae-dong · b. 1952' : '박재동 · 1952–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Every morning,
                  <br />
                  <span className="text-primary-soft">the truth in a single frame</span>
                </>
              ) : (
                <>
                  매일 아침,
                  <br />
                  <span className="text-primary-soft">한 칸의 진실</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He drew what power feared most — the truth made visible.
                  </span>
                  <span className="mt-2 block">
                    Eight years of the Hankyoreh Geurimpan. A pen that changed Korean journalism.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    권력이 가장 두려워하는 것 — 눈에 보이는 진실을 그렸다.
                  </span>
                  <span className="mt-2 block">
                    8년간의 한겨레 그림판. 한국 저널리즘을 바꾼 한 자루의 펜.
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
                    A pen as a public voice —<br />
                    <span className="text-primary-strong">the cartoonist who redefined satire</span>
                  </>
                ) : (
                  <>
                    공론장의 펜 —<br />
                    <span className="text-primary-strong">풍자를 다시 쓴 만화가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Jae-dong (b. 1952.12.20) was born in Ulsan and studied painting at Seoul
                      National University. Before entering the world of cartooning, he worked as an
                      art teacher at secondary schools in Seoul — a period that sharpened his eye
                      for the everyday and for the gaps between what institutions say and what they
                      do. He made his debut as a cartoonist in 1974.
                    </p>
                    <p>
                      In 1988, Park joined the founding team of the <em>Hankyoreh</em> — the
                      newspaper launched by journalists who had been dismissed from their posts
                      during the Chun Doo-hwan era, and the first Korean daily funded entirely by
                      reader investment. From the newspaper&apos;s first edition, Park drew the{' '}
                      <strong className="font-bold text-charcoal-deep">Hankyoreh Geurimpan</strong>{' '}
                      (한겨레 그림판), a daily editorial cartoon column he would continue for eight
                      years. In a media landscape still cautious about direct political criticism,
                      Park&apos;s bold caricatures of presidents, prosecutors, corporations, and the
                      National Assembly — delivered with a directness that had rarely been seen in
                      Korean editorial cartooning — established a new standard for the genre.
                    </p>
                    <p>
                      The phrase most frequently quoted about his career — &ldquo;Korean editorial
                      cartooning divides into before Park Jae-dong and after Park Jae-dong&rdquo; —
                      captures something real. Earlier editorial cartoons tended to stay within
                      implied limits; Park&apos;s work made the power portrait explicit, the
                      satirical target unmistakable. The Geurimpan column made him{' '}
                      <strong className="font-bold text-charcoal">
                        one of the most recognized visual voices
                      </strong>{' '}
                      in Korean public life during the democratization era of the late 1980s and
                      early 1990s. Among those he influenced was cartoonist Kang Full, who has said
                      that seeing Park&apos;s editorial cartoons first drew him toward comics.
                    </p>
                    <p>
                      In 1996, after eight years at the Hankyoreh, Park left to found an animation
                      production company, Odolttogi, and pivoted toward a new medium. He produced{' '}
                      <em>Park Jae-dong&apos;s TV Manhyeong</em> (TV 만평), an animated editorial
                      segment broadcast on weekend news programmes. From 2001, he joined the Korea
                      National University of Arts (KARTS) as a professor in the Animation department
                      of the School of Film, TV &amp; Multimedia, bringing his practice into
                      pedagogy.
                    </p>
                    <p>
                      Beyond journalism, Park has published several collections of drawings and
                      travel sketches — including{' '}
                      <em>Park Jae-dong&apos;s Silk Road Sketch Journey</em> — and contributed to
                      collaborative human-rights cartoon projects. In 2010, he received the 10th
                      Gobau Manhwa Award, given in honour of Kim Seong-hwan, creator of the
                      long-running satirical strip <em>Gobau</em>, and recognising those who have
                      broadened the social role of cartooning in Korea.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박재동(1952.12.20–)은 울산에서 태어나 서울대학교 회화과에서 미술을 공부했다.
                      만화계에 발을 들이기 전, 서울의 중·고등학교에서 미술교사로 일했다 — 제도가
                      말하는 것과 실제 사이의 간극을 날카롭게 보는 눈이 그 시절에 벼려졌다. 만화가로
                      등단한 것은 1974년이다.
                    </p>
                    <p>
                      1988년, 박재동은 한겨레신문 창간 멤버로 합류했다. 한겨레는 전두환 정권 시절
                      해직된 언론인들이 만들고 독자들의 주주 투자로 설립된, 한국 최초의 독자 자본
                      일간지였다. 창간호부터 그는 매일 만평{' '}
                      <strong className="font-bold text-charcoal-deep">「한겨레 그림판」</strong>을
                      그렸고, 8년을 이어갔다. 대통령, 검찰, 대기업, 국회를 향한 과감한 캐리커처와
                      직설적인 풍자 — 당시 한국 신문 만평이 좀처럼 보이지 않던 직접성으로 그는
                      시사만화의 새 기준을 세웠다.
                    </p>
                    <p>
                      &ldquo;한국의 시사만화는 박재동 이전과 이후로 나뉜다&rdquo;는 평은 실제를 담고
                      있다. 이전의 시사만화가 암묵적 경계 안에 머물렀다면, 박재동의 그림은 권력의
                      초상을 명시했고 풍자의 대상을 선명하게 특정했다. 「한겨레 그림판」은 그를
                      1980년대 후반 민주화 시대 한국 공론장의{' '}
                      <strong className="font-bold text-charcoal">
                        가장 잘 알려진 시각적 목소리
                      </strong>{' '}
                      중 하나로 만들었다. 만화가 강풀은 박재동의 만평을 보고 만화의 길로
                      접어들었다고 밝힌 바 있다.
                    </p>
                    <p>
                      1996년, 8년의 한겨레 연재를 마치고 박재동은 애니메이션 제작사 ㈜오돌또기를
                      창업하며 새로운 매체로 전환했다. 주말 뉴스 프로그램에서 방영한 〈박재동의
                      TV만평〉을 제작했으며, 2001년부터는 한국예술종합학교 영상원 애니메이션학과
                      교수로 초빙되어 후학 양성에 힘썼다.
                    </p>
                    <p>
                      저널리즘 바깥에서 박재동은 「박재동의 실크로드 스케치 기행」을 비롯한
                      드로잉·기행 스케치 작업집을 펴냈고, 인권만화 프로젝트에 참여했다. 2010년에는
                      장수 풍자만화 「고바우 영감」의 작가 고 김성환 화백의 정신을 기리는 제10회
                      고바우만화상을 수상했다 — &ldquo;만화의 사회적 역할을 넓힌&rdquo; 공로에
                      주어지는 상이었다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Major themes card */}
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'What the pen does' : '펜이 하는 일'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The caricature as public record' : '캐리커처, 공공 기록으로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Park's bold, exaggerated portraits of the powerful made editorial cartooning a form of daily public testimony — each drawing a verdict the mainstream press rarely dared to deliver."
                          : '권력자를 향한 과감한 캐리커처는 시사만화를 일상적 공공 증언으로 만들었다 — 주류 언론이 좀처럼 내놓지 못했던 판결을 매일 한 칸에 담았다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Satire in the democratisation era' : '민주화 시대의 풍자'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "The Hankyoreh Geurimpan ran during South Korea's turbulent transition from military rule to democratic governance. Park's cartoons named what was happening — and who was responsible."
                          : '「한겨레 그림판」은 한국이 군사통치에서 민주적 통치로 격변하는 시기를 관통했다. 박재동의 만평은 일어나고 있는 일을 이름 붙였고, 책임이 누구에게 있는지 가리켰다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Drawing beyond the newspaper' : '신문을 넘어선 그림'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Travel sketches, human-rights cartoon collaborations, animation, pedagogy — Park's practice extends cartooning's social reach far beyond the daily column."
                          : '기행 스케치, 인권만화 협업, 애니메이션, 교육 — 박재동의 작업은 만화의 사회적 역할을 일간 만평 너머로 확장해왔다.'}
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
                      1952
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born on 20 December in Ulsan.' : '12월 20일 울산 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studies painting at Seoul National University; makes cartoon debut in 1974.'
                        : '서울대학교 회화과 수학. 1974년 만화가로 등단.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1979–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works as an art teacher at secondary schools in Seoul (Hwimun, Jungkyeong).'
                        : '서울 휘문고·중경고에서 미술교사로 근무.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1988
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Joins the founding team of the Hankyoreh; begins the Hankyoreh Geurimpan daily editorial cartoon.'
                        : '한겨레신문 창간 멤버로 합류. 「한겨레 그림판」 연재 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1988–96
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Eight years of the Hankyoreh Geurimpan column; the run is credited with redefining Korean editorial cartooning.'
                        : '「한겨레 그림판」 8년 연재. "한국의 시사만화는 박재동 이전과 이후로 나뉜다"는 평을 얻다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1996
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Leaves the Hankyoreh; founds animation company Odolttogi; produces animated editorial segments for weekend news.'
                        : '한겨레 퇴사. 애니메이션 제작사 ㈜오돌또기 창업. 주말 뉴스 〈박재동의 TV만평〉 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Appointed professor, Animation dept., Korea National University of Arts (KARTS).'
                        : '한국예술종합학교 영상원 애니메이션학과 교수로 초빙.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the 10th Gobau Manhwa Award for broadening the social role of cartooning in Korea.'
                        : '제10회 고바우만화상 수상 — "만화의 사회적 역할을 넓힌" 공로.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* Career highlights card */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected career & publications' : '주요 경력 및 출판'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Hankyoreh founding member &amp; Geurimpan cartoonist (1988–1996) — 8-year
                          daily editorial cartoon column
                        </>
                      ) : (
                        <>
                          한겨레신문 창간 멤버 &amp; 「한겨레 그림판」 연재 (1988–1996) — 8년 매일
                          만평
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Professor, Animation dept., Korea National University of Arts — KARTS
                          (from 2001)
                        </>
                      ) : (
                        <>한국예술종합학교 영상원 애니메이션학과 교수 (2001년~)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          10th Gobau Manhwa Award (2010) — for broadening the social role of
                          cartooning
                        </>
                      ) : (
                        <>제10회 고바우만화상 수상 (2010) — 만화의 사회적 역할 확장 공로</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Publications: <em>Park Jae-dong&apos;s Silk Road Sketch Journey</em>,{' '}
                          <em>Life in Cartoons</em> (serialised in Hankyoreh 2005–2007),{' '}
                          <em>Sibiilban</em> (human-rights cartoon anthology, Changbi)
                        </>
                      ) : (
                        <>
                          출판물: 「박재동의 실크로드 스케치 기행」, 「인생만화」(한겨레 2005–2007
                          연재 단행본), 「십시일反」(창비, 인권만화 선집) 등
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Featured in{' '}
                          <a
                            href="https://source.washu.edu/2007/08/korean-comics-a-society-through-small-frames-at-mildred-lane-kemper-art-museum-aug-31-to-dec-17/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Korean Comics: A Society Through Small Frames
                          </a>
                          , Mildred Lane Kemper Art Museum, Washington University in St. Louis
                          (2007)
                        </>
                      ) : (
                        <>
                          참여 전시:{' '}
                          <a
                            href="https://source.washu.edu/2007/08/korean-comics-a-society-through-small-frames-at-mildred-lane-kemper-art-museum-aug-31-to-dec-17/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《Korean Comics: A Society Through Small Frames》
                          </a>
                          , 워싱턴대학교 밀드레드 레인 켐퍼 아트뮤지엄 (2007)
                        </>
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
                  <span className="text-charcoal-deep">on the cartoon and its weight</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">만화와 그 무게에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 한겨레 그림판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Hankyoreh Geurimpan — eight years, daily'
                    : '한겨레 「그림판」 — 8년, 매일'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When the Hankyoreh launched in May 1988, South Korea was in the first year
                        of direct presidential elections after decades of authoritarian rule. The
                        new newspaper — founded by journalists who had refused to follow dictates
                        during the Chun Doo-hwan era — needed a visual voice as bold as its
                        editorial mission. Park Jae-dong was that voice.
                      </p>
                      <p>
                        For eight years, from the paper&apos;s founding until 1996, Park drew the
                        Geurimpan column daily. The column&apos;s targets were the figures of power:
                        successive presidents, prosecutors and intelligence services, the
                        conglomerates, and the National Assembly. What distinguished the Geurimpan
                        from its predecessors was directness. Earlier Korean editorial cartoons
                        tended toward allegory and implication; Park&apos;s work made the subject
                        recognisable, the critique explicit. His caricatures — exaggerated,
                        physically unkind to the powerful, sometimes blunt to the point of
                        provocation — were a daily assertion that the press existed to hold power to
                        account.
                      </p>
                      <p>
                        The phrase most often quoted to summarise the period — &ldquo;Korean
                        editorial cartooning divides into before Park Jae-dong and after Park
                        Jae-dong&rdquo; — is shorthand for a genuine shift. The Geurimpan column set
                        the terms for what political satire could look like in Korean newspapers
                        during the pivotal years of democratic consolidation. Its influence extended
                        beyond journalism: cartoonist Kang Full has stated publicly that Park&apos;s
                        work was what first drew him toward comics as a medium.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1988년 5월 한겨레가 창간됐을 때 한국은 수십 년의 권위주의 통치 이후 첫
                        직선제 대통령 선거 원년이었다. 전두환 정권 시절 보도 지침을 거부한
                        언론인들이 만든 이 신문은, 그 창간 정신만큼 대담한 시각적 목소리가 필요했다.
                        박재동이 그 목소리였다.
                      </p>
                      <p>
                        창간부터 1996년까지 8년간, 박재동은 「그림판」을 매일 그렸다. 주인공은
                        권력자들이었다 — 역대 대통령, 검찰과 안기부, 대기업, 국회의원. 이전의 시사
                        만평과 「그림판」을 가르는 것은 직접성이었다. 앞선 한국 시사만화가 비유와
                        암시를 경유했다면, 박재동의 그림은 대상을 알아볼 수 있게 그렸고, 비판을
                        명시했다. 과장되고, 권력자에게 물리적으로 가혹하며, 때로 도발에 가까울 만큼
                        직설적인 캐리커처 — 그것은 언론이 권력을 책임 묻기 위해 존재한다는 매일의
                        주장이었다.
                      </p>
                      <p>
                        &ldquo;한국의 시사만화는 박재동 이전과 이후로 나뉜다&rdquo;는 평은 실제
                        변화를 가리킨다. 「그림판」 연재는 민주주의가 공고해지는 결정적 시기에 한국
                        신문 정치풍자가 어떻게 보일 수 있는지 기준을 세웠다. 그 영향은 저널리즘
                        바깥으로도 미쳤다 — 만화가 강풀은 박재동의 만평이 자신을 만화라는 매체로
                        이끈 계기였다고 공개적으로 밝혔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 만화라는 발언 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The cartoon as public speech' : '만화라는 발언'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Jae-dong&apos;s practice belongs to the tradition of editorial
                        cartooning as civic institution — the idea that a cartoonist working for a
                        daily newspaper occupies a public role distinct from that of a fine artist
                        or a journalist writing prose. The cartoon, in this tradition, is a verdict
                        delivered in a single image: a judgment that does not require the reader to
                        follow an argument to its conclusion, because the conclusion arrives first,
                        in the picture.
                      </p>
                      <p>
                        Park developed this tradition in the specific conditions of South Korean
                        democratisation. His years at the Hankyoreh coincided with the consolidation
                        of direct elections, the lifting of press restrictions, and the emergence of
                        civil society after decades of authoritarian governance. In that context,
                        the decision to draw what others did not — to name what others implied — was
                        itself a political act, not merely a formal one.
                      </p>
                      <p>
                        Beyond the Geurimpan, Park&apos;s engagement with cartooning as social
                        speech continued: he contributed to human-rights cartoon collaborations, and
                        in animation brought a satirical sensibility into a new medium. As a
                        professor at KARTS, he carried the argument — that images can and should
                        hold power to account — into the next generation of Korean artists. His work
                        and his pedagogy are continuous: both insist that the cartoon is not a minor
                        form but a civic one.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박재동의 작업은 시사만화를 시민 제도로 보는 전통에 속한다 — 일간지에서
                        일하는 만화가는 순수미술가나 기사를 쓰는 저널리스트와 구별되는 공적 역할을
                        갖는다는 생각. 이 전통에서 만화는 단 하나의 이미지로 내놓는 판결이다: 독자가
                        논거를 따라가지 않아도 되는 결론이 그림 안에 먼저 도달한다.
                      </p>
                      <p>
                        박재동은 한국 민주화라는 구체적 조건 속에서 이 전통을 발전시켰다. 한겨레
                        재직 시기는 직선제 공고화, 언론 자유화, 수십 년의 권위주의 통치 이후 시민
                        사회의 부상과 겹친다. 그 맥락에서 다른 사람들이 그리지 않은 것을 그리고 —
                        다른 사람들이 암시하는 것을 이름 붙이기로 한 결단은, 단순한 형식적 선택이
                        아니라 그 자체로 정치적 행위였다.
                      </p>
                      <p>
                        「그림판」 이후에도 박재동은 만화를 사회적 발언으로 계속했다: 인권만화
                        협업에 참여하고, 애니메이션이라는 새로운 매체에 풍자적 감수성을 가져갔다.
                        한예종 교수로서는 그 논리 — 이미지는 권력을 책임 물을 수 있고 물어야 한다는
                        — 를 다음 세대 예술인에게 전달했다. 그의 작업과 교육은 연속적이다: 둘 다
                        만화는 부차적 형식이 아니라 시민적 형식이라고 주장한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 애니메이션·미술교육 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Animation, education, and the expanding cartoon'
                    : '애니메이션·교육, 만화의 확장'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Park Jae-dong left the Hankyoreh in 1996 to found the animation company
                        Odolttogi, he was not departing from cartooning — he was taking it somewhere
                        new. Animation, in his understanding, extended what the static editorial
                        cartoon could do: it added time, movement, and sound to the single-frame
                        verdict. His animated editorial segments for weekend news programmes brought
                        political satire into a broadcast context where it had rarely appeared.
                      </p>
                      <p>
                        In 2001, his invitation to join KARTS as a professor in the Animation
                        department formalised a pedagogical role he had been assuming informally for
                        years. At KARTS, one of Korea&apos;s most selective arts institutions, Park
                        brought together his experience as an editorial cartoonist, animator, and
                        travel sketcher into a teaching practice that argued for the social
                        seriousness of drawn images. For students entering a media landscape
                        transformed by digital platforms, his insistence on the cartoon&apos;s civic
                        function was both historical and prospective.
                      </p>
                      <p>
                        His travel sketch books — in particular the{' '}
                        <em>Silk Road Sketch Journey</em> series — show another dimension of his
                        practice: direct observation, the notebook as primary document, the hand as
                        instrument of record. Whether drawing a political leader in caricature or a
                        landscape encountered in travel, the method is consistent: look directly,
                        mark what you see, make the image do the work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1996년 한겨레를 떠나 애니메이션 제작사 오돌또기를 차린 것은, 만화로부터의
                        이탈이 아니었다 — 만화를 새로운 곳으로 가져가는 일이었다. 애니메이션은 그의
                        이해에서 정적인 시사만화가 할 수 있는 것을 확장했다: 한 칸의 판결에 시간,
                        움직임, 소리를 더했다. 주말 뉴스 프로그램의 애니메이션 만평은 정치풍자를
                        거의 등장하지 않았던 방송 맥락으로 가져갔다.
                      </p>
                      <p>
                        2001년 한예종 애니메이션학과 교수로 초빙된 것은, 그가 비공식적으로 수행해 온
                        교육적 역할을 공식화한 것이었다. 한국에서 가장 까다로운 예술대학 중 하나인
                        한예종에서, 박재동은 시사만화가·애니메이터·기행 스케치 작가로서의 경험을
                        그린 이미지의 사회적 진지함을 주장하는 교육 실천으로 모아냈다. 디지털
                        플랫폼이 바꿔놓은 미디어 환경에 진입하는 학생들에게, 만화의 시민적 기능에
                        대한 그의 고집은 역사적인 동시에 전향적이었다.
                      </p>
                      <p>
                        기행 스케치 작업 — 특히 「박재동의 실크로드 스케치 기행」 시리즈 — 은 그의
                        실천의 또 다른 차원을 보여준다: 직접 관찰, 노트북을 1차 기록물로, 손을
                        기록의 도구로 삼는 태도. 정치 지도자를 캐리커처로 그리든 기행에서 만난
                        풍경을 그리든, 방법은 일관하다 — 직접 보고, 보이는 것을 표시하고, 이미지에
                        일을 시켜라.
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
                      From the art classrooms of 1970s Seoul to the founding edition of the
                      Hankyoreh, from the animation studio to the lecture hall at KARTS, Park
                      Jae-dong has pursued the same proposition: that a drawn image, delivered at
                      the right moment, can do what no other form of speech quite can. He joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those who come after might work with the same freedom he defended for
                      others through decades of drawing.
                    </>
                  ) : (
                    <>
                      1970년대 서울의 미술 교실에서 한겨레 창간호까지, 애니메이션 스튜디오에서
                      한예종 강의실까지 — 박재동은 한 가지 명제를 추구해왔다: 적절한 순간에 내놓는
                      그린 이미지는 다른 어떤 발언 형식도 하지 못하는 일을 할 수 있다는 것. 그는
                      씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 수십 년의 작업으로 타인을 위해 지켜온 자유 안에서 다음 세대의 예술인들이
                      일할 수 있도록.
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
                CARTOONS
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Park Jae-dong</span>
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
                    Park Jae-dong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박재동 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_JAEDONG_PATH}
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
