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

  const [titleLine1, titleLine2] = t('heroTitle').split('\n');

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

      {/* 히어로 — 작가 초대 (다크 + 테라코타 배경) */}
      <header className="relative isolate overflow-hidden bg-charcoal text-white">
        <div className="absolute inset-0 -z-10">
          <SafeImage
            src="/images/petition-oh-yoon/mural-2.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/85" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-[10%] h-full w-px bg-white/10" />
          <div className="absolute top-0 right-[16%] h-full w-px bg-primary/25" />
        </div>

        <div className="container-max mx-auto flex min-h-[62vh] min-h-[62svh] flex-col justify-center px-4 py-24 md:py-28">
          <p className="text-eyebrow mb-6 text-sun">{t('heroEyebrow')}</p>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.08] tracking-tighter text-balance drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl">
            {titleLine1}
            <br />
            {titleLine2}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed break-keep text-white/85 md:text-xl">
            {t('heroLead')}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <LinkButton href={FUNDRAISER_PATH} variant="primary">
              {t('ctaApply')}
            </LinkButton>
            <LinkButton href={EXHIBITION_PATH} variant="secondary">
              {t('ctaView')}
            </LinkButton>
          </div>
        </div>
      </header>

      {/* 출품 안내 — 3 포인트 (라이트) */}
      <section className="bg-canvas-soft py-20 md:py-28">
        <div className="container-max mx-auto max-w-5xl px-4">
          <h2 className="border-l-[12px] border-charcoal pl-5 font-section text-3xl font-bold leading-tight text-charcoal-deep text-balance md:pl-6 md:text-4xl">
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
        </div>
      </section>

      {/* 출품 방법 — 스텝 (다크) */}
      <section className="bg-charcoal-deep py-20 text-white md:py-28">
        <div className="container-max mx-auto max-w-3xl px-4">
          <p className="text-eyebrow mb-3 text-sun">{t('stepsTitle')}</p>
          <ol className="mt-6 space-y-6">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-4 border-t border-white/15 pt-6">
                <span className="shrink-0 font-display text-2xl font-black tabular-nums text-sun">
                  {i + 1}
                </span>
                <p className="text-base leading-relaxed break-keep text-white/85 md:text-lg">
                  {step}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-10 rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm leading-relaxed break-keep text-white/70 backdrop-blur-sm md:text-base">
            {t('note')}
          </p>
        </div>
      </section>

      {/* 클로징 CTA */}
      <section className="bg-charcoal py-20 text-center text-white md:py-28">
        <div className="container-max mx-auto max-w-3xl px-4">
          <p className="font-display text-2xl font-black leading-snug text-balance break-keep md:text-4xl">
            {t('closingTitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href={FUNDRAISER_PATH} variant="primary">
              {t('ctaApply')}
            </LinkButton>
            <LinkButton href={JOIN_PATH} variant="secondary">
              {t('ctaJoin')}
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
