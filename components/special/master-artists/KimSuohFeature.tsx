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

// 작가 feature는 작가 페이지(/artworks/artist/김수오)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_SUOH_PATH = `/artworks/artist/${encodeURIComponent('김수오')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimSuohArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김수오' ||
    n === 'kim suoh' ||
    n === 'kim su-oh' ||
    n.replace(/[\s-]+/g, '') === 'kimsuoh'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김수오 — 신들의 땅, 사라지기 전에 담는 화산섬',
    description:
      '낮에는 사람을 고치고 밤에는 땅을 기록하는 한의사·사진가 김수오. 제주 중산간 오름의 어둠과 고요 속에서 개발과 오염으로 사라져가는 원초적 풍광을 응시한다. 첫 개인전 〈신들의 땅〉, 두 번째 개인전 〈가닿음으로〉의 작가 김수오를 씨앗페 온라인에서 만날 수 있습니다.',
    ogDescription:
      '한의사이자 사진가 김수오. 제주 중산간 오름의 깊은 밤, 사라져가는 화산섬의 원초적 풍광을 〈신들의 땅〉으로 담아낸다.',
    ogAlt: '김수오 대표 작품',
    twitterTitle: '김수오',
    twitterDescription: '낮엔 사람을 고치고 밤엔 땅을 기록한다 — 〈신들의 땅〉의 작가 김수오',
    keywords: '김수오 사진가, 제주 오름 사진, 신들의 땅, 가닿음으로, 제주 중산간, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Suoh — Land of the Gods, a Volcanic Island Recorded Before It Vanishes',
    description:
      'Selected works by Kim Suoh, an Oriental-medicine doctor and photographer who heals people by day and records the land by night. In the darkness and stillness of the mid-mountain oreum of Jeju, he gazes at a primal landscape vanishing to development and pollution. Artist of the solo exhibitions 〈Land of the Gods〉 and 〈Reaching, Touching〉. View his works at SAF Online.',
    ogDescription:
      'Kim Suoh — doctor and photographer. In the deep night of the mid-mountain oreum of Jeju he records a primal volcanic-island landscape before it disappears.',
    ogAlt: 'Kim Suoh — featured work',
    twitterTitle: 'Kim Suoh',
    twitterDescription:
      'Healing people by day, recording the land by night — Kim Suoh, artist of 〈Land of the Gods〉',
    keywords:
      'Kim Suoh photographer, Jeju oreum photography, Land of the Gods, Jeju mid-mountain, volcanic island landscape',
  },
} as const;

