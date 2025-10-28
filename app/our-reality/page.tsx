import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import TestimonialCard from '@/components/ui/TestimonialCard';
import { EXTERNAL_LINKS, OG_IMAGE, SITE_URL } from '@/lib/constants';

const PAGE_URL = `${SITE_URL}/our-reality`;

const FirstBankAccessChart = dynamic(
  () =>
    import('@/components/features/StatisticsCharts').then(
      (mod) => mod.FirstBankAccessChart
    ),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" /> }
);

const RejectionReasonsChart = dynamic(
  () =>
    import('@/components/features/StatisticsCharts').then(
      (mod) => mod.RejectionReasonsChart
    ),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" /> }
);

const HighInterestProductChart = dynamic(
  () =>
    import('@/components/features/StatisticsCharts').then(
      (mod) => mod.HighInterestProductChart
    ),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" /> }
);

const InterestRateDistributionChart = dynamic(
  () =>
    import('@/components/features/StatisticsCharts').then(
      (mod) => mod.InterestRateDistributionChart
    ),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" /> }
);

const DebtCollectionChart = dynamic(
  () =>
    import('@/components/features/StatisticsCharts').then(
      (mod) => mod.DebtCollectionChart
    ),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" /> }
);

const CreativeImpactChart = dynamic(
  () =>
    import('@/components/features/StatisticsCharts').then(
      (mod) => mod.CreativeImpactChart
    ),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" /> }
);

export const metadata: Metadata = {
  title: '우리의 현실 | 씨앗:페 2026',
  description:
    '2025 예술인 금융 재난 보고서가 보여준 배제·약탈·파괴의 악순환과 씨앗:페가 제시하는 상호부조 해법을 확인하세요.',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: '우리의 현실 | 씨앗:페 2026',
    description:
      '금융 사각지대에 놓인 예술인의 현실과 상호부조 대출이 필요한 이유를 데이터와 증언으로 살펴봅니다.',
    url: PAGE_URL,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '우리의 현실 | 씨앗:페 2026',
    description: '예술인이 겪는 금융 재난의 구조와 데이터를 한눈에 확인하세요.',
    images: [OG_IMAGE.url],
  },
};

