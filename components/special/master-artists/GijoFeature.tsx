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

// 작가 feature는 작가 페이지(/artworks/artist/기조)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='기조', name_en='Gijo'.
const GIJO_PATH = `/artworks/artist/${encodeURIComponent('기조')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isGijoArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === '기조' || n === 'gijo';
};

const PAGE_COPY = {
  ko: {
    title: '기조 — 갈등 이후 남겨지는 감정을 그리고 깎는 시각예술가',
    description:
      '갈등 이후 남겨지는 감정을 평면 회화와 목각 채색으로 다루는 시각예술가 기조. 달천예술창작공간 입주 작가로 활동하며, 그려진 표면과 깎아 낸 부조를 오가는 작업을 펼친다. 평면과 목각의 경계에서 잔여의 감정을 형상화하는 기조의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '갈등 이후 남겨지는 감정 — 평면 회화와 목각 채색을 병행하는 시각예술가 기조. 달천예술창작공간 입주 작가.',
    ogAlt: '기조 대표 작품',
    twitterTitle: '기조',
    twitterDescription: '갈등 이후 남겨지는 감정 — 그리고 또 깎는 시각예술가 기조',
    keywords:
      '기조 작가, 평면 회화, 목각, 채색, 달천예술창작공간, 갈등, 잔여의 감정, 부조, 씨앗페 온라인',
  },
  en: {
    title: 'Gijo — Visual Artist of the Emotions Left After Conflict',
    description:
      'Selected works by Gijo, a visual artist who treats the emotions left behind after conflict through flat painting and painted wood carving. A resident artist at Dalcheon Art Creation Space, Gijo moves between the painted surface and the carved relief. View and collect the works of Gijo — who gives form to residual feeling at the border of the planar and the carved — at SAF Online.',
    ogDescription:
      'The emotions left after conflict — Gijo, a visual artist working in both flat painting and painted wood carving. A resident artist at Dalcheon Art Creation Space.',
    ogAlt: 'Gijo — featured work',
    twitterTitle: 'Gijo',
    twitterDescription: 'The emotions left after conflict — a visual artist who paints and carves',
    keywords:
      'Gijo artist, flat painting, wood carving, painted wood, Dalcheon Art Creation Space, conflict, residual emotion, relief',
  },
} as const;

export async function buildGijoMetadata({
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
  const pageUrl = buildLocaleUrl(GIJO_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('기조');
  const artwork = allArtworks.find((a) => isGijoArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Gijo`
      : `${artwork.title} — 기조`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(GIJO_PATH, locale, true),
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

