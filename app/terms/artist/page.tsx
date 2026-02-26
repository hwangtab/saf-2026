import type { Metadata } from 'next';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  BREADCRUMB_HOME,
  BREADCRUMBS,
  CONTACT,
  SITE_URL,
} from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';

const PAGE_PATH = '/terms/artist';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = createPageMetadata(
  '아티스트 이용약관',
  '씨앗페 2026 아티스트 가입 신청 및 작품 제출 과정에 적용되는 이용약관입니다.',
  PAGE_PATH
);

export default function ArtistTermsPage() {
  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS[PAGE_PATH]]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="아티스트 이용약관"
        description="아티스트 가입 신청과 작품 제출, 심사 및 운영 과정에 적용되는 약관입니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
            <p className="mb-2 text-sm text-charcoal-muted">시행일: 2026년 2월 26일</p>
            <p className="mb-8 text-sm text-charcoal-muted">
              약관 버전: {ARTIST_APPLICATION_TERMS_VERSION}
            </p>

            <div className="space-y-10 text-charcoal">
              <section>
                <SectionTitle className="mb-4">1. 적용 대상</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  본 약관은 씨앗페 2026에 아티스트로 가입 신청하거나 작품 정보를 제출하는 이용자에게
                  적용됩니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">2. 제출 정보의 진실성</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  신청자는 작가명, 연락처, 소개 및 작품 관련 정보를 사실에 근거해 제출해야 하며,
                  허위 또는 타인 권리를 침해하는 정보 제출 시 승인 보류 또는 제한이 발생할 수
                  있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">3. 심사 및 승인</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  제출된 정보는 운영 정책에 따라 심사되며, 승인 여부와 시점은 내부 운영 상황에 따라
                  달라질 수 있습니다. 심사 과정에서 보완 요청이 있을 수 있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">4. 저작권 및 책임</SectionTitle>
                <p className="leading-7 text-charcoal-muted">
                  작품 이미지와 설명에 대한 권리는 원저작자에게 있으며, 신청자는 제출한 콘텐츠에
                  대한 필요한 권리를 보유하고 있음을 보장합니다. 제3자 분쟁 발생 시 관련 법령과 내부
                  절차에 따라 처리됩니다.
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
