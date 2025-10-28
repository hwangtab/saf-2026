import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import DynamicCounter from '@/components/features/DynamicCounter';
import BackgroundSlider from '@/components/features/BackgroundSlider';
import { EXTERNAL_LINKS, OG_IMAGE, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: '씨앗:페 2026 - 예술인 금융 위기 해결 캠페인',
  description:
    '씨앗:페 2026은 예술인 상호부조 대출 기금 마련을 위해 후원과 작품 구매를 연결하는 캠페인입니다. 금융 사각지대에 놓인 예술인에게 안정적인 창작 환경을 선물하세요.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    siteName: '씨앗:페 2026',
    title: '씨앗:페 2026 - 예술인 금융 위기 해결 캠페인',
    description:
      '후원과 작품 구매로 예술인 상호부조 대출 기금을 확장하고, 금융 위기 속에서도 창작이 지속되도록 힘을 보태주세요.',
    url: SITE_URL,
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
    title: '씨앗:페 2026 - 예술인 금융 위기 해결 캠페인',
    description:
      '예술인의 금융 위기를 해결하는 상호부조 대출 캠페인, 씨앗:페 2026에 함께하세요.',
    images: [OG_IMAGE.url],
  },
};

export default function Home() {
  const counterItems = [
    { label: '제1금융권 배제율', value: 84.9, unit: '%' },
    { label: '고리대금 노출 예술인', value: 48.6, unit: '%' },
    { label: '상호부조 대출 상환율', value: 95, unit: '%' },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center py-12 md:py-20">
        <BackgroundSlider />
        <div className="relative z-10 container-max text-center">
          <div className="mb-12 flex justify-center">
            <Image
              src="/images/logo/320pxX90px_white.png"
              alt="씨앗:페 2026 로고"
              width={1120}
              height={320}
              className="w-96 md:w-[56rem] h-auto drop-shadow-2xl"
              priority
            />
          </div>
          <h1 className="font-partial text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight text-white drop-shadow-lg text-balance">
            예술인의 금융 위기,
            <br />
            함께 해결합니다
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
            한국 예술인의 84.9%가 제1금융권에서 배제되고,
            <br />
            절반이 약탈적 고리대금에 노출되어 있습니다.
            <br className="hidden md:block" />
            이 문제를 해결하기 위해 씨앗:페가 시작되었습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href={EXTERNAL_LINKS.DONATE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent hover:bg-accent-strong text-light font-bold px-8 py-4 rounded-lg transition-all duration-200 active:scale-95"
            >
              ❤️ 지금 후원하기
            </a>
            <a
              href={EXTERNAL_LINKS.ONLINE_GALLERY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-lg transition-all duration-200 active:scale-95"
            >
              🎨 작품 구매하기
            </a>
          </div>
          <p className="text-sm text-white/70 drop-shadow-lg">
            📌 11월 15일 인사아트센터에서 시작합니다
          </p>
        </div>
      </section>

      {/* Statistics Counter Section */}
      <DynamicCounter items={counterItems} />

      {/* Problem Section */}
      <section className="py-16 md:py-24 bg-sun-soft">
        <div className="container-max">
          <h2 className="font-partial text-3xl md:text-4xl text-center mb-12">
            우리가 직면한 문제
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="font-watermelon text-xl font-bold text-charcoal">
                🚫 금융 시장의 차별
              </h3>
              <p className="text-charcoal-muted leading-relaxed">
                예술인들은 정기적인 소득을 입증하기 어려워 은행 대출에서 거절당합니다.
                신용등급이 없으면 금융권에서 완전히 배제됩니다.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-watermelon text-xl font-bold text-charcoal">
                💳 고리대금의 악순환
              </h3>
              <p className="text-charcoal-muted leading-relaxed">
                대출받을 곳이 없어 카드론, 현금서비스 등 연 20%에 육박하는
                고리대금 상품에 의존하게 됩니다.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-watermelon text-xl font-bold text-charcoal">
                😔 심각한 피해
              </h3>
              <p className="text-charcoal-muted leading-relaxed">
                이는 예술가들의 창작활동을 방해하고 예술 생태계의
                지속가능성을 위협합니다.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-watermelon text-xl font-bold text-charcoal">
                🤝 해결책: 상호부조
              </h3>
              <p className="text-charcoal-muted leading-relaxed">
                <a
                  href={EXTERNAL_LINKS.KOSMART_HOME}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  한국스마트협동조합
                </a>
                의 기금과 태릉신협의 신뢰로 만든
                상호부조 대출이 답입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 md:py-24 bg-primary-surface">
        <div className="container-max">
          <h2 className="font-partial text-3xl md:text-4xl text-center mb-12">
            우리의 해결책
          </h2>
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-3xl mx-auto">
            <div className="mb-8">
              <h3 className="font-watermelon text-2xl font-bold text-charcoal mb-4">
                📈 95% 상환율의 신뢰
              </h3>
              <p className="text-charcoal-muted leading-relaxed mb-4">
                <a
                  href={EXTERNAL_LINKS.KOSMART_HOME}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  한국스마트협동조합
                </a>
                이 일정한 기금을 조성하면, 태릉신협이
                그 기금의 약 7배까지 예술인들에게 저금리로 대출합니다.
              </p>
            </div>
            <div className="border-t pt-8">
              <p className="text-charcoal mb-6">
                이미 지원받은 예술인들의 95% 이상이 성실하게 상환하고 있습니다.
                이는 예술인들이 신뢰할 수 있는 금융 시스템만 있으면,
                얼마든지 책임감 있게 행동할 수 있다는 증거입니다.
              </p>
              <a
                href={EXTERNAL_LINKS.LOAN_INFO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-accent hover:bg-accent-strong text-light font-bold px-6 py-3 rounded-lg transition-colors"
              >
                대출 신청하기 →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-accent-soft">
        <div className="container-max">
          <h2 className="font-partial text-3xl md:text-4xl mb-12 text-center">
            당신도 함께할 수 있습니다
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <a
              href={EXTERNAL_LINKS.DONATE}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-primary hover:shadow-xl transition-all duration-200 active:scale-95"
            >
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="font-watermelon text-xl font-bold mb-3">후원하기</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                당신의 후원은 예술인들을 위한 기금이 됩니다.
              </p>
              <span className="inline-block group-hover:translate-x-1 transition-transform">
                후원하기 →
              </span>
            </a>

            <a
              href={EXTERNAL_LINKS.ONLINE_GALLERY}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-primary hover:shadow-xl transition-all duration-200 active:scale-95"
            >
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="font-watermelon text-xl font-bold mb-3">작품 구매</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                참여 예술가들의 작품을 구매하며 지원합니다.
              </p>
              <span className="inline-block group-hover:translate-x-1 transition-transform">
                갤러리 방문 →
              </span>
            </a>

            <Link
              href="/exhibition"
              className="group flex flex-col p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-primary hover:shadow-xl transition-all duration-200 active:scale-95"
            >
              <div className="text-4xl mb-4">🏛️</div>
              <h3 className="font-watermelon text-xl font-bold mb-3">전시 방문</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                인사아트센터에서 펼쳐지는 예술의 현장을 직접 방문하세요.
              </p>
              <span className="inline-block group-hover:translate-x-1 transition-transform">
                정보 보기 →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