export default async function GijoFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(GIJO_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('기조');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isGijoArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Gijo' : '기조', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${GIJO_PATH}#person-gijo`,
    name: isEnglish ? 'Gijo' : '기조',
    alternateName: isEnglish ? '기조' : 'Gijo',
    jobTitle: isEnglish ? 'Visual Artist' : '시각예술가',
    description: isEnglish
      ? 'Gijo is a visual artist who treats the emotions left behind after conflict through flat painting and painted wood carving, and is a resident artist at the Dalcheon Art Creation Space.'
      : '기조는 갈등 이후 남겨지는 감정을 평면 회화 및 목각 채색 기법으로 표현하는 시각예술가로, 달천예술창작공간 입주 작가로 활동합니다.',
    knowsAbout: isEnglish
      ? ['Flat painting', 'Painted wood carving', 'Residual emotion after conflict']
      : ['평면 회화', '목각 채색', '갈등 이후의 잔여 감정'],
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Dalcheon Art Creation Space' : '달천예술창작공간',
    },
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Gijo — SAF Online' : '기조 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Gijo from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 기조 작품을 소개합니다.',
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
        {/* Hero Section — 평면과 부조의 결: 깎아 낸 결 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 깎인 결 모티프 — 평면 위에 새겨지는 부조의 선 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/25" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Gijo · Visual Artist' : '기조 · 시각예술'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  What conflict
                  <br />
                  <span className="text-primary-soft">leaves behind</span>
                </>
              ) : (
                <>
                  갈등이
                  <br />
                  <span className="text-primary-soft">남겨 두는 것</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Gijo paints the surface, then carves into it.</span>
                  <span className="mt-2 block">
                    Residual emotion, given form between the planar and the relief.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">표면을 그리고, 다시 그것을 깎아 낸다.</span>
                  <span className="mt-2 block">평면과 부조 사이에 형상이 되는 잔여의 감정.</span>
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
                    Paint and chisel —<br />
                    <span className="text-primary-strong">the feeling that remains</span>
                  </>
                ) : (
                  <>
                    붓과 끌 —<br />
                    <span className="text-primary-strong">남겨지는 감정</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Gijo is a visual artist whose subject is, before anything else, what conflict
                      leaves behind. Not the conflict itself — not its noise or its event — but the
                      sediment that settles once it has passed: the residual emotion that stays in a
                      person after the argument is over, the relationship has shifted, the room has
                      gone quiet.
                    </p>
                    <p>
                      Gijo gives this aftermath two bodies. One is{' '}
                      <strong className="font-bold text-charcoal-deep">flat painting</strong> — the
                      worked surface, colour and mark laid onto a plane. The other is{' '}
                      <strong className="font-bold text-charcoal-deep">painted wood carving</strong>{' '}
                      — wood cut, shaped, and then coloured, so that feeling is not only depicted
                      but physically taken out of the material. Between the two Gijo keeps a
                      deliberate conversation going: what the brush can only suggest on a surface,
                      the chisel can press into depth.
                    </p>
                    <p>
                      To carve is to subtract. A gouge does not add to the wood; it removes, and
                      what remains is defined by what has been taken away. This is an apt grammar
                      for an art about residue — the form that is left once something has been lost
                      is, in a literal sense, the form Gijo is after. The painted surface and the
                      carved relief become two ways of asking the same question: what stays in us
                      after the conflict has gone.
                    </p>
                    <p>
                      Gijo works as a resident artist at the{' '}
                      <strong className="font-bold text-charcoal">
                        Dalcheon Art Creation Space
                      </strong>
                      , a working residency that gives the practice its room and its rhythm — the
                      slow, repeated labour that both painting in layers and carving in wood demand.
                      It is from inside that working life that these objects emerge: planar and
                      carved, coloured and cut, each holding the quiet weight of what is left
                      behind.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      기조는 무엇보다 갈등 이후 남겨지는 것을 주제로 삼는 시각예술가다. 갈등 그
                      자체가 아니라 — 그 소란이나 사건이 아니라 — 그것이 지나간 뒤 가라앉는 침전물.
                      말다툼이 끝나고, 관계가 어긋나고, 방이 고요해진 다음 한 사람 안에 남는{' '}
                      <strong className="font-bold text-charcoal-deep">잔여의 감정</strong>.
                    </p>
                    <p>
                      그는 이 뒤끝에 두 개의 몸을 부여한다. 하나는{' '}
                      <strong className="font-bold text-charcoal-deep">평면 회화</strong>다 — 평면에
                      색과 흔적을 올린, 다루어진 표면. 다른 하나는{' '}
                      <strong className="font-bold text-charcoal-deep">목각 채색</strong>이다 —
                      나무를 깎고 다듬어 형태를 낸 뒤 채색하여, 감정이 단지 묘사되는 데 그치지 않고
                      재료 바깥으로 물리적으로 끄집어내어지게 한다. 그 둘 사이에서 그는 의도된
                      대화를 이어 간다. 붓이 표면 위에 암시만 할 수 있는 것을, 끌은 깊이로 눌러
                      새긴다.
                    </p>
                    <p>
                      깎는다는 것은 덜어 내는 일이다. 끌은 나무에 무언가를 더하지 않는다. 그것은
                      덜어 내고, 남은 것은 덜어 낸 것에 의해 규정된다. 이것은 잔여를 다루는 예술에
                      꼭 맞는 문법이다 — 무언가를 잃은 뒤 남는 형상이야말로, 말 그대로 그가 좇는
                      형상이기 때문이다. 그려진 표면과 깎인 부조는 같은 물음을 던지는 두 방식이
                      된다. 갈등이 지나간 뒤 우리 안에 무엇이 남는가.
                    </p>
                    <p>
                      그는 <strong className="font-bold text-charcoal">달천예술창작공간</strong>의
                      입주 작가로 작업한다. 그 레지던시는 작업에 자리와 리듬을 내어 준다 — 겹을 쌓는
                      회화도, 나무를 깎는 목각도 함께 요구하는 느리고 반복되는 노동의 리듬. 그의
                      사물들은 바로 그 작업의 시간 안에서 태어난다. 평면이자 부조이고, 채색된 동시에
                      깎인, 저마다 남겨진 것의 고요한 무게를 품은 사물들로.
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
                        {isEnglish ? 'What conflict leaves behind' : '갈등 이후 남겨지는 것'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not the conflict itself but its residue — the emotion that settles in a person once the event has passed.'
                          : '갈등 그 자체가 아니라 그 잔여 — 사건이 지나간 뒤 한 사람 안에 가라앉는 감정.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Painted surface and carved relief' : '평면과 목각의 병행'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Flat painting and painted wood carving held in conversation — what the brush suggests on a plane, the chisel presses into depth.'
                          : '평면 회화와 목각 채색을 나란히 둔 작업. 붓이 평면에 암시하는 것을, 끌은 깊이로 새긴다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Carving as subtraction' : '덜어 냄으로서의 깎기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'To carve is to remove; what remains is defined by what was taken away — a fitting grammar for an art about residue.'
                          : '깎는다는 것은 덜어 내는 일. 남은 것은 덜어 낸 것에 의해 규정된다 — 잔여를 다루는 데 꼭 맞는 문법.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Practice & residency' : '작업과 레지던시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident artist at the Dalcheon Art Creation Space.'
                        : '달천예술창작공간 입주 작가.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: flat painting and painted wood carving.'
                        : '매체: 평면 회화 및 목각 채색.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Subject: the emotions left behind after conflict.'
                        : '주제: 갈등 이후 남겨지는 감정.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 작업론 중심 (이력 짧음) */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on residue, surface, and the cut</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">잔여와 표면, 그리고 깎음에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 잔여의 감정 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Residue — the subject is the aftermath'
                    : '잔여의 감정 — 주제는 뒤끝이다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most art about conflict reaches for the conflict — the clash, the rupture,
                        the dramatic moment when something breaks. Gijo&apos;s work begins after
                        that moment has already gone. The subject is not the storm but the silence
                        that follows it: the particular feeling that stays in a person once the
                        argument is finished, the relationship has changed, and there is nothing
                        left to do but live with what remains.
                      </p>
                      <p>
                        This is a quieter and harder subject than conflict itself. An event can be
                        depicted; residue can only be held. The feeling left after a conflict has no
                        clear outline — it lingers, dulls, resurfaces, settles. To make it into an
                        object is to ask how something so formless can be given a form without being
                        falsified, without being made louder or neater than it actually is.
                      </p>
                      <p>
                        The answer is to treat the emotion as material rather than as scene. Gijo
                        does not illustrate the cause of a feeling but works the feeling itself —
                        layering it onto a surface, or cutting it out of wood — until the residue
                        has a body one can stand in front of.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        갈등을 다루는 대부분의 예술은 갈등 그 자체를 향한다 — 충돌, 파열, 무언가가
                        부서지는 극적인 순간. 기조의 작업은 그 순간이 이미 지나간 다음에서 시작한다.
                        그의 주제는 폭풍이 아니라 그 뒤에 오는 고요다. 말다툼이 끝나고, 관계가
                        달라지고, 남은 것을 안고 살아가는 일밖에 할 게 없어진 뒤 한 사람 안에 남는,
                        그 특정한 감정.
                      </p>
                      <p>
                        이것은 갈등 그 자체보다 더 조용하고 더 어려운 주제다. 사건은 묘사될 수
                        있지만, 잔여는 붙드는 수밖에 없다. 갈등 이후 남는 감정에는 또렷한 윤곽이
                        없다 — 그것은 서성이고, 무뎌지고, 다시 떠오르고, 가라앉는다. 그것을 사물로
                        만든다는 것은, 그토록 형체 없는 것에 어떻게 형상을 부여하되 그것을 위조하지
                        않을지를 묻는 일이다. 실제보다 더 요란하거나 더 말끔하게 만들지 않으면서.
                      </p>
                      <p>
                        그의 대답은 감정을 장면이 아니라 재료로 다루는 것이다. 그는 감정의 원인을
                        설명하지 않는다. 감정 그 자체를 다룬다 — 표면 위에 겹겹이 올리거나, 나무에서
                        깎아 내면서 — 그 잔여가 앞에 마주 설 수 있는 몸을 가질 때까지.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 평면과 부조 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Surface and relief — two bodies for one feeling'
                    : '평면과 부조 — 하나의 감정을 위한 두 개의 몸'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Gijo works in two media at once, and the pairing is not incidental. Flat
                        painting and painted wood carving are not simply two things Gijo happens to
                        do; they are two ways of approaching the same question, each reaching where
                        the other cannot.
                      </p>
                      <p>
                        On the painted surface, feeling is suggestion. Colour bleeds, marks overlap,
                        and the plane holds a kind of atmosphere — a residue read across a flat
                        field the eye can travel without obstruction. The painting offers breadth:
                        the wide, even spread of a mood.
                      </p>
                      <p>
                        In the carved relief, feeling becomes depth. Where the brush moves across,
                        the chisel moves into. Wood is cut, shaped, raised and recessed, and then
                        colour is laid over the carved form, so that light catches the ridges and
                        pools in the hollows. The same emotion that the painting spreads out, the
                        carving pushes down — and the work as a whole lives in the conversation
                        between the two: surface and depth, brushed and cut, planar and dimensional.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        기조는 두 매체를 동시에 다루며, 그 짝지음은 우연이 아니다. 평면 회화와 목각
                        채색은 그가 그저 둘 다 하게 된 두 가지가 아니다. 그것은 같은 물음에 다가가는
                        두 방식이고, 저마다 다른 하나가 닿지 못하는 곳에 닿는다.
                      </p>
                      <p>
                        그려진 표면 위에서 감정은 암시다. 색이 번지고, 흔적이 겹치고, 평면은 일종의
                        분위기를 머금는다 — 눈이 막힘없이 가로지르는 평평한 장(場) 위로 읽히는 잔여.
                        회화는 넓이를 내어 준다. 한 정서가 고르게 펼쳐지는 너른 면을.
                      </p>
                      <p>
                        깎인 부조에서 감정은 깊이가 된다. 붓이 가로질러 지나가는 자리를, 끌은 안으로
                        파고든다. 나무는 잘리고 다듬어지며 돋우어지고 패이고, 그렇게 깎인 형태 위에
                        채색이 올라가, 빛이 능선에 걸리고 골에 고인다. 회화가 펼쳐 놓는 같은 감정을
                        목각은 눌러 내린다 — 그리고 작업 전체는 그 둘 사이의 대화 속에 산다. 표면과
                        깊이, 그려진 것과 깎인 것, 평면과 입체.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 달천예술창작공간 — 작업의 시간 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Dalcheon — the slow time of the studio'
                    : '달천예술창작공간 — 작업의 느린 시간'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Gijo works as a resident artist at the Dalcheon Art Creation Space. A
                        residency is not a backdrop to a practice; it is a condition of it. To carve
                        wood and to build a painting in layers are both slow forms of labour, and
                        slow labour needs a place that holds steady around it — room, time, and the
                        permission to repeat.
                      </p>
                      <p>
                        Both of these media reward patience. Carving cannot be rushed; a cut, once
                        made, cannot be unmade, so the hand must move with the deliberation of
                        something that knows it cannot take anything back. Painting in layers asks
                        for the same composure — each pass settling before the next, the surface
                        deepening by accumulation rather than by force. The residency gives this
                        rhythm somewhere to live.
                      </p>
                      <p>
                        It is from inside that working life that these objects come — neither
                        sketches nor statements but things made over time, each carrying the quiet
                        weight of what conflict leaves behind. The studio is where the residue is
                        given its slow, deliberate body.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        기조는 달천예술창작공간의 입주 작가로 작업한다. 레지던시는 작업의 배경이
                        아니라 작업의 조건이다. 나무를 깎는 일도, 회화를 겹겹이 쌓아 올리는 일도
                        느린 노동의 형식이고, 느린 노동에는 그 둘레에서 흔들리지 않고 버텨 주는
                        자리가 필요하다 — 공간과 시간, 그리고 반복할 수 있는 허락.
                      </p>
                      <p>
                        그의 두 매체는 모두 인내에 보답한다. 깎기는 서두를 수 없다. 한번 낸 칼자국은
                        되돌릴 수 없기에, 손은 아무것도 무를 수 없음을 아는 것의 신중함으로 움직여야
                        한다. 겹을 쌓는 회화도 같은 침착함을 요구한다 — 다음 겹을 올리기 전에 한
                        겹이 가라앉기를 기다리며, 화면은 힘이 아니라 축적으로 깊어진다. 레지던시는
                        이 리듬에 머물 자리를 내어 준다.
                      </p>
                      <p>
                        그의 사물들은 바로 그 작업의 시간 안에서 나온다 — 스케치도 선언도 아닌,
                        시간을 들여 만들어진 것들. 저마다 갈등이 남겨 둔 것의 고요한 무게를 품은
                        채로. 작업실은 그 잔여가 느리고 신중한 몸을 얻는 자리다.
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
                      Between the painted surface and the carved relief, Gijo pursues a single,
                      patient question: how does one give a body to the emotion that conflict leaves
                      behind? Gijo joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that the proceeds of the work might become a
                      low-interest lifeline for artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      그려진 표면과 깎인 부조 사이에서, 기조는 하나의 차분한 물음을 추구한다 —
                      갈등이 남겨 두는 감정에 어떻게 몸을 부여할 것인가. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 작품 판매 수익이
                      오늘 금융 차별을 겪는 예술인에게 저금리의 버팀목이 될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Gijo</span>
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
                    Gijo joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    기조 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={GIJO_PATH}
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
