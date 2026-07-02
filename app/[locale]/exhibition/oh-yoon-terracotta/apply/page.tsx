import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import LinkButton from '@/components/ui/LinkButton';
import SafeImage from '@/components/common/SafeImage';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { resolveLocale } from '@/lib/server-locale';
import { createLocaleAlternates } from '@/lib/locale-alternates';
import { createStandardPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { resolveEnRobots } from '@/lib/en-indexable';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-static';

const PAGE_PATH = '/exhibition/oh-yoon-terracotta/apply';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const FUNDRAISER_PATH = '/dashboard/fundraiser';
const EXHIBITION_PATH = '/exhibition/oh-yoon-terracotta';
const JOIN_PATH = '/signup';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta.apply' });

  const title = t('heroTitle').replace(/\n/g, ' ');
  const description = t('metaDescription');

  const base = createStandardPageMetadata(title, description, PAGE_URL, PAGE_PATH, locale);
  const robots = resolveEnRobots(locale, true);

  return {
    ...base,
    alternates: createLocaleAlternates(PAGE_PATH, locale, false),
    ...(robots && { robots }),
  };
}

export default async function ExhibitionApplyPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta.apply' });

  const [heroLine1, heroLine2] = t('heroTitle').split('\n');

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: locale === 'en' ? 'Home' : '홈', url: SITE_URL },
    { name: t('breadcrumb'), url: PAGE_URL },
  ]);

  const points = [
    { title: t('how1Title'), body: t('how1Body') },
    { title: t('how2Title'), body: t('how2Body') },
    { title: t('how3Title'), body: t('how3Body') },
  ];
  const steps = [t('step1'), t('step2'), t('step3')];

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />

      {/* ① 히어로 — 작가에게 보내는 밝은 초대장 (전시의 다크 몰입 히어로와 대비) */}
      <header className="border-b border-gallery-hairline bg-canvas-strong">
        <div className="container-max mx-auto max-w-3xl px-4 py-24 text-center md:py-32">
          <div aria-hidden="true" className="mx-auto mb-8 h-px w-16 bg-primary-strong/40" />
          <p className="text-eyebrow mb-6 text-primary-strong">{t('heroEyebrow')}</p>
          <h1 className="font-display text-4xl font-black leading-[1.1] tracking-tight text-charcoal-deep text-balance sm:text-5xl md:text-6xl">
            {heroLine1}
            <br />
            {heroLine2}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed break-keep text-charcoal-muted md:text-xl">
            {t('heroLead')}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <LinkButton href={FUNDRAISER_PATH} variant="primary">
              {t('ctaApply')}
            </LinkButton>
            <LinkButton href={EXHIBITION_PATH} variant="secondary">
              {t('ctaView')}
            </LinkButton>
          </div>
        </div>
      </header>

      {/* ② 무엇을 지키는가 (유물, 라이트) */}
      <section className="bg-canvas-soft py-20 md:py-28">
        <div className="container-max mx-auto max-w-5xl px-4">
          <p className="text-eyebrow mb-3 text-primary-strong">{t('s2Eyebrow')}</p>
          <h2 className="border-l-[12px] border-charcoal pl-5 font-section text-3xl font-bold leading-tight text-charcoal-deep text-balance md:pl-6 md:text-5xl">
            {t('s2Title')}
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-relaxed break-keep text-charcoal md:text-lg">
            {t('s2Body')}
          </p>
          <figure className="mt-12 grid gap-3 md:grid-cols-3">
            {[
              { src: '/images/petition-oh-yoon/mural-1.webp', alt: t('muralAltFront') },
              { src: '/images/petition-oh-yoon/mural-2.webp', alt: t('muralAltDetail') },
              { src: '/images/petition-oh-yoon/mural-3.webp', alt: t('muralAltBack') },
            ].map((img) => (
              <div
                key={img.src}
                className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep"
              >
                <SafeImage
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
            <figcaption className="mt-1 text-center text-xs text-charcoal-muted md:col-span-3">
              {t('muralCaption')}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ③ 나누는 마음 (오윤 어록, 다크) */}
      <section className="bg-charcoal py-20 text-white md:py-28">
        <div className="container-max mx-auto max-w-4xl px-4">
          <p className="text-eyebrow mb-8 text-center text-sun">{t('s3Eyebrow')}</p>
          <blockquote className="relative mx-auto max-w-3xl border-4 border-white/15 bg-white/[0.04] p-8 text-center backdrop-blur-sm md:p-14">
            <span
              aria-hidden="true"
              className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-primary font-display text-3xl font-black text-white"
            >
              &ldquo;
            </span>
            <p className="font-display text-2xl font-black leading-snug text-balance break-keep md:text-4xl">
              {t('s3Quote')}
            </p>
            <footer className="mt-6 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-white/30" />
              <span className="text-base font-bold tracking-widest text-white/80 md:text-lg">
                {t('s3QuoteBy')}
              </span>
              <span className="h-px w-8 bg-white/30" />
            </footer>
          </blockquote>
          <p className="mx-auto mt-10 max-w-2xl text-base leading-relaxed break-keep text-white/85 md:text-lg">
            {t('s3Body')}
          </p>
        </div>
      </section>

      {/* ④ 당신의 자리 (연대의 의의, canvas) */}
      <section className="bg-canvas py-20 md:py-28">
        <div className="container-max mx-auto max-w-3xl px-4">
          <p className="text-eyebrow mb-3 text-primary-strong">{t('s4Eyebrow')}</p>
          <h2 className="font-section text-3xl font-bold leading-tight text-charcoal-deep text-balance md:text-5xl">
            {t('s4Title')}
          </h2>
          <p className="mt-6 text-base leading-relaxed break-keep text-charcoal md:text-lg">
            {t('s4Body')}
          </p>
        </div>
      </section>

      {/* ⑤ 함께해 주시겠습니까 (초대의 절정, 다크) */}
      <section className="bg-charcoal-deep py-20 text-center text-white md:py-28">
        <div className="container-max mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-black leading-tight text-balance break-keep md:text-5xl">
            {t('inviteTitle')}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed break-keep text-white/85 md:text-xl">
            {t('inviteBody')}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <LinkButton href={FUNDRAISER_PATH} variant="primary">
              {t('ctaApply')}
            </LinkButton>
            <LinkButton href={EXHIBITION_PATH} variant="outline-white">
              {t('ctaView')}
            </LinkButton>
          </div>
        </div>
      </section>

      {/* ⑥ 출품 안내 — 실무 코다 (라이트) */}
      <section className="bg-canvas-soft py-20 md:py-28">
        <div className="container-max mx-auto max-w-5xl px-4">
          <h2 className="border-l-[12px] border-charcoal pl-5 font-section text-2xl font-bold leading-tight text-charcoal-deep text-balance md:pl-6 md:text-4xl">
            {t('howTitle')}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {points.map((p, i) => (
              <li
                key={p.title}
                className="rounded-2xl border border-gallery-hairline bg-white p-6 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-charcoal font-display text-lg font-black tabular-nums text-charcoal-deep">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold leading-snug break-keep text-charcoal-deep">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed break-keep text-charcoal-muted md:text-base">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-2xl border border-gallery-hairline bg-white p-6 md:p-8">
            <p className="text-eyebrow mb-4 text-primary-strong">{t('stepsTitle')}</p>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="shrink-0 font-display text-xl font-black tabular-nums text-charcoal-deep">
                    {i + 1}
                  </span>
                  <p className="text-base leading-relaxed break-keep text-charcoal md:text-lg">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-gallery-divider pt-4 text-sm leading-relaxed break-keep text-charcoal-muted">
              {t('note')}
            </p>
          </div>
        </div>
      </section>

      {/* ⑦ 클로징 */}
      <section className="bg-charcoal py-20 text-center text-white md:py-28">
        <div className="container-max mx-auto max-w-3xl px-4">
          <p className="font-display text-2xl font-black leading-snug text-balance break-keep md:text-4xl">
            {t('closingTitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href={FUNDRAISER_PATH} variant="primary">
              {t('ctaApply')}
            </LinkButton>
            <LinkButton href={JOIN_PATH} variant="outline-white">
              {t('ctaJoin')}
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
