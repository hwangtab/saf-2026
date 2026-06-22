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

// 거장 작가 feature는 작가 페이지(/artworks/artist/남진현)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const NAM_JINHYUN_PATH = `/artworks/artist/${encodeURIComponent('남진현')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isNamJinhyunArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '남진현' ||
    n === 'nam jin hyun' ||
    n === 'nam jinhyun' ||
    n === 'nam, jin hyun' ||
    n.replace(/[\s,-]+/g, '') === 'namjinhyun'
  );
};

const PAGE_COPY = {
  ko: {
    title: '남진현 — 얼굴에 새긴 시대',
    description:
      '혁명가에서 화가로. 남진현(1963–)은 사람의 얼굴을 기하학적 선과 색채로 분할·재구성한 아크릴 추상으로 개인의 경험을 보편적 성찰로 확장한다. 「혹독한 시절」의 푸른색에서 「인간의 조건」까지, 한 시대를 살아낸 내면의 풍경을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '혁명가에서 화가로 — 남진현. 사람의 얼굴을 기하학적 선·색채로 분할한 아크릴 추상으로 개인사를 보편적 사유로 승화시킨다.',
    ogAlt: '남진현 대표 작품',
    twitterTitle: '남진현',
    twitterDescription: '혁명가에서 화가로 — 얼굴에 새긴 시대, 남진현',
    keywords:
      '남진현 화가, 아크릴 추상, 얼굴 추상, 혹독한 시절, 인간의 조건, 화가가 된 혁명가, 씨앗페 온라인',
  },
  en: {
    title: 'Nam Jin Hyun — An Era Inscribed on the Face',
    description:
      'From revolutionary to painter. Nam Jin Hyun (b. 1963) builds acrylic abstractions that divide and reconstruct the human face into geometric lines and color, expanding personal experience into universal reflection. From the blue of 〈Harsh Times〉 to 〈The Human Condition〉, view and collect the inner landscapes of a life lived through history at SAF Online.',
    ogDescription:
      'Nam Jin Hyun — from revolutionary to painter. Acrylic abstractions that divide the human face into geometric line and color, raising personal history into universal thought.',
    ogAlt: 'Nam Jin Hyun — featured work',
    twitterTitle: 'Nam Jin Hyun',
    twitterDescription: 'From revolutionary to painter — an era inscribed on the face',
    keywords:
      'Nam Jin Hyun artist, acrylic abstraction, face abstraction, Korean contemporary painting, The Human Condition',
  },
} as const;

