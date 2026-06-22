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

// 거장 작가 feature는 작가 페이지(/artworks/artist/류연복)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const RYU_YEONBOK_PATH = `/artworks/artist/${encodeURIComponent('류연복')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isRyuYeonbokArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '류연복' ||
    n === 'ryu yeonbok' ||
    n === 'ryu yeon-bok' ||
    n.replace(/[\s-]+/g, '') === 'ryuyeonbok'
  );
};

const PAGE_COPY = {
  ko: {
    title: '류연복 — 칼로 새긴 민중의 삶과 국토의 영혼',
    description:
      '목판화가 류연복(1958–). 홍익대 회화과를 나와 1980년대 민중판화 운동에 참여했고, 1993년 안성에 자리 잡은 이후 백두산·독도·금강산·DMZ 등 국토를 몸소 순례하며 칼로 새긴 산천과 생명의 목판화를 작업해왔다. 씨앗페 온라인에서 류연복의 작품을 만날 수 있습니다.',
    ogDescription:
      '목판화가 류연복. 칼로 새긴 민중과 국토 — 1980년대 민중판화 운동에서 안성의 자연·생명 연작까지, 한국 목판화의 중요한 한 축.',
    ogAlt: '류연복 대표 목판화 작품',
    twitterTitle: '류연복',
    twitterDescription: '칼이 지나간 자리에 사람이 산다 — 목판화가 류연복',
    keywords:
      '류연복 판화가, 류연복 목판화, 민중판화, 한국목판화, 국토 목판화, 씨앗페 온라인, 한국현대목판화협회',
  },
  en: {
    title: 'Ryu Yeonbok — Korean Woodblock Master of Land and People',
    description:
      'Selected works by Ryu Yeonbok (b. 1958), Korean woodblock printmaker. A graduate of Hongik University, he participated in the minjung printmaking movement of the 1980s. Since settling in Anseong in 1993, he has carved the Korean landscape — Baekdusan, Dokdo, Geumgangsan, the DMZ — onto wood, producing a body of work rooted in land and life. View his works at SAF Online.',
    ogDescription:
      'Ryu Yeonbok — Korean woodblock printmaker. From the minjung movement of the 1980s to meditations on land and life carved at his Anseong studio.',
    ogAlt: 'Ryu Yeonbok — featured woodblock print',
    twitterTitle: 'Ryu Yeonbok',
    twitterDescription: 'Where the blade has passed, people live — woodblock master Ryu Yeonbok',
    keywords:
      'Ryu Yeonbok printmaker, Korean woodblock, minjung art, Korean contemporary printmaking, landscape woodcut',
  },
} as const;

