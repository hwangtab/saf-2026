import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, SITE_URL, TERMS_OF_SERVICE_VERSION } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { TERMS_OF_SERVICE_DOCUMENT } from '@/lib/legal-documents';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { formatEffectiveDateForLocale } from '@/lib/utils';
import { resolveLocale } from '@/lib/server-locale';

export const revalidate = false;

const PAGE_PATH = '/terms';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_COPY = {
  ko: {
    title: '이용약관',
    description:
      '씨앗페 온라인 웹사이트 이용약관 및 서비스 이용 시 적용되는 기본 조건을 안내합니다.',
  },
  en: {
    title: 'Terms of Service',
    description: 'Core terms and conditions for using the SAF Online website and related services.',
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

export default async function TermsPage() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl(PAGE_PATH, locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('terms'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const doc = TERMS_OF_SERVICE_DOCUMENT;
  const effectiveDate = formatEffectiveDateForLocale(doc.effectiveDate, locale);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={breadcrumbSchema} />
        <PageHero
          title="Terms of Service"
          description="Core terms for using SAF Online services. The official legal text is currently maintained in Korean."
          breadcrumbItems={breadcrumbItems}
        />

        <Section variant="white" className="pb-24 md:pb-32">
          <div className="container-max">
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10 space-y-6">
              <p className="text-sm text-charcoal-muted">Effective date: {effectiveDate}</p>
              <p className="text-sm text-charcoal-muted">Version: {TERMS_OF_SERVICE_VERSION}</p>

              <div className="rounded-lg bg-canvas p-5 text-sm leading-7 text-charcoal-muted">
                The official Terms of Service text is currently provided in Korean.
                <br />
                Please review the Korean version for legally binding interpretation.
              </div>

              <section>
                <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-4 leading-snug text-balance">
                  Role-specific agreements
                </h2>
                <ul className="list-disc space-y-2 pl-5 text-charcoal-muted">
                  <li>
                    <Link href="/terms/artist" className="hover:underline">
                      View artist agreement
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms/exhibitor" className="hover:underline">
                      View exhibitor agreement
                    </Link>
                  </li>
                </ul>
              </section>

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
        title="이용약관"
        description="씨앗페 온라인 웹사이트와 관련 서비스 이용 시 적용되는 기본 약관입니다."
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {effectiveDate}</p>
            <p className="mb-8 text-sm text-charcoal-muted">버전: {TERMS_OF_SERVICE_VERSION}</p>

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
                  역할별 계약서
                </h2>
                <p className="mb-3 leading-7 text-charcoal-muted">
                  아티스트 또는 출품자로 가입 신청 시에는 아래 역할별 계약서 동의가 추가로
                  필요합니다.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-charcoal-muted">
                  <li>
                    <Link href="/terms/artist" className="hover:underline">
                      아티스트 계약서 보기
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms/exhibitor" className="hover:underline">
                      출품자 계약서 보기
                    </Link>
                  </li>
                </ul>
              </section>

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
