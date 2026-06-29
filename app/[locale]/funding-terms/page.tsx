import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, SITE_URL, FUNDING_TERMS_VERSION } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { FUNDING_TERMS_DOCUMENT } from '@/lib/legal-documents';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { formatEffectiveDateForLocale } from '@/lib/utils';
import { resolveLocale } from '@/lib/server-locale';

export const dynamic = 'force-static';
export const revalidate = false;

const PAGE_PATH = '/funding-terms';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_COPY = {
  ko: {
    title: '크라우드펀딩 후원 약관',
    description:
      '씨앗페 온라인 크라우드펀딩의 후원 신청, 후원금 집행(Keep-it-All), 리워드 제공, 청약철회 및 환불 절차를 「전자상거래법」 기준으로 안내합니다.',
  },
  en: {
    title: 'Crowdfunding Pledge Terms',
    description:
      'Pledge, fund allocation (Keep-it-All), reward delivery, withdrawal, and refund procedures for SAF Online crowdfunding, in accordance with Korean e-commerce law.',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  const base = createStandardPageMetadata(title, copy.description, PAGE_URL, PAGE_PATH, locale);
  // 환불정책과 동일 정책: en은 KO 원문 안내 + noindex (법적 구속력은 KO 기준).
  if (locale === 'en') {
    return {
      ...base,
      alternates: createLocaleAlternates(PAGE_PATH, locale, true),
      robots: { index: false, follow: true },
    };
  }
  return {
    ...base,
    alternates: createLocaleAlternates(PAGE_PATH, locale, true),
  };
}

export default async function FundingTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const pageUrl = buildLocaleUrl(PAGE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('fundingTerms'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const doc = FUNDING_TERMS_DOCUMENT;
  const effectiveDate = formatEffectiveDateForLocale(doc.effectiveDate, locale);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={breadcrumbSchema} />
        <PageHero
          title="Crowdfunding Pledge Terms"
          description="Pledge terms for SAF Online crowdfunding. The official legal text is currently maintained in Korean."
          breadcrumbItems={breadcrumbItems}
        />

        <Section variant="white" className="pb-24 md:pb-32">
          <div className="container-max">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10 space-y-6">
              <p className="text-sm text-charcoal-muted">Effective date: {effectiveDate}</p>
              <p className="text-sm text-charcoal-muted">Version: {FUNDING_TERMS_VERSION}</p>

              <div className="rounded-lg bg-canvas p-5 text-sm leading-7 text-charcoal-muted">
                The official Crowdfunding Pledge Terms are currently provided in Korean.
                <br />
                Please refer to the Korean version for legally binding interpretation.
              </div>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-4 leading-snug text-balance">
                  Contact
                </h2>
                <div className="rounded-lg bg-canvas p-4 text-sm leading-7">
                  <p>
                    Email:{' '}
                    <a href={`mailto:${CONTACT.EMAIL}`} className="hover:underline">
                      {CONTACT.EMAIL}
                    </a>
                  </p>
                  <p>
                    Phone:{' '}
                    <a href={`tel:${CONTACT.PHONE.replace(/-/g, '')}`} className="hover:underline">
                      {CONTACT.PHONE}
                    </a>
                  </p>
                </div>
                <p className="mt-4 text-sm text-charcoal-muted">Document URL: {PAGE_URL}</p>
              </section>
            </div>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="크라우드펀딩 후원 약관"
        description="씨앗페 온라인 크라우드펀딩의 후원, 후원금 집행, 리워드, 청약철회 및 환불 절차를 안내합니다."
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {effectiveDate}</p>
            <p className="mb-8 text-sm text-charcoal-muted">버전: {FUNDING_TERMS_VERSION}</p>

            {doc.preamble && (
              <div className="mb-10 rounded-lg bg-canvas p-5 text-sm leading-7 text-charcoal-muted">
                {doc.preamble.map((line) => (
                  <p key={line} className="mb-2 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-10 text-charcoal">
              {doc.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-4 leading-snug text-balance">
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mb-2 leading-7 text-charcoal-muted last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 leading-7 text-charcoal-muted">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {section.subsections?.map((sub, idx) => (
                    <div key={idx} className="mt-2 pl-4">
                      <p className="mb-1 font-medium text-charcoal-muted">{sub.text}</p>
                      {sub.bullets && (
                        <ul className="list-disc space-y-1 pl-5 leading-7 text-charcoal-muted">
                          {sub.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              ))}

              {doc.appendix && (
                <section>
                  <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-4 leading-snug text-balance">
                    부칙
                  </h2>
                  {doc.appendix.map((line) => (
                    <p key={line} className="mb-2 leading-7 text-charcoal-muted last:mb-0">
                      {line}
                    </p>
                  ))}
                </section>
              )}

              <section>
                <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-4 leading-snug text-balance">
                  문의처
                </h2>
                <div className="rounded-lg bg-canvas p-4 text-sm leading-7">
                  <p>
                    이메일:{' '}
                    <a href={`mailto:${CONTACT.EMAIL}`} className="hover:underline">
                      {CONTACT.EMAIL}
                    </a>
                  </p>
                  <p>
                    연락처:{' '}
                    <a href={`tel:${CONTACT.PHONE.replace(/-/g, '')}`} className="hover:underline">
                      {CONTACT.PHONE}
                    </a>
                  </p>
                </div>
                <p className="mt-4 text-sm text-charcoal-muted">문서 URL: {PAGE_URL}</p>
              </section>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
