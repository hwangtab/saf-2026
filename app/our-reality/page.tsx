import type { Metadata } from 'next';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';
import { testimonials as testimonialsData } from '@/content/testimonials';
import { EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import HighlightedText from '@/components/ui/HighlightedText';
import { createPageMetadata } from '@/lib/seo';
import {
  FirstBankAccessChart,
  RejectionReasonsChart,
  HighInterestProductChart,
  InterestRateDistributionChart,
  DebtCollectionChart,
  CreativeImpactChart,
} from '@/components/features/charts/DynamicCharts';

import { JsonLdScript } from '@/components/common/JsonLdScript';
import { BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';

const PAGE_URL = `${SITE_URL}/our-reality`;

export const metadata: Metadata = createPageMetadata(
  '우리의 현실',
  '제1금융권 배제율 84.9%. 예술인들이 직면한 금융 재난의 실태와 구조적 원인을 데이터로 증명합니다.',
  '/our-reality'
);

export default function OurReality() {
  const breadcrumbSchema = createBreadcrumbSchema([BREADCRUMB_HOME, BREADCRUMBS['/our-reality']]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="우리의 현실"
        description="2025 예술인 금융 재난 보고서가 밝혀낸 한국 예술인의 금융 위기의 구조적 현실"
      >
        <ShareButtons
          url={PAGE_URL}
          title="우리의 현실 - 씨앗페 2026"
          description="예술인이 겪는 금융 재난의 구조와 데이터를 확인하세요."
        />
      </PageHero>

      {testimonialsData.map((group, groupIndex) => {
        const variants: ('white' | 'gray' | 'canvas-soft')[] = ['white', 'gray', 'canvas-soft'];
        const currentVariant = variants[groupIndex];
        const prevVariant = groupIndex > 0 ? variants[groupIndex - 1] : undefined;

        return (
          <Section key={group.category} variant={currentVariant} prevVariant={prevVariant}>
            <div className="container-max">
              <SectionTitle className="mb-12">{group.category}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {group.items.map((item, itemIndex) => (
                  <div
                    key={`${item.author}-${itemIndex}`}
                    className="bg-white p-6 rounded-lg shadow-lg border-l-8 border-primary flex flex-col justify-between"
                  >
                    <p className="text-xl md:text-2xl text-charcoal mb-4 italic leading-relaxed before:content-['“'] after:content-['”']">
                      <HighlightedText text={item.quote} />
                    </p>
                    <div>
                      <p className="font-semibold text-primary">{item.author}</p>
                      {item.context && (
                        <p className="text-sm text-charcoal-muted">{item.context}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        );
      })}

      {/* 도입: 금융의 재정의 */}
      <Section variant="white" prevVariant="canvas-soft">
        <div className="container-max">
          <div className="max-w-3xl mx-auto text-balance">
            <SectionTitle className="mb-8">예술인에게 금융은 산소호흡기</SectionTitle>
            <div className="space-y-6 text-lg text-charcoal">
              <p>
                예술인들은 정기적인 급여가 아닌, 프로젝트 기반의 불규칙한 소득을 얻습니다. 공연과
                공연 사이, 전시와 전시 사이 발생하는
                <strong> &ldquo;소득 공백기&rdquo;</strong>는 그들이 피할 수 없는 구조적 현실입니다.
              </p>
              <p>
                이 공백기 동안 월세, 식비, 창작 재료비를 버텨낼 방법이 필요합니다. 안정적인 금융은
                단순한 &lsquo;빚&rsquo;이 아닌,
                <strong>
                  {' '}
                  창작의 시간을 살려내는 <span className="text-sun-strong">생명의 산소</span>
                </strong>
                입니다.
              </p>
              <p>
                그러나 한국의 금융 시스템은 예술인을 정상적인 금융 고객으로 인정하지 않았습니다. 그
                결과 예술인들은
                <strong> 배제 → 약탈 → 파괴</strong>라는 악순환에 갇혀있습니다.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Stage 1: 배제 (84.9%) */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              🚫
            </div>
            <span className="text-sm font-bold text-primary-strong uppercase">STAGE 1</span>
            <SectionTitle className="mb-4">닫힌 문: 은행이 거절하다</SectionTitle>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              제1금융권 배제율 <strong className="text-primary-strong">84.9%</strong>
            </p>
          </div>

          {/* Description Text */}
          <div id="stage1-description" className="max-w-3xl mb-12">
            <h3 className="text-card-title mb-3">은행의 문은 왜 닫혔나?</h3>
            <ul className="space-y-3 text-charcoal">
              <li className="flex gap-3">
                <span className="font-bold text-primary-strong">•</span>
                <span>
                  <strong>53.1%</strong>는 대출 신청 후 직접적으로 <strong>거절</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary-strong">•</span>
                <span>
                  <strong>31.8%</strong>는 어차피 안 될 것이라 예상하며 <strong>신청 포기</strong>
                </span>
              </li>
            </ul>
          </div>

          {/* Chart Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="h-96">
              <RejectionReasonsChart />
            </div>
            <div className="h-96">
              <FirstBankAccessChart />
            </div>
          </div>
        </div>
      </Section>

      {/* Stage 2: 약탈 (48.6%) */}
      <Section variant="accent-soft" prevVariant="primary-surface">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              ⚠️
            </div>
            <span className="text-sm font-bold text-accent-strong uppercase">STAGE 2</span>
            <SectionTitle className="mb-4">낭떠러지: 고리대금로 내몰리다</SectionTitle>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              고리대금 상품 노출률 <strong className="text-accent-strong">48.6%</strong> (연 15%
              이상)
            </p>
          </div>

          {/* Description Text */}
          <div id="stage2-description" className="max-w-3xl mb-12">
            <h3 className="text-card-title mb-3">선택이 아닌 생존</h3>
            <p className="text-charcoal mb-4 text-balance leading-relaxed">
              은행 문이 닫힌 순간, 예술인들은 곧바로 저축은행, 카드론, 대부업체로 내몰립니다.
              <strong> 83.2%의 예술인이 고리대금 금융 상품을 이용</strong>한 경험이 있습니다.
            </p>
            <p className="text-charcoal leading-relaxed">
              이는 선택이 아닌, 생존을 위한 유일한 탈출구였습니다.
            </p>
          </div>

          {/* Chart Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="h-96">
              <InterestRateDistributionChart />
            </div>
            <div className="h-96">
              <HighInterestProductChart />
            </div>
          </div>
        </div>
      </Section>

      {/* Stage 3: 파괴 (88.3%) */}
      <Section variant="red" prevVariant="accent-soft">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              💔
            </div>
            <span className="text-sm font-bold text-danger uppercase">STAGE 3</span>
            <SectionTitle className="mb-4">파괴: 창작이 멈춘다</SectionTitle>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              채권추심 경험자의 창작 중단율 <strong className="text-danger">88.3%</strong>
            </p>
          </div>

          {/* Description Text */}
          <div id="stage3-description" className="max-w-3xl mb-12">
            <h3 className="text-card-title mb-3">생존의 위기</h3>
            <p className="text-charcoal mb-4 text-balance leading-relaxed">
              채권추심을 경험한 예술인은 <strong>10명 중 4명(43%)</strong>입니다. 이들은 멈추지 않는
              전화, 모욕적인 언사, 집으로 찾아오는 추심원 앞에서 생존의 벼랑 끝으로 내몰립니다.
            </p>
          </div>

          {/* Chart Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="h-96">
              <CreativeImpactChart />
            </div>
            <div className="h-96">
              <DebtCollectionChart />
            </div>
          </div>
        </div>
      </Section>

      {/* 진단: 사회적 재난 */}
      <Section variant="white" prevVariant="red">
        <div className="container-max max-w-3xl">
          <SectionTitle className="mb-8">이것은 개인의 문제가 아닙니다</SectionTitle>
          <div className="space-y-6 text-lg text-charcoal">
            <p>
              예술인 금융 위기는 개인의 나태나 불성실의 결과가 아닙니다. 이는{' '}
              <strong>프로젝트 기반 고용이라는 산업 구조적 현실</strong>을 전혀 인정하지 않는 금융
              시스템의 구조적 실패입니다.
            </p>
            <p>
              고용보험, 실업급여 등 대부분의 사회 안전망도 전통적 &lsquo;상시 고용&rsquo;을 기준으로
              설계되어, 예술인들은 <strong>사회적으로도 금융적으로도 체계적으로 배제</strong>되어
              있습니다.
            </p>
            <p>
              따라서 이것은 단순한 개인의 빈곤 문제가 아닌,
              <strong> 한국 문화예술 생태계의 지속가능성을 위협하는 사회적 재난</strong>입니다.
            </p>
          </div>
        </div>
      </Section>

      {/* 제언: 산소호흡기가 필요하다 */}
      <Section variant="canvas-soft" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-8">산소호흡기가 필요하다</SectionTitle>
          <div className="space-y-6 text-lg text-charcoal mb-12 max-w-3xl mx-auto text-balance">
            <p>
              예술인에게 필요한 것은 일시적인 지원금이나 복지가 아닙니다.
              <strong> 예측 불가능한 소득 공백기를 버텨낼 안정적인 금융</strong>입니다.
            </p>
            <p>
              복지는 물고기를 주는 것이라면, 금융은 물고기를 잡으러 나갈 다음 기회까지 버틸 수 있게
              해주는 <strong>산소호흡기</strong>입니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-primary">
              <div className="text-4xl mb-3">⏱️</div>
              <h4 className="font-bold text-lg mb-2">창작 시간을 살려내고</h4>
              <p className="text-sm text-charcoal-muted">
                안정적인 금융으로 소득 공백기를 버티며 창작에 집중할 수 있습니다
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-primary">
              <div className="text-4xl mb-3">🎭</div>
              <h4 className="font-bold text-lg mb-2">예술적 존엄성을 지키며</h4>
              <p className="text-sm text-charcoal-muted">
                부당한 조건을 거부하고 자신의 예술적 가치를 지킬 수 있습니다
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-primary">
              <div className="text-4xl mb-3">🌱</div>
              <h4 className="font-bold text-lg mb-2">생태계를 지속가능하게</h4>
              <p className="text-sm text-charcoal-muted">
                문화예술 생태계의 다양성과 지속가능성을 확보할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Call to Action */}
      <Section variant="primary-surface" prevVariant="canvas-soft" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-6">이제 행동할 시간입니다</SectionTitle>
          <p className="text-lg text-charcoal-muted mb-8 max-w-2xl mx-auto text-balance">
            한국 예술인들의 창작 시간을 살려내는 일에 함께해주세요.
            <br />
            조합원 가입과 작품 구매가 예술이 계속 숨 쉬게 하는{' '}
            <span className="text-sun-strong font-semibold">산소호흡기</span>가 됩니다.
          </p>
          <CTAButtonGroup variant="large" className="justify-center" />

          {/* AI/GEO Optimization: Explicit Citations Section */}
          <div className="mt-16 pt-16 border-t border-primary/20 max-w-2xl mx-auto text-left">
            <h3 className="text-sm font-bold text-primary-strong uppercase tracking-widest mb-6">
              자료 출처 및 근거 (Citations)
            </h3>
            <ul className="space-y-3 text-xs md:text-sm text-charcoal-muted list-disc pl-5">
              <li>
                <strong>금융 배제 및 고리대금 통계</strong>: 한국스마트협동조합 &apos;2025 예술인
                금융 재난 보고서&apos; (179명 심층 설문 결과)
              </li>
              <li>
                <strong>상환율 데이터</strong>: 2022년 12월~2025년 9월 예술인 상호부조 대출 운용
                기록 (누적 354건 집계)
              </li>
              <li>
                <strong>관련 보도</strong>: 한겨레(2025.11.05), 뉴스아트(2025.11.05),
                아시아경제(2025.11.05) 등 주요 일간지 및 전문지
              </li>
              <li>
                <strong>제도적 배경</strong>: 문화체육관광부 예술인 복지 정책 및 제1금융권 예술인
                신용 규제 현황
              </li>
            </ul>
          </div>

          <p className="text-sm text-charcoal-muted mt-12">
            2025 예술인 금융 재난 보고서 기반 |{' '}
            <a
              href={EXTERNAL_LINKS.KOSMART_HOME}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              한국스마트협동조합
            </a>
          </p>
        </div>
      </Section>
    </>
  );
}
