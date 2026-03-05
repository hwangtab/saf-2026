import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, SITE_URL, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { TERMS_OF_SERVICE_DOCUMENT } from '@/lib/legal-documents';

const PAGE_PATH = '/terms';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = createPageMetadata(
  '이용약관',
  '씨앗페 2026 웹사이트 이용약관 및 서비스 이용 시 적용되는 기본 조건을 안내합니다.',
  PAGE_PATH
);

export default function TermsPage() {
  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS[PAGE_PATH]]);
  const doc = TERMS_OF_SERVICE_DOCUMENT;

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="이용약관"
        description="씨앗페 2026 웹사이트와 관련 서비스 이용 시 적용되는 기본 약관입니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {doc.effectiveDate}</p>
            <p className="mb-8 text-sm text-charcoal-muted">버전: {doc.version}</p>

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
                <SectionTitle className="mb-4">역할별 계약서</SectionTitle>
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
