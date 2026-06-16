import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import { LOAN_COUNT } from '@/lib/site-stats';
import { getLiveStats } from '@/lib/live-stats';
import { ArrowRight } from 'lucide-react';

/**
 * About 정체성 영역 [C] — 매뉴얼 6.4 [C].
 *
 * Hero[B] 직후 ribbon. 페르소나 B에게 "이 사이트는 무엇인가" 30초 인지.
 * 매뉴얼 톤 원칙: "1단 첫 구매자에게는 '미술 플랫폼' 인상 우선, '상호부조'는 보조".
 *
 * 구조 (매뉴얼 6.4 [C] 와이어프레임):
 * - 큰 제목: "한국 작가 N명, 작품 N점" (미술 플랫폼 정체성 우선)
 * - 부제 (작은 글씨): "예술인 상호부조 플랫폼" (깊이 단계 정체성)
 * - 통계 3개: 운영 + 작가 수 + 작품 수 (모바일 한 줄, 데스크탑 가로 배치)
 * - [About 더 보기] 텍스트 링크 → /about
 *
 * 정적 server component, ICU 변수는 lib/site-stats.ts 단일 출처 (작품 추가 시 자동 갱신).
 */
export default async function AboutIdentity({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.aboutIdentity' });
  const { artistCount, artworkCount } = await getLiveStats();

  return (
    <Section variant="canvas-soft" padding="sm" className="py-12 md:py-16">
      <div className="container-max text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-charcoal-deep mb-3 break-keep text-balance">
          {t('headline', { artistCount, artworkCount })}
        </h2>
        <p className="text-base md:text-lg text-charcoal-muted mb-6 text-balance">
          {t('subtitle')}
        </p>
        {/* 구매 신뢰 스트립 — PM 패널(2026-06-16) 합의: metaDescription이 약속한 '무료배송·7일반품'
            신호를 홈 first-screen 인근에 노출(promise-mismatch 해소). 정적 텍스트라 CLS/LCP 영향 0. */}
        <p className="mb-8 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs md:text-sm font-medium text-charcoal-soft">
          {t('trustStrip')}
        </p>
        <div className="flex flex-row flex-wrap items-center justify-center gap-6 md:gap-12 mb-8">
          <div>
            <p className="text-eyebrow text-charcoal-muted mb-1">{t('statOperationLabel')}</p>
            <p className="text-xl md:text-2xl font-bold text-charcoal-deep">
              {t('statOperationValue')}
            </p>
          </div>
          <div className="hidden md:block h-8 w-px bg-gray-200" aria-hidden="true" />
          <div>
            <p className="text-eyebrow text-charcoal-muted mb-1">{t('statArtistsLabel')}</p>
            <p className="text-xl md:text-2xl font-bold text-charcoal-deep">
              {t('statArtistsValue', { artistCount })}
            </p>
          </div>
          <div className="hidden md:block h-8 w-px bg-gray-200" aria-hidden="true" />
          <div>
            <p className="text-eyebrow text-charcoal-muted mb-1">{t('statLoansLabel')}</p>
            <p className="text-xl md:text-2xl font-bold text-charcoal-deep">
              {t('statLoansValue', { loanCount: LOAN_COUNT })}
            </p>
          </div>
        </div>
        <Link
          href="/about"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-strong hover:underline"
        >
          {t('learnMore')}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </Section>
  );
}
