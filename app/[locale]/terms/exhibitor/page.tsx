import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { CONTACT, EXHIBITOR_APPLICATION_TERMS_VERSION, SITE_URL } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { EXHIBITOR_APPLICATION_TERMS_DOCUMENT } from '@/lib/legal-documents';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { formatEffectiveDateForLocale } from '@/lib/utils';
import { resolveLocale } from '@/lib/server-locale';

export const revalidate = false;

const PAGE_PATH = '/terms/exhibitor';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_COPY = {
  ko: {
    title: '출품자 계약서',
    description:
      '씨앗페 온라인에 작품을 출품하는 예술인을 위한 전시위탁 계약서 전문. 위탁 조건, 판매 수수료, 정산 방식 및 작품 보험에 관한 조항을 안내합니다.',
  },
  en: {
    title: 'Exhibitor Agreement',
    description:
      'Full text of the SAF Online exhibitor consignment agreement. Covers consignment terms, sales commission, settlement process, and artwork insurance provisions.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  const base = createStandardPageMetadata(title, copy.description, PAGE_URL, PAGE_PATH, locale);
  if (locale === 'en') {
    return {
      ...base,
      alternates: createLocaleAlternates(PAGE_PATH, locale, true),
      robots: { index: false, follow: true },
    };
  }
  return base;
}

export default async function ExhibitorTermsPage() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl(PAGE_PATH, locale);
  const termsUrl = buildLocaleUrl('/terms', locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('terms'), url: termsUrl },
    { name: tBreadcrumbs('termsExhibitor'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const doc = EXHIBITOR_APPLICATION_TERMS_DOCUMENT;
  const effectiveDate = formatEffectiveDateForLocale(doc.effectiveDate, locale);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={breadcrumbSchema} />
        <PageHero
          title="Exhibitor Consignment Agreement"
          description="Full exhibitor agreement for SAF Online. The official legal text is currently maintained in Korean."
          breadcrumbItems={breadcrumbItems}
        />

        <Section variant="white" className="pb-24 md:pb-32">
          <div className="container-max">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10 space-y-6">
              <p className="text-sm text-charcoal-muted">Effective date: {effectiveDate}</p>
              <p className="text-sm text-charcoal-muted">
                Version: {EXHIBITOR_APPLICATION_TERMS_VERSION}
              </p>

              <div className="rounded-lg bg-canvas-soft p-5 text-sm leading-7 text-charcoal-muted">
                The official exhibitor agreement text is currently provided in Korean.
                <br />
                Please review the Korean version for legal interpretation.
              </div>

              <section>
                <SectionTitle className="mb-4">Contact</SectionTitle>
                <div className="rounded-lg bg-canvas-soft p-4 text-sm leading-7">
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
        title="출품자 전시위탁 계약서"
        description="씨앗페 온라인 출품자 전시위탁 계약서 전문입니다."
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {effectiveDate}</p>
            <p className="mb-8 text-sm text-charcoal-muted">
              버전: {EXHIBITOR_APPLICATION_TERMS_VERSION}
            </p>

            {doc.preamble && (
              <div className="mb-10 rounded-lg bg-canvas-soft p-5 text-sm leading-7 text-charcoal-muted">
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
                  <SectionTitle className="mb-4">{section.title}</SectionTitle>
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
                  {section.table && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border border-gray-200 text-sm">
                        <thead className="bg-canvas-soft">
                          <tr>
                            {section.table.headers.map((header) => (
                              <th
                                key={header}
                                className="border border-gray-200 px-3 py-2 text-left font-semibold text-charcoal"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="even:bg-canvas-soft">
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="border border-gray-200 px-3 py-2 leading-6 text-charcoal-muted"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}

              {doc.appendix && (
                <section>
                  <SectionTitle className="mb-4">부칙</SectionTitle>
                  {doc.appendix.map((line) => (
                    <p key={line} className="mb-2 leading-7 text-charcoal-muted last:mb-0">
                      {line}
                    </p>
                  ))}
                </section>
              )}

              <section>
                <SectionTitle className="mb-4">문의처</SectionTitle>
                <div className="rounded-lg bg-canvas-soft p-4 text-sm leading-7">
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
