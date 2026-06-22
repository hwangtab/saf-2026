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

// 거장 작가 feature는 작가 페이지(/artworks/artist/류준화)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const RYU_JUNHWA_PATH = `/artworks/artist/${encodeURIComponent('류준화')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isRyuJunhwaArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '류준화' ||
    n === 'ryu jun-hwa' ||
    n === 'ryu junhwa' ||
    n.replace(/[\s-]+/g, '') === 'ryujunhwa'
  );
};

const PAGE_COPY = {
  ko: {
    title: '류준화 — 가려진 여성의 서사를 복원하는 여성주의 미술',
    description:
      '1990년대부터 한국 여성주의 미술의 최전선에서 활동해 온 류준화. 가부장적 사회가 규정한 여성의 역할을 해체하고 남성 중심의 시각 시스템을 전복하며, 페미니스트 그룹 「입김」과 함께 종묘를 «아방궁»으로 재해석했다. 바리데기와 여성 독립운동가의 서사를 복원하는 류준화의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '류준화 — 한국 여성주의 미술의 최전선. 가부장적 시선을 전복하고, 가려졌던 여성의 서사를 복원하는 회복의 예술.',
    ogAlt: '류준화 대표 작품',
    twitterTitle: '류준화',
    twitterDescription: '아방궁과 바리데기 — 가려진 여성의 서사를 복원하다',
    keywords:
      '류준화 작가, 여성주의 미술, 페미니즘 미술, 입김, 아방궁 종묘, 바리데기, 여성 독립운동가, 씨앗페 온라인',
  },
  en: {
    title: 'Ryu Junhwa — Feminist Art That Restores Erased Histories of Women',
    description:
      'Selected works by Ryu Junhwa, who has stood at the forefront of Korean feminist art since the 1990s. Dismantling the roles patriarchy assigned to women and overturning the male-centered system of looking, she reimagined Jongmyo as the «Abang-gung» with the feminist collective Ipgim, and now restores the narratives of Bari and women independence activists. View and collect her works at SAF Online.',
    ogDescription:
      'Ryu Junhwa — at the forefront of Korean feminist art. Overturning the patriarchal gaze, restoring the erased histories of women.',
    ogAlt: 'Ryu Junhwa — featured work',
    twitterTitle: 'Ryu Junhwa',
    twitterDescription: 'Abang-gung and Bari — restoring the erased histories of women',
    keywords:
      'Ryu Junhwa artist, Korean feminist art, feminism, Ipgim, Abang-gung Jongmyo, Bari, women independence activists, SAF Online',
  },
} as const;

