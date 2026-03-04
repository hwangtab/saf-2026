import type { Metadata } from 'next';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import {
  BREADCRUMB_HOME,
  BREADCRUMBS,
  CONTACT,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  SITE_URL,
} from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { EXHIBITOR_APPLICATION_TERMS_DOCUMENT } from '@/lib/legal-documents';

const PAGE_PATH = '/terms/exhibitor';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = createPageMetadata(
  '출품자 계약서',
  '씨앗페 2026 출품자 전시위탁 계약서 전문입니다.',
  PAGE_PATH
);

export default function ExhibitorTermsPage() {
  const breadcrumbSchema = createBreadcrumbSchema([
    BREADCRUMB_HOME,
    BREADCRUMBS['/terms'],
    BREADCRUMBS[PAGE_PATH],
  ]);

  const doc = EXHIBITOR_APPLICATION_TERMS_DOCUMENT;

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="출품자 전시위탁 계약서"
        description="씨앗페 2026 출품자 전시위탁 계약서 전문입니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <p className="mb-1 text-sm text-charcoal-muted">시행일: {doc.effectiveDate}</p>
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
                </section>
              ))}

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