export default function OurReality() {
  return (
    <>
      {/* Enhanced Hero: 95% 상환율을 중심으로 */}
      <section className="py-16 md:py-24 bg-sun-soft text-center">
        <div className="container-max">
          <h1 className="font-partial text-4xl md:text-6xl mb-6 text-balance">우리의 현실</h1>
          <p className="text-lg md:text-xl text-charcoal-muted mb-12 max-w-2xl mx-auto text-balance">
            2025 예술인 금융 재난 보고서가 밝혀낸 한국 예술인의 금융 위기의 구조적 현실
          </p>

          {/* Key Evidence: 95% 상환율 */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-2xl mx-auto border-l-4 border-primary">
            <p className="text-sm font-semibold text-primary uppercase mb-2">증명된 사실</p>
            <h2 className="font-partial text-5xl md:text-6xl text-primary mb-4">95%</h2>
            <p className="text-lg text-charcoal mb-4">
              상호부조 대출 상환율
            </p>
            <p className="text-charcoal-muted text-balance">
              신용점수와 무관하게 진행된 354건의 대출, 약 7억 원 규모에서 달성한 상환율입니다.
              <br />
              <strong>예술인은 위험하지 않다. 위험한 것은 이들을 약탈하도록 방치하는 금융 시스템이다.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 도입: 금융의 재정의 */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-max">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-partial text-3xl md:text-4xl mb-8 text-center sm:text-left">예술인에게 금융은 산소호흡기</h2>
            <div className="space-y-6 text-lg text-charcoal">
            <p>
              예술인들은 정기적인 급여가 아닌, 프로젝트 기반의 불규칙한 소득을 얻습니다. 공연과 공연 사이, 전시와 전시 사이 발생하는
              <strong> &ldquo;소득 공백기&rdquo;</strong>는 그들이 피할 수 없는 구조적 현실입니다.
            </p>
            <p>
              이 공백기 동안 월세, 식비, 창작 재료비를 버텨낼 방법이 필요합니다. 안정적인 금융은 단순한 &lsquo;빚&rsquo;이 아닌,
              <strong> 창작의 시간을 살려내는 <span className="text-sun-strong">생명의 산소</span></strong>입니다.
            </p>
              <p>
                그러나 한국의 금융 시스템은 예술인을 정상적인 금융 고객으로 인정하지 않았습니다. 그 결과 예술인들은
                <strong> 배제 → 약탈 → 파괴</strong>라는 악순환에 갇혀있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 1: 배제 (84.9%) */}
      <section className="py-12 md:py-20 bg-primary-surface">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              🚫
            </div>
            <span className="text-sm font-bold text-primary-strong uppercase">STAGE 1</span>
            <h2 className="font-partial text-4xl md:text-5xl mb-4">닫힌 문: 은행이 거절하다</h2>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              제1금융권 배제율 <strong className="text-primary-strong">84.9%</strong>
            </p>
          </div>

          {/* Description Text */}
          <div className="max-w-3xl mb-12">
            <h3 className="font-watermelon text-xl font-bold mb-3">은행의 문은 왜 닫혔나?</h3>
            <ul className="space-y-3 text-charcoal">
              <li className="flex gap-3">
                <span className="font-bold text-primary-strong">•</span>
                <span><strong>53.1%</strong>는 대출 신청 후 직접적으로 <strong>거절</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary-strong">•</span>
                <span><strong>31.8%</strong>는 어차피 안 될 것이라 예상하며 <strong>신청 포기</strong></span>
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

          {/* Stage 1 Testimony */}
          <TestimonialCard
            quote="연극배우라고 하자 무직자라고 대출 담당자에게 들었습니다."
            author="50대 배우"
            context="은행이 찍은 무직자라는 낙인은 성실한 예술가들을 시스템 밖으로 밀어내는 자기실현적 예언이 되었습니다."
            borderColor="border-primary-strong"
            contextColor="text-primary-strong"
          />
        </div>
      </section>

      {/* Stage 2: 약탈 (48.6%) */}
      <section className="py-12 md:py-20 bg-accent-soft">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              ⚠️
            </div>
            <span className="text-sm font-bold text-accent-strong uppercase">STAGE 2</span>
            <h2 className="font-partial text-4xl md:text-5xl mb-4">낭떠러지: 고리대금로 내몰리다</h2>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              고리대금 상품 노출률 <strong className="text-accent-strong">48.6%</strong> (연 15% 이상)
            </p>
          </div>

          {/* Description Text */}
          <div className="max-w-3xl mb-12">
            <h3 className="font-watermelon text-xl font-bold mb-3">선택이 아닌 생존</h3>
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

          {/* Stage 2 Testimony */}
          <TestimonialCard
            quote="12년간 낸 이자의 절반만 되었어도 빚을 없앴을 겁니다. 이자 갚느라 작품 할 시간을 잃었습니다."
            author="40대 음악인"
            context="고리대금는 단순한 이자가 아닙니다. 그것은 예술가의 시간을 빼앗고, 창작 의지를 꺾으며, 삶을 서서히 파괴하는 보이지 않는 족쇄입니다."
            borderColor="border-accent"
            bgColor="bg-white"
            contextColor="text-accent-strong"
          />
        </div>
      </section>

      {/* Stage 3: 파괴 (88.3%) */}
      <section className="py-12 md:py-20 bg-red-100">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              💔
            </div>
            <span className="text-sm font-bold text-danger uppercase">STAGE 3</span>
            <h2 className="font-partial text-4xl md:text-5xl mb-4">파괴: 창작이 멈춘다</h2>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              채권추심 경험자의 창작 중단율 <strong className="text-danger">88.3%</strong>
            </p>
          </div>

          {/* Description Text */}
          <div className="max-w-3xl mb-12">
            <h3 className="font-watermelon text-xl font-bold mb-3">생존의 위기</h3>
            <p className="text-charcoal mb-4 text-balance leading-relaxed">
              채권추심을 경험한 예술인은 <strong>10명 중 4명(43%)</strong>입니다.
              이들은 멈추지 않는 전화, 모욕적인 언사, 집으로 찾아오는 추심원 앞에서
              생존의 벼랑 끝으로 내몰립니다.
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

          {/* Stage 3 Testimonies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <TestimonialCard
              quote="아이들 모르게 나만 3일을 굶었던 기억."
              author="50대 연극인"
              borderColor="border-danger"
            />

            <TestimonialCard
              quote="돈이 없어 절박했던 치과 치료를 못 받고 있어요. 병원을 제때 가야 하는데, 안 가고 웬만하면 참는 것이 이젠 습관이 돼버렸습니다."
              author="50대 배우"
              borderColor="border-danger"
            />

            <TestimonialCard
              quote="독촉 전화로 연습과 공연에 지장을 주고 이로 인해 심리적 부담감과 압박이 하루하루를 고통스럽게 합니다."
              author="40대 연극인"
              borderColor="border-danger"
            />

            <TestimonialCard
              quote="하루 4시간도 채 못 자며 알바와 연극을 병행하지만, 공연을 할수록 빚만 늘어가는 상황이 계속되어 공연을 그만두기로 함."
              author="30대 배우"
              borderColor="border-danger"
            />
          </div>
        </div>
      </section>

      {/* The Evidence: 95% 상환율 */}
      <section className="py-12 md:py-20 bg-accent-soft">
        <div className="container-max">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="font-partial text-4xl md:text-5xl mb-8">
              하지만 우리는 증거를 찾았습니다
            </h2>
            <p className="text-xl text-sky-strong">
              3년간 신용점수와 무관하게 진행된 상호부조 대출의 결과
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow text-center border-t-4 border-primary">
              <p className="text-4xl font-bold text-primary mb-2">354건</p>
              <p className="text-charcoal-muted">신용 무관 대출 건수</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow text-center border-t-4 border-primary">
              <p className="text-4xl font-bold text-primary mb-2">약 7억 원</p>
              <p className="text-charcoal-muted">총 대출 규모</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow text-center border-t-4 border-primary">
              <p className="text-5xl font-bold text-primary mb-2">95%</p>
              <p className="text-charcoal-muted">상환율 달성</p>
            </div>
          </div>

          <div className="mt-12 bg-white p-8 rounded-lg max-w-3xl mx-auto border-l-4 border-primary">
            <p className="text-lg text-charcoal mb-4">
              이 데이터는 명백한 사실을 증명합니다.
            </p>
            <p className="text-2xl font-bold text-gray-800">
              <span className="text-primary">예술인은 위험하지 않습니다.</span>
              <br />
              위험한 것은 이들을 약탈하도록 방치하는 현재의 금융 시스템입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 진단: 사회적 재난 */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-max max-w-3xl">
          <h2 className="font-partial text-3xl md:text-4xl mb-8 text-center">이것은 개인의 문제가 아닙니다</h2>
          <div className="space-y-6 text-lg text-charcoal">
            <p>
              예술인 금융 위기는 개인의 나태나 불성실의 결과가 아닙니다.
              이는 <strong>프로젝트 기반 고용이라는 산업 구조적 현실</strong>을 전혀 인정하지 않는
              금융 시스템의 구조적 실패입니다.
            </p>
            <p>
              고용보험, 실업급여 등 대부분의 사회 안전망도 전통적 &lsquo;상시 고용&rsquo;을 기준으로 설계되어,
              예술인들은 <strong>사회적으로도 금융적으로도 체계적으로 배제</strong>되어 있습니다.
            </p>
            <p>
              따라서 이것은 단순한 개인의 빈곤 문제가 아닌,
              <strong> 한국 문화예술 생태계의 지속가능성을 위협하는 사회적 재난</strong>입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 제언: 산소호흡기가 필요하다 */}
      <section className="py-12 md:py-20 bg-canvas-soft">
        <div className="container-max">
          <h2 className="font-partial text-3xl md:text-4xl mb-8 text-center">산소호흡기가 필요하다</h2>
          <div className="space-y-6 text-lg text-charcoal mb-12 max-w-3xl mx-auto">
            <p>
              예술인에게 필요한 것은 일시적인 지원금이나 복지가 아닙니다.
              <strong> 예측 불가능한 소득 공백기를 버텨낼 안정적인 금융</strong>입니다.
            </p>
            <p>
              복지는 물고기를 주는 것이라면, 금융은 물고기를 잡으러 나갈 다음 기회까지
              버틸 수 있게 해주는 <strong>산소호흡기</strong>입니다.
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
      </section>

      {/* Call to Action */}
      <section className="py-12 md:py-20 bg-primary/20">
        <div className="container-max text-center">
          <h2 className="font-partial text-3xl md:text-4xl mb-6">이제 행동할 시간입니다</h2>
          <p className="text-lg text-charcoal-muted mb-8 max-w-2xl mx-auto">
            한국 예술인들의 창작 시간을 살려내는 일에 함께해주세요.
            <br />
            당신의 참여와 후원이 <span className="text-sun-strong font-semibold">산소호흡기</span>가 되어 예술이 계속 숨 쉬게 합니다.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href={EXTERNAL_LINKS.DONATE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-light font-bold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              ❤️ 지금 후원하기
            </a>
            <a
              href={EXTERNAL_LINKS.ONLINE_GALLERY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              🎨 작품 구매하기
            </a>
          </div>
          <p className="text-sm text-charcoal-muted mt-6">
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
      </section>
    </>
  );
}