export async function buildRyuYeonbokMetadata({
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
  const pageUrl = buildLocaleUrl(RYU_YEONBOK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('류연복');
  const artwork = allArtworks.find((a) => isRyuYeonbokArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ryu Yeonbok`
      : `${artwork.title} — 류연복`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(RYU_YEONBOK_PATH, locale, true),
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

export default async function RyuYeonbokFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(RYU_YEONBOK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('류연복');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isRyuYeonbokArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Ryu Yeonbok' : '류연복', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${RYU_YEONBOK_PATH}#person-ryu-yeonbok`,
    name: isEnglish ? 'Ryu Yeonbok' : '류연복',
    alternateName: isEnglish ? '류연복' : 'Ryu Yeonbok',
    jobTitle: isEnglish ? 'Printmaker' : '판화가',
    description: isEnglish
      ? 'Ryu Yeonbok (b. 1958) is a Korean woodblock printmaker. He studied painting at Hongik University and participated in the minjung printmaking movement of the 1980s. Since 1993, based in Anseong, he has carved the Korean landscape and the rhythms of life onto wood.'
      : '류연복(1958–)은 한국의 목판화가다. 홍익대 회화과를 졸업하고 1980년대 민중판화 운동에 참여했다. 1993년 안성에 정착한 이후 국토의 산천과 생명의 결을 나무판에 새기는 작업을 이어오고 있다.',
    birthDate: '1958',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Painting' : '홍익대학교 회화과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish
        ? 'Korean Contemporary Woodblock Printmakers Association'
        : '한국현대목판화협회',
    },
    knowsAbout: ['Korean woodblock printmaking', 'Minjung art', 'Korean landscape printmaking'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ryu Yeonbok — SAF Online' : '류연복 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected woodblock prints by Ryu Yeonbok from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 류연복 작품을 소개합니다.',
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
        {/* Hero Section — 목판 나뭇결·칼선 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Wood-grain line motif — 나뭇결을 암시하는 수평·대각선들 */}
          <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-[30%] left-0 w-full h-px bg-white/5" />
          <div className="absolute top-[60%] left-0 w-full h-px bg-white/5" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-white/10" />
          {/* Blade-diagonal accent */}
          <div className="absolute top-0 left-[15%] h-full w-px bg-white/8 rotate-[2deg]" />
          <div className="absolute top-0 right-[20%] h-full w-px bg-white/5 -rotate-[1.5deg]" />
          <div className="absolute top-0 left-[40%] h-full w-px bg-white/5 rotate-[1deg]" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Ryu Yeonbok · 1958–' : '류연복 · 1958–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Where the blade has passed,
                  <br />
                  <span className="text-primary-soft">people live</span>
                </>
              ) : (
                <>
                  칼이 지나간 자리에
                  <br />
                  <span className="text-primary-soft">사람이 산다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He carves the mountains, rivers, and people of Korea onto wood.
                  </span>
                  <span className="mt-2 block">
                    A blade, a block, a life — Korean woodblock printmaking rooted in land and
                    solidarity.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한국의 산과 강과 사람을 나무판에 새기는 목판화가.</span>
                  <span className="mt-2 block">
                    칼 한 자루, 나무 한 판, 한 생애 — 국토와 연대에 뿌리내린 한국 목판화.
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
                    The wood remembers —<br />
                    <span className="text-primary-strong">
                      a printmaker who carves Korea into being
                    </span>
                  </>
                ) : (
                  <>
                    나무는 기억한다 —<br />
                    <span className="text-primary-strong">한국을 새기는 목판화가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Ryu Yeonbok (b. 1958) studied painting at Hongik University before discovering
                      that the woodblock — its resistance, its grain, its demand for commitment —
                      was the medium that matched his temperament and his times. He came of age as
                      an artist in the 1980s, when South Korea&apos;s democratic movement was at its
                      most urgent, and woodblock printmaking had become, for many artists, not
                      merely a technique but a form of public speech.
                    </p>
                    <p>
                      Through the 1980s and into the mid-1990s, Ryu participated in the minjung
                      (people&apos;s) printmaking movement — contributing to wall painting projects
                      and scroll paintings that carried the voice of ordinary Koreans into public
                      space. In this tradition, the woodblock was not a studio object but a social
                      instrument: multiple impressions from a single block meant art that could be
                      distributed, posted, shared. The blade, in this context, was a form of
                      commitment — what you carved could not be erased.
                    </p>
                    <p>
                      In 1993, Ryu left the city and settled in Anseong, a rural town in Gyeonggi
                      province, where he has remained ever since. The move was not a retreat from
                      subject matter but a shift in its register. Where the 1980s work had addressed
                      the social and political directly, his subsequent practice turned toward a
                      longer time scale — land, seasons, life itself. He began to travel the Korean
                      peninsula systematically, accumulating sketchbooks from Baekdusan, Dokdo,
                      Geumgangsan, and the DMZ, and returning to his studio to carve those
                      landscapes into wood.
                    </p>
                    <p>
                      The process — sketching in the field, then carving, printing, re-carving,
                      printing again — enacts a kind of double attention: the eye that reads the
                      land, and the hand that interprets it through resistance. Wood does not
                      surrender to the blade passively; the grain pushes back, proposes
                      alternatives, forces decisions. Ryu has described his approach to woodcutting
                      as akin to poetry — shaping and emptying, choosing what to leave and what to
                      remove until the essential image remains.
                    </p>
                    <p>
                      His work has also been introduced internationally — his woodblock prints are
                      noted as having been featured in <em>Azalea</em>, the Harvard journal of
                      Korean literature and culture (2008), and he is reported to have lectured and
                      exhibited at the College of Fine Arts and Design, University of Sharjah, UAE
                      (2009) — an occasion that demonstrated the legibility of his distinctly Korean
                      sensibility beyond Korean borders. He is a member of the Korean Contemporary
                      Woodblock Printmakers Association and participated in the association&apos;s
                      2026 member exhibition, <em>Asking the Tree</em> (나무에게 묻는다). He was
                      also included in{' '}
                      <em>
                        각인(刻印) — 100 Years of Korean Modern and Contemporary Woodblock
                        Printmaking
                      </em>
                      , a major survey held at Gyeongnam Art Museum (2021–2022).
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      류연복(1958–)은 홍익대 회화과에서 그림을 공부하다 목판이라는 매체를 만났다 —
                      저항, 나뭇결, 결단을 요구하는 그 매체가 자신의 기질과 시대에 맞는다는 것을.
                      그는 1980년대 한국 민주화 운동이 가장 격렬하던 시기에 예술가로 성장했고, 그
                      시절 목판화는 많은 작가들에게 기법이 아니라 공적 발언의 형식이었다.
                    </p>
                    <p>
                      1980년대부터 1990년대 중반까지 류연복은 민중판화 운동에 참여했다 — 벽화 작업과
                      걸개그림으로 평범한 한국인들의 목소리를 공공 공간에 내걸었다. 이 전통에서
                      목판화는 스튜디오의 사물이 아니라 사회적 도구였다: 하나의 판에서 여러 장을
                      찍을 수 있다는 것은 예술이 배포되고, 게시되고, 공유될 수 있다는 의미였다. 칼은
                      그 맥락에서 하나의 약속이었다 — 새긴 것은 지워지지 않는다.
                    </p>
                    <p>
                      1993년, 류연복은 도시를 떠나 경기도 안성에 자리를 잡았고 지금껏 그곳에 있다.
                      그것은 주제로부터의 후퇴가 아니라 음조의 변화였다. 1980년대의 작업이 사회·정치
                      현실을 직접 다뤘다면, 이후의 작업은 더 긴 시간의 눈금으로 방향을 틀었다 — 땅,
                      계절, 생명 그 자체. 그는 한반도를 체계적으로 순례하기 시작했다 — 백두산, 독도,
                      금강산, DMZ를 돌며 화첩에 담고, 작업실에 돌아와 그 풍경들을 나무판에 새겼다.
                    </p>
                    <p>
                      현장 스케치, 칼로 새기기, 찍어내기, 다시 도려내기, 다시 찍어내기 — 이 과정은
                      이중의 주의를 실천한다: 땅을 읽는 눈과, 저항을 통해 해석하는 손. 나무는 칼에
                      수동적으로 굴복하지 않는다. 나뭇결은 밀어내고, 대안을 제안하며, 결정을
                      강요한다. 류연복은 목판 작업을 시와 같다고 말해왔다 — 형태를 빚고 비워내며,
                      무엇을 남기고 무엇을 제거할지 선택하다 보면 본질적인 이미지가 남는다.
                    </p>
                    <p>
                      그의 작업은 국제적으로도 소개되었다. 하버드대학의 한국 문학·문화 학술지{' '}
                      <em>Azalea(진달래)</em>(2008)에 목판화가 수록된 것으로 알려져 있고, 2009년에는
                      아랍에미리트 샤자대학교 미술대학에서 강의와 전시를 연 것으로 전해진다. 지극히
                      한국적인 그의 감성이 국경 너머로 읽힌다는 것을 증명했다. 한국현대목판화협회
                      회원으로 활동하며 협회의 2026년 회원전 《나무에게 묻는다》에 참여했고,
                      경남도립미술관에서 열린 주요 개관전 《각인(刻印)—한국근현대목판화
                      100년》(2021–2022)에도 이름을 올렸다.
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
                  {isEnglish ? 'What the blade does' : '칼이 하는 일'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The land as subject' : '국토를 주제로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Ryu's systematic journeys to Baekdusan, Dokdo, Geumgangsan, and the DMZ transformed field sketches into woodblock prints — making the act of traversing Korea's territory into an artistic practice rooted in physical encounter."
                          : '백두산·독도·금강산·DMZ를 몸소 순례하며 쌓은 스케치들이 목판화로 이어진다 — 국토를 직접 건너는 행위 자체가 신체적 만남에 뿌리내린 예술 실천이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Carving as commitment' : '새김의 약속'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Unlike a brushstroke, a woodcut is irreversible. The resistance of the grain — what Ryu describes as an exchange akin to poetry — forces choices that cannot be undone. What remains after carving is what the artist truly decided to say.'
                          : '붓 자국과 달리 목판의 칼선은 되돌릴 수 없다. 나뭇결의 저항 — 류연복이 시와 같다고 말하는 그 교환 — 은 취소할 수 없는 선택을 강요한다. 새긴 뒤에 남는 것이 작가가 진정으로 말하기로 한 것이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'People and solidarity' : '민중과 연대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "From the minjung movement of the 1980s to his current work, Ryu's prints have never left people behind. Landscapes contain the evidence of lives lived on them; life-forms share the frame with mountains. The wood remembers both."
                          : '1980년대 민중판화 운동에서 현재의 작업까지, 류연복의 판화에는 사람이 빠진 적 없다. 풍경에는 그 위에서 살아온 삶의 흔적이 담겨 있고, 생명체는 산과 같은 화면을 나눈다. 나무는 둘 다 기억한다.'}
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
                      1958
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Korea.' : '출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1980년대
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Dept. of Painting; participates in the minjung printmaking movement — wall painting and scroll painting projects.'
                        : '홍익대 회화과 졸업. 민중판화 운동 참여 — 벽화·걸개그림 작업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1993
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Settles in Anseong, Gyeonggi province; begins sustained practice carving the Korean landscape and life onto woodblocks.'
                        : '경기도 안성에 정착. 국토와 생명을 주제로 한 목판화 작업 본격화.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000년대–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Undertakes field journeys to Baekdusan, Dokdo, Geumgangsan, DMZ and surrounding territories; translates sketches into large-scale woodblock prints.'
                        : '백두산·독도·금강산·DMZ 등 국토 현장 순례 및 스케치 수집. 대형 목판화 작업으로 이어짐.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Woodblock prints featured in Azalea — Journal of Korean Literature & Culture (Harvard University).'
                        : '하버드대 한국 문학·문화 학술지 《Azalea(진달래)》에 목판화 수록.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lectures and solo exhibition at College of Fine Arts & Design, University of Sharjah, UAE.'
                        : '아랍에미리트 샤자대학교 미술대학에서 강의 및 전시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021–22
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Included in 각인(刻印) — 100 Years of Korean Modern & Contemporary Woodblock Printmaking, Gyeongnam Art Museum.'
                        : '경남도립미술관 《각인(刻印)—한국근현대목판화 100년》 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in Korean Contemporary Woodblock Printmakers Association member exhibition Asking the Tree (나무에게 묻는다); joins SAF Online in solidarity with fellow artists.'
                        : '한국현대목판화협회 회원전 《나무에게 묻는다》 참여. 동료 예술인과의 연대로 씨앗페 온라인 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* Exhibitions / collections card */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & publications' : '주요 전시 및 게재'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <em>
                            각인(刻印) — 100 Years of Korean Modern &amp; Contemporary Woodblock
                            Printmaking
                          </em>
                          , Gyeongnam Art Museum (Oct 2021 – Feb 2022)
                        </>
                      ) : (
                        <>《각인(刻印)—한국근현대목판화 100년》, 경남도립미술관 (2021.10–2022.02)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Korean Contemporary Woodblock Printmakers Association — 2026 Member
                          Exhibition <em>Asking the Tree</em> (나무에게 묻는다)
                        </>
                      ) : (
                        <>한국현대목판화협회 2026 회원전 《나무에게 묻는다》</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Woodblock prints featured in{' '}
                          <em>Azalea — Journal of Korean Literature &amp; Culture</em>, Harvard
                          University (2008)
                        </>
                      ) : (
                        <>
                          하버드대 《Azalea — Journal of Korean Literature &amp; Culture》 목판화
                          게재 (2008)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Lecture &amp; exhibition, College of Fine Arts &amp; Design, University of
                          Sharjah, UAE (2009)
                        </>
                      ) : (
                        <>아랍에미리트 샤자대학교 미술대학 강의 및 전시 (2009)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>Member, Korean Contemporary Woodblock Printmakers Association</>
                      ) : (
                        <>한국현대목판화협회 회원</>
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
                  <span className="text-charcoal-deep">on the blade, the land, and the people</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">칼과 국토와 민중에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 칼로 새긴 민중의 삶 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'The blade as people’s voice' : '칼로 새긴 민중의 삶'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the 1980s, Korean woodblock printmaking was not primarily a medium of
                        gallery art. It was a medium of circulation: prints could be run in quantity
                        from a single block, posted on walls, distributed through movement networks,
                        folded into pamphlets. For artists involved in the minjung movement —
                        committed to making art that spoke to and for ordinary Koreans — this
                        multiplicity was not incidental but essential.
                      </p>
                      <p>
                        Ryu Yeonbok entered this practice in that context. The subjects of his early
                        work were drawn from the lives and struggles of the people around him, and
                        the making process — carving into wood, removing what was unnecessary,
                        inking and pressing — enacted a kind of discipline: each mark was a
                        decision, irreversible, bearing full weight. Wall paintings and scroll
                        paintings took this public character further, placing images in the spaces
                        where people gathered, worked, and protested.
                      </p>
                      <p>
                        What distinguished this tradition from mere agitprop was the quality of
                        attention it demanded. To carve a face, a hand, a figure in labour, the
                        artist had to study it — to understand the form well enough to translate it
                        into the resistance of wood grain. The blade pressed against the material
                        asked the same question that good portraiture always asks: what is essential
                        here? What, if removed, would mean that the person is gone?
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1980년대 한국의 목판화는 주로 갤러리 예술의 매체가 아니었다. 유통의
                        매체였다: 하나의 판에서 여러 장을 찍어낼 수 있고, 벽에 붙이고, 운동
                        네트워크를 통해 배포하고, 팸플릿 안에 접어 넣을 수 있었다. 민중운동에 참여한
                        작가들 — 평범한 한국인들에게, 그리고 그들을 위해 말하는 예술을 만들겠다고
                        뜻을 모은 — 에게 이 복수성(multiplicity)은 부수적인 것이 아니라 본질이었다.
                      </p>
                      <p>
                        류연복은 그 맥락에서 이 실천에 참여했다. 초기 작업의 주제들은 주변 사람들의
                        삶과 투쟁에서 왔고, 제작 과정 — 나무에 새기고, 불필요한 것을 제거하고,
                        잉크를 묻혀 찍어내는 — 은 하나의 규율을 실천했다: 모든 흔적이 결정이고,
                        취소할 수 없으며, 전체 무게를 진다. 벽화와 걸개그림은 이 공공성을 더
                        나아가게 했다 — 사람들이 모이고, 일하고, 저항하는 공간에 이미지를 놓았다.
                      </p>
                      <p>
                        이 전통을 단순한 선전 예술과 구별하는 것은 그것이 요구하는 주의(注意)의
                        질이었다. 얼굴 하나, 손 하나, 노동하는 몸 하나를 새기려면 작가는 그것을
                        연구해야 했다 — 나뭇결의 저항으로 번역하기에 충분할 만큼 형태를 이해해야
                        했다. 재료에 맞서는 칼은 좋은 초상화가 언제나 묻는 것과 같은 질문을 물었다:
                        여기서 본질적인 것은 무엇인가? 무엇을 제거하면 그 사람이 사라지는가?
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 국토·자연의 목판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The Korean land carved in wood' : '국토·자연의 목판'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Since settling in Anseong in 1993, Ryu Yeonbok has pursued a sustained
                        engagement with the Korean landscape — not as scenic background but as
                        subject in its own right, carrying historical, political, and ecological
                        weight. His journeys to Baekdusan, Dokdo, Geumgangsan, and the DMZ were not
                        tourist visits but artistic pilgrimages: the sketchbook accumulated in the
                        field became the source material from which woodblocks were carved.
                      </p>
                      <p>
                        The landscapes that result are not straightforwardly documentary. The
                        process of carving imposes interpretation: to translate a mountain seen in
                        the field into the grain of a wood block, the artist must decide what
                        belongs to the essential form of that mountain and what does not. The DMZ
                        prints carry the weight of division; the Baekdusan images carry the weight
                        of longing for a unified Korea; the Dokdo works carry the weight of
                        contested sovereignty. The land, for Ryu, is never politically neutral —
                        because Korean land never has been.
                      </p>
                      <p>
                        At the same time, since Anseong, his practice has opened toward the
                        biological: insects, plants, the textures of soil and bark, the rhythms of
                        seasons. This is not a departure from the political but an extension of it —
                        an insistence that the life of the land is also the life of the people who
                        inhabit it, and that to carve it with care is already an ethical act.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1993년 안성에 정착한 이후 류연복은 한국의 국토와 지속적인 관계를 맺어왔다 —
                        풍경적 배경이 아니라 역사적·정치적·생태적 무게를 담은 주제 그 자체로.
                        백두산·독도· 금강산·DMZ 순례는 관광이 아니라 예술적 순례였다: 현장에서 쌓인
                        화첩이 목판화의 원재료가 됐다.
                      </p>
                      <p>
                        이 과정에서 탄생하는 풍경화는 단순한 기록이 아니다. 새기는 행위는 해석을
                        강제한다: 현장에서 본 산을 나뭇결로 번역하려면 작가는 그 산의 본질적 형태에
                        속하는 것과 아닌 것을 결정해야 한다. DMZ 목판화는 분단의 무게를 담고, 백두산
                        작업은 통일의 염원을 담으며, 독도 작업은 주권의 무게를 진다. 류연복에게
                        국토는 결코 정치적으로 중립이지 않다 — 왜냐하면 한국의 땅은 결코 그런 적이
                        없기 때문이다.
                      </p>
                      <p>
                        동시에 안성 이후의 작업은 생물학적인 것들을 향해 열려왔다: 곤충, 식물, 흙과
                        나무껍질의 결, 계절의 리듬. 이것은 정치로부터의 이탈이 아니라 그것의
                        확장이다 — 땅의 생명이 곧 그 땅에 사는 사람들의 생명이라는 주장, 그것을
                        정성스럽게 새기는 것 자체가 이미 윤리적 행위라는 주장.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 1980년대 민중판화 운동 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'The 1980s minjung printmaking movement' : '1980년대 민중판화 운동'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The minjung art movement emerged in South Korea in the early 1980s, as
                        artists responded to military rule and the suppression of civil society by
                        making art that was explicitly political and oriented toward a popular
                        audience. Printmaking — especially woodblock — became one of the
                        movement&apos;s primary media, for practical as much as aesthetic reasons:
                        prints were reproducible, transportable, and could be produced without
                        gallery infrastructure.
                      </p>
                      <p>
                        Ryu Yeonbok&apos;s participation in this movement placed him in a generation
                        of Korean artists who understood art-making as inseparable from social
                        commitment. Wall paintings and scroll paintings were collective projects,
                        often created collaboratively and displayed publicly — in factories, on
                        university campuses, in the streets during protests. The scale demanded by
                        these formats challenged the woodblock&apos;s normal intimacy, expanding the
                        medium into something monumental.
                      </p>
                      <p>
                        The movement&apos;s legacies are multiple. It established woodblock
                        printmaking as a significant strand of Korean contemporary art. It produced
                        a generation of artists — among them Ryu — who had learned to work with
                        urgency and with an audience in mind. And it forged a connection between
                        Korean printmaking and the conditions of ordinary Korean life that
                        Ryu&apos;s subsequent landscape work would deepen, rather than abandon. The
                        land he carved after 1993 was the same land the movement had argued belonged
                        to everyone.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민중미술 운동은 1980년대 초 한국에서 군사 통치와 시민 사회 억압에 대응하여
                        등장했다 — 명시적으로 정치적이며 대중을 향한 예술을 만들기 위해. 판화, 특히
                        목판화는 실용적인 이유 못지않게 미학적 이유에서 운동의 주요 매체 중 하나가
                        됐다: 복수 찍기가 가능하고, 이동이 용이하며, 갤러리 인프라 없이도 제작할 수
                        있었다.
                      </p>
                      <p>
                        류연복의 참여는 그를 예술 제작과 사회적 헌신을 불가분하게 이해한 한국 예술가
                        세대에 자리 잡게 했다. 벽화와 걸개그림은 집단적 프로젝트였고, 종종 협력으로
                        제작되어 공장·대학 캠퍼스·저항 시위 현장에서 공개적으로 걸렸다. 이 형식들이
                        요구하는 규모는 목판의 일반적인 내밀함에 도전해 매체를 기념비적인 무언가로
                        확장했다.
                      </p>
                      <p>
                        이 운동의 유산은 다층적이다. 목판화를 한국 현대미술의 중요한 흐름으로
                        확립시켰다. 긴박함과 관객을 의식하며 작업하는 법을 배운 작가들 — 류연복을
                        포함해 — 의 세대를 길러냈다. 그리고 한국 판화와 평범한 한국인의 삶의 조건
                        사이에 연결을 만들었는데, 이는 류연복의 이후 국토 작업이 버리는 것이 아니라
                        심화시킬 연결이었다. 1993년 이후 그가 새긴 땅은 운동이 모든 사람의 것이라고
                        주장했던 바로 그 땅이었다.
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
                      From the wall paintings of the 1980s to the mountain summits and river valleys
                      of his Anseong studio practice, Ryu Yeonbok has pursued the same act: carving
                      what matters into wood, so that it can be pressed onto paper and held. He
                      joins this campaign not as a subject of financial hardship but as a fellow
                      artist in solidarity — so that those who come after can work with the same
                      freedom that the blade in his hand has always been in service of.
                    </>
                  ) : (
                    <>
                      1980년대의 벽화에서 안성 작업실의 산 정상과 강줄기까지 — 류연복은 같은 행위를
                      이어왔다: 중요한 것을 나무에 새겨, 종이에 찍어내고, 손에 쥘 수 있게 하는 일.
                      씨앗페에는 금융 차별의 당사자가 아니라, 동료 예술인과의 연대자로 함께한다 —
                      그의 손 안의 칼이 언제나 섬겨온 자유 안에서 다음 세대의 예술인들이 일할 수
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Ryu Yeonbok</span>
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
                    Ryu Yeonbok joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    류연복 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={RYU_YEONBOK_PATH}
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
