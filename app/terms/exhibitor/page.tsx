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

const PAGE_PATH = '/terms/exhibitor';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = createPageMetadata(
  '출품자 이용약관',
  '씨앗페 2026 출품자 가입 신청 및 작가/작품 운영 과정에 적용되는 이용약관입니다.',
  PAGE_PATH
);

export default function ExhibitorTermsPage() {
  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS[PAGE_PATH]]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="출품자 이용약관"
        description="출품자 가입 신청과 작가/작품 관리, 운영 책임 범위에 적용되는 약관입니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
            <p className="mb-2 text-sm text-charcoal-muted">시행일: 2026년 2월 26일</p>
            <p className="mb-8 text-sm text-charcoal-muted">
              약관 버전: {EXHIBITOR_APPLICATION_TERMS_VERSION}
            </p>

            <div className="space-y-10 text-charcoal">
              <section>
                <SectionTitle className="mb-4">1. 적용 대상</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  본 약관은 씨앗페 2026에 출품자(갤러리, 기획자, 단체 등)로 가입 신청하고 관련
                  정보를 운영하는 이용자에게 적용됩니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">2. 운영 정보 제출 및 관리</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  출품자는 대표명, 연락처, 소개 등 신청 정보를 정확하게 제공해야 하며, 승인 이후에도
                  최신 정보가 유지되도록 관리해야 합니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">3. 전시/출품 운영 책임</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  출품자가 등록·관리하는 작가 및 작품 정보, 전시 운영 관련 내용은 관련 법령과 내부
                  운영 정책을 준수해야 하며, 권리 침해나 허위 정보 발생 시 시정 또는 이용 제한이
                  적용될 수 있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">4. 승인 및 제한</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  신청 정보는 내부 심사를 거쳐 승인 여부가 결정됩니다. 정책 위반, 반복적인 운영
                  문제, 허위 정보가 확인되는 경우 승인 보류 또는 계정 운영 제한이 이루어질 수
                  있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">5. 문의처</SectionTitle>
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
