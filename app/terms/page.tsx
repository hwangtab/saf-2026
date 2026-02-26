import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, SITE_URL, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';

const PAGE_URL = `${SITE_URL}/terms`;

export const metadata: Metadata = createPageMetadata(
  '이용약관',
  '씨앗페 2026 웹사이트 이용약관 및 서비스 이용 시 적용되는 기본 조건을 안내합니다.',
  '/terms'
);

export default function TermsPage() {
  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS['/terms']]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="이용약관"
        description="씨앗페 2026 웹사이트와 관련 서비스 이용 시 적용되는 기본 약관입니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
            <p className="text-sm text-charcoal-muted mb-6">시행일: 2026년 2월 26일</p>

            <div className="space-y-10 text-charcoal">
              <section>
                <SectionTitle className="mb-4">역할별 약관</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  가입 신청 시에는 아래 역할별 약관 동의가 추가로 필요합니다.
                </p>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-charcoal-muted">
                  <li>
                    <Link href="/terms/artist" className="hover:underline">
                      아티스트 이용약관 보기
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms/exhibitor" className="hover:underline">
                      출품자 이용약관 보기
                    </Link>
                  </li>
                </ul>
              </section>

              <section>
                <SectionTitle className="mb-4">1. 목적</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  본 약관은 씨앗페 2026 웹사이트 및 관련 서비스의 이용 조건, 절차, 이용자와 운영
                  주체의 권리와 의무를 규정하는 것을 목적으로 합니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">2. 서비스 제공 및 변경</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  웹사이트는 캠페인 소개, 작품 안내, 주문 및 문의 관련 정보를 제공합니다. 운영상
                  필요에 따라 서비스의 일부가 변경되거나 중단될 수 있으며, 중요한 변경은 사이트
                  공지로 안내합니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">3. 이용자의 의무</SectionTitle>
                <ul className="list-disc pl-5 space-y-2 text-charcoal-muted leading-7">
                  <li>법령, 본 약관, 공지사항을 준수해야 합니다.</li>
                  <li>서비스 운영을 방해하거나 타인의 권리를 침해하는 행위를 해서는 안 됩니다.</li>
                  <li>허위 정보 제공, 부정 결제 시도, 비정상적 접근 등은 제한될 수 있습니다.</li>
                </ul>
              </section>

              <section>
                <SectionTitle className="mb-4">4. 주문·결제·배송 관련</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  작품 주문, 결제, 배송, 취소/교환/환불 등 전자상거래 관련 사항은 개별 상품 안내와
                  관련 법령을 따릅니다. 세부 절차는 주문 페이지 및 고객 안내 채널을 통해 확인할 수
                  있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">5. 지식재산권</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  사이트에 게시된 텍스트, 이미지, 디자인 및 작품 관련 콘텐츠의 저작권과 기타 권리는
                  원저작자 또는 정당한 권리자에게 있으며, 사전 허가 없는 복제·배포·2차 이용은
                  제한됩니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">6. 책임의 제한</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  천재지변, 시스템 장애, 외부 서비스 연동 이슈 등 불가항력적 사유로 인한 서비스
                  중단에 대해 합리적인 범위에서 복구를 위해 노력하며, 관련 법령이 허용하는 범위에서
                  책임이 제한될 수 있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">7. 문의처</SectionTitle>
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
