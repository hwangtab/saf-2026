import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  BREADCRUMB_HOME,
  BREADCRUMBS,
  CONTACT,
  OG_IMAGE,
  SITE_URL,
} from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { ARTIST_APPLICATION_TERMS_DOCUMENT } from '@/lib/legal-documents';

const PAGE_PATH = '/terms/artist';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = '아티스트 계약서';
const PAGE_DESCRIPTION = '씨앗페 2026 온라인전시 및 판매위탁 계약서 전문입니다.';

export async function generateMetadata(): Promise<Metadata> {
  const tSeo = await getTranslations('seo');
  const title = `${PAGE_TITLE} | ${tSeo('siteTitle')}`;

  return {
    title,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      images: [
        { url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: PAGE_DESCRIPTION,
      images: [OG_IMAGE.url],
    },
  };
}

export default function ArtistTermsPage() {
  const breadcrumbSchema = createBreadcrumbSchema([
    BREADCRUMB_HOME,
    BREADCRUMBS['/terms'],
    BREADCRUMBS[PAGE_PATH],
  ]);

  const doc = ARTIST_APPLICATION_TERMS_DOCUMENT;

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="온라인전시 및 판매위탁 계약서"
        description="씨앗페 2026 아티스트 전시·판매위탁 계약서 전문입니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {doc.effectiveDate}</p>
            <p className="mb-8 text-sm text-charcoal-muted">
              버전: {ARTIST_APPLICATION_TERMS_VERSION}
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
