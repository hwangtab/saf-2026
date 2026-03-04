import type { Metadata } from 'next';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, SITE_URL, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';

const PAGE_URL = `${SITE_URL}/privacy`;

export const metadata: Metadata = createPageMetadata(
  '개인정보처리방침',
  '씨앗페 2026 웹사이트 이용 과정에서 처리되는 개인정보 항목, 이용 목적, 보유 기간 및 권리 안내입니다.',
  '/privacy'
);

export default function PrivacyPolicyPage() {
  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS['/privacy']]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="개인정보처리방침"
        description="씨앗페 2026 웹사이트의 개인정보 처리 기준과 이용자 권리를 안내합니다."
      />

      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
            <p className="text-sm text-charcoal-muted mb-6">시행일: 2026년 2월 26일</p>

            <div className="space-y-10 text-charcoal">
              <section>
                <SectionTitle className="mb-4">1. 수집하는 개인정보 항목</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  씨앗페 2026은 서비스 운영에 필요한 최소한의 정보를 수집합니다. 문의, 조합원 가입
                  안내, 작품 구매 및 주문 확인 과정에서 이름, 연락처, 이메일, 배송 정보, 결제 관련
                  정보가 처리될 수 있습니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">2. 개인정보의 이용 목적</SectionTitle>
                <ul className="list-disc pl-5 space-y-2 text-charcoal-muted leading-7">
                  <li>작품 주문, 결제 확인, 배송 및 CS 응대</li>
                  <li>조합원 가입 및 캠페인 참여 안내</li>
                  <li>문의 응답, 공지 전달, 서비스 운영 안정화</li>
                  <li>관련 법령 준수를 위한 기록 보관</li>
                </ul>
              </section>

              <section>
                <SectionTitle className="mb-4">3. 개인정보 보유 및 이용 기간</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  개인정보는 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 다만 전자상거래,
                  소비자보호, 세무 관련 법령 등에서 일정 기간 보관을 요구하는 경우 해당 기간 동안
                  안전하게 보관한 뒤 파기합니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">4. 제3자 제공 및 처리위탁</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  주문 처리 및 결제, 배송, 고객 응대를 위해 필요한 범위 내에서 결제/쇼핑몰/물류
                  서비스에 개인정보 처리가 위탁될 수 있습니다. 이 경우 관계 법령에 따라 수탁사를
                  관리하고 보호조치를 적용합니다.
                </p>
              </section>

              <section>
                <SectionTitle className="mb-4">5. 이용자의 권리</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있으며, 관련
                  문의는 아래 연락처를 통해 접수할 수 있습니다.
                </p>
                <div className="mt-4 rounded-lg bg-canvas-soft p-4 text-sm leading-7">
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
              </section>

              <section>
                <SectionTitle className="mb-4">6. 고지 및 개정</SectionTitle>
                <p className="text-charcoal-muted leading-7">
                  본 방침은 관련 법령 및 서비스 변경 사항에 따라 개정될 수 있으며, 중요한 변경이
                  있는 경우 웹사이트 공지 또는 별도 안내를 통해 고지합니다.
                </p>
                <p className="mt-4 text-sm text-charcoal-muted">문서 URL: {PAGE_URL}</p>
              </section>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
