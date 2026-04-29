import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, SITE_URL, SHIPPING_REFUND_POLICY_VERSION } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { SHIPPING_REFUND_POLICY_DOCUMENT } from '@/lib/legal-documents';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { formatEffectiveDateForLocale } from '@/lib/utils';
import { resolveLocale } from '@/lib/server-locale';

export const revalidate = false;

const PAGE_PATH = '/refund-policy';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_COPY = {
  ko: {
    title: '배송·교환·환불 안내',
    description:
      '씨앗페 온라인에서 판매하는 미술 작품의 배송, 주문 취소, 청약철회, 교환·반품, 환불 절차를 「전자상거래법」 기준으로 안내합니다.',
  },
  en: {
    title: 'Shipping, Exchange & Refund Policy',
    description:
      'Shipping, order cancellation, withdrawal, exchange, return, and refund procedures for artworks sold on SAF Online, in accordance with Korean e-commerce law.',
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

export default async function RefundPolicyPage() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl(PAGE_PATH, locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('refundPolicy'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const doc = SHIPPING_REFUND_POLICY_DOCUMENT;
  const effectiveDate = formatEffectiveDateForLocale(doc.effectiveDate, locale);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={breadcrumbSchema} />
        <PageHero
          title="Shipping, Exchange & Refund Policy"
          description="Shipping and refund procedures for SAF Online. The official legal text is currently maintained in Korean."
          breadcrumbItems={breadcrumbItems}
        />

        <Section variant="white" className="pb-24 md:pb-32">
          <div className="container-max">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10 space-y-6">
              <p className="text-sm text-charcoal-muted">Effective date: {effectiveDate}</p>
              <p className="text-sm text-charcoal-muted">
                Version: {SHIPPING_REFUND_POLICY_VERSION}
              </p>

              <div className="rounded-lg bg-canvas p-5 text-sm leading-7 text-charcoal-muted">
                The official Shipping, Exchange & Refund Policy is currently provided in Korean.
                <br />
                Please refer to the Korean version for legally binding interpretation.
              </div>

              <section>
                <SectionTitle className="mb-4">Contact</SectionTitle>
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
        title="배송·교환·환불 안내"
        description="씨앗페 온라인의 배송, 주문 취소, 청약철회, 교환·반품 및 환불 절차를 안내합니다."
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {effectiveDate}</p>
            <p className="mb-8 text-sm text-charcoal-muted">
              버전: {SHIPPING_REFUND_POLICY_VERSION}
            </p>

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
                        <thead className="bg-canvas">
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
                            <tr key={rowIdx} className="even:bg-canvas">
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
