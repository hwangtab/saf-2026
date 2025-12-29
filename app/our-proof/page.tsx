import type { Metadata } from 'next';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import TestimonialCard from '@/components/ui/TestimonialCard';
import { EXTERNAL_LINKS, OG_IMAGE, SITE_URL } from '@/lib/constants';

const PAGE_URL = `${SITE_URL}/our-proof`;

export const metadata: Metadata = {
  title: '우리의 증명 | 씨앗페 2026',
  description:
    '예술인 상호부조 대출 305건, 누적 6억 900만원 지원. 데이터로 확인하는 상호부조 금융의 성과.',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: '우리의 증명 | 씨앗페 2026',
    description:
      '예술인 상호부조 대출 305건, 누적 6억 900만원 지원. 데이터로 확인하는 상호부조 금융의 성과.',
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
    title: '씨앗페 2026 상호부조 데이터',
    description:
      '상호부조 대출 305건, 누적 6억 900만원 지원. 예술인 금융 안전망의 실제 성과를 확인하세요.',
    images: [OG_IMAGE.url],
  },
};

export default function OurProof() {
  return (
    <>
      <PageHero
        title="우리의 증명"
        description="예술인 상호부조 대출의 실제 성과. 354건, 약 7억 원의 신뢰가 데이터로 증명되었습니다."
      >
        <ShareButtons
          url={PAGE_URL}
          title="우리의 증명 - 씨앗페 2026"
          description="예술인 상호부조 대출 354건, 누적 약 7억 원 지원. 데이터로 확인하세요."
        />
      </PageHero>



      <section className="py-12 md:py-20 bg-primary-surface">
        <div className="container-max">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="font-section font-normal text-4xl md:text-5xl mb-8">
              증명된 사실:<br />예술인은 빌린 돈을 약속대로 갚습니다
            </h2>
            <p className="text-xl text-sky-strong">
              신용점수에 상관없이 빌려준 354건, 약 7억 원 가운데 95%가 제때 돌아왔고
              빚을 대신 갚아야 했던 비율도 5.10%뿐이라 흔한 저신용 대출보다 오히려 안정적입니다.
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
              <p className="text-charcoal-muted">상환율 (대위변제율 5.10%)</p>

            </div >
          </div >

          <div className="mt-12 bg-white p-8 rounded-lg max-w-3xl mx-auto border-l-4 border-primary">
            <p className="text-lg text-charcoal mb-2">
              이 데이터는 명백한 사실을 증명합니다. <span className="text-primary font-semibold">예술인은 빚을 떼먹는 사람이 아닙니다.</span>
            </p>
            <p className="text-base text-charcoal-muted mb-6">
              354건 중 95%가 제때 갚혔고 대위변제율도 5.10%에 머물러 뉴스아트(2025.05.22)가 소개한 것처럼
              일반 금융기관 저신용 대출 연체율보다 낮은 수준이 유지되고 있습니다.
            </p>
            <p className="text-2xl font-bold text-charcoal">
              위험한 것은 이들을 약탈하도록 방치하는 현재의 금융 시스템입니다.
            </p>
          </div>
        </div>
      </section>

      {/* Proof Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="font-section font-normal text-4xl md:text-5xl mb-6">상호부조 대출이란?</h2>
              <div className="space-y-4 text-charcoal">
                <p>
                  <a
                    href={EXTERNAL_LINKS.KOSMART_HOME}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    한국스마트협동조합
                  </a>
                  이 일정한 기금을 조성하면, 협약금융기관이 그 기금의 약 7배까지 예술인들에게 <strong>저금리</strong>로 대출하는 시스템입니다.
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
              <h3 className="text-card-title mb-6">기금의 힘</h3>
              <p className="text-sm text-charcoal-muted mb-3">누적 조성된 상호부조 기금</p>
              <p className="text-4xl font-bold text-primary">77,000,000원</p>
              <p className="text-sm text-charcoal-muted mt-4">
                작품 판매와 후원, 특별조합비로 함께 채워온 신뢰의 안전망입니다.
              </p>
            </div>
          </div>

          {/* Success Stories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">354건</div>
              <h3 className="text-card-title mb-2">누적 대출 실행</h3>
              <p className="text-charcoal-muted text-sm text-balance">
                2022년 12월부터 2025년 9월말까지 354건의 상호부조 대출이 실행되었습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">약 7억 원</div>
              <h3 className="text-card-title mb-2">누적 지원 금액</h3>
              <p className="text-charcoal-muted text-sm text-balance">
                생활비·창작비·프로젝트 자금 등으로 총 약 7억 원이 투입되었습니다.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-primary mb-4">5.10%</div>
              <h3 className="text-card-title mb-2">대위변제율</h3>
              <p className="text-charcoal-muted text-sm text-balance">
                총 20건, 31,080,986원이 대위변제 처리되어 전체 실행액 대비 5.10% 수준입니다.
              </p>
            </div>
          </div>

          {/* Why It Works */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-3xl mx-auto mb-16">
            <h2 className="font-section font-normal text-4xl md:text-5xl mb-8 text-center">왜 상호부조 금융이 작동할까?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">기금과 특별조합비</h3>
                  <p className="text-charcoal-muted text-balance">
                    조합이 조성한 7,700만원의 기금과 대출자 특별조합비로 안정기금 잔액 35,608,224원을 유지하며 리스크를 공동으로 감당합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">연 5% 고정금리</h3>
                  <p className="text-charcoal-muted text-balance">
                    프로젝트형·긴급생활형 상품 모두 연 5% 고정금리로 설계되어 고리대금 대출 대비 평균 14%p 이상 이자 부담을 덜어줍니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">용도별 맞춤 상품</h3>
                  <p className="text-charcoal-muted text-balance">
                    긴급·익일·특별·프로젝트 대출 등 네 가지 상품으로 생활비부터 창작비까지 필요한 시점에 자금을 공급합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">투명한 리스크 관리</h3>
                  <p className="text-charcoal-muted text-balance">
                    대위변제 20건(6.56%) 중 11,396,305원을 회수했고, 실시간 모니터링과 회수 계획으로 상호부조 신뢰를 지켜가고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 bg-sun-soft">
        <div className="container-max">
          <h2 className="font-section font-normal text-4xl md:text-5xl mb-12 text-center">예술인들의 증언</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TestimonialCard
              quote="급하게 병원비가 필요했는데, 어디서도 돈을 빌릴 수 없었어요. 상호부조 대출 덕분에 치료에만 집중할 수 있었습니다."
              author="김OO"
              context="시각 예술가"
              borderColor="border-primary"
              contextColor="text-sky-strong"
            />
            <TestimonialCard
              quote="은행 문턱이 너무 높았는데, 여기서는 저를 '예술인'으로 인정해주더군요. 단순한 대출이 아니라 큰 위로와 응원이었습니다."
              author="이OO"
              context="독립 영화감독"
              borderColor="border-sun"
              contextColor="text-sun-strong"
            />
            <TestimonialCard
              quote="다음 전시 준비 자금이 막막했는데, 덕분에 무사히 작품을 완성하고 전시를 열 수 있었습니다. 이 제도가 없었다면 불가능했을 거예요."
              author="박OO"
              context="설치 미술가"
              borderColor="border-accent"
              contextColor="text-accent-strong"
            />
            <TestimonialCard
              quote="내 상환금이 다른 동료 예술가에게 희망이 된다는 사실이 저를 더 책임감 있게 만듭니다. 우리는 서로의 안전망입니다."
              author="최OO"
              context="뮤지컬 배우"
              borderColor="border-primary-strong"
              contextColor="text-primary-strong"
            />
          </div>
        </div>
      </section>

      {/* Statistics Comparison */}
      <section className="py-12 md:py-20 bg-primary-surface">
        <div className="container-max">
          <h2 className="font-section font-normal text-4xl md:text-5xl mb-12 text-center">기존 금융 vs 상호부조 대출</h2>
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
      <section className="py-12 md:py-20 bg-primary/20">
        <div className="container-max text-center">
          <h2 className="font-section font-normal text-4xl md:text-5xl mb-8">
            당신도 이 신뢰의 체계에 참여할 수 있습니다
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">후원으로 기금에 힘을 보태주세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                상호부조 대출 기금은 시민 후원으로 확대됩니다. 정기후원·일시후원 모두 큰 도움이 됩니다.
              </p>
              <a
                href={EXTERNAL_LINKS.DONATE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-light font-bold px-6 py-3 rounded-lg transition-colors"
              >
                후원하기
              </a>
            </div>
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">작품을 구매해 예술인을 응원하세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                판매 수익은 전액 기금으로 귀속됩니다. 온라인 갤러리에서 작품을 만나보세요.
              </p>
              <a
                href="/artworks"
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