export async function buildNamJinhyunMetadata({
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
  const pageUrl = buildLocaleUrl(NAM_JINHYUN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('남진현');
  const artwork = allArtworks.find((a) => isNamJinhyunArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Nam Jin Hyun`
      : `${artwork.title} — 남진현`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(NAM_JINHYUN_PATH, locale, true),
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

export default async function NamJinhyunFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(NAM_JINHYUN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('남진현');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isNamJinhyunArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Nam Jin Hyun' : '남진현', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${NAM_JINHYUN_PATH}#person-nam-jinhyun`,
    name: isEnglish ? 'Nam Jin Hyun' : '남진현',
    alternateName: isEnglish ? '남진현' : 'Nam Jin Hyun',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Nam Jin Hyun (b. 1963) is a mid-career Korean painter who builds acrylic abstractions dividing and reconstructing the human face into geometric line and color, expanding personal experience into universal reflection.'
      : '남진현(1963–)은 사람의 얼굴을 기하학적 선과 색채로 분할·재구성한 아크릴 추상으로 개인의 경험을 보편적 성찰로 확장해 온 중견 화가입니다.',
    birthDate: '1963-03',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Cheorwon, Gangwon, South Korea' : '강원도 철원',
    },
    knowsAbout: ['Acrylic abstraction', 'Portrait abstraction', 'Korean contemporary art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Nam Jin Hyun — SAF Online' : '남진현 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Nam Jin Hyun from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 남진현 작품을 소개합니다.',
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

          {/* Fractured facial-plane lines — 얼굴을 분할하는 기하학적 선 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10 rotate-6 origin-top" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/30 -rotate-6 origin-top" />
          <div className="absolute top-0 right-14 h-full w-px bg-white/10 rotate-3 origin-top" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Nam Jin Hyun · b. 1963' : '남진현 · 1963–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  An era,
                  <br />
                  <span className="text-primary-soft">inscribed on a face</span>
                </>
              ) : (
                <>
                  한 시대를
                  <br />
                  <span className="text-primary-soft">얼굴에 새기다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From revolutionary to painter — a life carried into color.
                  </span>
                  <span className="mt-2 block">
                    The human face, divided by geometric line, becomes a universal reflection.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">혁명가에서 화가로 — 한 생애가 색으로 옮겨지다.</span>
                  <span className="mt-2 block">
                    기하학적 선으로 분할된 사람의 얼굴이 보편적 성찰이 된다.
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
                    The face, reconstructed —<br />
                    <span className="text-primary-strong">personal history made universal</span>
                  </>
                ) : (
                  <>
                    재구성된 얼굴 —<br />
                    <span className="text-primary-strong">보편이 된 개인의 역사</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Nam Jin Hyun (b. 1963) was born in Cheorwon, Gangwon province, and grew up in
                      Seoul. In 1981 he entered the College of Engineering at Seoul National
                      University, but left his studies after taking part in the student movement of
                      the era.
                    </p>
                    <p>
                      In October 1990 he was arrested for activity with the South Korean Socialist
                      Workers&apos; League (Sanomaeng) and sentenced to thirteen years in prison,
                      serving roughly eight before his release on{' '}
                      <strong className="font-bold text-charcoal-deep">August 15, 1998</strong>.
                      Those years in confinement were the harshest of his life — and, by a paradox
                      he would later make the subject of his work, the ground from which the painter
                      emerged.
                    </p>
                    <p>
                      After release he ran a private academy in Daechi-dong; when it failed, he
                      turned in 2008 to studying art in earnest. Taking the human face as his motif,
                      he began making acrylic abstractions — dividing and reconstructing the most
                      human of subjects into{' '}
                      <strong className="font-bold text-charcoal">geometric line and color</strong>,
                      so that a single individual&apos;s experience could open into a broader
                      reflection on the human condition.
                    </p>
                    <p>
                      His paintings move through distinct narratives toward the substance of an era.
                      〈Harsh Times〉 renders the pain and grief of the prison years in blue.
                      〈Without a Single Shame〉 turns toward self-affirmation and dignity. The
                      〈World Trilogy〉 — bewildered, dislocated, absurd — probes the contradictions
                      of contemporary society, while 〈The Human Condition〉, recalling André
                      Malraux and Hannah Arendt, shows his work to be the result not of mere
                      aesthetic gesture but of dialectical thought. 〈Around Sixty〉 and 〈Life, On
                      That Blue Dream〉 set down, in line and color, a deep reckoning with six
                      decades of a complicated life.
                    </p>
                    <p>
                      The film critic Jeon Chan-il has written that Nam&apos;s work &ldquo;holds the
                      power to raise a personal story into universal thought,&rdquo; while the
                      historian Jeon Woo-yong observes that &ldquo;wound into his paintings are the
                      man and the era who lived through a harsh world; through his work we come to
                      understand the totality of the life he has lived.&rdquo;
                    </p>
                    <p>
                      From his first solo exhibition in 2013 to his seventh in 2025, Nam has shown
                      his work steadily, with introductions abroad at the Van Der Plas Gallery in
                      New York, Pariskofinearts in New Jersey, and 〈2025 Art NY〉 in Manhattan. In
                      2023 he published the essay collection{' '}
                      <em>The Revolutionary Who Became a Painter</em> (Binbin Books) — thirty
                      paintings and their stories, carrying a personal history and the spirit of its
                      time well beyond simple captions.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      남진현(1963–)은 강원도 철원에서 태어나 서울에서 성장했다. 1981년 서울대학교
                      공과대학에 입학했으나, 당대의 학생운동에 참여하면서 학업을 중단했다.
                    </p>
                    <p>
                      1990년 10월, 그는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        사노맹(남한사회주의노동자동맹)
                      </strong>{' '}
                      활동으로 구속되어 징역 13년을 선고받았고, 약 8년을 복역한 뒤 1998년 8월 15일
                      석방됐다. 그 수감의 시간은 그의 인생에서 가장 혹독한 시간이었으나, 훗날 그가
                      작품의 주제로 삼게 되는 역설 — 화가가 태어나는 토양이 됐다.
                    </p>
                    <p>
                      석방 후 대치동에서 학원을 운영하다 실패한 뒤, 그는 2008년 본격적으로 미술을
                      공부하기 시작했다. 사람의 얼굴을 모티브로 삼아 아크릴 추상화를 그리기
                      시작했고, 가장 인간적인 소재인 얼굴을{' '}
                      <strong className="font-bold text-charcoal">기하학적 선과 색채</strong>로
                      분할·재구성함으로써 한 개인의 경험을 인간 보편의 성찰로 확장시키는 작업을
                      전개했다.
                    </p>
                    <p>
                      그의 작품들은 각기 다른 서사를 통해 시대의 본질로 향한다. 「혹독한 시절」은
                      감옥 시절의 고통과 슬픔을 푸른색으로 표현하고, 「한 점 부끄럼 없이」는 자기
                      긍정과 존엄을 다룬다. 「세계 삼부작」(혼미한 세계·어긋난 세계·부조리한 세계)은
                      현대 사회의 모순을 탐구하며, 앙드레 말로와 한나 아렌트를 연상시키는 「인간의
                      조건」은 그의 작업이 단순한 미학적 표현이 아니라 변증법적 사유의 결과임을
                      보여준다. 「예순 즈음에」와 「인생, 그 푸르른 꿈에 대하여」는 복잡다단했던
                      60여 년의 삶에 대한 깊은 소회를 색과 선으로 풀어낸다.
                    </p>
                    <p>
                      영화평론가 전찬일은 남진현의 작품이 &ldquo;개인적 사연을 보편적 사유로
                      승화시키는 힘을 지닌다&rdquo;고 평하고, 역사학자 전우용은 &ldquo;그의 그림에는
                      혹독한 세상을 살아온 그와 그의 시대가 감겨 있으며, 우리는 그의 작품을 통해
                      그가 살아온 삶의 총체를 이해할 수 있다&rdquo;고 평가한다.
                    </p>
                    <p>
                      2013년 첫 개인전 이후 2025년 일곱 번째 개인전까지 꾸준히 작품을 선보여 온
                      남진현은, 뉴욕 Van Der Plas 갤러리, 뉴저지 Pariskofinearts, 맨해튼 〈2025 Art
                      NY〉 등 해외에서도 작품을 소개해 왔다. 2023년에는 자신의 삶과 예술 세계를 담은
                      에세이 『화가가 된 혁명가』(빈빈책방)를 출간했다 — 그림 30점과 이야기로 구성된
                      이 책은 단순한 설명을 넘어 개인의 역사와 그 시대의 정신을 담는다.
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
                        {isEnglish ? 'The divided face' : '분할된 얼굴'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The most human of subjects, cut into geometric line and color — an individual face reconstructed into a universal one.'
                          : '가장 인간적인 소재를 기하학적 선과 색채로 분할한다. 한 개인의 얼굴이 보편의 얼굴로 재구성된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The blue of 〈Harsh Times〉' : '「혹독한 시절」의 푸른색'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The pain and grief of the prison years, set down in blue — personal suffering transformed into a contemplative surface.'
                          : '감옥 시절의 고통과 슬픔을 푸른색으로 옮긴다. 개인의 아픔이 사색의 화면으로 전환된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Dialectical reflection' : '변증법적 사유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the 〈World Trilogy〉 to 〈The Human Condition〉, recalling Malraux and Arendt — abstraction as thought, not mere aesthetic gesture.'
                          : '「세계 삼부작」에서 「인간의 조건」까지, 말로와 아렌트를 연상시키는 사유. 추상은 미학적 제스처가 아니라 사고의 결과다.'}
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
                      1963
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Cheorwon, Gangwon province; grows up in Seoul.'
                        : '강원도 철원 출생, 서울에서 성장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1981
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Enters the College of Engineering, Seoul National University; leaves his studies amid the student movement.'
                        : '서울대학교 공과대학 입학, 학생운동 참여로 학업 중단.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Arrested in October for Sanomaeng activity; sentenced to thirteen years.'
                        : '10월, 사노맹 활동으로 구속·징역 13년 선고.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1998
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Released on August 15 after roughly eight years of imprisonment.'
                        : '약 8년 복역 후 8월 15일 석방.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins to study art in earnest; takes the human face as his motif.'
                        : '본격적으로 미술 공부 시작, 사람의 얼굴을 모티브로 작업 개시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '1st solo exhibition (Insa Art Center).'
                        : '제1회 개인전(인사아트센터).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2nd solo exhibition (Insa Art Center).'
                        : '제2회 개인전(인사아트센터).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition, Van Der Plas Gallery (New York).'
                        : 'Van Der Plas Gallery 단체전(뉴욕).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '3rd solo exhibition (Maru Art Center).'
                        : '제3회 개인전(마루아트센터).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '4th solo exhibition (Gallery Boda).'
                        : '제4회 개인전(갤러리보다).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '5th & 6th solo exhibitions; publishes the essay 〈The Revolutionary Who Became a Painter〉.'
                        : '제5·6회 개인전, 에세이 『화가가 된 혁명가』 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '7th solo exhibition (Gallery Insa Art); introduced abroad via 〈2025 Art NY〉 and others.'
                        : '제7회 개인전(갤러리인사아트), 〈2025 Art NY〉 등 해외 소개.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & abroad' : '주요 전시 및 해외 소개'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seven solo exhibitions (2013–2025): Insa Art Center, Maru Art Center, Gallery Boda, Gallery Ssamzie-an, Gallery Insa Art.'
                        : '개인전 7회(2013–2025): 인사아트센터·마루아트센터·갤러리보다·갤러리쌈지안·갤러리인사아트.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈2025 Art NY 25〉 (Manhattan); Pariskofinearts (New Jersey); Türkiye Bodrum & Adana.'
                        : '〈2025 Art NY 25〉(맨해튼), Pariskofinearts(뉴저지), 튀르키예 보드룸·아다나.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'K-ART-LONDON (Mall Gallery) & K-ART-MELBOURNE (Brightspace Gallery), 2023; Van Der Plas Gallery (New York), 2020.'
                        : 'K-ART-LONDON(Mall gallery)·K-ART-MELBOURNE(Brightspace Gallery, 2023), Van Der Plas Gallery(뉴욕, 2020).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art fairs: BAMA, Gyeongju Art Fair, K Art Fair (2022); 〈100 Selected Korean Contemporary Paintings〉, Maru Art Center (2021).'
                        : '아트페어: 부산국제화랑아트페어(BAMA)·경주아트페어·K아트페어(2022), 한국현대회화100선전(마루아트센터, 2021).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publication: 〈The Revolutionary Who Became a Painter〉 (Binbin Books, 2023) — thirty paintings and their stories.'
                        : '저서: 『화가가 된 혁명가』(빈빈책방, 2023) — 그림 30점과 이야기.'}
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
                  <span className="text-charcoal-deep">on a life turned into painting</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">그림이 된 한 생애에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 혁명가에서 화가로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From revolutionary to painter — a biographical arc'
                    : '혁명가에서 화가로 — 한 사람의 전기(傳記)'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Nam Jin Hyun&apos;s path to painting runs through a life that few of his
                        contemporaries shared. Born in 1963 in Cheorwon and raised in Seoul, he
                        entered Seoul National University&apos;s engineering college in 1981 and
                        soon left it for the student movement. In October 1990 he was arrested for
                        activity with the South Korean Socialist Workers&apos; League and sentenced
                        to thirteen years; he served roughly eight, and was released on August 15,
                        1998.
                      </p>
                      <p>
                        These are the facts of a biography, neither monument nor indictment. What
                        matters here is what the artist himself made of them. He titled his 2023
                        essay collection <em>The Revolutionary Who Became a Painter</em> — a phrase
                        that frames the prison years not as an end but as a passage. The harshest
                        time of his life became, by his own account, the soil from which the painter
                        grew.
                      </p>
                      <p>
                        That a person could carry such a history into the quiet labour of acrylic on
                        canvas is itself the subject. Nam does not paint slogans; he paints faces.
                        The turn from political conviction to the slow work of seeing is the
                        through-line of everything that follows.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        남진현이 그림에 이른 길은 동시대 누구와도 닮지 않은 생애를 지난다. 1963년
                        철원에서 태어나 서울에서 자란 그는 1981년 서울대학교 공과대학에 들어갔다가
                        이내 학생운동으로 학업을 떠났다. 1990년 10월 사노맹 활동으로 구속되어 징역
                        13년을 선고받았고, 약 8년을 복역한 뒤 1998년 8월 15일 석방됐다.
                      </p>
                      <p>
                        이것은 한 사람의 전기적 사실이다. 기념비도, 고발도 아니다. 여기서 중요한
                        것은 작가 자신이 그 사실을 무엇으로 만들었는가다. 그는 2023년 에세이집에
                        『화가가 된 혁명가』라는 제목을 붙였다 — 감옥의 시간을 끝이 아니라 통로로
                        자리매김하는 문장이다. 인생에서 가장 혹독했던 시간이, 그의 표현을 빌리면,
                        화가가 자라난 토양이 됐다.
                      </p>
                      <p>
                        그런 역사를 지닌 사람이 캔버스 위 아크릴의 고요한 노동으로 그것을 옮겨
                        왔다는 사실 자체가 하나의 주제다. 남진현은 구호를 그리지 않는다. 그는 얼굴을
                        그린다. 정치적 신념에서 천천히 보는 일로의 전환이, 이후 모든 작업을 관통하는
                        선이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 얼굴이라는 형식 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The face as form — geometry and color'
                    : '얼굴이라는 형식 — 기하학과 색채'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Nam began studying art in earnest in 2008, he chose the most human of
                        subjects: the face. But he does not render likeness. He divides the face
                        into planes of geometric line, then reconstructs it in color, so that an
                        individual&apos;s features dissolve into something nearer to a universal
                        figure. The particular becomes the general; one person&apos;s face holds the
                        weight of many.
                      </p>
                      <p>
                        Color carries the argument. In 〈Harsh Times〉, the blue is not decoration
                        but temperature — the cold of confinement made visible. Elsewhere, in
                        〈Without a Single Shame〉, color turns toward affirmation and dignity.
                        Across the 〈World Trilogy〉 — bewildered, dislocated, absurd — the palette
                        tracks the contradictions of a society rather than the moods of a single
                        sitter.
                      </p>
                      <p>
                        This is abstraction built from biography but addressed to everyone. The
                        geometric fracture of the face is not a stylistic flourish; it is a way of
                        saying that no single life is self-contained — that each face is crossed by
                        the lines of its time.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2008년 본격적으로 미술을 공부하기 시작한 남진현은 가장 인간적인 소재, 얼굴을
                        택했다. 그러나 그는 닮음을 그리지 않는다. 얼굴을 기하학적 선의 면들로 분할한
                        뒤 색채로 재구성함으로써, 한 개인의 이목구비가 보편의 형상에 가까운 무언가로
                        녹아들게 한다. 특수한 것이 일반이 되고, 한 사람의 얼굴이 여럿의 무게를
                        담는다.
                      </p>
                      <p>
                        주장을 실어 나르는 것은 색이다. 「혹독한 시절」의 푸른색은 장식이 아니라
                        온도다 — 가시화된 수감의 한기. 「한 점 부끄럼 없이」에서 색은 긍정과
                        존엄으로 돌아선다. 「세계 삼부작」(혼미한 세계·어긋난 세계·부조리한 세계)을
                        가로지르며 팔레트는 한 모델의 기분이 아니라 한 사회의 모순을 좇는다.
                      </p>
                      <p>
                        이것은 전기에서 출발하되 모두를 향해 발화하는 추상이다. 얼굴의 기하학적
                        균열은 양식적 멋이 아니라, 그 어떤 생애도 자기 안에 닫혀 있지 않다는 — 모든
                        얼굴이 제 시대의 선들로 가로질러진다는 — 말의 방식이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 개인에서 보편으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From the personal to the universal — what the critics see'
                    : '개인에서 보편으로 — 비평이 본 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The throughline critics return to is the movement from the personal to the
                        universal. The film critic Jeon Chan-il writes that Nam&apos;s work
                        &ldquo;holds the power to raise a personal story into universal
                        thought,&rdquo; linking it to the philosophy of Hannah Arendt and the
                        cinematic world of director Bong Joon-ho. The reference is apt: 〈The Human
                        Condition〉, recalling André Malraux and Arendt, shows that these paintings
                        are the result of dialectical thought rather than aesthetic gesture alone.
                      </p>
                      <p>
                        The historian Jeon Woo-yong puts it in the register of time: &ldquo;wound
                        into his paintings are the man and the era who lived through a harsh world;
                        through his work we come to understand the totality of the life he has
                        lived.&rdquo; It is a reading that treats each canvas as a cross-section of
                        a life and its century at once.
                      </p>
                      <p>
                        In the later works — 〈Around Sixty〉, 〈Life, On That Blue Dream〉 — the
                        reckoning softens into reflection. Six decades of a complicated life are set
                        down in line and color, no longer as wound but as understanding. The
                        revolutionary who became a painter arrives, in the end, at a quieter and
                        larger question: how a single face can hold an era.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        비평이 거듭 돌아오는 선은 개인에서 보편으로의 이동이다. 영화평론가 전찬일은
                        남진현의 작품이 &ldquo;개인적 사연을 보편적 사유로 승화시키는 힘을
                        지닌다&rdquo; 고 쓰며, 그것을 한나 아렌트의 철학과 봉준호 감독의 영화 세계에
                        연결한다. 그 참조는 적절하다 — 앙드레 말로와 아렌트를 연상시키는 「인간의
                        조건」은, 이 그림들이 미학적 제스처만이 아니라 변증법적 사유의 결과임을
                        보여준다.
                      </p>
                      <p>
                        역사학자 전우용은 그것을 시간의 차원에서 말한다. &ldquo;그의 그림에는 혹독한
                        세상을 살아온 그와 그의 시대가 감겨 있으며, 우리는 그의 작품을 통해 그가
                        살아온 삶의 총체를 이해할 수 있다.&rdquo; 한 화면을 한 생애이자 한 세기의
                        단면으로 읽는 독법이다.
                      </p>
                      <p>
                        후기 작업 — 「예순 즈음에」, 「인생, 그 푸르른 꿈에 대하여」 — 에서 그
                        대면은 성찰로 누그러진다. 복잡다단했던 60여 년의 삶이 더는 상처가 아니라
                        이해로서 색과 선에 놓인다. 화가가 된 혁명가는 마침내 더 조용하고 더 큰
                        물음에 이른다: 하나의 얼굴이 어떻게 한 시대를 담을 수 있는가.
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
                      From the engineering halls of 1981 to the canvases of the 2020s, Nam Jin
                      Hyun&apos;s work has pursued a single question: how does a face carry the
                      weight of a life, and how does color carry that face? He joins this campaign
                      not as a subject of its cause but as a fellow artist in solidarity — so that
                      those who come after might paint without the harshness he has borne.
                    </>
                  ) : (
                    <>
                      1981년의 공대 강의실에서 2020년대의 캔버스까지, 남진현의 작업은 하나의 물음을
                      추구해 왔다: 얼굴은 어떻게 한 생애의 무게를 감당하는가, 그리고 색은 어떻게 그
                      얼굴을 감당하는가. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의
                      연대자로 함께한다 — 다음 세대의 예술인들이 그가 견딘 혹독함 없이 그릴 수
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Nam Jin Hyun</span>
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
                    Nam Jin Hyun joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    남진현 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={NAM_JINHYUN_PATH}
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