export async function buildKimSuohMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_SUOH_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김수오');
  const artwork = allArtworks.find((a) => isKimSuohArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Suoh`
      : `${artwork.title} — 김수오`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_SUOH_PATH, locale, true),
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

export default async function KimSuohFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_SUOH_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김수오');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimSuohArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Suoh' : '김수오', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_SUOH_PATH}#person-kim-suoh`,
    name: isEnglish ? 'Kim Suoh' : '김수오',
    alternateName: isEnglish ? '김수오' : 'Kim Suoh',
    jobTitle: isEnglish ? 'Photographer · Oriental Medicine Doctor' : '사진가 · 한의사',
    description: isEnglish
      ? 'Kim Suoh is a Jeju-born photographer and Oriental-medicine doctor who heals people by day and records the mid-mountain oreum of Jeju by night, photographing a primal volcanic-island landscape before it vanishes.'
      : '김수오는 제주에서 태어난 사진가이자 한의사로, 낮에는 환자를 진료하고 밤에는 제주 중산간 오름을 기록하며 사라져가는 화산섬의 원초적 풍광을 사진으로 담는다.',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Jeju Island, South Korea' : '제주',
    },
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Seoul National University, Dept. of Electronic Engineering'
          : '서울대학교 전자공학과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Kyung Hee University (Ph.D., Korean Medicine)' : '경희대학교 한의대',
      },
    ],
    knowsAbout: ['Jeju oreum photography', 'Landscape photography', 'Korean medicine'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Suoh — SAF Online' : '김수오 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Suoh from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김수오 작품을 소개합니다.',
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

          {/* Strata lines — 화산섬 지층·오름 능선 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Suoh · Photographer' : '김수오 · 사진가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Healing by day,
                  <br />
                  <span className="text-primary-soft">recording the land by night</span>
                </>
              ) : (
                <>
                  낮엔 사람을 고치고
                  <br />
                  <span className="text-primary-soft">밤엔 땅을 기록한다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The darkness and stillness of Jeju&apos;s mid-mountain oreum.
                  </span>
                  <span className="mt-2 block">
                    A primal landscape recorded before it vanishes.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">제주 중산간 오름의 어둠과 고요.</span>
                  <span className="mt-2 block">사라지기 전에 담아 두는 원초적 풍광.</span>
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
                    The land of the gods —<br />
                    <span className="text-primary-strong">recorded before it vanishes</span>
                  </>
                ) : (
                  <>
                    신들의 땅 —<br />
                    <span className="text-primary-strong">사라지기 전에 담는 화산섬</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Suoh was born and raised on the volcanic island of Jeju. As a child he
                      played in the Tapdong sea below Sarabong — turning over stones at low tide to
                      find crabs and sea snails, cracking open sea urchins on the spot. That sea is
                      remembered with his whole body. It is not nostalgia alone: after spending his
                      youth on the mainland and returning home around the age of forty, the sea he
                      met again was no longer that sea.
                    </p>
                    <p>
                      Watching life disappear from a sea worn down by development and pollution, he
                      says: <em>&ldquo;The sea is dying.&rdquo;</em> Within those words is sorrow,
                      and an urgency — that the old things must be remembered.
                    </p>
                    <p>
                      In 1984 he left home for the Department of Electronic Engineering, working at
                      a research institute for some six years before entering a college of Korean
                      medicine. He became an{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Oriental-medicine doctor
                      </strong>{' '}
                      and returned to Jeju, where he now treats patients at his clinic. The return
                      to the island was, for him, the recovery of a place to stand.
                    </p>
                    <p>
                      What first led him to take up the camera in earnest was Gangjeong village.
                      During the years when Gureombi rock was blasted and construction of the naval
                      base was pushed through, he would finish seeing patients and drive across
                      Hallasan to Gangjeong — giving acupuncture to injured residents in the sit-in
                      tents, then crossing back to Jeju City near midnight, season after season. One
                      such night, parked on a mid-mountain plain, the silhouette of the oreum and
                      the distant lights of fishing boats on the night sea were almost unreal in
                      their beauty. Having watched Tapdong reclaimed and Gureombi disappear, he
                      thought:{' '}
                      <em>
                        those landscapes too could one day vanish; before they are lost, I must hold
                        them in photographs.
                      </em>
                    </p>
                    <p>
                      That was the beginning. Almost every day since, once his clinic hours end, he
                      sets out for the mid-mountain plains and oreum — from evening into deep night,
                      sometimes met by the dawn dew, photographing the landscapes of the volcanic
                      island. He works mostly among the oreum of eastern Jeju&apos;s mid-mountains;
                      to the west, resorts and golf courses inevitably enter the frame. In the
                      darkness and stillness of the island at dusk, where the trails of people have
                      thinned, he walks the hills and fields alone deep into the night, trying to
                      hold the beauty that is slipping away.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김수오는 화산섬 제주에서 태어나 자랐다. 사라봉 아래 탑동 바다에서 뛰어놀던
                      아이는, 썰물 때 돌을 뒤집으면 게와 보말이 나오고 성게를 그 자리에서 깨먹던 그
                      바다를 온몸으로 기억한다. 그 기억은 단순한 향수가 아니다. 청년 시절을 육지에서
                      보내다 불혹의 나이에 고향으로 돌아와 마주한 바다는 더 이상 그 바다가 아니었다.
                    </p>
                    <p>
                      개발과 오염으로 생명이 사라져가는 바다를 보며 그는 말한다.{' '}
                      <em>&ldquo;바다가 죽어가고 있습니다.&rdquo;</em> 그 말 속에는 슬픔과 함께,
                      오래된 것들을 기억해야 한다는 절박함이 담겨 있다.
                    </p>
                    <p>
                      1984년 고향을 떠나 전자공학과에 진학해 연구소에서 6년여 근무하다, 다시
                      한의대에 진학해{' '}
                      <strong className="font-bold text-charcoal-deep">한의사</strong>가 되어
                      고향으로 돌아왔다. 그는 지금 제주의 한의원에서 환자들을 진료한다. 제주섬으로의
                      귀환은 그에게 삶의 자리를 되찾는 일이었다.
                    </p>
                    <p>
                      카메라를 본격적으로 들게 된 계기는 강정마을이었다. 구럼비 바위를 폭파하고
                      해군기지 공사를 밀어붙이던 시절, 그는 한의원 진료를 마치는 대로 한라산 너머
                      강정마을로 달려갔다. 농성 천막에서 다친 주민들을 침으로 치료하고 자정 무렵
                      다시 제주시로 넘어오는 날들이 사계절 내내 반복되던 어느 날, 중산간 들판에 차를
                      세우고 바라본 오름의 실루엣과 멀리 밤바다 고깃배 불빛이 비현실적일 만큼
                      아름다웠다. 탑동이 매립되고 구럼비가 사라지는 것을 지켜본 그는 생각했다.{' '}
                      <em>
                        저 풍광들도 언젠가는 사라질 수 있다. 더 이상 사라지기 전에 사진으로 담아
                        두어야겠다.
                      </em>
                    </p>
                    <p>
                      그것이 시작이었다. 그 뒤로 거의 매일, 한의원 진료를 마치면 중산간 들판과
                      오름으로 나선다. 저녁부터 깊은 밤, 때로는 새벽이슬을 맞으며 화산섬의 풍광을
                      카메라에 담았다. 그가 주로 찾는 곳은 제주 동쪽 중산간 오름이다. 서쪽 지역은
                      카메라 앵글 안에 어김없이 인공적인 리조트와 골프장이 들어오기 때문이다. 인적이
                      끊긴 저물녘 제주섬의 어둠과 고요, 그 원초적인 풍광 속에서 사라져가는
                      아름다움을 담으려 밤 깊도록 홀로 제주 산야를 거닌다.
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
                        {isEnglish ? 'The oreum at night' : '밤의 오름'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The darkness and stillness of the mid-mountain oreum at dusk — a primal volcanic-island landscape held in deep, contemplative tones.'
                          : '저물녘 중산간 오름의 어둠과 고요. 화산섬의 원초적 풍광을 깊고 사색적인 밤의 톤으로 담는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Before it vanishes' : '사라지기 전에'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Having watched Tapdong reclaimed and Gureombi disappear, he records the landscapes that could one day be lost — an urgency to remember.'
                          : '탑동이 매립되고 구럼비가 사라지는 것을 지켜본 그는, 언젠가 사라질 수 있는 풍광을 기록한다. 기억해야 한다는 절박함.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Life and its cycle' : '생명과 자연의 섭리'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the oreum to the lives upon it — the four seasons and life cycle of the Jeju horse trace the circulation of life and the order of nature.'
                          : '오름에서 그 위에 살아가는 존재들로. 제주마의 사계와 생로병사를 통해 생명의 순환과 자연의 섭리를 풀어낸다.'}
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
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Leaves Jeju for the Department of Electronic Engineering at Seoul National University.'
                        : '고향 제주를 떠나 서울대학교 전자공학과 진학.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works at a research institute for some six years, then enters a college of Korean medicine.'
                        : '연구소에서 6년여 근무 후 한의대 진학.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ph.D. in Korean Medicine, Kyung Hee University; returns to Jeju as an Oriental-medicine doctor.'
                        : '경희대학교 한의대 박사. 한의사가 되어 고향 제주로 귀환.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins photographing the mid-mountain oreum of Jeju after the years at Gangjeong.'
                        : '강정마을 시절을 지나며 제주 중산간 오름을 카메라에 담기 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition 〈Land of the Gods〉, Gallery Keunbadayeong, Jeju — his first public statement on the oreum.'
                        : '첫 개인전 〈신들의 땅〉, 갤러리 큰바다영, 제주 — 오름을 주제로 한 첫 공개 발화.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Second solo exhibition 〈Reaching, Touching〉, Gallery Nuvo, Jeju — the four seasons and life cycle of the Jeju horse.'
                        : '두 번째 개인전 〈가닿음으로〉, 갤러리 누보, 제주 — 제주마의 사계와 생로병사.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Education & exhibitions' : '학력 및 전시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'B.S., Dept. of Electronic Engineering, Seoul National University; Ph.D. in Korean Medicine, Kyung Hee University'
                        : '서울대학교 전자공학과 졸업 · 경희대학교 한의대 박사'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Land of the Gods〉, Gallery Keunbadayeong, Jeju (2022)'
                        : '개인전 〈신들의 땅〉, 갤러리 큰바다영, 제주 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Reaching, Touching〉, Gallery Nuvo, Jeju (2024)'
                        : '개인전 〈가닿음으로〉, 갤러리 누보, 제주 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: many shows for the nature and peace of Jeju'
                        : '단체전: 제주의 자연과 평화를 위한 다수의 단체전 참여'}
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
                  <span className="text-charcoal-deep">on the island, the night, and the work</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">섬과 밤, 그리고 작업에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 두 개의 직업, 하나의 시선 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Two vocations, one gaze — the doctor who photographs'
                    : '두 개의 직업, 하나의 시선 — 사진 찍는 한의사'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Suoh did not arrive at photography through art school. He studied
                        electronic engineering, worked at a research institute, then turned to
                        Korean medicine and came home to Jeju to practice. By day he reads the body
                        and tends to illness; by night he reads the land. The two disciplines are
                        not as far apart as they look. Both are acts of attention — of looking
                        closely at what is ailing, and at what is quietly enduring.
                      </p>
                      <p>
                        His photographs are born where those two grains of his life meet. The same
                        patience that sits with a patient sits with an oreum until the light is
                        right; the same care that treats an injury attends to a landscape that is
                        slipping away. This is why his images move beyond beautiful scenery toward a
                        contemplation of life and the order of nature.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김수오는 미술 학교를 거쳐 사진에 이른 사람이 아니다. 전자공학을 공부하고
                        연구소에서 일하다, 한의학으로 방향을 틀어 제주로 돌아와 환자를 본다. 낮에는
                        몸을 읽고 병을 돌보며, 밤에는 땅을 읽는다. 두 일은 보이는 것만큼 멀지 않다.
                        둘 다 응시의 행위다 — 아파하는 것과 말없이 견디는 것을 가까이 들여다보는 일.
                      </p>
                      <p>
                        그의 사진은 그 두 결이 만나는 자리에서 태어난다. 환자 곁에 머무는 인내가
                        빛이 들 때까지 오름 곁에 머물고, 상처를 치료하는 보살핌이 사라져가는 풍광을
                        향한다. 그의 사진이 아름다운 풍경을 넘어 생명과 자연의 섭리를 돌아보게
                        만드는 이유다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 강정에서 카메라까지 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'From Gangjeong to the camera — how the work began'
                    : '강정에서 카메라까지 — 작업의 시작'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The camera entered his life through Gangjeong village. In the years when
                        Gureombi rock was blasted and the naval base went up, he would finish his
                        clinic hours and drive across Hallasan to give acupuncture to injured
                        residents in the sit-in tents, returning to Jeju City near midnight. These
                        are stated here as a matter of record — the personal occasion that first put
                        a camera in his hands — not as an argument for or against any cause.
                      </p>
                      <p>
                        On one of those midnight drives, parked on a mid-mountain plain, the
                        silhouette of an oreum and the far lights of fishing boats struck him as
                        almost unreal in their beauty. Having already watched Tapdong reclaimed and
                        Gureombi disappear, he understood that such landscapes are not permanent.
                        The decision followed: to hold them in photographs before they too were
                        gone. The impulse was preservation, not protest — a wish to remember.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        카메라는 강정마을을 통해 그의 삶에 들어왔다. 구럼비 바위가 폭파되고
                        해군기지가 들어서던 시절, 그는 진료를 마치는 대로 한라산을 넘어 농성 천막의
                        다친 주민들을 침으로 치료하고 자정 무렵 제주시로 돌아왔다. 이는 그가 처음
                        카메라를 들게 된 개인적 계기로서 사실 그대로 적는 것이며, 어떤 입장을
                        옹호하거나 규탄하기 위함이 아니다.
                      </p>
                      <p>
                        그 자정의 귀갓길 어느 날, 중산간 들판에 차를 세우고 바라본 오름의 실루엣과
                        멀리 고깃배 불빛은 비현실적일 만큼 아름다웠다. 이미 탑동의 매립과 구럼비의
                        소멸을 지켜본 그는, 그런 풍광이 영원하지 않음을 알았다. 결심은 그 뒤를
                        따랐다 — 그것들도 사라지기 전에 사진으로 담아 두기로. 충동은 항변이 아니라
                        보존이었다, 기억하려는 바람.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 신들의 땅에서 가닿음으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From 〈Land of the Gods〉 to 〈Reaching, Touching〉'
                    : '〈신들의 땅〉에서 〈가닿음으로〉까지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2022, after years of work, he opened his first solo exhibition,{' '}
                        <em>Land of the Gods</em>, at Gallery Keunbadayeong in Jeju — his first
                        public statement on the oreum. He works mostly among the oreum of eastern
                        Jeju&apos;s mid-mountains; to the west, resorts and golf courses inevitably
                        crowd into the frame. In the hush of dusk, where the trails of people have
                        thinned, he walks the hills alone into deep night, holding the beauty that
                        is slipping away.
                      </p>
                      <p>
                        His second solo exhibition, <em>Reaching, Touching</em> (Gallery Nuvo, Jeju,
                        2024), follows the four seasons and the life cycle of the Jeju horse to
                        unfold the circulation of life and the order of nature. The gaze that began
                        on the oreum has deepened — toward the lives lived upon it, and toward the
                        time in which those lives continue and disappear.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2022년, 수년에 걸친 작업 끝에 그는 첫 개인전 <em>신들의 땅</em>을 제주
                        갤러리 큰바다영에서 열었다 — 오름을 주제로 한 첫 공개 발화였다. 그가 주로
                        찾는 곳은 제주 동쪽 중산간 오름이다. 서쪽은 어김없이 리조트와 골프장이
                        앵글에 들어오기 때문이다. 인적이 끊긴 저물녘의 고요 속에서, 그는 밤 깊도록
                        홀로 산야를 거닐며 사라져가는 아름다움을 담는다.
                      </p>
                      <p>
                        두 번째 개인전 <em>가닿음으로</em>(갤러리 누보, 제주, 2024)에서는 제주마의
                        사계와 생로병사를 따라 생명의 순환과 자연의 섭리를 풀어냈다. 오름에서 시작한
                        시선은 그 위에 살아가는 존재들의 삶으로, 그리고 그 삶이 이어지고 사라지는
                        시간으로 깊어지고 있다.
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
                      Healing people by day and recording the land by night, Kim Suoh photographs a
                      volcanic island before it vanishes — a deep, affectionate gaze at things that
                      are beautiful and disappearing, and at lives that endure without a word. He
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity, offering his work so that those who come after might keep their
                      footing.
                    </>
                  ) : (
                    <>
                      낮에는 사람을 고치고 밤에는 땅을 기록하며, 김수오는 사라지기 전의 화산섬을
                      사진으로 담는다 — 아름답지만 사라지고 있는 것들, 말없이 살아가는 존재들을 향한
                      깊고 애정 어린 눈길. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의
                      연대자로 함께한다 — 다음 세대의 예술인들이 삶의 자리를 지킬 수 있도록 작품을
                      내놓으며.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Suoh</span>
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
                    Kim Suoh joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김수오 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_SUOH_PATH}
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
