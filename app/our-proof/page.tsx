import type { Metadata } from 'next';
import TestimonialCard from '@/components/ui/TestimonialCard';
import { EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';

const PAGE_URL = `${SITE_URL}/our-proof`;
const OG_IMAGE_URL = `${SITE_URL}/images/saf2023/IMG_0334.png`;

export const metadata: Metadata = {
  title: '우리의 증명 | 씨앗:페 2026',
  description:
    '예술인 상호부조 대출 305건, 누적 6억 900만원 지원. 데이터로 확인하는 상호부조 금융의 성과.',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: '우리의 증명 | 씨앗:페 2026',
    description:
      '예술인 상호부조 대출 305건, 누적 6억 900만원 지원. 데이터로 확인하는 상호부조 금융의 성과.',
    url: PAGE_URL,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: '씨앗페 현장에서 공유된 예술인 상호부조 데이터 인포그래픽',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '씨앗:페 2026 상호부조 데이터',
    description:
      '상호부조 대출 305건, 누적 6억 900만원 지원. 예술인 금융 안전망의 실제 성과를 확인하세요.',
    images: [OG_IMAGE_URL],
  },
};

export default function OurProof() {
  return (
    <>
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="container-max text-center">
          <div className="text-5xl md:text-7xl font-bold text-primary mb-6">305건</div>
          <h1 className="font-partial text-4xl md:text-5xl mb-6 text-balance">예술인 상호부조 대출의 실제 성과</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            2022년 12월부터 2025년 4월까지, 총 <strong>305건</strong>의 대출을 통해 <strong>609,000,000원</strong>을
            예술인에게 공급했습니다. 상호부조의 신뢰가 실제 데이터로 증명되었습니다.
          </p>
        </div>
      </section>

      {/* Proof Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="font-partial text-3xl mb-6">상호부조 대출이란?</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <a
                    href={EXTERNAL_LINKS.KOSMART_HOME}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    한국스마트협동조합
                  </a>
                  이 일정한 기금을 조성하면, 태릉신협이 그 기금의 약 7배까지 예술인들에게 <strong>저금리</strong>로 대출하는 시스템입니다.
                </p>
                <p>
                  이는 단순한 금융상품이 아닙니다. 예술인들을 신뢰하고, 그들의 성실함에 베팅하는 &lsquo;상호부조&rsquo;의 정신이 담겨있습니다.
                </p>
                <p className="font-semibold">
                  기존 금융이 &ldquo;정기 소득을 증명할 수 없으니 불가능&rdquo;이라고 말할 때, 우리는 &ldquo;당신을 믿습니다&rdquo;라고 말합니다.
                </p>
              </div>
            </div>
            <div className="bg-primary/10 rounded-lg p-8 border-2 border-primary text-center">
              <h3 className="font-watermelon text-2xl font-bold mb-6">기금의 힘</h3>
              <p className="text-sm text-gray-600 mb-3">누적 조성된 상호부조 기금</p>
              <p className="text-4xl font-bold text-primary">39,000,000원</p>
              <p className="text-sm text-gray-600 mt-4">
                작품 판매와 후원, 특별조합비로 함께 채워온 신뢰의 안전망입니다.
              </p>
            </div>
          </div>

          {/* Success Stories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">305건</div>
              <h3 className="font-watermelon font-bold text-lg mb-2">누적 대출 실행</h3>
              <p className="text-gray-600 text-sm text-balance">
                2022년 12월부터 2025년 4월까지 305건의 상호부조 대출이 실행되었습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">609,000,000원</div>
              <h3 className="font-watermelon font-bold text-lg mb-2">누적 지원 금액</h3>
              <p className="text-gray-600 text-sm text-balance">
                생활비·창작비·프로젝트 자금 등으로 총 6억 9백만원이 투입되었습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">5.10%</div>
              <h3 className="font-watermelon font-bold text-lg mb-2">대위변제율</h3>
              <p className="text-gray-600 text-sm text-balance">
                총 20건, 31,080,986원이 대위변제 처리되어 전체 실행액 대비 5.10% 수준입니다.
              </p>
            </div>
          </div>

          {/* Why It Works */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-3xl mx-auto mb-16">
            <h2 className="font-partial text-3xl mb-8 text-center">왜 상호부조 금융이 작동할까?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <div>
                  <h3 className="font-watermelon font-bold text-lg mb-2">기금과 특별조합비</h3>
                  <p className="text-gray-600 text-balance">
                    조합이 조성한 3,900만원의 기금과 대출자 특별조합비로 안정기금 잔액 35,608,224원을 유지하며 리스크를 공동으로 감당합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <div>
                  <h3 className="font-watermelon font-bold text-lg mb-2">연 5% 고정금리</h3>
                  <p className="text-gray-600 text-balance">
                    프로젝트형·긴급생활형 상품 모두 연 5% 고정금리로 설계되어 고금리 대출 대비 평균 14%p 이상 이자 부담을 덜어줍니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <div>
                  <h3 className="font-watermelon font-bold text-lg mb-2">용도별 맞춤 상품</h3>
                  <p className="text-gray-600 text-balance">
                    긴급·익일·특별·프로젝트 대출 등 네 가지 상품으로 생활비부터 창작비까지 필요한 시점에 자금을 공급합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <div>
                  <h3 className="font-watermelon font-bold text-lg mb-2">투명한 리스크 관리</h3>
                  <p className="text-gray-600 text-balance">
                    대위변제 20건(6.56%) 중 11,396,305원을 회수했고, 실시간 모니터링과 회수 계획으로 상호부조 신뢰를 지켜가고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-max">
          <h2 className="font-partial text-3xl mb-12 text-center">예술인들의 증언</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TestimonialCard
              quote="급하게 병원비가 필요했는데, 어디서도 돈을 빌릴 수 없었어요. 상호부조 대출 덕분에 치료에만 집중할 수 있었습니다."
              author="김OO"
              context="시각 예술가"
              borderColor="border-primary"
            />
            <TestimonialCard
              quote="은행 문턱이 너무 높았는데, 여기서는 저를 '예술인'으로 인정해주더군요. 단순한 대출이 아니라 큰 위로와 응원이었습니다."
              author="이OO"
              context="독립 영화감독"
              borderColor="border-yellow-400"
            />
            <TestimonialCard
              quote="다음 전시 준비 자금이 막막했는데, 덕분에 무사히 작품을 완성하고 전시를 열 수 있었습니다. 이 제도가 없었다면 불가능했을 거예요."
              author="박OO"
              context="설치 미술가"
              borderColor="border-green-400"
            />
            <TestimonialCard
              quote="내 상환금이 다른 동료 예술가에게 희망이 된다는 사실이 저를 더 책임감 있게 만듭니다. 우리는 서로의 안전망입니다."
              author="최OO"
              context="뮤지컬 배우"
              borderColor="border-blue-400"
            />
          </div>
        </div>
      </section>

      {/* Statistics Comparison */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="font-partial text-3xl mb-12 text-center">기존 금융 vs 상호부조 대출</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">항목</th>
                  <th className="px-6 py-4 text-center font-bold">기존 금융기관</th>
                  <th className="px-6 py-4 text-center font-bold">상호부조 대출</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">심사 기준</td>
                  <td className="px-6 py-4 text-center">정기 소득, 신용등급</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">예술인임</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">금리</td>
                  <td className="px-6 py-4 text-center text-red-500">15~30%</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">연 5% 고정</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">대출 한도</td>
                  <td className="px-6 py-4 text-center">제한적</td>
                  <td className="px-6 py-4 text-center">상대적으로 유연</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">상담 지원</td>
                  <td className="px-6 py-4 text-center">최소한</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">맞춤형 상담</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold">철학</td>
                  <td className="px-6 py-4 text-center">영리 추구</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">상호부조</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 md:py-20">
        <div className="container-max text-center">
          <h2 className="font-partial text-3xl md:text-4xl mb-8">
            당신도 이 신뢰의 체계에 참여할 수 있습니다
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
              <h3 className="font-watermelon text-lg font-bold mb-3">후원으로 기금에 힘을 보태주세요</h3>
              <p className="text-gray-600 mb-4 flex-grow">
                상호부조 대출 기금은 시민 후원으로 확대됩니다. 정기후원·일시후원 모두 큰 도움이 됩니다.
              </p>
              <a
                href={EXTERNAL_LINKS.DONATE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-primary hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors"
              >
                후원하기
              </a>
            </div>
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
              <h3 className="font-watermelon text-lg font-bold mb-3">작품을 구매해 예술인을 응원하세요</h3>
              <p className="text-gray-600 mb-4 flex-grow">
                판매 수익은 전액 기금으로 귀속됩니다. 온라인 갤러리에서 작품을 만나보세요.
              </p>
              <a
                href={EXTERNAL_LINKS.ONLINE_GALLERY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-lg transition-colors"
              >
                작품 구매하기
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
