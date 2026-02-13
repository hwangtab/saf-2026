import type { Metadata } from 'next';
import SafeImage from '@/components/common/SafeImage';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import ActionCard from '@/components/ui/ActionCard';
import BackgroundSlider from '@/components/features/BackgroundSlider';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import {
  EXTERNAL_LINKS,
  OG_IMAGE,
  SITE_URL,
  STATISTICS_DATA,
  escapeJsonLdForScript,
} from '@/lib/constants';
import { generateExhibitionSchema, generateFAQSchema } from '@/lib/seo-utils';
import { shuffleArray } from '@/lib/utils';
import { getSupabaseArtworks, getSupabaseFAQs } from '@/lib/supabase-data';

const DynamicCounter = dynamic(() => import('@/components/features/DynamicCounter'));
const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'));
const FAQList = dynamic(() => import('@/components/features/FAQList'));
const ArtworkHighlightSlider = dynamic(
  () => import('@/components/features/ArtworkHighlightSlider')
);

export const metadata: Metadata = {
  title: '씨앗페 2026 - 예술인 상호부조 기금 마련 특별전',
  description:
    '씨앗페 2026은 예술인 상호부조 대출 기금 마련을 위해 조합원 가입과 작품 구매를 연결하는 온라인 특별전입니다. 금융 사각지대에 놓인 예술인에게 안정적인 창작 환경을 선물하세요.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    siteName: '씨앗페 2026',
    title: '씨앗페 2026 - 예술인 상호부조 기금 마련 특별전',
    description:
      '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 조합원 가입과 작품 구매로 창작의 시간을 살려내는 연대에 참여하세요.',
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
    title: '씨앗페 2026 - 예술인 상호부조 기금 마련 특별전',
    description: '예술인 상호부조 대출 기금을 마련하는 특별전, 씨앗페 2026에 함께하세요.',
    images: [OG_IMAGE.url],
  },
};