export async function buildRyuJunhwaMetadata({
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
  const pageUrl = buildLocaleUrl(RYU_JUNHWA_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('류준화');
  const artwork = allArtworks.find((a) => isRyuJunhwaArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ryu Junhwa`
      : `${artwork.title} — 류준화`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(RYU_JUNHWA_PATH, locale, true),
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

export default async function RyuJunhwaFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(RYU_JUNHWA_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('류준화');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isRyuJunhwaArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Ryu Junhwa' : '류준화', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${RYU_JUNHWA_PATH}#person-ryu-junhwa`,
    name: isEnglish ? 'Ryu Junhwa' : '류준화',
    alternateName: isEnglish ? '류준화' : 'Ryu Junhwa',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Ryu Junhwa has worked at the forefront of Korean feminist art since the 1990s, dismantling the roles patriarchy assigned to women and overturning the male-centered system of looking.'
      : '류준화는 1990년대부터 한국 여성주의 미술의 최전선에서 활동하며, 가부장적 사회가 규정한 여성의 역할을 해체하고 남성 중심의 시각 시스템을 전복해 온 작가입니다.',
    knowsAbout: ['Korean feminist art', 'Feminism', 'Gender and visual culture'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ryu Junhwa — SAF Online' : '류준화 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Ryu Junhwa from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 류준화 작품을 소개합니다.',
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
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Vertical thread lines — 가려진 서사를 다시 엮어 올리는 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Ryu Junhwa · Feminist Art' : '류준화 · 여성주의 미술'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Abang-gung and Bari —
                  <br />
                  <span className="text-primary-soft">restoring the erased</span>
                </>
              ) : (
                <>
                  아방궁과 바리데기 —
                  <br />
                  <span className="text-primary-soft">가려진 서사를 복원하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She seized the gaze that was always presumed to be male.
                  </span>
                  <span className="mt-2 block">
                    At the forefront of Korean feminist art since the 1990s.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">언제나 남성의 것으로 가정되던 시선을 빼앗다.</span>
                  <span className="mt-2 block">1990년대부터 한국 여성주의 미술의 최전선에서.</span>
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
                    Dismantling the gaze —<br />
                    <span className="text-primary-strong">and rebuilding a subject</span>
                  </>
                ) : (
                  <>
                    시선을 해체하고 —<br />
                    <span className="text-primary-strong">새로운 주체를 세우다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Since the 1990s, Ryu Junhwa has worked at the forefront of Korean feminist
                      art. Her practice does not stop at depicting women: it dismantles the roles
                      that a patriarchal society prescribed for them, and makes visible the
                      structures of oppression hidden inside those roles. Hers is an art that
                      challenges social taboos and overturns the male-centered system of looking.
                    </p>
                    <p>
                      Her early work placed on the canvas the realities of women who had become
                      victims of social violence — sexual assault, the sex trade — sounding a heavy
                      alarm in the society of its time. In the Korean word for prostitution,
                      <em> maechun</em>, she fixed her attention not on the act of selling but on
                      the act of buying, emphasizing the responsibility of the men who purchase sex.
                      By reading language and image against the grain, she turned dominant
                      assumptions on their head.
                    </p>
                    <p>
                      Using popular objects such as the Barbie doll, alongside photography and
                      installation, she criticized the double standard that contemporary society
                      forces upon women — the &lsquo;chaste wife&rsquo; and the &lsquo;sexual
                      object&rsquo; at once. She seized the &lsquo;observing gaze&rsquo; that had
                      been conventionally reserved for men and turned men into the object of
                      observation; she rendered, as a ghostly figure, the violence concealed behind
                      the term <em>jipsaram</em> — &lsquo;the person of the house&rsquo; — that
                      erases the individuality of a married woman.
                    </p>
                    <p>
                      Her work did not remain a private act of creation. Through the feminist artist
                      group{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Ipgim (&lsquo;Breath&rsquo;)
                      </strong>
                      , it expanded into a collective voice. The attempt to reinterpret Jongmyo —
                      that patriarchal symbolic space — as the{' '}
                      <strong className="font-bold text-charcoal">
                        Abang-gung, the &lsquo;beautiful, defiant womb&rsquo;
                      </strong>{' '}
                      animated by women&apos;s vitality is regarded as one of the most symbolic and
                      defiant events in the history of Korean feminist art.
                    </p>
                    <p>
                      More recently she has turned to Bari, the abandoned princess of myth, and to
                      women independence activists of history — re-illuminating the narratives of
                      women that a patriarchal view of history had obscured. Ryu Junhwa&apos;s work
                      has moved beyond denouncing past wounds toward excavating forgotten
                      women&apos;s histories and building a new female subjecthood: a process of
                      historical re-illumination.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      류준화는 1990년대부터 한국 여성주의 미술의 최전선에서 활동해 왔다. 그의 작업은
                      단순히 여성을 묘사하는 데 그치지 않는다 — 가부장적 사회가 규정한 여성의 역할을
                      해체하고, 그 속에 감춰진 억압의 굴레를 시각화한다. 사회적 금기에 도전하고 남성
                      중심적인 시각 시스템을 전복하는 예술적 실천이다.
                    </p>
                    <p>
                      초기 작업에서 그는 성폭력이나 성매매와 같은 사회적 폭력의 희생자가 된 여성들의
                      현실을 화폭에 담아내며 당시 사회에 무거운 경종을 울렸다. 특히
                      &lsquo;매춘(賣春)&rsquo;이라는 단어에서 &lsquo;파는 행위&rsquo;가 아닌
                      &lsquo;사는 행위&rsquo;에 주목하여 성을 구매하는 남성의 책임을 강조하는 등,
                      언어와 이미지를 통해 지배적인 통념을 뒤집는 날카로운 통찰을 보여주었다.
                    </p>
                    <p>
                      또한 바비 인형과 같은 대중적 오브제나 사진, 설치 작업을 활용하여 현대 사회가
                      여성에게 강요하는{' '}
                      <strong className="font-bold text-charcoal">
                        &lsquo;정숙한 아내&rsquo;와 &lsquo;성적 대상&rsquo;
                      </strong>
                      이라는 이중적인 잣대를 비판했다. 관습적으로 남성의 전유물이었던 &lsquo;관찰
                      하는 시선&rsquo;을 빼앗아 남성을 관찰의 대상으로 치환하거나, 기혼 여성의
                      개성을 지워버리는 &lsquo;집사람&rsquo;이라는 호칭 뒤에 숨은 폭력성을 유령 같은
                      형상으로 그려내기도 했다.
                    </p>
                    <p>
                      그의 활동은 개인적인 창작에 머물지 않았다. 페미니스트 아티스트 그룹{' '}
                      <strong className="font-bold text-charcoal-deep">「입김」</strong>을 통해
                      공동체적인 목소리로 확장되었다. 종묘라는 가부장적 상징 공간을 여성의 생명력이
                      깃든{' '}
                      <strong className="font-bold text-charcoal">
                        &lsquo;아방궁(아름답고 방자한 자궁)&rsquo;
                      </strong>
                      으로 재해석하려 했던 시도는 한국 여성주의 미술사에서 가장 상징적이고 저항적인
                      사건으로 평가받는다.
                    </p>
                    <p>
                      최근에는 신화 속 바리데기나 역사 속 여성 독립운동가들을 재조명하며, 가부장제
                      역사관에 의해 가려졌던 여성들의 서사를 복원하는 데 주력하고 있다. 류준화의
                      작업은 과거의 상처를 고발하는 것에서 나아가, 잊힌 여성의 역사를 발굴하고
                      새로운 여성 주체성을 세워가는 역사적 재조명의 과정으로 나아가고 있다.
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
                        {isEnglish ? 'Overturning the gaze' : '시선의 전복'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'She seizes the observing gaze long reserved for men and turns men into the object of observation — dismantling the male-centered system of looking.'
                          : '남성의 전유물이던 관찰하는 시선을 빼앗아 남성을 관찰 대상으로 치환한다. 남성 중심의 시각 시스템을 해체하는 작업이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Ipgim and the Abang-gung' : '입김과 아방궁'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Through the feminist collective Ipgim, she reimagined Jongmyo as the «Abang-gung» — regarded as one of the most symbolic, defiant events in Korean feminist art history.'
                          : '페미니스트 그룹 「입김」과 함께 종묘를 «아방궁»으로 재해석한 시도. 한국 여성주의 미술사에서 가장 상징적이고 저항적인 사건으로 평가받는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Restoring erased histories' : '가려진 서사의 복원'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From Bari of myth to women independence activists of history, she recovers the narratives of women obscured by a patriarchal view of history.'
                          : '신화 속 바리데기부터 역사 속 여성 독립운동가까지. 가부장제 역사관에 가려졌던 여성들의 서사를 복원한다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가의 주제적 궤적 — DB history 부재로 연도 타임라인 대신 주제 흐름으로 구성 */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'The arc of the work' : '작업의 궤적'}
                </h3>
                <ol className="space-y-5">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-sm tabular-nums w-20 uppercase tracking-wide">
                      {isEnglish ? '1990s–' : '1990년대–'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Steps to the forefront of Korean feminist art; confronts the realities of women made victims of social violence.'
                        : '한국 여성주의 미술의 최전선에 서다. 사회적 폭력의 희생자가 된 여성들의 현실을 화폭에 담다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-sm tabular-nums w-20 uppercase tracking-wide">
                      {isEnglish ? 'Language' : '언어'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Reads maechun against the grain — the act of buying, not selling — to name the buyer’s responsibility.'
                        : '‘매춘’을 거슬러 읽다 — 파는 행위가 아닌 사는 행위로. 구매하는 남성의 책임을 묻다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-sm tabular-nums w-20 uppercase tracking-wide">
                      {isEnglish ? 'Object' : '오브제'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Barbie dolls, photography, installation — critiquing the double bind of the ‘chaste wife’ and the ‘sexual object.’'
                        : '바비 인형, 사진, 설치 — ‘정숙한 아내’와 ‘성적 대상’의 이중 잣대를 비판하다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-sm tabular-nums w-20 uppercase tracking-wide">
                      {isEnglish ? 'Ipgim' : '입김'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'With the feminist collective Ipgim, reinterprets Jongmyo as the «Abang-gung» — a collective, defiant voice.'
                        : '페미니스트 그룹 「입김」과 함께 종묘를 «아방궁»으로 재해석하다. 공동체적이고 저항적인 목소리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-sm tabular-nums w-20 uppercase tracking-wide">
                      {isEnglish ? 'Recent' : '최근'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Re-illuminates Bari of myth and women independence activists, restoring narratives obscured by patriarchal history.'
                        : '신화 속 바리데기와 역사 속 여성 독립운동가를 재조명하며, 가부장제 역사관에 가려졌던 서사를 복원하다.'}
                    </span>
                  </li>
                </ol>
                <p className="mt-6 pt-4 border-t border-charcoal/15 text-charcoal-soft text-sm leading-relaxed break-keep">
                  {isEnglish
                    ? 'This arc traces themes within the artist’s practice; specific dates and venues are noted only where independently documented.'
                    : '위 궤적은 작가의 작업 세계를 주제 중심으로 정리한 것으로, 연도·장소는 별도로 확인된 경우에만 표기했습니다.'}
                </p>
              </div>

              {/* 입김 / 아방궁 — 미술사적 사건으로서의 공동체 작업 */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Ipgim and the Abang-gung project' : '입김과 아방궁 프로젝트'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ipgim (‘Breath’) — a feminist artist collective through which Ryu Junhwa’s practice expanded into a shared, communal voice.'
                        : '「입김」 — 류준화의 작업이 공동체적 목소리로 확장된 페미니스트 아티스트 그룹.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          The{' '}
                          <a
                            href="https://sema.seoul.go.kr/semaaa/front/jungu/searchView.do?authId=36"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            «Abang-gung Jongmyo Occupation Project»
                          </a>{' '}
                          reimagined the patriarchal symbolic space of Jongmyo as a site animated by
                          women&apos;s vitality.
                        </>
                      ) : (
                        <>
                          가부장적 상징 공간 종묘를 여성의 생명력이 깃든 장으로 전복한{' '}
                          <a
                            href="https://sema.seoul.go.kr/semaaa/front/jungu/searchView.do?authId=36"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            «아방궁 종묘 점거 프로젝트»
                          </a>
                          .
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Regarded as one of the most symbolic and defiant events in the history of Korean feminist art.'
                        : '한국 여성주의 미술사에서 가장 상징적이고 저항적인 사건으로 평가받는다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'In recent work, Bari of myth and women independence activists become figures of historical recovery.'
                        : '최근 작업에서는 신화 속 바리데기와 여성 독립운동가가 역사 복원의 주체로 등장한다.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 신학철 패턴 차용, 류준화 여성주의 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its stakes</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 쟁점에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 시선을 빼앗다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Seizing the gaze — overturning the male-centered system of looking'
                    : '시선을 빼앗다 — 남성 중심 시각 시스템의 전복'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        At the center of Ryu Junhwa&apos;s practice is a question about who is
                        permitted to look. In the inherited grammar of Western and Korean
                        image-making alike, the observing gaze had long been presumed to belong to
                        men, while women appeared as that which is looked at. Her work refuses this
                        arrangement: it seizes the &lsquo;observing gaze&rsquo; and turns men into
                        the object of observation.
                      </p>
                      <p>
                        This is not a reversal for its own sake but a way of making the structure
                        visible. By critiquing the double bind that society forces upon women — the
                        &lsquo;chaste wife&rsquo; and the &lsquo;sexual object&rsquo; held at once —
                        she exposes how a single system can demand opposite things of the same
                        person. The work treats the gaze itself as a political instrument, and
                        reassigns it.
                      </p>
                      <p>
                        Across painting, photography, and installation, the consistent strategy is
                        to challenge social taboo head-on. The practice does not merely represent
                        women; it intervenes in the very apparatus through which women have been
                        represented.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        류준화 작업의 중심에는 &lsquo;누가 볼 권리를 갖는가&rsquo;라는 물음이 있다.
                        서양과 한국의 이미지 문법 모두에서, 관찰하는 시선은 오랫동안 남성의 것으로
                        가정되었고 여성은 보이는 대상으로 등장했다. 그의 작업은 이 배치를 거부한다 —
                        관찰하는 시선을 빼앗아 남성을 관찰의 대상으로 치환한다.
                      </p>
                      <p>
                        이는 단순한 역전을 위한 역전이 아니라 구조를 가시화하는 방법이다. 사회가
                        여성에게 강요하는 &lsquo;정숙한 아내&rsquo;와 &lsquo;성적 대상&rsquo;이라는
                        이중 잣대를 비판함으로써, 하나의 시스템이 같은 사람에게 어떻게 정반대의 것을
                        요구하는지를 드러낸다. 그의 작업은 시선 자체를 정치적 도구로 다루고, 그것을
                        다시 배분한다.
                      </p>
                      <p>
                        회화·사진·설치를 가로지르며 일관된 전략은 사회적 금기에 정면으로 도전하는
                        것이다. 그의 작업은 여성을 재현하는 데 그치지 않고, 여성이 재현되어 온 그
                        장치 자체에 개입한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 입김과 아방궁 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Ipgim and the Abang-gung — a collective, defiant voice'
                    : '입김과 아방궁 — 공동체적이고 저항적인 목소리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Ryu Junhwa&apos;s practice did not remain private. Through the feminist
                        artist group <strong className="font-bold text-charcoal-deep">Ipgim</strong>{' '}
                        it expanded into a shared voice — the work of building, exhibiting, and
                        acting together rather than alone.
                      </p>
                      <p>
                        Its most resonant gesture was the attempt to reinterpret Jongmyo — the royal
                        ancestral shrine, a dense symbol of patriarchal order — as the{' '}
                        <a
                          href="https://sema.seoul.go.kr/semaaa/front/jungu/searchView.do?authId=36"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary-strong"
                        >
                          «Abang-gung», the &lsquo;beautiful, defiant womb&rsquo;
                        </a>
                        : a space animated, instead, by women&apos;s vitality. To stage a feminist
                        art festival in the shadow of that shrine was to set Confucian solemnity and
                        a feminist concept of liberation in maximal tension.
                      </p>
                      <p>
                        This is why the project is regarded as one of the most symbolic and defiant
                        events in the history of Korean feminist art. It transformed an established
                        historical and cultural site into a space of contemporary art — and it did
                        so collectively, as a festival of sharing rather than a single author&apos;s
                        statement.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        류준화의 작업은 개인에 머물지 않았다. 페미니스트 아티스트 그룹{' '}
                        <strong className="font-bold text-charcoal-deep">「입김」</strong>을 통해
                        공동의 목소리로 확장되었다 — 홀로가 아니라 함께 짓고, 전시하고, 행동하는
                        작업으로.
                      </p>
                      <p>
                        그 가장 울림 있는 몸짓은 종묘 — 가부장적 질서의 농밀한 상징인 왕가의 사당 —
                        를{' '}
                        <a
                          href="https://sema.seoul.go.kr/semaaa/front/jungu/searchView.do?authId=36"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary-strong"
                        >
                          여성의 생명력이 깃든 «아방궁(아름답고 방자한 자궁)»
                        </a>
                        으로 재해석하려 한 시도였다. 그 사당의 그늘에서 여성주의 미술 축제를 여는
                        일은, 유교적 엄숙주의와 여성주의적 해방 개념을 최대치의 긴장 속에 놓는
                        일이었다.
                      </p>
                      <p>
                        이 시도가 한국 여성주의 미술사에서 가장 상징적이고 저항적인 사건으로
                        평가받는 이유다. 기존의 역사적·문화적 공간을 현대 미술의 공간으로
                        변화시켰고, 그것을 한 작가의 선언이 아니라 나눔의 축제로서 공동으로 해냈다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 바리데기와 역사의 복원 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Bari and the recovery of history — from accusation to restoration'
                    : '바리데기와 역사의 복원 — 고발에서 복원으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        If the early work sounded an alarm about present violence, the recent work
                        turns toward what was lost. Ryu Junhwa re-illuminates Bari — the princess of
                        Korean myth, abandoned for being born a daughter, who nonetheless journeys
                        to the underworld to save those who cast her out — and the women
                        independence activists whom a patriarchal account of history left in shadow.
                      </p>
                      <p>
                        These figures are not chosen for nostalgia. They are chosen because their
                        narratives were obscured — written out of the record kept by a patriarchal
                        view of history. To paint them is to perform an act of restoration: to
                        excavate forgotten histories of women and to build, from them, a new female
                        subjecthood.
                      </p>
                      <p>
                        In this way her practice has moved beyond denouncing past wounds toward a
                        process of historical re-illumination. The accusation of the early work and
                        the recovery of the recent work are two halves of one project — to make the
                        erased visible, and to let it speak.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        초기 작업이 현재의 폭력에 경종을 울렸다면, 최근 작업은 잃어버린 것을 향한다.
                        류준화는 바리데기 — 딸로 태어났다는 이유로 버려졌으나 자신을 버린 이들을
                        구하기 위해 저승으로 떠나는 한국 신화 속 공주 — 와, 가부장제 역사 서술이
                        그늘에 남겨둔 여성 독립운동가들을 재조명한다.
                      </p>
                      <p>
                        이 인물들은 향수를 위해 선택된 것이 아니다. 그들의 서사가 가려졌기에 —
                        가부장제 역사관이 기록에서 지워냈기에 — 선택되었다. 그들을 그리는 일은
                        복원의 행위다: 잊힌 여성의 역사를 발굴하고, 그로부터 새로운 여성 주체성을
                        세우는 일.
                      </p>
                      <p>
                        이렇게 그의 작업은 과거의 상처를 고발하는 데서 나아가 역사적 재조명의
                        과정으로 향한다. 초기 작업의 고발과 최근 작업의 복원은 하나의 기획의 두
                        절반이다 — 가려진 것을 보이게 하고, 그것이 말하게 하는 일.
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
                      From the early canvases that named present violence to the recent work that
                      restores erased histories, Ryu Junhwa&apos;s practice has pursued a single
                      question: who is permitted to look, to speak, to be remembered? She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that the women who come after might work, and be seen, on their own terms.
                    </>
                  ) : (
                    <>
                      현재의 폭력을 호명한 초기 화면에서 가려진 역사를 복원하는 최근 작업까지,
                      류준화의 작업은 하나의 물음을 추구해 왔다: 누가 볼 권리를, 말할 권리를, 기억될
                      권리를 갖는가. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 다음 세대의 여성 예술인들이 자신의 언어로 일하고, 보여질 수 있도록.
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
                    점의 작품을 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Ryu Junhwa</span>
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
                    Ryu Junhwa joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    류준화 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={RYU_JUNHWA_PATH}
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
