import type { Metadata } from 'next';
import TestimonialCard from '@/components/ui/TestimonialCard';
import { EXTERNAL_LINKS } from '@/lib/constants';

export const metadata: Metadata = {
  title: '우리의 증명 | 씨앗:페 2026',
  description:
    '95% 상환율로 증명하는 상호부조 대출의 신뢰도. 예술인들의 성실한 상환 기록.',
  openGraph: {
    title: '우리의 증명 | 씨앗:페 2026',
    description:
      '95% 상환율로 증명하는 상호부조 대출의 신뢰도. 예술인들의 성실한 상환 기록.',
    url: 'https://saf2026.org/our-proof',
    images: ['/images/og-image.png'],
  },
};

export default function OurProof() {
  return (
    <>
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="container-max text-center">
          <div className="text-5xl md:text-7xl font-bold text-primary mb-6">95%</div>
          <h1 className="font-partial text-4xl md:text-5xl mb-6">상호부조 대출 상환율</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            신뢰할 수 있는 금융 시스템만 있으면, 예술인들은 얼마든지 책임감 있게 행동합니다.
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
                  이 일정한 기금을 조성하면, 북서울신협이 그 기금의 약 7배까지 예술인들에게 <strong>저금리</strong>로 대출하는 시스템입니다.
                </p>
                <p>
                  이는 단순한 금융상품이 아닙니다. 예술인들을 신뢰하고, 그들의 성실함에 베팅하는 '상호부조'의 정신이 담겨있습니다.
                </p>
                <p className="font-semibold">
                  기존 금융이 "정기 소득을 증명할 수 없으니 불가능"이라고 말할 때, 우리는 "당신을 믿습니다"라고 말합니다.
                </p>
              </div>
            </div>
            <div className="bg-primary/10 rounded-lg p-8 border-2 border-primary">
              <h3 className="font-watermelon text-2xl font-bold mb-8 text-center">기금의 힘</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600">협동조합이 조성한 기금</p>
                  <p className="text-3xl font-bold">1억 2,534만 원</p>
                </div>
                <div>
                  <p className="text-gray-600">↓ × 약 7배 ↓</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">북서울신협이 대출할 수 있는 금액</p>
                  <p className="text-3xl font-bold text-primary">약 10억 원</p>
                </div>
              </div>
            </div>
          </div>

          {/* Success Stories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">150+</div>
              <h3 className="font-bold text-lg mb-2">지원받은 예술인</h3>
              <p className="text-gray-600 text-sm">
                이미 수백 명의 예술인이 상호부조 대출의 도움을 받았습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">95%</div>
              <h3 className="font-bold text-lg mb-2">상환율</h3>
              <p className="text-gray-600 text-sm">
                95% 이상의 예술인들이 성실하게 대출금을 상환하고 있습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">4.99%</div>
              <h3 className="font-bold text-lg mb-2">저금리</h3>
              <p className="text-gray-600 text-sm">
                기존 고금리(15~30%)와 비교하여 획기적으로 낮은 금리입니다.
              </p>
            </div>
          </div>

          {/* Why It Works */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-3xl mx-auto mb-16">
            <h2 className="font-partial text-3xl mb-8 text-center">왜 95% 상환율이 가능할까?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">신뢰</h3>
                  <p className="text-gray-600">
                    "당신을 믿습니다"라는 신뢰 자체가 대출자들을 책임감 있게 만듭니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">정당한 금리</h3>
                  <p className="text-gray-600">
                    약탈적인 금리가 아니라 정당한 금리이므로, 상환 부담이 현저히 낮습니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">문제 해결</h3>
                  <p className="text-gray-600">
                    금융 문제로 인한 창작 방해가 사라지면서, 예술인들이 경제활동에 집중할 수 있게 됩니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">상호부조의 정신</h3>
                  <p className="text-gray-600">
                    "당신의 상환이 다른 예술가들의 희망이 됩니다"라는 메시지가 시스템 전체의 신뢰도를 높입니다.
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
              author="김민준"
              context="시각 예술가"
              borderColor="border-primary"
            />
            <TestimonialCard
              quote="은행 문턱이 너무 높았는데, 여기서는 저를 '예술인'으로 인정해주더군요. 단순한 대출이 아니라 큰 위로와 응원이었습니다."
              author="이서연"
              context="독립 영화감독"
              borderColor="border-yellow-400"
            />
            <TestimonialCard
              quote="다음 전시 준비 자금이 막막했는데, 덕분에 무사히 작품을 완성하고 전시를 열 수 있었습니다. 이 제도가 없었다면 불가능했을 거예요."
              author="박지훈"
              context="설치 미술가"
              borderColor="border-green-400"
            />
            <TestimonialCard
              quote="내 상환금이 다른 동료 예술가에게 희망이 된다는 사실이 저를 더 책임감 있게 만듭니다. 우리는 서로의 안전망입니다."
              author="최유진"
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
                  <td className="px-6 py-4 text-center text-primary font-semibold">4.99%</td>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div>
              <h3 className="font-watermelon text-lg font-bold mb-3">예술인이신가요?</h3>
              <p className="text-gray-600 mb-4">
                상호부조 대출을 신청하여 금융 어려움에서 벗어나세요.
              </p>
              <a
                href={EXTERNAL_LINKS.LOAN_INFO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors"
              >
                대출 신청하기
              </a>
            </div>
            <div>
              <h3 className="font-watermelon text-lg font-bold mb-3">응원하고 싶으신가요?</h3>
              <p className="text-gray-600 mb-4">
                당신의 후원이 다른 예술인들의 희망이 됩니다.
              </p>
              <a
                href="https://www.socialfunch.org/SAF"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors"
              >
                후원하기
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