export default async function Home() {
  const counterItems = STATISTICS_DATA.slice(0, 3);

  // Slider Logic: Show all available artworks (sold: false)
  const [allArtworks, faqs] = await Promise.all([getSupabaseArtworks(), getSupabaseFAQs()]);
  const availableArtworks = allArtworks.filter((artwork) => !artwork.sold);

  // 서버 측에서 30개만 샘플링하여 라이브러리/데이터 전송량 최적화

  const sliderArtworks = shuffleArray(availableArtworks).slice(0, 30);

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-12 pb-12 md:pt-20 md:pb-20">
        <BackgroundSlider />
        <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
        <div className="relative z-10 container-max text-center">
          <div className="mb-12 translate-y-6 hidden md:flex justify-center">
            <SafeImage
              src="/images/logo/320pxX90px_white.webp"
              alt="씨앗페 2026 로고"
              width={1120}
              height={320}
              className="w-96 md:w-[56rem] h-auto drop-shadow-2xl"
              priority
              placeholder="empty"
            />
          </div>
          <h1
            className="mt-12 md:mt-0 font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg text-balance opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            온라인 전시 오픈
            <br />
            작품 구매 가능
          </h1>
          <p
            className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg break-keep text-balance opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
          >
            한국 예술인의 84.9%가 제1금융권에서 배제되고 있습니다.
            <br className="hidden md:block" />
            예술을 사랑하는 당신의 후원과 구매가
            <br className="hidden md:block" />
            예술인들의 든든한 버팀목이 됩니다.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
          >
            <Button
              href="/artworks"
              variant="accent"
              size="lg"
              className="shadow-lg min-w-[200px] justify-center text-lg"
            >
              작품 보러가기
            </Button>
            <Button
              href="/archive"
              variant="outline"
              size="lg"
              className="bg-white/10 backdrop-blur-sm border-white/50 text-white hover:bg-white hover:text-primary min-w-[160px] justify-center"
            >
              씨앗페 소개
            </Button>
          </div>

          <div className="flex justify-center">
            <ShareButtons
              url={SITE_URL}
              title="씨앗페 2026 - 온라인 전시 오픈"
              description="한국 예술인 상호부조 기금 마련을 위한 온라인 특별전, 씨앗페 2026에 함께하세요."
            />
          </div>
        </div>
      </section>

      <ArtworkHighlightSlider artworks={sliderArtworks} />

      {/* Statistics Counter Section */}
      <DynamicCounter items={counterItems} />

      {/* Call to Action Section (Moved Up) */}
      <Section variant="accent-soft" prevVariant="canvas-soft" className="pb-24">
        <div className="container-max">
          <SectionTitle className="mb-12">당신도 함께할 수 있습니다</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <ActionCard
              href={EXTERNAL_LINKS.JOIN_MEMBER}
              external
              icon="🤝"
              title="조합원 가입"
              description="한국스마트협동조합의 조합원이 되어 예술인 상호부조의 든든한 지원군이 되어주세요."
              linkText="조합원 가입하기"
            />

            <ActionCard
              href="/artworks"
              icon="🎨"
              title="작품 구매"
              description="참여 예술가들의 작품을 구매하며 지원합니다."
              linkText="출품작 보기"
            />

            <ActionCard
              href="/archive"
              icon="🏛️"
              title="아카이브"
              description="지난 전시의 기록과 성과를 확인해보세요."
              linkText="기록 보기"
            />
          </div>
        </div>
      </Section>

      {/* Problem Section */}
      <Section variant="sun-soft" prevVariant="accent-soft">
        <div className="container-max">
          <SectionTitle className="mb-12">우리가 직면한 문제</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">🚫 금융 시장의 차별</h3>
              <p className="text-charcoal-muted leading-relaxed">
                예술인들은 정기적인 소득을 입증하기 어려워 은행 대출에서 거절당합니다. 신용등급이
                없으면 금융권에서 완전히 배제됩니다.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">💳 고리대금의 악순환</h3>
              <p className="text-charcoal-muted leading-relaxed">
                대출받을 곳이 없어 카드론, 현금서비스 등 연 20%에 육박하는 고리대금 상품에 의존하게
                됩니다.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">😔 심각한 피해</h3>
              <p className="text-charcoal-muted leading-relaxed">
                이는 예술가들의 창작활동을 방해하고 예술 생태계의 지속가능성을 위협합니다.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">🤝 해결책: 상호부조</h3>
              <p className="text-charcoal-muted leading-relaxed">
                <a
                  href={EXTERNAL_LINKS.KOSMART_HOME}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  한국스마트협동조합
                </a>
                의 기금과 협약금융기관의 신뢰로 만든 상호부조 대출이 답입니다.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Solution Section */}
      <Section variant="primary-surface" prevVariant="sun-soft" className="pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">우리의 해결책</SectionTitle>
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-3xl mx-auto text-balance text-center md:text-left">
            <div className="mb-8">
              <h3 className="text-card-title text-charcoal mb-4">📈 95% 상환율의 신뢰</h3>
              <p className="text-charcoal-muted leading-relaxed mb-4">
                <a
                  href={EXTERNAL_LINKS.KOSMART_HOME}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  한국스마트협동조합
                </a>
                이 일정한 기금을 조성하면, 협약금융기관이 그 기금의 약 7배까지 예술인들에게 저금리로
                대출합니다.
              </p>
            </div>
            <div className="border-t pt-8">
              <p className="text-charcoal mb-6">
                이미 지원받은 예술인들의 95% 이상이 성실하게 상환하고 있습니다. 이는 예술인들이
                신뢰할 수 있는 금융 시스템만 있으면, 얼마든지 책임감 있게 행동할 수 있다는
                증거입니다.
              </p>
              <Button
                href={EXTERNAL_LINKS.LOAN_INFO}
                external
                variant="accent"
                size="md"
                className="w-full md:w-auto justify-center"
              >
                대출 신청하기
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ Section */}
      <Section variant="sun-soft" prevVariant="primary-surface" className="pb-24 md:pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">자주 묻는 질문</SectionTitle>
          <FAQList items={faqs} />
        </div>
      </Section>

      {/* FAQ JSON-LD Schema for AI Optimization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLdForScript(JSON.stringify(generateFAQSchema(faqs))),
        }}
      />
      {/* ExhibitionEvent JSON-LD Schema for Google Knowledge Graph */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLdForScript(JSON.stringify(generateExhibitionSchema())),
        }}
      />
    </>
  );
}
