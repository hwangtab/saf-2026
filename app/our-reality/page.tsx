import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import PageHero from '@/components/ui/PageHero';

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
    '한국 예술인의 금융 위기 현황을 데이터로 보여줍니다. 제1금융권 배제율, 고금리 노출, 창작활동 영향 등.',
  openGraph: {
    title: '우리의 현실 | 씨앗:페 2026',
    description:
      '한국 예술인의 금융 위기 현황을 데이터로 보여줍니다. 제1금융권 배제율, 고금리 노출, 창작활동 영향 등.',
    url: 'https://saf2026.org/our-reality',
    images: ['/images/og-image.png'],
  },
};

export default function OurReality() {
  return (
    <>
      <PageHero
        title="우리의 현실"
        description="2025 예술인 금융 재난 보고서가 밝혀낸 한국 예술인들의 현황"
      />

      {/* Statistics Sections */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <div className="mb-16">
            <FirstBankAccessChart />
          </div>
          <div className="mb-16">
            <RejectionReasonsChart />
          </div>
          <div className="mb-16">
            <HighInterestProductChart />
          </div>
          <div className="mb-16">
            <InterestRateDistributionChart />
          </div>
          <div className="mb-16">
            <DebtCollectionChart />
          </div>
          <div className="mb-16">
            <CreativeImpactChart />
          </div>
        </div>
      </section>

      {/* Key Findings Section */}
      <section className="py-12 md:py-20 bg-primary/5">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12 text-center">주요 발견</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-primary">
              <h3 className="text-2xl font-bold text-primary mb-3">84.9%</h3>
              <p className="text-gray-600">
                제1금융권 서비스 배제율. 정기적인 소득 입증이 어려운 예술인들은 은행 문의 자체가 불가능한 상황입니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-red-500">
              <h3 className="text-2xl font-bold text-red-500 mb-3">48.6%</h3>
              <p className="text-gray-600">
                고금리(연 20% 이상) 상품 노출률. 대안이 없어 악의적인 금융기관의 먹잇감이 되고 있습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <h3 className="text-2xl font-bold text-yellow-500 mb-3">38%</h3>
              <p className="text-gray-600">
                채권추심 경험율. 일부 예술인들은 사채와 추심의 악순환에 갇혀있습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-orange-500">
              <h3 className="text-2xl font-bold text-orange-500 mb-3">68%</h3>
              <p className="text-gray-600">
                금융 어려움으로 인한 창작량 감소. 개인의 고통을 넘어 예술 생태계 전체의 위기입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimony Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12 text-center">예술인들의 목소리</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <blockquote className="bg-gray-50 p-8 rounded-lg border-l-4 border-primary">
              <p className="text-gray-700 mb-4 italic">
                "은행에서는 '정기적인 소득이 없다'며 거절했습니다. 결국 카드론을 써야 했는데, 이자가 23%나 되었어요. 예술 활동도 제대로 할 수 없을 정도로 힘들었습니다."
              </p>
              <p className="font-semibold text-gray-800">— 배우, 40대</p>
            </blockquote>
            <blockquote className="bg-gray-50 p-8 rounded-lg border-l-4 border-primary">
              <p className="text-gray-700 mb-4 italic">
                "음악가로 살아가려면 악기 수리, 공간 임차, 교육비 등 갑자기 필요한 자금이 많습니다. 신용등급이 없으니 어디서도 도와주지 않았어요."
              </p>
              <p className="font-semibold text-gray-800">— 뮤지션, 30대</p>
            </blockquote>
            <blockquote className="bg-gray-50 p-8 rounded-lg border-l-4 border-primary">
              <p className="text-gray-700 mb-4 italic">
                "고금리 채무로 질려 창작을 포기하고 싶었습니다. 하지만 상호부조 대출을 받으면서 다시 꿈을 꿀 수 있게 됐어요."
              </p>
              <p className="font-semibold text-gray-800">— 화가, 50대</p>
            </blockquote>
            <blockquote className="bg-gray-50 p-8 rounded-lg border-l-4 border-primary">
              <p className="text-gray-700 mb-4 italic">
                "이 문제는 개인의 책임이 아닙니다. 사회적 구조의 문제이고, 해결책은 있습니다. 우리를 믿어주세요."
              </p>
              <p className="font-semibold text-gray-800">— 배우, 35세</p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 md:py-20 bg-primary/5">
        <div className="container-max text-center">
          <h2 className="text-3xl font-bold mb-6">이 현실, 함께 바꿀 수 있습니다</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            당신의 참여와 후원이 한국 예술인들의 삶을 바꾸는 힘이 됩니다.
          </p>
          <a
            href="https://www.socialfunch.org/SAF"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary hover:bg-yellow-500 text-black font-bold px-8 py-4 rounded-lg transition-colors"
          >
            지금 후원하기
          </a>
        </div>
      </section>
    </>
  );
}
