import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import SafeImage from '@/components/common/SafeImage';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { getArtworksByExhibition } from '@/lib/supabase-data';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { resolveLocale } from '@/lib/server-locale';
import { createLocaleAlternates } from '@/lib/locale-alternates';
import { createStandardPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { resolveEnRobots } from '@/lib/en-indexable';
import { SITE_URL } from '@/lib/constants';
import type { Artwork, ArtworkListItem } from '@/types';

export const dynamic = 'force-static';

const PAGE_PATH = '/exhibition/oh-yoon-terracotta';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });

  const title = t('heroTitle');
  const description = t('heroDescription');

  const base = createStandardPageMetadata(title, description, PAGE_URL, PAGE_PATH, locale);
  const robots = resolveEnRobots(locale, true);

  return {
    ...base,
    alternates: createLocaleAlternates(PAGE_PATH, locale, false),
    ...(robots && { robots }),
  };
}

export default async function ExhibitionOhYoonTerracottaPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });

  const artworks = await getArtworksByExhibition(OH_YOON_TERRACOTTA_EXHIBITION.slug);
  const listArtworks: ArtworkListItem[] = artworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: locale === 'en' ? 'Home' : '홈', url: SITE_URL },
    { name: t('breadcrumb'), url: PAGE_URL },
  ]);

  const deadlines = [
    { when: t('ch2When1'), what: t('ch2What1') },
    { when: t('ch2When2'), what: t('ch2What2') },
    { when: t('ch2When3'), what: t('ch2What3') },
  ];
  const steps = [t('ch3Step1'), t('ch3Step2'), t('ch3Step3')];

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />

      {/* ① 히어로 — 벽이 사라지기 전에 (full-bleed 다크 + 테라코타 배경 + 지층 라인) */}
      <header className="relative isolate overflow-hidden bg-charcoal text-white">
        <div className="absolute inset-0 -z-10">
          <SafeImage
            src="/images/petition-oh-yoon/mural-1.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/80" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-[8%] h-full w-px bg-white/10" />
          <div className="absolute top-0 left-[22%] h-full w-px bg-primary/25" />
          <div className="absolute top-0 right-[12%] h-full w-px bg-white/10" />
        </div>

        <div className="container-max mx-auto flex min-h-[72vh] min-h-[72svh] flex-col justify-center px-4 py-24 md:py-32">
          <p className="text-eyebrow mb-6 text-sun">{t('heroEyebrow')}</p>
          <h1 className="max-w-4xl font-display text-4xl font-black leading-[1.05] tracking-tighter text-balance drop-shadow-sm sm:text-6xl md:text-7xl lg:text-8xl">
            {t('heroDisplayLine1')}
            <br />
            {t('heroDisplayLine2')}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed break-keep text-white/85 md:text-xl">
            {t('heroLead')}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.fundingHref} variant="primary">
              {t('fundingCta')}
            </LinkButton>
            <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
              {t('petitionCta')}
            </LinkButton>
          </div>
        </div>
        <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
      </header>

      {/* ② 챕터 1 — 한 노동자가 벽에 새긴 것 (유물, 라이트) */}
      <section className="bg-canvas-soft py-20 md:py-28">
        <div className="container-max mx-auto max-w-5xl px-4">
          <p className="text-eyebrow mb-3 text-primary-strong">{t('ch1Eyebrow')}</p>
          <h2 className="border-l-[12px] border-charcoal pl-5 font-section text-3xl font-bold leading-tight text-charcoal-deep text-balance md:pl-6 md:text-5xl">
            {t('ch1Title')}
          </h2>

          <blockquote className="relative mx-auto my-12 max-w-3xl border-4 border-charcoal bg-white p-8 text-center shadow-[8px_8px_0px_0px_rgba(49,57,60,0.1)] md:my-16 md:p-14">
            <span
              aria-hidden="true"
              className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-3xl font-black text-white"
            >
              &ldquo;
            </span>
            <p className="font-display text-2xl font-black leading-snug text-charcoal-deep text-balance break-keep md:text-4xl">
              {t('ch1Quote')}
            </p>
            <footer className="mt-6 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-charcoal/40" />
              <span className="text-base font-bold tracking-widest text-charcoal md:text-lg">
                {t('ch1QuoteBy')}
              </span>
              <span className="h-px w-8 bg-charcoal/40" />
            </footer>
          </blockquote>

          <p className="mx-auto max-w-2xl text-base leading-relaxed break-keep text-charcoal md:text-lg">
            {t('ch1Body')}
          </p>

          <figure className="mt-12 grid gap-3 md:grid-cols-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-1.webp"
                alt={t('muralAltFront')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-2.webp"
                alt={t('muralAltDetail')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-3.webp"
                alt={t('muralAltBack')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
              <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-charcoal-deep backdrop-blur-sm">
                {t('muralBadge')}
              </div>
            </div>
            <figcaption className="mt-1 text-center text-xs text-charcoal-muted md:col-span-3">
              {t('muralCaption')}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ③ 챕터 2 — 50년, 그리고 8월 (위기, 다크 + 시한) */}
      <section className="relative overflow-hidden bg-charcoal-deep py-20 text-white md:py-28">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-2 -z-0 select-none font-display text-[22vw] font-black leading-none text-white/[0.04]"
        >
          2026
        </span>
        <div className="container-max relative mx-auto max-w-4xl px-4">
          <p className="text-eyebrow mb-3 text-sun">{t('ch2Eyebrow')}</p>
          <h2 className="border-l-[12px] border-sun pl-5 font-section text-4xl font-black leading-tight text-balance md:pl-6 md:text-6xl">
            {t('ch2Title')}
          </h2>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed break-keep text-white/85 md:text-xl">
            {t('ch2Body')}
          </p>
          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {deadlines.map((d) => (
              <li key={d.what} className="border-t-2 border-white/20 pt-4">
                <div className="font-display text-3xl font-black tabular-nums text-sun md:text-4xl">
                  {d.when}
                </div>
                <div className="mt-2 text-sm text-white/70 md:text-base">{d.what}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ④ 챕터 3 — 작가들이 벽을 듭니다 (연대 · 기금 메커니즘, 라이트) */}
      <section className="bg-canvas py-20 md:py-28">
        <div className="container-max mx-auto max-w-4xl px-4 text-center">
          <p className="text-eyebrow mb-3 text-primary-strong">{t('ch3Eyebrow')}</p>
          <h2 className="font-section text-3xl font-bold leading-tight text-charcoal-deep text-balance md:text-5xl">
            {t('ch3Title')}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed break-keep text-charcoal-muted md:text-lg">
            {t('ch3Body')}
          </p>
          <ol className="mx-auto mt-12 grid max-w-3xl gap-6 text-left md:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step}
                className="rounded-2xl border border-gallery-hairline bg-white p-6 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-charcoal font-display text-lg font-black tabular-nums text-charcoal-deep">
                  {i + 1}
                </span>
                <p className="mt-4 text-base font-medium leading-snug break-keep text-charcoal-deep">
                  {step}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.fundingHref} variant="primary">
              {t('fundingCta')}
            </LinkButton>
            <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
              {t('petitionCta')}
            </LinkButton>
          </div>
          <p className="mt-6 text-sm text-charcoal-muted">
            <Link
              href="/exhibition/oh-yoon-terracotta/apply"
              className="font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              {t('ch3ArtistLink')}
            </Link>
          </p>
        </div>
      </section>

      {/* ⑤ 출품작 갤러리 (다크) */}
      <section className="relative overflow-hidden bg-charcoal py-20 text-white md:py-28">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 -z-0 -translate-x-1/2 select-none font-display text-[18vw] font-black uppercase leading-none tracking-tighter text-white/[0.04]"
        >
          SEED ART
        </span>
        <div className="container-max relative mx-auto px-4">
          <p className="text-eyebrow mb-3 text-sun">{t('galleryEyebrow')}</p>
          <h2 className="mb-10 font-section text-3xl font-black leading-tight md:text-5xl">
            {t('galleryTitle')}
          </h2>
          {listArtworks.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-16 text-center backdrop-blur-sm">
              <p className="text-base leading-relaxed break-keep text-white/70 md:text-lg">
                {t('galleryEmpty')}
              </p>
            </div>
          ) : (
            <MasterArtistGallery
              artworks={listArtworks}
              returnTo="%2Fexhibition%2Foh-yoon-terracotta"
            />
          )}
        </div>
      </section>

      {/* ⑥ 클로징 */}
      <section className="bg-charcoal-deep py-20 text-center text-white md:py-28">
        <div className="container-max mx-auto max-w-3xl px-4">
          <p className="font-display text-2xl font-black leading-snug text-balance break-keep md:text-4xl">
            {t('closingLine')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.fundingHref} variant="primary">
              {t('fundingCta')}
            </LinkButton>
            <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
              {t('petitionCta')}
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
